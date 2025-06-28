import { createAgentGraph } from './graph';
import { GraphExecutionResult } from './types';

export class Agent {
  private graph = createAgentGraph();

  async query(question: string): Promise<string> {
    const result = await this.graph.execute(question);
    
    if (!result.success) {
      return `Error: ${result.error}`;
    }

    if (!result.result?.summary) {
      return 'No summary could be generated from the available data.';
    }

    return result.result.summary;
  }

  async queryDetailed(question: string): Promise<GraphExecutionResult> {
    return await this.graph.execute(question);
  }
}

export const createAgent = (): Agent => {
  return new Agent();
};

export * from './types';
export * from './graph';
export { queryClassifierNode } from './nodes/query-classifier';
export { fetchGithubDataNode } from './nodes/fetch-github-data';
export { fetchJiraDataNode } from './nodes/fetch-jira-data';
export { mergeDataNode } from './nodes/merge-data';
export { summarizeDataNode } from './nodes/summarize-data'; 