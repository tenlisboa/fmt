import { AgentInput, AgentOutput } from '../types';
import { createJiraService } from '../../services';
import { ConfigManager } from '../../lib/config.js';

export const fetchJiraDataNode = async (input: AgentInput): Promise<AgentOutput> => {
  const { memberName } = input;
  
  if (!memberName) {
    return {
      error: 'Member name is required to fetch Jira data'
    };
  }

  const jiraConfig = ConfigManager.getJiraConfig();
  if (!jiraConfig) {
    return {
      error: 'Jira configuration not found. Please run "fmt config" to set up Jira credentials.'
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