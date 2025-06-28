import { AgentState } from "../state";
import { ConfigManager } from "../../lib/config";
import { createGitHubService, createJiraService, createMemberActivityService, MemberActivity } from "../../services";
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

    const memberActivityService = createMemberActivityService(githubConfig, jiraConfig);
    const memberActivity = await memberActivityService.fetchMemberActivity(state.memberName, {
        githubUsername: state.memberGithubUsername,
        jiraUsername: state.memberJiraUsername
    });

    const llmService = createLLMService(llmConfig);
    const result = await llmService.summarizeActivity(memberActivity, state.intent);

    return {
      summary: result,
      memberActivity: memberActivity,
    };
  };

export const fetchGithubData = async (githubUsername: string): Promise<any> => {
    if (!githubUsername) {
        throw new Error('Member name is required to fetch GitHub data');
    }

    const githubConfig = ConfigManager.getGitHubConfig();
    if (!githubConfig) {
        throw new Error('GitHub configuration not found. Please run "fmt config" to set up GitHub credentials.');
    }

    try {
        const githubService = createGitHubService(githubConfig);
        
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const [commits, pullRequests] = await Promise.all([
        githubService.fetchCommitsByAuthor(githubUsername, twoWeeksAgo),
        githubService.fetchPullRequestsByAuthor(githubUsername)
        ]);

        return {
            commits,
            pullRequests
        };
    } catch (error) {
        throw new Error(`Failed to fetch GitHub data: ${error}`);
    }
}; 

export const fetchJiraData = async (jiraUsername: string): Promise<any> => {
    if (!jiraUsername) {
      throw new Error('Member name is required to fetch Jira data');
    }
  
    const jiraConfig = ConfigManager.getJiraConfig();
    if (!jiraConfig) {
      throw new Error('Jira configuration not found. Please run "fmt config" to set up Jira credentials.');
    }
  
    try {
      const jiraService = createJiraService(jiraConfig);
      
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
      const [issues, sprintVelocity] = await Promise.all([
        jiraService.fetchIssuesByAssignee(jiraUsername, jiraConfig.projectKey, twoWeeksAgo),
        jiraService.getSprintVelocity(jiraUsername, undefined, jiraConfig.projectKey)
      ]);
  
      return {
        issues,
        sprintVelocity
      };
    } catch (error) {
      throw new Error(`Failed to fetch Jira data: ${error}`);
    }
  }; 

  export const mergeDataNode = async (githubData: any, jiraData: any): Promise<MemberActivity> => {
  
    if (!githubData && !jiraData) {
      throw new Error('At least one data source (GitHub or Jira) is required');
    }
  
    const commits = githubData?.commits || [];
    const pullRequests = githubData?.pullRequests || [];
    const issues = jiraData?.issues || [];
    const sprintVelocity = jiraData?.sprintVelocity || 0;
  
    const lastActive = calculateLastActiveDate(commits, pullRequests, issues);
  
    const memberActivity: MemberActivity = {
      commits,
      pullRequests,
      issues,
      sprintVelocity,
      lastActive
    };
  
    return memberActivity;
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