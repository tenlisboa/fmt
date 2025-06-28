import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  queryClassifierNode,
  fetchGithubDataNode,
  fetchJiraDataNode,
  mergeDataNode,
  summarizeDataNode,
  AgentGraph,
  createAgent,
  QueryIntent
} from '../agent/index';

describe('Agent Core Implementation', () => {
  describe('Query Classifier Node', () => {
    it('should extract member name from query', async () => {
      const result = await queryClassifierNode({ query: 'How is Alice doing?' });
      expect(result.memberName).toBe('Alice');
      expect(result.intent).toBe(QueryIntent.MEMBER_PERFORMANCE);
    });

    it('should classify different intents', async () => {
      const teamQuery = await queryClassifierNode({ query: 'How is the team doing?' });
      expect(teamQuery.intent).toBe(QueryIntent.TEAM_SUMMARY);

      const sprintQuery = await queryClassifierNode({ query: 'What is the sprint status?' });
      expect(sprintQuery.intent).toBe(QueryIntent.SPRINT_STATUS);
    });

    it('should handle invalid queries', async () => {
      const result = await queryClassifierNode({ query: '' });
      expect(result.error).toBeTruthy();
    });
  });

  describe('Merge Data Node', () => {
    it('should merge GitHub and Jira data', async () => {
      const input = {
        query: 'test',
        memberName: 'Alice',
        githubData: {
          commits: [{ sha: '123', message: 'test commit', author: 'Alice', date: new Date(), url: '', additions: 5, deletions: 2 }],
          pullRequests: [{ id: 1, title: 'Test PR', url: '', state: 'merged' as const, author: 'Alice', createdAt: new Date(), reviewCount: 1, additions: 5, deletions: 2 }]
        },
        jiraData: {
          issues: [{ key: 'TEST-1', summary: 'Test issue', status: 'Done', assignee: 'Alice', priority: 'Medium', created: new Date(), updated: new Date(), url: '' }],
          sprintVelocity: 10
        }
      };

      const result = await mergeDataNode(input);
      
      expect(result.memberActivity).toBeDefined();
      expect(result.memberActivity?.name).toBe('Alice');
      expect(result.memberActivity?.commits).toHaveLength(1);
      expect(result.memberActivity?.pullRequests).toHaveLength(1);
      expect(result.memberActivity?.issues).toHaveLength(1);
      expect(result.memberActivity?.sprintVelocity).toBe(10);
    });

    it('should handle missing data', async () => {
      const result = await mergeDataNode({ query: 'test' });
      expect(result.error).toBeTruthy();
    });
  });

  describe('Summarize Data Node', () => {
    it('should generate meaningful summary', async () => {
      const memberActivity = {
        name: 'Alice',
        commits: [{ sha: '123', message: 'test', author: 'Alice', date: new Date(), url: '', additions: 5, deletions: 2 }],
        pullRequests: [{ id: 1, title: 'Test PR', url: '', state: 'merged' as const, author: 'Alice', createdAt: new Date(), reviewCount: 1, additions: 5, deletions: 2 }],
        issues: [{ key: 'TEST-1', summary: 'Test issue', status: 'Done', assignee: 'Alice', priority: 'Medium', created: new Date(), updated: new Date(), url: '' }],
        sprintVelocity: 10,
        lastActive: new Date()
      };

      const result = await summarizeDataNode({ query: 'test', memberActivity });
      
      expect(result.summary).toBeDefined();
      expect(result.summary).toContain('Alice');
      expect(result.summary).toContain('1 commits');
      expect(result.summary).toContain('1 pull requests');
      expect(result.summary).toContain('10 story points');
    });
  });

  describe('Agent Graph Execution', () => {
    it('should create agent graph', () => {
      const graph = new AgentGraph();
      expect(graph).toBeDefined();
    });

    it('should create agent', () => {
      const agent = createAgent();
      expect(agent).toBeDefined();
      expect(typeof agent.query).toBe('function');
      expect(typeof agent.queryDetailed).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle node errors gracefully', async () => {
      const result = await queryClassifierNode({ query: '' });
      expect(result.error).toBeTruthy();
    });

    it('should validate required inputs', async () => {
      const result = await fetchGithubDataNode({ query: 'test' });
      expect(result.error).toContain('Member name is required');
    });
  });

  describe('Type System', () => {
    it('should have proper enum values', () => {
      expect(QueryIntent.MEMBER_PERFORMANCE).toBe('member_performance');
      expect(QueryIntent.TEAM_SUMMARY).toBe('team_summary');
      expect(QueryIntent.SPRINT_STATUS).toBe('sprint_status');
      expect(QueryIntent.UNKNOWN).toBe('unknown');
    });
  });
}); 