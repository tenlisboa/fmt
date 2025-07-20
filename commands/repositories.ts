import { Argv } from "yargs";
import chalk from "chalk";
import prompts from "prompts";
import { ConfigManager } from "../lib/config.js";
import { RepositoryConfig } from "../services/types.js";

export const command = "repositories";
export const describe = "Manage GitHub repositories";
export const builder = (yargs: Argv) => {
  return yargs
    .option("list", {
      type: "boolean",
      describe: "List all configured repositories",
      alias: "l",
    })
    .option("add", {
      type: "boolean",
      describe: "Add a new repository",
      alias: "a",
    })
    .option("remove", {
      type: "boolean",
      describe: "Remove a repository",
      alias: "r",
    })
    .option("default", {
      type: "boolean",
      describe: "Set default repository",
      alias: "d",
    });
};

export const handler = async (argv: any) => {
  const { list, add, remove, default: setDefault } = argv;

  // Check if GitHub is configured
  if (!ConfigManager.hasGitHubConfig()) {
    console.log(
      chalk.red("❌ GitHub is not configured. Please run 'fmt config' first.")
    );
    process.exit(1);
  }

  const repositories = ConfigManager.getRepositories();

  if (list || (!list && !add && !remove && !setDefault)) {
    await listRepositories(repositories);
  } else if (add) {
    await addRepository();
  } else if (remove) {
    await removeRepository(repositories);
  } else if (setDefault) {
    await setDefaultRepository(repositories);
  }
};

async function listRepositories(
  repositories: RepositoryConfig[]
): Promise<void> {
  console.log(chalk.blue("📋 Configured Repositories:"));

  if (repositories.length === 0) {
    console.log(chalk.yellow("  No repositories configured"));
    console.log(
      chalk.gray("  Use 'fmt repositories --add' to add your first repository")
    );
    return;
  }

  repositories.forEach((repo, index) => {
    const defaultMarker = repo.isDefault ? chalk.green(" (default)") : "";
    const name = repo.name || `${repo.owner}/${repo.repo}`;
    const description = repo.description
      ? chalk.gray(` - ${repo.description}`)
      : "";

    console.log(
      `  ${index + 1}. ${chalk.cyan(name)}${defaultMarker}${description}`
    );
    console.log(`     ${chalk.gray(`${repo.owner}/${repo.repo}`)}`);
  });

  console.log(
    chalk.gray(
      `\nTotal: ${repositories.length} repository${
        repositories.length === 1 ? "" : "ies"
      }`
    )
  );
}

async function addRepository(): Promise<void> {
  console.log(chalk.blue("➕ Add New Repository"));

  const response = await prompts([
    {
      type: "text",
      name: "name",
      message:
        "What would you like to call this repository? (e.g., 'Main App', 'API Service')",
      validate: (value: string) =>
        value.length > 0 || "Repository name is required",
    },
    {
      type: "text",
      name: "owner",
      message: "What is the GitHub repository owner/organization?",
      validate: (value: string) =>
        value.length > 0 || "Repository owner is required",
    },
    {
      type: "text",
      name: "repo",
      message: "What is the GitHub repository name?",
      validate: (value: string) =>
        value.length > 0 || "Repository name is required",
    },
    {
      type: "text",
      name: "description",
      message: "Repository description (optional):",
      initial: "",
    },
    {
      type: "confirm",
      name: "isDefault",
      message: "Set this as the default repository?",
      initial: ConfigManager.getRepositories().length === 0,
    },
  ]);

  if (!response.name || !response.owner || !response.repo) {
    console.log(chalk.yellow("❌ Repository configuration cancelled"));
    return;
  }

  const repository: RepositoryConfig = {
    name: response.name,
    owner: response.owner,
    repo: response.repo,
    description: response.description || undefined,
    isDefault: response.isDefault,
  };

  try {
    ConfigManager.addRepository(repository);
    console.log(
      chalk.green(`✅ Repository "${repository.name}" added successfully!`)
    );
  } catch (error) {
    console.log(chalk.red(`❌ Failed to add repository: ${error}`));
  }
}

async function removeRepository(
  repositories: RepositoryConfig[]
): Promise<void> {
  if (repositories.length === 0) {
    console.log(chalk.yellow("❌ No repositories to remove"));
    return;
  }

  console.log(chalk.blue("🗑️  Remove Repository"));

  const choices = repositories.map((repo, index) => ({
    title: `${repo.name || `${repo.owner}/${repo.repo}`}${
      repo.isDefault ? " (default)" : ""
    }`,
    value: index,
  }));

  const response = await prompts({
    type: "select",
    name: "repositoryIndex",
    message: "Which repository would you like to remove?",
    choices,
  });

  if (response.repositoryIndex === undefined) {
    console.log(chalk.yellow("❌ Repository removal cancelled"));
    return;
  }

  const repoToRemove = repositories[response.repositoryIndex];
  const confirmResponse = await prompts({
    type: "confirm",
    name: "confirm",
    message: `Are you sure you want to remove "${
      repoToRemove.name || `${repoToRemove.owner}/${repoToRemove.repo}`
    }"?`,
    initial: false,
  });

  if (confirmResponse.confirm) {
    try {
      ConfigManager.removeRepository(repoToRemove.owner, repoToRemove.repo);
      console.log(chalk.green("✅ Repository removed successfully!"));
    } catch (error) {
      console.log(chalk.red(`❌ Failed to remove repository: ${error}`));
    }
  } else {
    console.log(chalk.yellow("❌ Repository removal cancelled"));
  }
}

async function setDefaultRepository(
  repositories: RepositoryConfig[]
): Promise<void> {
  if (repositories.length === 0) {
    console.log(chalk.yellow("❌ No repositories configured"));
    return;
  }

  console.log(chalk.blue("⭐ Set Default Repository"));

  const choices = repositories.map((repo, index) => ({
    title: `${repo.name || `${repo.owner}/${repo.repo}`}${
      repo.isDefault ? " (current default)" : ""
    }`,
    value: index,
  }));

  const response = await prompts({
    type: "select",
    name: "repositoryIndex",
    message: "Which repository should be the default?",
    choices,
  });

  if (response.repositoryIndex === undefined) {
    console.log(chalk.yellow("❌ Default repository selection cancelled"));
    return;
  }

  const selectedRepo = repositories[response.repositoryIndex];
  try {
    ConfigManager.setDefaultRepository(selectedRepo.owner, selectedRepo.repo);
    console.log(
      chalk.green(
        `✅ Default repository set to "${
          selectedRepo.name || `${selectedRepo.owner}/${selectedRepo.repo}`
        }"!`
      )
    );
  } catch (error) {
    console.log(chalk.red(`❌ Failed to set default repository: ${error}`));
  }
}
