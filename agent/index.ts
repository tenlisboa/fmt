import { AgentGraph } from "./graph";

export class Agent {
  private readonly graph = new AgentGraph();

  async query(question: string): Promise<string> {
    const result = await this.graph.execute(question);

    if (!result.success) {
      return `Error: ${result.error}`;
    }

    if (!result.result?.summary) {
      return "No summary could be generated from the available data.";
    }

    return result.result.summary;
  }
}
