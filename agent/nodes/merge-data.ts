import { AgentInput, AgentOutput } from '../types';
import { MemberActivity } from '../../services/types';

export const mergeDataNode = async (input: AgentInput): Promise<AgentOutput> => {
  const { memberName, githubData, jiraData } = input;
  
  if (!memberName) {
    return {
      error: 'Member name is required to merge data'
    };
  }

  if (!githubData && !jiraData) {
    return {
      error: 'At least one data source (GitHub or Jira) is required'
    };
  }

  const commits = githubData?.commits || [];
  const pullRequests = githubData?.pullRequests || [];
  const issues = jiraData?.issues || [];
  const sprintVelocity = jiraData?.sprintVelocity || 0;

  const lastActive = calculateLastActiveDate(commits, pullRequests, issues);

  const memberActivity: MemberActivity = {
    name: memberName,
    commits,
    pullRequests,
    issues,
    sprintVelocity,
    lastActive
  };

  return {
    memberName,
    memberActivity
  };
};

const calculateLastActiveDate = (commits: any[], pullRequests: any[], issues: any[]): Date => {
  const dates: Date[] = [];

  commits.forEach(commit => dates.push(commit.date));

  pullRequests.forEach(pr => {
    dates.push(pr.createdAt);
    if (pr.mergedAt) dates.push(pr.mergedAt);
  });

  issues.forEach(issue => {
    dates.push(issue.created);
    dates.push(issue.updated);
    if (issue.resolved) dates.push(issue.resolved);
  });

  return dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
}; 