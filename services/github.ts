import { Octokit } from '@octokit/rest';
import {
  GitHubConfig,
  Commit,
  PullRequest,
  GitHubCommitRaw,
  GitHubPullRequestRaw,
  APIError,
  ValidationError
} from './types.js';

export class GitHubService {
  private octokit: Octokit;
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.validateConfig(config);
    this.config = config;
    this.octokit = new Octokit({
      auth: config.token,
    });
  }

  private validateConfig(config: GitHubConfig): void {
    if (!config.token || typeof config.token !== 'string') {
      throw new ValidationError('GitHub token is required and must be a string');
    }
    if (!config.owner || typeof config.owner !== 'string') {
      throw new ValidationError('GitHub owner is required and must be a string');
    }
    if (!config.repo || typeof config.repo !== 'string') {
      throw new ValidationError('GitHub repo is required and must be a string');
    }
  }

  async fetchCommitsByAuthor(
    author: string,
    since?: Date,
    until?: Date
  ): Promise<Commit[]> {
    try {
      const params: any = {
        owner: this.config.owner,
        repo: this.config.repo,
        author,
        per_page: 100
      };

      if (since) {
        params.since = since.toISOString();
      }
      if (until) {
        params.until = until.toISOString();
      }

      const response = await this.octokit.rest.repos.listCommits(params);
      
      return response.data.map(commit => this.normalizeCommit(commit as GitHubCommitRaw));
    } catch (error) {
      throw new APIError(
        `Failed to fetch commits for author ${author}: ${error}`,
        'github',
        error instanceof Error ? (error as any).status : undefined
      );
    }
  }

  async fetchPullRequestsByAuthor(
    author: string,
    state: 'open' | 'closed' | 'all' = 'all'
  ): Promise<PullRequest[]> {
    try {
      const response = await this.octokit.rest.pulls.list({
        owner: this.config.owner,
        repo: this.config.repo,
        state,
        per_page: 100
      });

      return response.data
        .filter(pr => pr.user?.login === author)
        .map(pr => this.normalizePullRequest(pr as GitHubPullRequestRaw));
    } catch (error) {
      throw new APIError(
        `Failed to fetch pull requests for author ${author}: ${error}`,
        'github',
        error instanceof Error ? (error as any).status : undefined
      );
    }
  }

  async getContributors(): Promise<string[]> {
    try {
      const response = await this.octokit.rest.repos.listContributors({
        owner: this.config.owner,
        repo: this.config.repo,
        per_page: 100
      });

      return response.data.map(contributor => contributor.login || 'unknown');
    } catch (error) {
      throw new APIError(
        `Failed to fetch contributors: ${error}`,
        'github',
        error instanceof Error ? (error as any).status : undefined
      );
    }
  }

  private normalizeCommit(raw: GitHubCommitRaw): Commit {
    if (!raw.sha || !raw.commit?.message || !raw.commit?.author?.name) {
      throw new ValidationError('Invalid commit data received from GitHub API');
    }

    return {
      sha: raw.sha,
      message: raw.commit.message,
      author: raw.commit.author.name,
      date: new Date(raw.commit.author.date),
      url: raw.html_url,
      additions: raw.stats?.additions || 0,
      deletions: raw.stats?.deletions || 0  
    };
  }

  private normalizePullRequest(raw: GitHubPullRequestRaw): PullRequest {
    if (!raw.id || !raw.title || !raw.html_url || !raw.user?.login) {
      throw new ValidationError('Invalid pull request data received from GitHub API');
    }

    let state: 'open' | 'closed' | 'merged' = 'open';
    if (raw.state === 'closed') {
      state = raw.merged_at ? 'merged' : 'closed';
    }

    return {
      id: raw.id,
      title: raw.title,
      url: raw.html_url,
      state,
      author: raw.user.login,
      createdAt: new Date(raw.created_at),
      mergedAt: raw.merged_at ? new Date(raw.merged_at) : undefined,
      reviewCount: raw.reviews?.length || 0,
      additions: raw.additions || 0,
      deletions: raw.deletions || 0
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({
        owner: this.config.owner,
        repo: this.config.repo
      });
      return true;
    } catch (error) {
      throw new APIError(
        `GitHub connection test failed: ${error}`,
        'github',
        error instanceof Error ? (error as any).status : undefined
      );
    }
  }
}

export const createGitHubService = (config: GitHubConfig): GitHubService => {
  return new GitHubService(config);
}; 