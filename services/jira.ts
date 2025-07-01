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
}

export const createJiraService = (config: JiraConfig): JiraService => {
  return new JiraService(config);
};
