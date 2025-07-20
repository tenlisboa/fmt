import { GraphExecutionResult } from "./types";
import { supervisorNode } from "./nodes/supervisor";
import { START, StateGraph } from "@langchain/langgraph";
import { AgentState } from "./state";
import { memberPerformanceNode } from "./nodes/member-performance";
import { HumanMessage } from "@langchain/core/messages";
import { teamAnalyzerNode } from "./nodes/team-analyzer";

export class AgentGraph {
  private executionPath: string[] = [];

  async execute(query: string): Promise<GraphExecutionResult> {
    this.executionPath = [];

    try {
      const workflow = new StateGraph(AgentState)
        .addNode("supervisor", supervisorNode)
        .addNode("member_performance", memberPerformanceNode)
        .addNode("team_analyzer", teamAnalyzerNode);

      workflow
        .addEdge(START, "supervisor")
        .addConditionalEdges(
          "supervisor",
          (s: typeof AgentState.State) => s.intent
        );

      const app = workflow.compile();
      const result = await app.invoke({
        messages: [new HumanMessage(query)],
      });

      if (result.error) {
        throw new Error(result.error);
      }

      return {
        success: true,
        result: result,
        executionPath: this.executionPath,
      };
    } catch (error) {
      return {
        success: false,
        error: `Graph execution failed: ${error}`,
        executionPath: this.executionPath,
      };
    }
  }
}

export const createAgentGraph = (): AgentGraph => {
  return new AgentGraph();
};
