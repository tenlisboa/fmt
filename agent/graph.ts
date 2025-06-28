import { AgentInput, AgentOutput, GraphExecutionResult, QueryIntent } from './types';
import { queryClassifierNode } from './nodes/query-classifier';
import { fetchGithubDataNode } from './nodes/fetch-github-data';
import { fetchJiraDataNode } from './nodes/fetch-jira-data';
import { mergeDataNode } from './nodes/merge-data';
import { summarizeDataNode } from './nodes/summarize-data';
import { teamAnalyzerNode } from './nodes/team-analyzer';

export class AgentGraph {
  private executionPath: string[] = [];

  async execute(query: string): Promise<GraphExecutionResult> {
    this.executionPath = [];
    
    try {
      let currentInput: AgentInput = { query };
      
      const classifyResult = await this.executeNode('query_classifier', queryClassifierNode, currentInput);
      if (classifyResult.error) {
        return this.createErrorResult(classifyResult.error);
      }
      
      currentInput = { ...currentInput, ...classifyResult };

      if (currentInput.intent === QueryIntent.TEAM_SUMMARY) {
        const teamResult = await this.executeNode('team_analyzer', teamAnalyzerNode, currentInput);
        if (teamResult.error) {
          return this.createErrorResult(teamResult.error);
        }
        
        return {
          success: true,
          result: teamResult,
          executionPath: this.executionPath
        };
      }
      
      if (!currentInput.memberName) {
        return this.createErrorResult('Could not identify member name from query');
      }

      const [githubResult, jiraResult] = await Promise.all([
        this.executeNode('fetch_github_data', fetchGithubDataNode, currentInput),
        {error: null} // TODO: Add Jira data fetching
      ]);

      currentInput = { ...currentInput, ...githubResult, ...jiraResult };

      if (githubResult.error && jiraResult.error) {
        return this.createErrorResult('Failed to fetch data from both GitHub and Jira');
      }

      const mergeResult = await this.executeNode('merge_data', mergeDataNode, currentInput);
      if (mergeResult.error) {
        return this.createErrorResult(mergeResult.error);
      }
      
      currentInput = { ...currentInput, ...mergeResult };

      const summaryResult = await this.executeNode('summarize_data', summarizeDataNode, currentInput);
      if (summaryResult.error) {
        return this.createErrorResult(summaryResult.error);
      }

      return {
        success: true,
        result: summaryResult,
        executionPath: this.executionPath
      };
    } catch (error) {
      return this.createErrorResult(`Graph execution failed: ${error}`);
    }
  }

  private async executeNode(
    nodeName: string, 
    nodeFunction: (input: AgentInput) => Promise<AgentOutput>, 
    input: AgentInput
  ): Promise<AgentOutput> {
    this.executionPath.push(nodeName);
    return await nodeFunction(input);
  }

  private createErrorResult(error: string): GraphExecutionResult {
    return {
      success: false,
      error,
      executionPath: this.executionPath
    };
  }
}

export const createAgentGraph = (): AgentGraph => {
  return new AgentGraph();
}; 