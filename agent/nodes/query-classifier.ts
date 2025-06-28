import { AgentInput, AgentOutput, QueryIntent } from '../types';

export const queryClassifierNode = async (input: AgentInput): Promise<AgentOutput> => {
  const { query } = input;
  
  if (!query || typeof query !== 'string') {
    return {
      error: 'Query is required and must be a string'
    };
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  const memberName = extractMemberName(normalizedQuery);
  const intent = classifyIntent(normalizedQuery);

  return {
    memberName,
    intent
  };
};

const extractMemberName = (query: string): string | undefined => {
  const namePatterns = [
    /(?:how is|how's)\s+([a-zA-Z]+)(?:\s+doing|performing)?/i,
    /(?:what about|status of|performance of)\s+([a-zA-Z]+)/i,
    /([a-zA-Z]+)(?:'s|\s+is\s+doing|\s+performance)/i,
  ];

  for (const pattern of namePatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    }
  }

  const words = query.split(/\s+/);
  const commonWords = ['how', 'is', 'doing', 'performing', 'this', 'sprint', 'what', 'about', 'status', 'performance'];
  const potentialNames = words.filter(word => 
    word.length > 2 && 
    !commonWords.includes(word.toLowerCase()) &&
    /^[a-zA-Z]+$/.test(word)
  );

  return potentialNames.length > 0 ? 
    potentialNames[0].charAt(0).toUpperCase() + potentialNames[0].slice(1).toLowerCase() : 
    undefined;
};

const classifyIntent = (query: string): QueryIntent => {
  if (query.includes('team') || query.includes('everyone') || query.includes('summary')) {
    return QueryIntent.TEAM_SUMMARY;
  }
  
  if (query.includes('sprint') && !query.includes('how')) {
    return QueryIntent.SPRINT_STATUS;
  }
  
  if (query.includes('how') || query.includes('performing') || query.includes('doing') || query.includes('performance')) {
    return QueryIntent.MEMBER_PERFORMANCE;
  }
  
  return QueryIntent.UNKNOWN;
}; 