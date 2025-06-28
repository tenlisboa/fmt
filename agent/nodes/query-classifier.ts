import { AgentInput, AgentOutput, QueryIntent } from '../types';
import { createLLMService } from '../../services/llm';
import { ConfigManager } from '../../lib/config.js';

export const queryClassifierNode = async (input: AgentInput): Promise<AgentOutput> => {
  const { query } = input;
  
  if (!query || typeof query !== 'string') {
    return {
      error: 'Query is required and must be a string'
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
    const result = await llmService.classifyQuery(query);
    
    const intent = mapStringToQueryIntent(result.intent);
    
    return {
      memberName: result.memberName,
      intent
    };
  } catch (error) {
    return {
      error: `Failed to classify query: ${error}`
    };
  }
};

const mapStringToQueryIntent = (intentString: string): QueryIntent => {
  switch (intentString) {
    case 'member_performance':
      return QueryIntent.MEMBER_PERFORMANCE;
    case 'sprint_status':
      return QueryIntent.SPRINT_STATUS;
    case 'team_summary':
      return QueryIntent.TEAM_SUMMARY;
    default:
      return QueryIntent.UNKNOWN;
  }
}; 