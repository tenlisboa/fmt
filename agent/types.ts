import { MemberActivity } from '../services/types';

export interface AgentInput {
  query: string;
  memberName?: string;
  intent?: QueryIntent;
  githubData?: {
    commits: any[];
    pullRequests: any[];
  };
  jiraData?: {
    issues: any[];
    sprintVelocity: number;
  };
  memberActivity?: MemberActivity;
}

export interface AgentOutput {
  memberName?: string;
  intent?: QueryIntent;
  githubData?: {
    commits: any[];
    pullRequests: any[];
  };
  jiraData?: {
    issues: any[];
    sprintVelocity: number;
  };
  memberActivity?: MemberActivity;
  summary?: string;
  error?: string;
}

export type AgentNode = (input: AgentInput) => Promise<AgentOutput>;

export enum QueryIntent {
  MEMBER_PERFORMANCE = 'member_performance',
  SPRINT_STATUS = 'sprint_status',
  TEAM_SUMMARY = 'team_summary',
  UNKNOWN = 'unknown'
}

export interface GraphNode {
  name: string;
  execute: AgentNode;
}

export interface AgentConfig {
  githubConfig: {
    token: string;
    owner: string;
    repo: string;
  };
  jiraConfig: {
    host: string;
    username: string;
    password: string;
    projectKey?: string;
  };
}

export interface GraphExecutionResult {
  success: boolean;
  result?: AgentOutput;
  error?: string;
  executionPath: string[];
} 