import { AgentState } from "../state";
import { validateAndCreateServices } from "../../lib/utils.js";

export const memberPerformanceNode = async (
  state: typeof AgentState.State
): Promise<Partial<typeof AgentState.State>> => {
  const { llmService, memberActivityService, jiraConfig } =
    validateAndCreateServices();

  if (!memberActivityService) {
    throw new Error(
      "Both GitHub and Jira configurations are required for member performance analysis"
    );
  }

  const memberActivity = await memberActivityService.fetchMemberActivity(
    state.memberName,
    {
      githubUsername: state.memberGithubUsername,
      jiraUsername: state.memberJiraUsername,
      projectKey: jiraConfig?.projectKey,
      repositoryName: state.repositoryName || undefined,
    }
  );

  const result = await llmService.summarizeActivity(
    memberActivity,
    state.intent
  );

  return {
    summary: result,
    memberActivity: memberActivity,
  };
};
