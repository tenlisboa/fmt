import { Version3Models, Version3Client } from "jira.js";
import { promisify } from "util";
import {
  JiraConfig,
  JiraTicket,
  JiraIssueRaw,
  APIError,
  ValidationError,
} from "./types.js";

export class JiraService {
  private client: Version3Client;
  private config: JiraConfig;

  constructor(config: JiraConfig) {
    this.validateConfig(config);
    this.config = config;
    this.client = new Version3Client({
      host: `https://${config.host}`,
      authentication: {
        basic: {
          email: config.username,
          apiToken: config.password,
        },
      },
    });
  }

  private validateConfig(config: JiraConfig): void {
    if (!config.host || typeof config.host !== "string") {
      throw new ValidationError("Jira host is required and must be a string");
    }
    if (!config.username || typeof config.username !== "string") {
      throw new ValidationError(
        "Jira username is required and must be a string"
      );
    }
    if (!config.password || typeof config.password !== "string") {
      throw new ValidationError(
        "Jira password/token is required and must be a string"
      );
    }
  }

  async fetchIssuesByAssignee(
    assignee: string,
    projectKey?: string,
    since?: Date
  ): Promise<JiraTicket[]> {
    try {
      let jql = `assignee = "${assignee}"`;

      if (projectKey || this.config.projectKey) {
        jql += ` AND project = "${projectKey || this.config.projectKey}"`;
      }

      if (since) {
        const sinceStr = since.toISOString().split("T")[0];
        jql += ` AND updated >= "${sinceStr}"`;
      }

      jql += " ORDER BY updated DESC";

      return this.searchWithJQL(jql);
    } catch (error) {
      throw new APIError(
        `Failed to fetch issues for assignee ${assignee}: ${error}`,
        "jira",
        error instanceof Error ? (error as any).statusCode : undefined
      );
    }
  }

  private normalizeIssue(raw: Version3Models.Issue): JiraTicket {
    if (!raw.key || !raw.fields?.summary || !raw.fields?.status?.name) {
      throw new ValidationError("Invalid issue data received from Jira API");
    }

    const baseUrl = `https://${this.config.host}`;

    return {
      key: raw.key,
      summary: raw.fields.summary,
      status: raw.fields.status.name,
      assignee: raw.fields.assignee?.displayName || "Unassigned",
      priority: raw.fields.priority?.name || "Unknown",
      created: new Date(raw.fields.created),
      updated: new Date(raw.fields.updated),
      resolved: raw.fields.resolutiondate
        ? new Date(raw.fields.resolutiondate)
        : undefined,
      storyPoints: raw.fields.customfield_10016 || undefined,
      url: `${baseUrl}/browse/${raw.key}`,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.myself.getCurrentUser();
      return true;
    } catch (error) {
      throw new APIError(
        `Jira connection test failed: ${error}`,
        "jira",
        error instanceof Error ? (error as any).statusCode : undefined
      );
    }
  }

  async searchWithJQL(
    jql: string,
    maxResults: number = 50
  ): Promise<JiraTicket[]> {
    try {
      const response =
        await this.client.issueSearch.searchForIssuesUsingJqlEnhancedSearch<Version3Models.SearchAndReconcileResults>(
          {
            jql,
            fields: [
              "summary",
              "status",
              "assignee",
              "priority",
              "created",
              "updated",
              "resolutiondate",
              "customfield_10016",
            ],
          }
        );

      return response.issues?.map((issue) => this.normalizeIssue(issue)) ?? [];
    } catch (error) {
      throw new APIError(
        `Failed to search with JQL "${jql}": ${error}`,
        "jira",
        error instanceof Error ? (error as any).statusCode : undefined
      );
    }
  }

  /**
   * Get project members from Jira
   */
  async getProjectMembers(): Promise<
    Array<{ username: string; displayName: string; email?: string }>
  > {
    try {
      if (!this.config.projectKey) {
        throw new ValidationError(
          "Project key is required to get project members"
        );
      }

      // Get recent issues to find active assignees
      const recentIssues = await this.getRecentIssues(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ); // Last 30 days

      // Extract unique assignees
      const assigneeMap = new Map<
        string,
        { displayName: string; email?: string }
      >();

      for (const issue of recentIssues) {
        if (issue.assignee && issue.assignee !== "Unassigned") {
          assigneeMap.set(issue.assignee, {
            displayName: issue.assignee,
            email: undefined, // Jira API doesn't provide email in issue data
          });
        }
      }

      // Convert to array format
      return Array.from(assigneeMap.entries()).map(([username, info]) => ({
        username,
        displayName: info.displayName,
        email: info.email,
      }));
    } catch (error) {
      throw new APIError(
        `Failed to get project members: ${error}`,
        "jira",
        error instanceof Error ? (error as any).statusCode : undefined
      );
    }
  }

  /**
   * Get recent issues from a specific date
   */
  async getRecentIssues(since: Date): Promise<JiraTicket[]> {
    try {
      const sinceStr = since.toISOString().split("T")[0];
      let jql = `updated >= "${sinceStr}"`;

      if (this.config.projectKey) {
        jql += ` AND project = "${this.config.projectKey}"`;
      }

      jql += " ORDER BY updated DESC";

      return this.searchWithJQL(jql, 100); // Get more results for discovery
    } catch (error) {
      throw new APIError(
        `Failed to get recent issues: ${error}`,
        "jira",
        error instanceof Error ? (error as any).statusCode : undefined
      );
    }
  }
}

export const createJiraService = (config: JiraConfig): JiraService => {
  return new JiraService(config);
};
