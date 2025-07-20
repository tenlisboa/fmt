import {
  DiscoveredMember,
  DiscoveryResult,
  DiscoveryOptions,
  APIError,
} from "./types.js";
import { createGitHubService } from "./github.js";
import { createJiraService } from "./jira.js";
import { ConfigManager } from "../lib/config.js";
import { filterValidMembers, findMemberMatches } from "../lib/matcher.js";

export class DiscoveryService {
  private githubService: any;
  private jiraService: any;

  constructor() {
    const githubConfig = ConfigManager.getGitHubConfig();
    const jiraConfig = ConfigManager.getJiraConfig();

    if (!githubConfig && !jiraConfig) {
      throw new Error(
        "At least one service (GitHub or Jira) must be configured"
      );
    }

    if (githubConfig) {
      this.githubService = createGitHubService(githubConfig);
    }

    if (jiraConfig) {
      this.jiraService = createJiraService(jiraConfig);
    }
  }

  /**
   * Discover team members from configured services
   */
  async discoverMembers(
    options: DiscoveryOptions = {}
  ): Promise<DiscoveryResult> {
    const { githubOnly = false, jiraOnly = false, daysBack = 30 } = options;

    let githubMembers: DiscoveredMember[] = [];
    let jiraMembers: DiscoveredMember[] = [];

    try {
      // Discover from GitHub
      if (!jiraOnly && this.githubService) {
        console.log("🔍 Discovering team members from GitHub...");
        githubMembers = await this.discoverGitHubMembers(daysBack);
        console.log(`✅ Found ${githubMembers.length} GitHub members`);
      }

      // Discover from Jira
      if (!githubOnly && this.jiraService) {
        console.log("🔍 Discovering team members from Jira...");
        jiraMembers = await this.discoverJiraMembers(daysBack);
        console.log(`✅ Found ${jiraMembers.length} Jira members`);
      }

      // Filter out bots and inactive members
      githubMembers = filterValidMembers(githubMembers);
      jiraMembers = filterValidMembers(jiraMembers);

      // Find matches between GitHub and Jira members
      const suggestedMatches = findMemberMatches(githubMembers, jiraMembers);

      return {
        githubMembers,
        jiraMembers,
        suggestedMatches,
      };
    } catch (error) {
      throw new APIError(
        `Discovery failed: ${error}`,
        "discovery",
        error instanceof Error ? (error as any).status : undefined
      );
    }
  }

  /**
   * Discover members from GitHub repository
   */
  private async discoverGitHubMembers(
    daysBack: number
  ): Promise<DiscoveredMember[]> {
    const members: DiscoveredMember[] = [];
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    try {
      // Get all contributors
      const contributors = await this.githubService.getContributors();

      // Get recent commits to gather more details
      const recentCommits = await this.githubService.fetchCommitsByAuthor(
        "",
        since
      );

      // Create a map of recent activity by author
      const authorActivity = new Map<
        string,
        { lastCommit: Date; commitCount: number }
      >();

      for (const commit of recentCommits) {
        const existing = authorActivity.get(commit.author) || {
          lastCommit: new Date(0),
          commitCount: 0,
        };
        authorActivity.set(commit.author, {
          lastCommit:
            commit.date > existing.lastCommit
              ? commit.date
              : existing.lastCommit,
          commitCount: existing.commitCount + 1,
        });
      }

      // Process each contributor
      for (const username of contributors) {
        const activity = authorActivity.get(username);

        members.push({
          source: "github",
          username,
          displayName: username, // GitHub API doesn't provide display names in contributors list
          lastActive: activity?.lastCommit,
          activityCount: activity?.commitCount || 0,
        });
      }

      return members;
    } catch (error) {
      console.warn(`Warning: Failed to discover GitHub members: ${error}`);
      return [];
    }
  }

  /**
   * Discover members from Jira project
   */
  private async discoverJiraMembers(
    daysBack: number
  ): Promise<DiscoveredMember[]> {
    const members: DiscoveredMember[] = [];
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    try {
      // Get project members (this will be implemented in jira.ts)
      const projectMembers = await this.jiraService.getProjectMembers();

      // Get recent issues to gather activity data
      const recentIssues = await this.jiraService.getRecentIssues(since);

      // Create a map of recent activity by assignee
      const assigneeActivity = new Map<
        string,
        { lastIssue: Date; issueCount: number }
      >();

      for (const issue of recentIssues) {
        if (issue.assignee) {
          const existing = assigneeActivity.get(issue.assignee) || {
            lastIssue: new Date(0),
            issueCount: 0,
          };
          assigneeActivity.set(issue.assignee, {
            lastIssue:
              issue.updated > existing.lastIssue
                ? issue.updated
                : existing.lastIssue,
            issueCount: existing.issueCount + 1,
          });
        }
      }

      // Process each project member
      for (const member of projectMembers) {
        const activity = assigneeActivity.get(member.username);

        members.push({
          source: "jira",
          username: member.username,
          displayName: member.displayName,
          email: member.email,
          lastActive: activity?.lastIssue,
          activityCount: activity?.issueCount || 0,
        });
      }

      return members;
    } catch (error) {
      console.warn(`Warning: Failed to discover Jira members: ${error}`);
      return [];
    }
  }

  /**
   * Test connections to configured services
   */
  async testConnections(): Promise<{ github: boolean; jira: boolean }> {
    const results = { github: false, jira: false };

    if (this.githubService) {
      try {
        await this.githubService.testConnection();
        results.github = true;
      } catch (error) {
        console.warn(`GitHub connection test failed: ${error}`);
      }
    }

    if (this.jiraService) {
      try {
        await this.jiraService.testConnection();
        results.jira = true;
      } catch (error) {
        console.warn(`Jira connection test failed: ${error}`);
      }
    }

    return results;
  }
}

export const createDiscoveryService = (): DiscoveryService => {
  return new DiscoveryService();
};
