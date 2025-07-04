import { createLLMService } from "../../services/llm";
import { createGitHubService, MemberActivity } from "../../services";
import { ConfigManager } from "../../lib/config.js";
import { AgentState } from "../state.js";

export const teamAnalyzerNode = async (
  state: typeof AgentState.State
): Promise<Partial<typeof AgentState.State>> => {
  const llmConfig = ConfigManager.getLLMConfig();
  if (!llmConfig) {
    throw new Error(
      'LLM configuration not found. Please run "fmt config" to set up OpenAI credentials.'
    );
  }

  const githubConfig = ConfigManager.getGitHubConfig();
  const jiraConfig = ConfigManager.getJiraConfig();

  if (!githubConfig && !jiraConfig) {
    throw new Error(
      "At least one data source (GitHub or Jira) must be configured for team analysis."
    );
  }

  try {
    const teamData = await gatherTeamData(githubConfig, jiraConfig);
    const llmService = createLLMService(llmConfig);
    const summary = await llmService.analyzeTeamData(teamData, "team_summary");

    return {
      summary,
    };
  } catch (error) {
    throw new Error(`Failed to analyze team data: ${error}`);
  }
};

const gatherTeamData = async (githubConfig: any, jiraConfig: any) => {
  const teamData: MemberActivity[] = [];

  if (githubConfig) {
    const githubService = createGitHubService(githubConfig);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const contributors = await githubService.getContributors();

    for (const contributorName of contributors) {
      const [commits, pullRequests] = await Promise.all([
        githubService.fetchCommitsByAuthor(contributorName, twoWeeksAgo),
        githubService.fetchPullRequestsByAuthor(contributorName),
      ]);

      const lastActiveDate = calculateLastActiveDate(commits, pullRequests, []);

      teamData.push({
        commits,
        pullRequests,
        issues: [],
        lastActive: lastActiveDate,
      });
    }
  }

  return teamData;
};

const calculateLastActiveDate = (
  commits: any[],
  pullRequests: any[],
  issues: any[]
): Date => {
  const dates: Date[] = [];

  commits.forEach((commit) => dates.push(commit.date));
  pullRequests.forEach((pr) => {
    dates.push(pr.createdAt);
    if (pr.mergedAt) dates.push(pr.mergedAt);
  });
  issues.forEach((issue) => {
    dates.push(issue.created);
    dates.push(issue.updated);
    if (issue.resolved) dates.push(issue.resolved);
  });

  return dates.length > 0
    ? new Date(Math.max(...dates.map((d) => d.getTime())))
    : new Date();
};
