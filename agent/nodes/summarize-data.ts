import { AgentInput, AgentOutput, QueryIntent } from '../types';

export const summarizeDataNode = async (input: AgentInput): Promise<AgentOutput> => {
  const { memberActivity, intent } = input;
  
  if (!memberActivity) {
    return {
      error: 'Member activity data is required for summarization'
    };
  }

  const summary = generateSummary(memberActivity, intent);

  return {
    memberName: memberActivity.name,
    memberActivity,
    summary
  };
};

const generateSummary = (activity: any, intent?: QueryIntent): string => {
  const { name, commits, pullRequests, issues, sprintVelocity, lastActive } = activity;
  
  const commitCount = commits.length;
  const prCount = pullRequests.length;
  const mergedPRs = pullRequests.filter((pr: any) => pr.state === 'merged').length;
  const openPRs = pullRequests.filter((pr: any) => pr.state === 'open').length;
  const issueCount = issues.length;
  const resolvedIssues = issues.filter((issue: any) => 
    issue.status.toLowerCase() === 'done' || 
    issue.status.toLowerCase() === 'closed' ||
    issue.status.toLowerCase() === 'resolved'
  ).length;
  
  const bugIssues = issues.filter((issue: any) => 
    issue.summary.toLowerCase().includes('bug') ||
    issue.priority.toLowerCase() === 'high'
  ).length;

  const featureIssues = issueCount - bugIssues;

  let summary = `${name} has been actively contributing with ${commitCount} commits and ${prCount} pull requests`;
  
  if (mergedPRs > 0) {
    summary += ` (${mergedPRs} merged`;
    if (openPRs > 0) {
      summary += `, ${openPRs} open`;
    }
    summary += ')';
  }
  
  summary += `.`;

  if (issueCount > 0) {
    summary += ` They have worked on ${issueCount} Jira tickets`;
    if (resolvedIssues > 0) {
      summary += ` with ${resolvedIssues} completed`;
    }
    if (bugIssues > 0 && featureIssues > 0) {
      summary += ` (${bugIssues} bugs, ${featureIssues} features)`;
    } else if (bugIssues > 0) {
      summary += ` (${bugIssues} bugs)`;
    } else if (featureIssues > 0) {
      summary += ` (${featureIssues} features)`;
    }
    summary += '.';
  }

  if (sprintVelocity > 0) {
    summary += ` Their sprint velocity is ${sprintVelocity} story points.`;
  }

  const daysSinceActive = Math.floor((new Date().getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceActive === 0) {
    summary += ` They were active today.`;
  } else if (daysSinceActive === 1) {
    summary += ` They were last active yesterday.`;
  } else if (daysSinceActive <= 7) {
    summary += ` They were last active ${daysSinceActive} days ago.`;
  } else {
    summary += ` Their last activity was ${daysSinceActive} days ago.`;
  }

  return summary;
}; 