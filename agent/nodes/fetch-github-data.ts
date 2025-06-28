import { AgentInput, AgentOutput } from '../types';
import { createGitHubService } from '../../services';

export const fetchGithubDataNode = async (input: AgentInput): Promise<AgentOutput> => {
  const { memberName } = input;
  
  if (!memberName) {
    return {
      error: 'Member name is required to fetch GitHub data'
    };
  }

  const githubConfig = getGithubConfig();
  if (!githubConfig) {
    return {
      error: 'GitHub configuration not found'
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

const getGithubConfig = () => {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    return null;
  }

  return { token, owner, repo };
}; 