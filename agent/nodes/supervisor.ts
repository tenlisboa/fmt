import { AgentState } from "../state";
import { createLLMService, LLMService } from "../../services/llm";
import { ConfigManager } from "../../lib/config";
import { QueryIntent } from "../types";

export const supervisorNode = async (
  state: typeof AgentState.State
): Promise<Partial<typeof AgentState.State>> => {
  const llmConfig = ConfigManager.getLLMConfig();
  if (!llmConfig) {
    throw new Error("LLM configuration not found");
  }

  const llmService = createLLMService(llmConfig);
  const repositories = ConfigManager.getRepositories();

  // Extract repository information from the question
  const repositoryInfo = await extractRepositoryFromQuestion(
    state.messages[state.messages.length - 1].content as string,
    repositories,
    llmService
  );

  // Extract member information and intent
  const teamMembers = ConfigManager.getTeamMembers() || [];
  const analysis = await llmService.classifyQuery(
    state.messages[state.messages.length - 1].content as string,
    teamMembers
  );

  return {
    intent: mapStringToQueryIntent(analysis.intent),
    memberName: analysis.memberName || "",
    memberGithubUsername: analysis.githubUsername || "",
    memberJiraUsername: analysis.jiraUsername || "",
    repositoryName: repositoryInfo.repositoryName || "",
  };
};

async function extractRepositoryFromQuestion(
  question: string,
  repositories: any[],
  llmService: LLMService
): Promise<{ repositoryName?: string; confidence: number }> {
  if (repositories.length === 0) {
    return { confidence: 0 };
  }

  if (repositories.length === 1) {
    // Only one repository, use it by default
    const repo = repositories[0];
    return {
      repositoryName: repo.name || `${repo.owner}/${repo.repo}`,
      confidence: 1.0,
    };
  }

  const questionLower = question.toLowerCase();
  for (const repo of repositories) {
    const repoName = repo.name || `${repo.owner}/${repo.repo}`;
    const repoNameLower = repoName.toLowerCase();

    // Check if repository name appears in question
    if (questionLower.includes(repoNameLower)) {
      return { repositoryName: repoName, confidence: 0.9 };
    }

    // Check for partial matches (e.g., "API" matches "API Service")
    if (repo.name && questionLower.includes(repo.name.toLowerCase())) {
      return { repositoryName: repoName, confidence: 0.8 };
    }
  }

  const response = await llmService.extractRepositoryFromQuestion(
    question,
    repositories
  );
  const extractedRepo = response.trim();

  if (extractedRepo && extractedRepo !== "none") {
    // Find the repository that matches the extracted name
    const foundRepo = repositories.find((repo) => {
      const repoName = repo.name || `${repo.owner}/${repo.repo}`;
      return (
        repoName.toLowerCase() === extractedRepo.toLowerCase() ||
        (repo.name && repo.name.toLowerCase() === extractedRepo.toLowerCase())
      );
    });

    if (foundRepo) {
      return {
        repositoryName:
          foundRepo.name || `${foundRepo.owner}/${foundRepo.repo}`,
        confidence: 0.7,
      };
    }
  }

  // No specific repository found - use default or all repositories
  const defaultRepo = repositories.find((repo) => repo.isDefault);
  if (defaultRepo) {
    return {
      repositoryName:
        defaultRepo.name || `${defaultRepo.owner}/${defaultRepo.repo}`,
      confidence: 0.5,
    };
  }

  // No default repository - return empty to indicate all repositories should be used
  return { confidence: 0.3 };
}

const mapStringToQueryIntent = (intentString: string): QueryIntent => {
  switch (intentString) {
    case "member_performance":
      return QueryIntent.MEMBER_PERFORMANCE;
    case "team_summary":
      return QueryIntent.TEAM_SUMMARY;
    default:
      return QueryIntent.UNKNOWN;
  }
};
