import { createGitHubService, MemberActivity } from "../../services";
import { validateAndCreateServices } from "../../lib/utils.js";
import { AgentState } from "../state.js";

export const teamAnalyzerNode = async (
  state: typeof AgentState.State
): Promise<Partial<typeof AgentState.State>> => {
  const { llmService, githubConfig, jiraConfig } = validateAndCreateServices();

  try {
    const teamData = await gatherTeamData(githubConfig, jiraConfig);
    const summary = await llmService.analyzeTeamData(teamData, "team_summary");

    return {
      summary,
    };
  } catch (error) {
    throw new Error(`Failed to analyze team data: ${error}`);
  }
};

const gatherTeamData = async (githubConfig: any, jiraConfig: any) => {
  const teamData: MemberActivity[] = [];

  if (githubConfig && githubConfig.repositories.length > 0) {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Get contributors from all repositories
    const allContributors = new Set<string>();

    for (const repository of githubConfig.repositories) {
      const githubService = createGitHubService(githubConfig.token, repository);
      try {
        const contributors = await githubService.getContributors();
        contributors.forEach((contributor) => allContributors.add(contributor));
      } catch (error) {
        console.warn(
          `Failed to get contributors from ${repository.owner}/${repository.repo}: ${error}`
        );
      }
    }

    // Gather data for each contributor across all repositories
    for (const contributorName of allContributors) {
      let allCommits: any[] = [];
      let allPullRequests: any[] = [];

      for (const repository of githubConfig.repositories) {
        const githubService = createGitHubService(
          githubConfig.token,
          repository
        );
        try {
          const [commits, pullRequests] = await Promise.all([
            githubService.fetchCommitsByAuthor(contributorName, twoWeeksAgo),
            githubService.fetchPullRequestsByAuthor(contributorName),
          ]);
          allCommits.push(...commits);
          allPullRequests.push(...pullRequests);
        } catch (error) {
          console.warn(
            `Failed to get data for ${contributorName} from ${repository.owner}/${repository.repo}: ${error}`
          );
        }
      }

      const lastActiveDate = calculateLastActiveDate(
        allCommits,
        allPullRequests,
        []
      );

      teamData.push({
        commits: allCommits,
        pullRequests: allPullRequests,
        issues: [],
        lastActive: lastActiveDate,
      });
    }
  }

  return teamData;
};

const calculateLastActiveDate = (
  commits: any[],
  pullRequests: any[],
  issues: any[]
): Date => {
  const dates: Date[] = [];

  commits.forEach((commit) => dates.push(commit.date));
  pullRequests.forEach((pr) => {
    dates.push(pr.createdAt);
    if (pr.mergedAt) dates.push(pr.mergedAt);
  });
  issues.forEach((issue) => {
    dates.push(issue.created);
    dates.push(issue.updated);
    if (issue.resolved) dates.push(issue.resolved);
  });

  return dates.length > 0
    ? new Date(Math.max(...dates.map((d) => d.getTime())))
    : new Date();
};
