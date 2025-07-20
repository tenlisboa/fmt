import prompts from "prompts";
import { ConfigManager } from "../lib/config.js";

export const command = "config";
export const describe = "Configure credentials and team settings";
export const builder = (yargs: any) => {
  return yargs
    .option("show", {
      type: "boolean",
      describe: "Show current configuration",
    })
    .option("clear", {
      type: "boolean",
      describe: "Clear all configuration",
    });
};

async function promptGitHubConfig(): Promise<void> {
  console.log("\n🐙 GitHub Configuration");
  console.log(
    "You'll need a Personal Access Token (PAT) with repository access."
  );

  const response = await prompts([
    {
      type: "password",
      name: "githubToken",
      message: "What is your GitHub Personal Access Token (PAT)?",
      validate: (value: string) =>
        value.length > 0 || "GitHub token is required",
    },
  ]);

  if (!response.githubToken) {
    console.log("❌ GitHub configuration cancelled");
    return;
  }

  // Check if GitHub is already configured
  const existingConfig = ConfigManager.getGitHubConfig();
  const repositories = existingConfig?.repositories || [];

  if (repositories.length > 0) {
    console.log("\n📋 Current repositories:");
    repositories.forEach((repo, index) => {
      const defaultMarker = repo.isDefault ? " (default)" : "";
      console.log(
        `  ${index + 1}. ${
          repo.name || `${repo.owner}/${repo.repo}`
        }${defaultMarker}`
      );
    });

    const actionResponse = await prompts({
      type: "select",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { title: "Add a new repository", value: "add" },
        { title: "Remove a repository", value: "remove" },
        { title: "Set default repository", value: "default" },
        { title: "Cancel", value: "cancel" },
      ],
    });

    switch (actionResponse.action) {
      case "add":
        await promptAddRepository(response.githubToken, repositories);
        break;
      case "remove":
        await promptRemoveRepository(repositories);
        break;
      case "default":
        await promptSetDefaultRepository(repositories);
        break;
      case "cancel":
        console.log("❌ Repository management cancelled");
        return;
    }
  } else {
    // First time setup - add initial repository
    await promptAddRepository(response.githubToken, []);
  }

  console.log("✅ GitHub configuration updated successfully!");
}

async function promptAddRepository(
  token: string,
  existingRepositories: any[]
): Promise<void> {
  const response = await prompts([
    {
      type: "text",
      name: "repoName",
      message:
        'What would you like to call this repository? (e.g., "Main App", "API Service")',
      validate: (value: string) =>
        value.length > 0 || "Repository name is required",
    },
    {
      type: "text",
      name: "repoOwner",
      message: "What is the GitHub repository owner/organization?",
      validate: (value: string) =>
        value.length > 0 || "Repository owner is required",
    },
    {
      type: "text",
      name: "repoName",
      message: "What is the GitHub repository name?",
      validate: (value: string) =>
        value.length > 0 || "Repository name is required",
    },
    {
      type: "text",
      name: "repoDescription",
      message: "Repository description (optional):",
      initial: "",
    },
    {
      type: "confirm",
      name: "isDefault",
      message: "Set this as the default repository?",
      initial: existingRepositories.length === 0,
    },
  ]);

  if (!response.repoName || !response.repoOwner || !response.repoName) {
    console.log("❌ Repository configuration cancelled");
    return;
  }

  const repository = {
    name: response.repoName,
    owner: response.repoOwner,
    repo: response.repoName,
    description: response.repoDescription || undefined,
    isDefault: response.isDefault,
  };

  ConfigManager.addRepository(repository);
  console.log(`✅ Repository "${repository.name}" added successfully!`);
}

async function promptRemoveRepository(repositories: any[]): Promise<void> {
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
    console.log("❌ Repository removal cancelled");
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
    ConfigManager.removeRepository(repoToRemove.owner, repoToRemove.repo);
    console.log("✅ Repository removed successfully!");
  } else {
    console.log("❌ Repository removal cancelled");
  }
}

async function promptSetDefaultRepository(repositories: any[]): Promise<void> {
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
    console.log("❌ Default repository selection cancelled");
    return;
  }

  const selectedRepo = repositories[response.repositoryIndex];
  ConfigManager.setDefaultRepository(selectedRepo.owner, selectedRepo.repo);
  console.log(
    `✅ Default repository set to "${
      selectedRepo.name || `${selectedRepo.owner}/${selectedRepo.repo}`
    }"!`
  );
}

async function promptJiraConfig(): Promise<void> {
  console.log("\n🔷 Jira Configuration");
  console.log("You'll need your Jira credentials and host information.");

  const response = await prompts([
    {
      type: "text",
      name: "jiraHost",
      message: "What is your Jira host? (e.g., company.atlassian.net)",
      validate: (value: string) => value.length > 0 || "Jira host is required",
    },
    {
      type: "text",
      name: "jiraUsername",
      message: "What is your Jira username/email?",
      validate: (value: string) =>
        value.length > 0 || "Jira username is required",
    },
    {
      type: "password",
      name: "jiraPassword",
      message: "What is your Jira API token or password?",
      validate: (value: string) =>
        value.length > 0 || "Jira password/token is required",
    },
    {
      type: "text",
      name: "jiraProjectKey",
      message: "What is your Jira project key? (optional, press Enter to skip)",
      initial: "",
    },
  ]);

  if (!response.jiraHost || !response.jiraUsername || !response.jiraPassword) {
    console.log("❌ Jira configuration cancelled");
    return;
  }

  ConfigManager.setJiraConfig({
    host: response.jiraHost,
    username: response.jiraUsername,
    password: response.jiraPassword,
    projectKey: response.jiraProjectKey || undefined,
  });

  console.log("✅ Jira configuration saved successfully!");
}

async function promptOpenAIConfig(): Promise<void> {
  console.log("\n🤖 OpenAI Configuration");
  console.log("You'll need an OpenAI API key for LLM functionality.");

  const response = await prompts([
    {
      type: "password",
      name: "openaiApiKey",
      message: "What is your OpenAI API key?",
      validate: (value: string) =>
        value.length > 0 || "OpenAI API key is required",
    },
    {
      type: "select",
      name: "openaiModel",
      message: "Which OpenAI model would you like to use?",
      choices: [
        {
          title: "GPT-4o Mini (Recommended - Fast & Cost-effective)",
          value: "gpt-4o-mini",
        },
        { title: "GPT-4o (Most Capable)", value: "gpt-4o" },
        { title: "GPT-4 Turbo", value: "gpt-4-turbo" },
        { title: "GPT-3.5 Turbo (Fastest)", value: "gpt-3.5-turbo" },
      ],
      initial: 0,
    },
  ]);

  if (!response.openaiApiKey || !response.openaiModel) {
    console.log("❌ OpenAI configuration cancelled");
    return;
  }

  ConfigManager.setLLMConfig({
    openaiApiKey: response.openaiApiKey,
    model: response.openaiModel,
    temperature: 0.1,
  });

  console.log("✅ OpenAI configuration saved successfully!");
}

export const handler = async (argv: any) => {
  if (argv.show) {
    console.log("📋 Current configuration:");
    const config = ConfigManager.getAllConfig();

    if (ConfigManager.hasGitHubConfig()) {
      console.log("  GitHub:");
      console.log(`    Token: ${"*".repeat(8)}`);
      const repositories = ConfigManager.getRepositories();
      if (repositories.length > 0) {
        console.log(`    Repositories: ${repositories.length}`);
        repositories.forEach((repo, index) => {
          const defaultMarker = repo.isDefault ? " (default)" : "";
          console.log(
            `      ${index + 1}. ${
              repo.name || `${repo.owner}/${repo.repo}`
            }${defaultMarker}`
          );
        });
      } else {
        console.log("    Repositories: None configured");
      }
    } else {
      console.log("  GitHub: Not configured");
    }

    if (ConfigManager.hasJiraConfig()) {
      console.log("  Jira:");
      console.log(`    Host: ${config.jira?.host}`);
      console.log(`    Username: ${config.jira?.username}`);
      console.log(`    Project Key: ${config.jira?.projectKey || "Not set"}`);
      console.log(`    Token: ${"*".repeat(8)}`);
    } else {
      console.log("  Jira: Not configured");
    }

    if (ConfigManager.hasLLMConfig()) {
      console.log("  OpenAI:");
      console.log(`    Model: ${config.llm?.model || "gpt-4o-mini"}`);
      console.log(`    API Key: ${"*".repeat(8)}`);
    } else {
      console.log("  OpenAI: Not configured");
    }

    const teamMembers = ConfigManager.getTeamMembers();
    if (teamMembers && teamMembers.length > 0) {
      console.log("  Team Members:");
      console.log(
        `    Count: ${teamMembers.length} member${
          teamMembers.length === 1 ? "" : "s"
        }`
      );
      console.log(`    Use "fmt setup --show" for details`);
    } else {
      console.log("  Team Members: Not configured");
    }

    console.log(`\nConfig file: ${ConfigManager.getConfigPath()}`);
    return;
  }

  if (argv.clear) {
    const response = await prompts({
      type: "confirm",
      name: "confirmClear",
      message: "Are you sure you want to clear all configuration?",
      initial: false,
    });

    if (response.confirmClear) {
      ConfigManager.clearAllConfig();
      console.log("🗑️  Configuration cleared successfully!");
    } else {
      console.log("❌ Configuration clear cancelled");
    }
    return;
  }

  // Interactive configuration mode
  console.log("🔧 Welcome to FMT Configuration Setup!");
  console.log("Let's configure your services step by step.\n");

  const response = await prompts({
    type: "multiselect",
    name: "services",
    message: "Which services would you like to configure?",
    choices: [
      { title: "GitHub (Repository access)", value: "github" },
      { title: "Jira (Issue tracking)", value: "jira" },
      { title: "OpenAI (LLM functionality)", value: "openai" },
    ],
    min: 1,
  });

  if (!response.services || response.services.length === 0) {
    console.log("❌ No services selected. Configuration cancelled.");
    return;
  }

  for (const service of response.services) {
    try {
      switch (service) {
        case "github":
          await promptGitHubConfig();
          break;
        case "jira":
          await promptJiraConfig();
          break;
        case "openai":
          await promptOpenAIConfig();
          break;
      }
    } catch (error) {
      console.error(`❌ Error configuring ${service}:`, error);
    }
  }

  console.log(
    "\n🎉 Configuration complete! You can now use FMT with your configured services."
  );
  console.log(
    "💡 Tip: Use `fmt config --show` to view your current configuration anytime."
  );
};
