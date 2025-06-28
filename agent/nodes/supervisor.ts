import { QueryIntent } from '../types.js';
import { createLLMService } from '../../services/llm.js';
import { ConfigManager } from '../../lib/config.js';
import { AgentState } from '../state.js';

export const supervisorNode = async (state: typeof AgentState.State): Promise<Partial<typeof AgentState.State>> => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  
  if (!lastMessage || typeof lastMessage.content !== 'string') {
    throw new Error('Query is required and must be a string');
  }

  const llmConfig = ConfigManager.getLLMConfig();
  if (!llmConfig) {
    throw new Error('LLM configuration not found. Please run "fmt config" to set up OpenAI credentials.');
  }

  try {
    const llmService = createLLMService(llmConfig);
    const result = await llmService.classifyQuery(lastMessage.content);
    
    const intent = mapStringToQueryIntent(result.intent);
    
    return {
      memberName: result.memberName,
      memberGithubUsername: result.githubUsername,
      memberJiraUsername: result.email,
      intent
    };
  } catch (error) {
    throw new Error(`Failed to classify query: ${error}`);
  }
};

const mapStringToQueryIntent = (intentString: string): QueryIntent => {
  switch (intentString) {
    case 'member_performance':
      return QueryIntent.MEMBER_PERFORMANCE;
    case 'team_summary':
      return QueryIntent.TEAM_SUMMARY;
    default:
      return QueryIntent.UNKNOWN;
  }
}; 