import { GraphExecutionResult, QueryIntent } from "./types";
import { supervisorNode } from "./nodes/supervisor";
import { START, StateGraph } from "@langchain/langgraph";
import { AgentState } from "./state";
import { memberPerformanceNode } from "./nodes/member-performance";
import { HumanMessage } from "@langchain/core/messages";
import { teamAnalyzerNode } from "./nodes/team-analyzer";

export class AgentGraph {
  async execute(query: string): Promise<GraphExecutionResult> {
    try {
      const workflow = new StateGraph(AgentState)
        .addNode("supervisor", supervisorNode)
        .addNode(QueryIntent.MEMBER_PERFORMANCE, memberPerformanceNode)
        .addNode(QueryIntent.TEAM_SUMMARY, teamAnalyzerNode);

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
      };
    } catch (error) {
      return {
        success: false,
        error: `Graph execution failed: ${error}`,
      };
    }
  }
}
