import { AgentState } from "./state";

export enum QueryIntent {
  MEMBER_PERFORMANCE = 'member_performance',
  TEAM_SUMMARY = 'team_summary',
  UNKNOWN = 'unknown'
}

export interface GraphExecutionResult {
  success: boolean;
  result?: typeof AgentState.State;
  error?: string;
  executionPath: string[];
} 