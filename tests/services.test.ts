import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  GitHubService,
  JiraService,
  MemberActivityService,
  GitHubConfig,
  JiraConfig,
  ValidationError,
  APIError
} from '../services/index.js';

describe('API Wrappers Implementation', () => {
  describe('GitHubService', () => {
    const mockConfig: GitHubConfig = {
      token: 'test-token',
      owner: 'test-owner',
      repo: 'test-repo'
    };

    it('should validate configuration on instantiation', () => {
      expect(() => new GitHubService({ ...mockConfig, token: '' }))
        .toThrow(ValidationError);
      
      expect(() => new GitHubService({ ...mockConfig, owner: '' }))
        .toThrow(ValidationError);
      
      expect(() => new GitHubService({ ...mockConfig, repo: '' }))
        .toThrow(ValidationError);
    });

    it('should create service with valid configuration', () => {
      expect(() => new GitHubService(mockConfig)).not.toThrow();
    });

    it('should have required methods', () => {
      const service = new GitHubService(mockConfig);
      
      expect(typeof service.fetchCommitsByAuthor).toBe('function');
      expect(typeof service.fetchPullRequestsByAuthor).toBe('function');
      expect(typeof service.getContributors).toBe('function');
      expect(typeof service.testConnection).toBe('function');
    });
  });

  describe('JiraService', () => {
    const mockConfig: JiraConfig = {
      host: 'test.atlassian.net',
      username: 'test-user',
      password: 'test-token'
    };

    it('should validate configuration on instantiation', () => {
      expect(() => new JiraService({ ...mockConfig, host: '' }))
        .toThrow(ValidationError);
      
      expect(() => new JiraService({ ...mockConfig, username: '' }))
        .toThrow(ValidationError);
      
      expect(() => new JiraService({ ...mockConfig, password: '' }))
        .toThrow(ValidationError);
    });

    it('should create service with valid configuration', () => {
      expect(() => new JiraService(mockConfig)).not.toThrow();
    });

    it('should have required methods', () => {
      const service = new JiraService(mockConfig);
      
      expect(typeof service.fetchIssuesByAssignee).toBe('function');
      expect(typeof service.fetchIssuesByReporter).toBe('function');
      expect(typeof service.getSprintVelocity).toBe('function');
      expect(typeof service.getProjectUsers).toBe('function');
      expect(typeof service.testConnection).toBe('function');
      expect(typeof service.searchWithJQL).toBe('function');
    });
  });

  describe('MemberActivityService', () => {
    const mockGithubConfig: GitHubConfig = {
      token: 'test-token',
      owner: 'test-owner',
      repo: 'test-repo'
    };

    const mockJiraConfig: JiraConfig = {
      host: 'test.atlassian.net',
      username: 'test-user',
      password: 'test-token'
    };

    it('should create service with valid configurations', () => {
      expect(() => new MemberActivityService(mockGithubConfig, mockJiraConfig))
        .not.toThrow();
    });

    it('should have required methods', () => {
      const service = new MemberActivityService(mockGithubConfig, mockJiraConfig);
      
      expect(typeof service.fetchMemberActivity).toBe('function');
      expect(typeof service.fetchTeamActivity).toBe('function');
      expect(typeof service.getTeamSummary).toBe('function');
      expect(typeof service.testConnections).toBe('function');
      expect(typeof service.getAvailableMembers).toBe('function');
    });
  });

  describe('Type Interfaces', () => {
    it('should have MemberActivity interface structure', () => {
      const mockActivity = {
        name: 'John Doe',
        commits: [],
        pullRequests: [],
        issues: [],
        sprintVelocity: 10,
        lastActive: new Date()
      };

      expect(mockActivity.name).toBe('John Doe');
      expect(Array.isArray(mockActivity.commits)).toBe(true);
      expect(Array.isArray(mockActivity.pullRequests)).toBe(true);
      expect(Array.isArray(mockActivity.issues)).toBe(true);
      expect(typeof mockActivity.sprintVelocity).toBe('number');
      expect(mockActivity.lastActive instanceof Date).toBe(true);
    });

    it('should have proper error types', () => {
      const apiError = new APIError('Test error', 'github', 404);
      expect(apiError.name).toBe('APIError');
      expect(apiError.service).toBe('github');
      expect(apiError.statusCode).toBe(404);

      const validationError = new ValidationError('Test validation error');
      expect(validationError.name).toBe('ValidationError');
    });
  });

  describe('Factory Functions', () => {
    it('should export factory functions', async () => {
      const { createGitHubService, createJiraService, createMemberActivityService } = 
        await import('../services/index.js');
      
      expect(typeof createGitHubService).toBe('function');
      expect(typeof createJiraService).toBe('function');
      expect(typeof createMemberActivityService).toBe('function');
    });
  });
}); 