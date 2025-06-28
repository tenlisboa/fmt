import { AgentInput, AgentOutput, QueryIntent } from '../types';
import { createLLMService } from '../../services/llm';
import { ConfigManager } from '../../lib/config.js';

export const summarizeDataNode = async (input: AgentInput): Promise<AgentOutput> => {
  const { memberActivity, intent } = input;
  
  if (!memberActivity) {
    return {
      error: 'Member activity data is required for summarization'
    };
  }

  const llmConfig = ConfigManager.getLLMConfig();
  if (!llmConfig) {
    return {
      error: 'LLM configuration not found. Please run "fmt config" to set up OpenAI credentials.'
    };
  }

  try {
    const llmService = createLLMService(llmConfig);
    const intentString = intent ? getIntentString(intent) : undefined;
    const summary = await llmService.summarizeActivity(memberActivity, intentString);

    return {
      memberName: memberActivity.name,
      memberActivity,
      summary
    };
  } catch (error) {
    return {
      error: `Failed to generate summary: ${error}`
    };
  }
};

const getIntentString = (intent: QueryIntent): string => {
  switch (intent) {
    case QueryIntent.MEMBER_PERFORMANCE:
      return 'member_performance';
    case QueryIntent.SPRINT_STATUS:
      return 'sprint_status';
    case QueryIntent.TEAM_SUMMARY:
      return 'team_summary';
    default:
      return 'unknown';
  }
}; 