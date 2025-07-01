export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: Date;
  url: string;
  additions: number;
  deletions: number;
}

export interface PullRequest {
  id: number;
  title: string;
  url: string;
  state: "open" | "closed" | "merged";
  author: string;
  createdAt: Date;
  mergedAt?: Date;
  reviewCount: number;
  additions: number;
  deletions: number;
}

export interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  assignee: string;
  priority: string;
  created: Date;
  updated: Date;
  resolved?: Date;
  storyPoints?: number;
  url: string;
}

export interface MemberActivity {
  commits: Commit[];
  pullRequests: PullRequest[];
  issues: JiraTicket[];
  lastActive: Date;
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export interface JiraConfig {
  host: string;
  username: string;
  password: string;
  projectKey?: string;
}

export class APIError extends Error {
  constructor(
    message: string,
    public service: "github" | "jira",
    public statusCode?: number
  ) {
    super(message);
    this.name = "APIError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export interface GitHubCommitRaw {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
  stats?: {
    additions: number;
    deletions: number;
  };
}

export interface GitHubPullRequestRaw {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  user: {
    login: string;
  };
  created_at: string;
  merged_at?: string;
  additions?: number;
  deletions?: number;
  reviews?: any[];
}

export interface JiraIssueRaw {
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
    assignee?: {
      displayName: string;
    };
    priority: {
      name: string;
    };
    created: string;
    updated: string;
    resolutiondate?: string;
    customfield_10016?: number;
  };
}
