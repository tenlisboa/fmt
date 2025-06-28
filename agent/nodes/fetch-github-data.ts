import { AgentInput, AgentOutput } from '../types';
import { createGitHubService } from '../../services';
import { ConfigManager } from '../../lib/config.js';

export const fetchGithubDataNode = async (input: AgentInput): Promise<AgentOutput> => {
  const { memberName } = input;
  
  if (!memberName) {
    return {
      error: 'Member name is required to fetch GitHub data'
    };
  }

  const githubConfig = ConfigManager.getGitHubConfig();
  if (!githubConfig) {
    return {
      error: 'GitHub configuration not found. Please run "fmt config" to set up GitHub credentials.'
    };
  }

  try {
    const githubService = createGitHubService(githubConfig);
    
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [commits, pullRequests] = await Promise.all([
      githubService.fetchCommitsByAuthor(memberName, twoWeeksAgo),
      githubService.fetchPullRequestsByAuthor(memberName)
    ]);

    return {
      memberName,
      githubData: {
        commits,
        pullRequests
      }
    };
  } catch (error) {
    return {
      error: `Failed to fetch GitHub data: ${error}`
    };
  }
}; 