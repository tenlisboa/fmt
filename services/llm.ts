import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { TeamMember } from "../types";

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

  async classifyQuery(
    query: string,
    teamMembers: TeamMember[]
  ): Promise<{
    memberName?: string;
    githubUsername?: string;
    jiraUsername?: string;
    email?: string;
    intent: string;
  }> {
    const systemPrompt = `You are an expert at analyzing queries about software engineering team performance.

Your task is to:
1. Select the team member informations on the context based on the query
2. Classify the intent of the query into one of these categories:
   - member_performance: Questions about how a specific team member is doing/performing
   - team_summary: Questions about overall team performance or summary
   - unknown: Cannot determine intent

Respond ONLY with a JSON object in this exact format:
{
  "memberName": "extracted_name_or_null",
  "githubUsername": "extracted_github_username_or_null",
  "jiraUsername": "extracted_jira_username_or_null",
  "email": "extracted_email_or_null",
  "intent": "one_of_the_three_categories"
}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Team Members: ${JSON.stringify(teamMembers, null, 2)}`),
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

  /**
   * Match GitHub and Jira users using LLM intelligence
   */
  async matchUsers(
    githubMembers: Array<{
      username: string;
      displayName?: string;
      email?: string;
      activityCount?: number;
    }>,
    jiraMembers: Array<{
      username: string;
      displayName?: string;
      email?: string;
      activityCount?: number;
    }>
  ): Promise<
    Array<{
      githubMember: {
        username: string;
        displayName?: string;
        email?: string;
        activityCount?: number;
      };
      jiraMember: {
        username: string;
        displayName?: string;
        email?: string;
        activityCount?: number;
      };
      confidence: "high" | "medium" | "low";
      reason: string;
    }>
  > {
    if (githubMembers.length === 0 || jiraMembers.length === 0) {
      return [];
    }

    const prompt = `You are an expert at matching user accounts across different platforms. Given lists of GitHub and Jira users, identify which accounts likely belong to the same person.

GitHub Users:
${githubMembers
  .map(
    (m, i) =>
      `${i + 1}. Username: ${m.username}, Display Name: ${
        m.displayName || "N/A"
      }, Email: ${m.email || "N/A"}, Activity: ${m.activityCount || 0} commits`
  )
  .join("\n")}

Jira Users:
${jiraMembers
  .map(
    (m, i) =>
      `${i + 1}. Username: ${m.username}, Display Name: ${
        m.displayName || "N/A"
      }, Email: ${m.email || "N/A"}, Activity: ${m.activityCount || 0} issues`
  )
  .join("\n")}

Analyze each potential match and respond with a JSON array of matches. For each match, provide:
- githubIndex: The index of the GitHub user (1-based)
- jiraIndex: The index of the Jira user (1-based)  
- confidence: "high", "medium", or "low"
- reason: Brief explanation of why these accounts likely match

Consider:
- Exact email matches (high confidence)
- Similar display names or usernames
- Common naming patterns (first.last, firstlast, etc.)
- Activity patterns that suggest the same person

Only include matches you're reasonably confident about. If no good matches exist, return an empty array.

Respond with ONLY valid JSON, no other text:`;

    try {
      const messages = [
        new SystemMessage(
          "You are a helpful assistant that matches user accounts across platforms. Always respond with valid JSON only."
        ),
        new HumanMessage(prompt),
      ];

      const response = await this.chatModel.invoke(messages);

      const content = response.content as string;
      if (!content) {
        throw new Error("No response from LLM");
      }

      // Parse the JSON response
      const matches = JSON.parse(content);

      // Convert indices back to actual member objects
      return matches.map((match: any) => ({
        githubMember: githubMembers[match.githubIndex - 1],
        jiraMember: jiraMembers[match.jiraIndex - 1],
        confidence: match.confidence as "high" | "medium" | "low",
        reason: match.reason,
      }));
    } catch (error) {
      console.warn(
        `LLM matching failed, falling back to string matching: ${error}`
      );
      // Fallback to string matching if LLM fails
      return this.fallbackStringMatching(githubMembers, jiraMembers);
    }
  }

  /**
   * Fallback string matching when LLM is unavailable
   */
  private fallbackStringMatching(
    githubMembers: Array<{
      username: string;
      displayName?: string;
      email?: string;
    }>,
    jiraMembers: Array<{
      username: string;
      displayName?: string;
      email?: string;
    }>
  ): Array<{
    githubMember: { username: string; displayName?: string; email?: string };
    jiraMember: { username: string; displayName?: string; email?: string };
    confidence: "high" | "medium" | "low";
    reason: string;
  }> {
    const matches = [];

    for (const githubMember of githubMembers) {
      for (const jiraMember of jiraMembers) {
        // High confidence: Exact email match
        if (
          githubMember.email &&
          jiraMember.email &&
          githubMember.email.toLowerCase() === jiraMember.email.toLowerCase()
        ) {
          matches.push({
            githubMember,
            jiraMember,
            confidence: "high" as const,
            reason: "Exact email match",
          });
          continue;
        }

        // Medium confidence: Display name similarity
        if (githubMember.displayName && jiraMember.displayName) {
          const similarity = this.calculateSimilarity(
            githubMember.displayName,
            jiraMember.displayName
          );
          if (similarity >= 0.8) {
            matches.push({
              githubMember,
              jiraMember,
              confidence: "medium" as const,
              reason: `Display name similarity: ${(similarity * 100).toFixed(
                0
              )}%`,
            });
          }
        }
      }
    }

    return matches;
  }

  /**
   * Simple similarity calculation for fallback
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;

    // Simple character overlap
    const chars1 = new Set(s1.split(""));
    const chars2 = new Set(s2.split(""));
    const intersection = new Set([...chars1].filter((x) => chars2.has(x)));
    const union = new Set([...chars1, ...chars2]);

    return intersection.size / union.size;
  }

  async extractRepositoryFromQuestion(
    question: string,
    repositories: any[]
  ): Promise<string> {
    const systemPrompt = `
You are analyzing a question about team performance. The user has the following repositories configured:

${repositories
  .map(
    (repo, i) =>
      `${i + 1}. ${repo.name || `${repo.owner}/${repo.repo}`}${
        repo.description ? ` - ${repo.description}` : ""
      }`
  )
  .join("\n")}

Question: "${question}"

Does this question specifically mention or refer to any of these repositories? If yes, respond with just the repository name. If no, respond with "none".

Repository:`;

    const messages = [new HumanMessage(systemPrompt)];

    const response = await this.chatModel.invoke(messages);
    return response.content as string;
  }
}

export const createLLMService = (config: LLMConfig): LLMService => {
  return new LLMService(config);
};
