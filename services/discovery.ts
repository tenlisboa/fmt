import {
  DiscoveredMember,
  DiscoveryResult,
  DiscoveryOptions,
  APIError,
} from "./types.js";
import { createGitHubService } from "./github.js";
import { createJiraService } from "./jira.js";
import { createLLMService } from "./llm.js";
import { ConfigManager } from "../lib/config.js";

export class DiscoveryService {
  private githubService: any;
  private jiraService: any;
  private llmService: any;

  constructor() {
    const githubConfig = ConfigManager.getGitHubConfig();
    const jiraConfig = ConfigManager.getJiraConfig();
    const llmConfig = ConfigManager.getLLMConfig();

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

    if (llmConfig) {
      this.llmService = createLLMService(llmConfig);
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
      githubMembers = this.filterValidMembers(githubMembers);
      jiraMembers = this.filterValidMembers(jiraMembers);

      // Find matches using LLM if available, otherwise use string matching
      let suggestedMatches;
      if (
        this.llmService &&
        githubMembers.length > 0 &&
        jiraMembers.length > 0
      ) {
        console.log("🤖 Using AI to match team members...");
        suggestedMatches = await this.llmService.matchUsers(
          githubMembers,
          jiraMembers
        );
        console.log(`✅ AI found ${suggestedMatches.length} potential matches`);
      } else {
        console.log("⚠️  LLM not available, using basic string matching...");
        suggestedMatches = this.findStringMatches(githubMembers, jiraMembers);
        console.log(
          `✅ String matching found ${suggestedMatches.length} potential matches`
        );
      }

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
   * Filter out bot accounts and inactive members
   */
  private filterValidMembers(members: DiscoveredMember[]): DiscoveredMember[] {
    return members.filter((member) => {
      // Filter out bots
      if (this.isBotUsername(member.username)) {
        return false;
      }

      // Filter out members without recent activity (if we have activity data)
      if (member.lastActive && !this.isRecent(member.lastActive)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if a username is likely a bot
   */
  private isBotUsername(username: string): boolean {
    const botPatterns = [
      "bot",
      "ci",
      "github-actions",
      "dependabot",
      "renovate",
      "automation",
      "deploy",
      "build",
      "test",
      "jenkins",
      "travis",
    ];

    const lowerUsername = username.toLowerCase();
    return botPatterns.some((pattern) => lowerUsername.includes(pattern));
  }

  /**
   * Check if a date is recent (within last 30 days)
   */
  private isRecent(date: Date): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date >= thirtyDaysAgo;
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
   * Fallback string matching when LLM is not available
   */
  private findStringMatches(
    githubMembers: DiscoveredMember[],
    jiraMembers: DiscoveredMember[]
  ): any[] {
    const matches = [];

    for (const githubMember of githubMembers) {
      for (const jiraMember of jiraMembers) {
        // High confidence: Exact email match
        if (
          githubMember.email &&
          jiraMember.email &&
          githubMember.email.toLowerCase() === jiraMember.email.toLowerCase()
        ) {
          matches.push({
            githubMember,
            jiraMember,
            confidence: "high",
            reason: "Exact email match",
          });
          continue;
        }

        // Medium confidence: Display name similarity
        if (githubMember.displayName && jiraMember.displayName) {
          const similarity = this.calculateSimilarity(
            githubMember.displayName,
            jiraMember.displayName
          );
          if (similarity >= 0.8) {
            matches.push({
              githubMember,
              jiraMember,
              confidence: "medium",
              reason: `Display name similarity: ${(similarity * 100).toFixed(
                0
              )}%`,
            });
          }
        }
      }
    }

    return matches;
  }

  /**
   * Simple similarity calculation for fallback
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;

    // Simple character overlap
    const chars1 = new Set(s1.split(""));
    const chars2 = new Set(s2.split(""));
    const intersection = new Set([...chars1].filter((x) => chars2.has(x)));
    const union = new Set([...chars1, ...chars2]);

    return intersection.size / union.size;
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
