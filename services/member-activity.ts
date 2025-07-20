import { GitHubService } from "./github.js";
import { JiraService } from "./jira.js";
import {
  MemberActivity,
  GitHubConfig,
  JiraConfig,
  RepositoryConfig,
  APIError,
  ValidationError,
} from "./types.js";

export class MemberActivityService {
  private githubServices: GitHubService[];
  private jiraService: JiraService;

  constructor(githubConfig: GitHubConfig, jiraConfig: JiraConfig) {
    this.githubServices = githubConfig.repositories.map(
      (repository) => new GitHubService(githubConfig.token, repository)
    );
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
      repositoryName?: string; // Optional: specify which repository to use
    } = {}
  ): Promise<MemberActivity> {
    const {
      githubUsername = memberName,
      jiraUsername = memberName,
      since,
      until,
      projectKey,
      repositoryName,
    } = options;

    try {
      // Determine which GitHub services to use
      let servicesToUse = this.githubServices;
      if (repositoryName && repositoryName.trim() !== "") {
        const specificService = this.githubServices.find(
          (service) => (service as any).repository.name === repositoryName
        );
        if (!specificService) {
          throw new ValidationError(`Repository '${repositoryName}' not found`);
        }
        servicesToUse = [specificService];
      }
      // If no repositoryName is provided, use all repositories (default behavior)

      // Fetch data from all relevant repositories
      const allCommits = await Promise.all(
        servicesToUse.map((service) =>
          service.fetchCommitsByAuthor(githubUsername, since, until)
        )
      );

      const allPullRequests = await Promise.all(
        servicesToUse.map((service) =>
          service.fetchPullRequestsByAuthor(githubUsername)
        )
      );

      // Combine results from all repositories
      const commits = allCommits.flat();
      const pullRequests = allPullRequests.flat();

      const assignedIssues = await this.jiraService.fetchIssuesByAssignee(
        jiraUsername,
        projectKey,
        since
      );

      const lastActive = this.calculateLastActiveDate(
        commits,
        pullRequests,
        assignedIssues
      );

      return {
        commits,
        pullRequests,
        issues: assignedIssues,
        lastActive,
      };
    } catch (error) {
      if (error instanceof APIError || error instanceof ValidationError) {
        throw error;
      }
      throw new APIError(
        `Failed to fetch member activity for ${memberName}: ${error}`,
        "github"
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
    } = {}
  ): Promise<MemberActivity[]> {
    const activities = await Promise.allSettled(
      members.map((member) =>
        this.fetchMemberActivity(member.name, {
          ...options,
          githubUsername: member.githubUsername,
          jiraUsername: member.jiraUsername,
        })
      )
    );

    return activities
      .filter(
        (result): result is PromiseFulfilledResult<MemberActivity> =>
          result.status === "fulfilled"
      )
      .map((result) => result.value);
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
    } = {}
  ): Promise<{
    totalMembers: number;
    totalCommits: number;
    totalPullRequests: number;
    totalIssues: number;
    activeMembers: number;
  }> {
    const activities = await this.fetchTeamActivity(members, options);

    const totalCommits = activities.reduce(
      (sum, activity) => sum + activity.commits.length,
      0
    );
    const totalPullRequests = activities.reduce(
      (sum, activity) => sum + activity.pullRequests.length,
      0
    );
    const totalIssues = activities.reduce(
      (sum, activity) => sum + activity.issues.length,
      0
    );

    const activeMembers = activities.filter(
      (activity) =>
        activity.commits.length > 0 ||
        activity.pullRequests.length > 0 ||
        activity.issues.length > 0
    ).length;

    return {
      totalMembers: activities.length,
      totalCommits,
      totalPullRequests,
      totalIssues,
      activeMembers,
    };
  }

  async testConnections(): Promise<{
    github: boolean;
    jira: boolean;
  }> {
    const githubTests = await Promise.allSettled(
      this.githubServices.map((service) => service.testConnection())
    );
    const jiraTest = await Promise.allSettled([
      this.jiraService.testConnection(),
    ]);

    return {
      github: githubTests.some(
        (test) => test.status === "fulfilled" && test.value
      ),
      jira: jiraTest[0].status === "fulfilled" ? jiraTest[0].value : false,
    };
  }

  private calculateLastActiveDate(
    commits: any[],
    pullRequests: any[],
    issues: any[]
  ): Date {
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
  }
}

export const createMemberActivityService = (
  githubConfig: GitHubConfig,
  jiraConfig: JiraConfig
): MemberActivityService => {
  return new MemberActivityService(githubConfig, jiraConfig);
};
