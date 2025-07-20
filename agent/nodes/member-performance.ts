import { AgentState } from "../state";
import { ConfigManager } from "../../lib/config";
import { createMemberActivityService } from "../../services";
import { createLLMService } from "../../services/llm";

export const memberPerformanceNode = async (
  state: typeof AgentState.State
): Promise<Partial<typeof AgentState.State>> => {
  const llmConfig = ConfigManager.getLLMConfig();
  if (!llmConfig) {
    throw new Error("LLM configuration not found");
  }

  const githubConfig = ConfigManager.getGitHubConfig();
  const jiraConfig = ConfigManager.getJiraConfig();
  if (!githubConfig || !jiraConfig) {
    throw new Error("GitHub or Jira configuration not found");
  }

  const memberActivityService = createMemberActivityService(
    githubConfig,
    jiraConfig
  );
  const memberActivity = await memberActivityService.fetchMemberActivity(
    state.memberName,
    {
      githubUsername: state.memberGithubUsername,
      jiraUsername: state.memberJiraUsername,
      projectKey: jiraConfig.projectKey,
      repositoryName: state.repositoryName || undefined,
    }
  );

  const llmService = createLLMService(llmConfig);
  const result = await llmService.summarizeActivity(
    memberActivity,
    state.intent
  );

  return {
    summary: result,
    memberActivity: memberActivity,
  };
};
