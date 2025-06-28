import { AgentInput, AgentOutput } from '../types';
import { createJiraService } from '../../services';

export const fetchJiraDataNode = async (input: AgentInput): Promise<AgentOutput> => {
  const { memberName } = input;
  
  if (!memberName) {
    return {
      error: 'Member name is required to fetch Jira data'
    };
  }

  const jiraConfig = getJiraConfig();
  if (!jiraConfig) {
    return {
      error: 'Jira configuration not found'
    };
  }

  try {
    const jiraService = createJiraService(jiraConfig);
    
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [issues, sprintVelocity] = await Promise.all([
      jiraService.fetchIssuesByAssignee(memberName, jiraConfig.projectKey, twoWeeksAgo),
      jiraService.getSprintVelocity(memberName, undefined, jiraConfig.projectKey)
    ]);

    return {
      memberName,
      jiraData: {
        issues,
        sprintVelocity
      }
    };
  } catch (error) {
    return {
      error: `Failed to fetch Jira data: ${error}`
    };
  }
};

const getJiraConfig = () => {
  const host = process.env.JIRA_HOST;
  const username = process.env.JIRA_USERNAME;
  const password = process.env.JIRA_PASSWORD;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!host || !username || !password) {
    return null;
  }

  return { host, username, password, projectKey };
}; 