import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export interface LLMConfig {
  openaiApiKey: string;
  model?: string;
  temperature?: number;
}

export class LLMService {
  private chatModel: BaseChatModel;

  constructor(config: LLMConfig) {
    this.chatModel = new ChatOpenAI({
      apiKey: config.openaiApiKey,
      model: config.model || "gpt-4o-mini",
      temperature: config.temperature || 0.1,
    });
  }

  async classifyQuery(query: string): Promise<{
    memberName?: string;
    githubUsername?: string;
    jiraUsername?: string;
    email?: string;
    intent: string;
  }> {
    const systemPrompt = `You are an expert at analyzing queries about software engineering team performance.

Your task is to:
1. Extract any team member names mentioned in the query
2. Extract the team github and jira usernames mentioned in the query
3. Extract the team member email mentioned in the query
4. Classify the intent of the query into one of these categories:
   - member_performance: Questions about how a specific team member is doing/performing
   - team_summary: Questions about overall team performance or summary
   - unknown: Cannot determine intent

Respond ONLY with a JSON object in this exact format:
{
  "memberName": "extracted_name_or_null",
  "githubUsername": "extracted_github_username_or_null",
  "jiraUsername": "extracted_jira_username_or_null",
  "email": "extracted_email_or_null",
  "intent": "one_of_the_four_categories"
}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Query: "${query}"`),
    ];

    const response = await this.chatModel.invoke(messages);
    const result = JSON.parse(response.content as string);

    return {
      memberName: result.memberName || undefined,
      githubUsername: result.githubUsername || undefined,
      jiraUsername: result.jiraUsername || undefined,
      email: result.email || undefined,
      intent: result.intent,
    };
  }

  async summarizeActivity(
    memberActivity: any,
    intent?: string
  ): Promise<string> {
    const systemPrompt = `You are an expert engineering manager AI assistant that provides insightful summaries of team member activity.

Generate a comprehensive but concise summary of the team member's recent activity based on the provided data.
Focus on key metrics, trends, and actionable insights that would be valuable for an engineering leader.

Guidelines:
- Be specific with numbers and timeframes
- Highlight both achievements and areas that might need attention
- Use professional, positive language
- Keep the summary focused and actionable
- Consider the query intent: ${intent || "general performance review"}`;

    const humanPrompt = `Team Member Activity Data:
${JSON.stringify(memberActivity, null, 2)}

Please provide a professional summary of this team member's recent activity and performance.`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(humanPrompt),
    ];

    const response = await this.chatModel.invoke(messages);
    return response.content as string;
  }

  async analyzeTeamData(teamData: any[], intent?: string): Promise<string> {
    const systemPrompt = `You are an expert engineering manager AI assistant that provides insightful team analysis.

Analyze the provided team data and generate a comprehensive summary that includes:
- Overall team performance trends
- Individual contributor highlights
- Areas of concern or improvement opportunities
- Actionable recommendations for the engineering leader

Guidelines:
- Use data-driven insights
- Be specific with metrics and timeframes
- Provide balanced analysis (strengths and improvement areas)
- Keep recommendations practical and actionable`;

    const humanPrompt = `Team Activity Data:
${JSON.stringify(teamData, null, 2)}

Query Intent: ${intent || "team summary"}

Please provide a comprehensive team analysis based on this data.`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(humanPrompt),
    ];

    const response = await this.chatModel.invoke(messages);
    return response.content as string;
  }
}

export const createLLMService = (config: LLMConfig): LLMService => {
  return new LLMService(config);
};
