import JiraClient from 'jira-client';
import {
  JiraConfig,
  JiraTicket,
  JiraIssueRaw,
  APIError,
  ValidationError
} from './types.js';

export class JiraService {
  private client: JiraClient;
  private config: JiraConfig;

  constructor(config: JiraConfig) {
    this.validateConfig(config);
    this.config = config;
    this.client = new JiraClient({
      protocol: 'https',
      host: config.host,
      username: config.username,
      password: config.password,
      apiVersion: '2',
      strictSSL: true
    });
  }

  private validateConfig(config: JiraConfig): void {
    if (!config.host || typeof config.host !== 'string') {
      throw new ValidationError('Jira host is required and must be a string');
    }
    if (!config.username || typeof config.username !== 'string') {
      throw new ValidationError('Jira username is required and must be a string');
    }
    if (!config.password || typeof config.password !== 'string') {
      throw new ValidationError('Jira password/token is required and must be a string');
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
        const sinceStr = since.toISOString().split('T')[0];
        jql += ` AND updated >= "${sinceStr}"`;
      }

      jql += ' ORDER BY updated DESC';

      const response = await this.client.searchJira(jql, {
        maxResults: 100,
        fields: [
          'summary',
          'status',
          'assignee',
          'priority',
          'created',
          'updated',
          'resolutiondate',
          'customfield_10016'
        ]
      });

      return response.issues.map((issue: JiraIssueRaw) => this.normalizeIssue(issue));
    } catch (error) {
      throw new APIError(
        `Failed to fetch issues for assignee ${assignee}: ${error}`,
        'jira',
        error instanceof Error ? (error as any).statusCode : undefined
      );
    }
  }

  async fetchIssuesByReporter(
    reporter: string,
    projectKey?: string,
    since?: Date
  ): Promise<JiraTicket[]> {
    try {
      let jql = `reporter = "${reporter}"`;
      
      if (projectKey || this.config.projectKey) {
        jql += ` AND project = "${projectKey || this.config.projectKey}"`;
      }
      
      if (since) {
        const sinceStr = since.toISOString().split('T')[0];
        jql += ` AND created >= "${sinceStr}"`;
      }

      jql += ' ORDER BY created DESC';

      const response = await this.client.searchJira(jql, {
        maxResults: 100,
        fields: [
          'summary',
          'status',
          'assignee',
          'priority',
          'created',
          'updated',
          'resolutiondate',
          'customfield_10016'
        ]
      });

      return response.issues.map((issue: JiraIssueRaw) => this.normalizeIssue(issue));
    } catch (error) {
      throw new APIError(
        `Failed to fetch issues by reporter ${reporter}: ${error}`,
        'jira',
        error instanceof Error ? (error as any).statusCode : undefined
      );
    }
  }

  async getSprintVelocity(
    assignee: string,
    sprintName?: string,
    projectKey?: string
  ): Promise<number> {
    try {
      let jql = `assignee = "${assignee}" AND status IN (Done, Closed, Resolved)`;
      
      if (projectKey || this.config.projectKey) {
        jql += ` AND project = "${projectKey || this.config.projectKey}"`;
      }

      if (sprintName) {
        jql += ` AND sprint = "${sprintName}"`;
      } else {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const sinceStr = twoWeeksAgo.toISOString().split('T')[0];
        jql += ` AND resolved >= "${sinceStr}"`;
      }

      const response = await this.client.searchJira(jql, {
        maxResults: 100,
        fields: ['customfield_10016'] // story points
      });

      return response.issues.reduce((total: number, issue: JiraIssueRaw) => {
        const storyPoints = issue.fields.customfield_10016 || 0;
        return total + storyPoints;
      }, 0);
    } catch (error) {
      throw new APIError(
        `Failed to calculate sprint velocity for ${assignee}: ${error}`,
        'jira',
        error instanceof Error ? (error as any).statusCode : undefined
      );
    }
  }

  async getProjectUsers(projectKey?: string): Promise<string[]> {
    try {
      const key = projectKey || this.config.projectKey;
      if (!key) {
        throw new ValidationError('Project key is required to fetch users');
      }

      const users = await this.client.searchUsers({query: `project = ${key}`});
      return users.map((user: any) => user.displayName || user.name || 'unknown');
    } catch (error) {
      throw new APIError(
        `Failed to fetch project users: ${error}`,
        'jira',
        error instanceof Error ? (error as any).statusCode : undefined
      );
    }
  }

  private normalizeIssue(raw: JiraIssueRaw): JiraTicket {
    if (!raw.key || !raw.fields?.summary || !raw.fields?.status?.name) {
      throw new ValidationError('Invalid issue data received from Jira API');
    }

    const baseUrl = `https://${this.config.host}`;
    
    return {
      key: raw.key,
      summary: raw.fields.summary,
      status: raw.fields.status.name,
      assignee: raw.fields.assignee?.displayName || 'Unassigned',
      priority: raw.fields.priority?.name || 'Unknown',
      created: new Date(raw.fields.created),
      updated: new Date(raw.fields.updated),
      resolved: raw.fields.resolutiondate ? new Date(raw.fields.resolutiondate) : undefined,
      storyPoints: raw.fields.customfield_10016 || undefined,
      url: `${baseUrl}/browse/${raw.key}`
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.getCurrentUser();
      return true;
    } catch (error) {
      throw new APIError(
        `Jira connection test failed: ${error}`,
        'jira',
        error instanceof Error ? (error as any).statusCode : undefined
      );
    }
  }

  async searchWithJQL(
    jql: string,
    maxResults: number = 50
  ): Promise<JiraTicket[]> {
    try {
      const response = await this.client.searchJira(jql, {
        maxResults,
        fields: [
          'summary',
          'status',
          'assignee',
          'priority',
          'created',
          'updated',
          'resolutiondate',
          'customfield_10016'
        ]
      });

      return response.issues.map((issue: JiraIssueRaw) => this.normalizeIssue(issue));
    } catch (error) {
      throw new APIError(
        `Failed to search with JQL "${jql}": ${error}`,
        'jira',
        error instanceof Error ? (error as any).statusCode : undefined
      );
    }
  }
}

export const createJiraService = (config: JiraConfig): JiraService => {
  return new JiraService(config);
}; 