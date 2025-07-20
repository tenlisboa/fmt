import { Argv } from "yargs";
import chalk from "chalk";
import { createAgent } from "../agent";
import { ConfigManager } from "../lib/config.js";

export const command = "ask <question>";
export const describe = "Ask the AI agent about a team member or status";
export const builder = (yargs: Argv) => {
  return yargs.positional("question", {
    describe:
      'The question to ask (e.g., "How is Alice doing this sprint?" or "How is the team performing in the API service?")',
    type: "string",
  });
};

export const handler = async (argv: any) => {
  const { question } = argv;

  // Check if GitHub is configured
  if (!ConfigManager.hasGitHubConfig()) {
    console.log(
      chalk.red("❌ GitHub is not configured. Please run 'fmt config' first.")
    );
    process.exit(1);
  }

  const repositories = ConfigManager.getRepositories();
  if (repositories.length === 0) {
    console.log(
      chalk.red(
        "❌ No repositories configured. Please run 'fmt repositories --add' to add repositories."
      )
    );
    process.exit(1);
  }

  console.log(chalk.blue(`🤖 Analyzing: "${question}"`));

  // Show which repositories will be analyzed
  if (repositories.length === 1) {
    const repo = repositories[0];
    console.log(
      chalk.gray(`📁 Repository: ${repo.name || `${repo.owner}/${repo.repo}`}`)
    );
  } else {
    console.log(
      chalk.gray(
        `📁 Repositories: ${repositories.length} configured (will analyze all or specific ones based on your question)`
      )
    );
  }

  console.log(chalk.gray("Fetching data from GitHub and Jira..."));

  try {
    const agent = createAgent();
    const response = await agent.query(question);

    console.log("\n" + chalk.green("📊 Analysis Complete:"));
    console.log(chalk.white(response));
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error}`));
    process.exit(1);
  }
};
