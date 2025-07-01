import { Argv } from "yargs";
import chalk from "chalk";
import { createAgent } from "../agent";

export const command = "ask <question>";
export const describe = "Ask the AI agent about a team member or status";
export const builder = (yargs: Argv) => {
  return yargs.positional("question", {
    describe: 'The question to ask (e.g., "How is Alice doing this sprint?")',
    type: "string",
  });
};

export const handler = async (argv: any) => {
  const { question } = argv;

  console.log(chalk.blue(`🤖 Analyzing: "${question}"`));
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
