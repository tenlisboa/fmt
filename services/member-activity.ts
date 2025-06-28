import { GitHubService } from './github.js';
import { JiraService } from './jira.js';
import {
  MemberActivity,
  GitHubConfig,
  JiraConfig,
  APIError,
  ValidationError
} from './types.js';

export class MemberActivityService {
  private githubService: GitHubService;
  private jiraService: JiraService;

  constructor(githubConfig: GitHubConfig, jiraConfig: JiraConfig) {
    this.githubService = new GitHubService(githubConfig);
    this.jiraService = new JiraService(jiraConfig);
  }

  async fetchMemberActivity(
    memberName: string,
    options: {
      githubUsername?: string;
      jiraUsername?: string;
      since?: Date;
      until?: Date;
      projectKey?: string;
      sprintName?: string;
    } = {}
  ): Promise<MemberActivity> {
    const { 
      githubUsername = memberName, 
      jiraUsername = memberName,
      since,
      until,
      projectKey,
      sprintName
    } = options;

    try {
      const [commits, pullRequests] = await Promise.all([
        this.githubService.fetchCommitsByAuthor(githubUsername, since, until),
        this.githubService.fetchPullRequestsByAuthor(githubUsername)
      ]);

      const [assignedIssues, sprintVelocity] = await Promise.all([
        this.jiraService.fetchIssuesByAssignee(jiraUsername, projectKey, since),
        this.jiraService.getSprintVelocity(jiraUsername, sprintName, projectKey)
      ]);

      const lastActive = this.calculateLastActiveDate(commits, pullRequests, assignedIssues);

      return {
        name: memberName,
        commits,
        pullRequests,
        issues: assignedIssues,
        sprintVelocity,
        lastActive
      };
    } catch (error) {
      if (error instanceof APIError || error instanceof ValidationError) {
        throw error;
      }
      throw new APIError(
        `Failed to fetch member activity for ${memberName}: ${error}`,
        'github'
      );
    }
  }

  async fetchTeamActivity(
    members: Array<{
      name: string;
      githubUsername?: string;
      jiraUsername?: string;
    }>,
    options: {
      since?: Date;
      until?: Date;
      projectKey?: string;
      sprintName?: string;
    } = {}
  ): Promise<MemberActivity[]> {
    const activities = await Promise.allSettled(
      members.map(member => 
        this.fetchMemberActivity(member.name, {
          ...options,
          githubUsername: member.githubUsername,
          jiraUsername: member.jiraUsername
        })
      )
    );

    return activities
      .filter((result): result is PromiseFulfilledResult<MemberActivity> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  async getTeamSummary(
    members: Array<{
      name: string;
      githubUsername?: string;
      jiraUsername?: string;
    }>,
    options: {
      since?: Date;
      until?: Date;
      projectKey?: string;
      sprintName?: string;
    } = {}
  ): Promise<{
    totalMembers: number;
    totalCommits: number;
    totalPullRequests: number;
    totalIssues: number;
    averageVelocity: number;
    activeMembers: number;
  }> {
    const activities = await this.fetchTeamActivity(members, options);

    const totalCommits = activities.reduce((sum, activity) => sum + activity.commits.length, 0);
    const totalPullRequests = activities.reduce((sum, activity) => sum + activity.pullRequests.length, 0);
    const totalIssues = activities.reduce((sum, activity) => sum + activity.issues.length, 0);
    const totalVelocity = activities.reduce((sum, activity) => sum + activity.sprintVelocity, 0);
    
    const activeMembers = activities.filter(activity => 
      activity.commits.length > 0 || 
      activity.pullRequests.length > 0 || 
      activity.issues.length > 0
    ).length;

    return {
      totalMembers: activities.length,
      totalCommits,
      totalPullRequests,
      totalIssues,
      averageVelocity: activities.length > 0 ? totalVelocity / activities.length : 0,
      activeMembers
    };
  }

  async testConnections(): Promise<{
    github: boolean;
    jira: boolean;
  }> {
    const [githubTest, jiraTest] = await Promise.allSettled([
      this.githubService.testConnection(),
      this.jiraService.testConnection()
    ]);

    return {
      github: githubTest.status === 'fulfilled' ? githubTest.value : false,
      jira: jiraTest.status === 'fulfilled' ? jiraTest.value : false
    };
  }

  async getAvailableMembers(projectKey?: string): Promise<{
    githubContributors: string[];
    jiraUsers: string[];
  }> {
    const [githubContributors, jiraUsers] = await Promise.allSettled([
      this.githubService.getContributors(),
      this.jiraService.getProjectUsers(projectKey)
    ]);

    return {
      githubContributors: githubContributors.status === 'fulfilled' ? githubContributors.value : [],
      jiraUsers: jiraUsers.status === 'fulfilled' ? jiraUsers.value : []
    };
  }

  private calculateLastActiveDate(
    commits: any[],
    pullRequests: any[],
    issues: any[]
  ): Date {
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
  }
}

export const createMemberActivityService = (
  githubConfig: GitHubConfig,
  jiraConfig: JiraConfig
): MemberActivityService => {
  return new MemberActivityService(githubConfig, jiraConfig);
}; 