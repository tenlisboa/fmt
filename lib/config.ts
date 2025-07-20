import Conf from "conf";
import {
  GitHubConfig,
  JiraConfig,
  RepositoryConfig,
} from "../services/types.js";
import { LLMConfig } from "../services/llm.js";
import { TeamMember } from "../types.js";

interface AppConfig {
  github?: GitHubConfig;
  jira?: JiraConfig;
  llm?: LLMConfig;
  teamMembers?: TeamMember[];
}

const config = new Conf({
  projectName: "fmt",
});

export class ConfigManager {
  static setGitHubConfig(githubConfig: GitHubConfig): void {
    config.set("github", githubConfig);
  }

  static getGitHubConfig(): GitHubConfig | null {
    const githubConfig = config.get("github") as any;
    if (!githubConfig) {
      return null;
    }

    // Migrate old format to new format if needed
    if (githubConfig.owner && githubConfig.repo && !githubConfig.repositories) {
      const migratedConfig: GitHubConfig = {
        token: githubConfig.token,
        repositories: [
          {
            name: `${githubConfig.owner}/${githubConfig.repo}`,
            owner: githubConfig.owner,
            repo: githubConfig.repo,
            isDefault: true,
          },
        ],
      };

      // Save the migrated config
      this.setGitHubConfig(migratedConfig);
      return migratedConfig;
    }

    return githubConfig as GitHubConfig;
  }

  static setJiraConfig(jiraConfig: JiraConfig): void {
    config.set("jira", jiraConfig);
  }

  static getJiraConfig(): JiraConfig | null {
    const jiraConfig = config.get("jira") as JiraConfig | undefined;
    return jiraConfig || null;
  }

  static hasGitHubConfig(): boolean {
    return config.has("github");
  }

  static hasJiraConfig(): boolean {
    return config.has("jira");
  }

  static setLLMConfig(llmConfig: LLMConfig): void {
    config.set("llm", llmConfig);
  }

  static getLLMConfig(): LLMConfig | null {
    const llmConfig = config.get("llm") as LLMConfig | undefined;
    return llmConfig || null;
  }

  static hasLLMConfig(): boolean {
    return config.has("llm");
  }

  static setTeamMembers(teamMembers: TeamMember[]): void {
    config.set("teamMembers", teamMembers);
  }

  static getTeamMembers(): TeamMember[] | null {
    const teamMembers = config.get("teamMembers") as TeamMember[] | undefined;
    return teamMembers || null;
  }

  static clearAllConfig(): void {
    config.clear();
  }

  static getConfigPath(): string {
    return config.path;
  }

  static getAllConfig(): AppConfig {
    return config.store;
  }

  static addRepository(repository: RepositoryConfig): void {
    const githubConfig = this.getGitHubConfig();
    if (!githubConfig) {
      throw new Error(
        "GitHub configuration not found. Please configure GitHub first."
      );
    }

    // Initialize repositories array if it doesn't exist
    if (!githubConfig.repositories) {
      githubConfig.repositories = [];
    }

    // If this is the first repository, make it default
    if (githubConfig.repositories.length === 0) {
      repository.isDefault = true;
    }

    // If this repository is set as default, unset others
    if (repository.isDefault) {
      githubConfig.repositories.forEach((repo) => (repo.isDefault = false));
    }

    // Check if repository already exists
    const existingIndex = githubConfig.repositories.findIndex(
      (repo) => repo.owner === repository.owner && repo.repo === repository.repo
    );

    if (existingIndex >= 0) {
      // Update existing repository
      githubConfig.repositories[existingIndex] = repository;
    } else {
      // Add new repository
      githubConfig.repositories.push(repository);
    }

    this.setGitHubConfig(githubConfig);
  }

  static removeRepository(owner: string, repo: string): void {
    const githubConfig = this.getGitHubConfig();
    if (!githubConfig) {
      throw new Error("GitHub configuration not found");
    }

    // Initialize repositories array if it doesn't exist
    if (!githubConfig.repositories) {
      githubConfig.repositories = [];
    }

    const index = githubConfig.repositories.findIndex(
      (r) => r.owner === owner && r.repo === repo
    );

    if (index === -1) {
      throw new Error(`Repository ${owner}/${repo} not found`);
    }

    const removedRepo = githubConfig.repositories[index];
    githubConfig.repositories.splice(index, 1);

    // If we removed the default repository, set the first remaining one as default
    if (removedRepo.isDefault && githubConfig.repositories.length > 0) {
      githubConfig.repositories[0].isDefault = true;
    }

    this.setGitHubConfig(githubConfig);
  }

  static getRepositories(): RepositoryConfig[] {
    const githubConfig = this.getGitHubConfig();
    return githubConfig?.repositories || [];
  }

  static getDefaultRepository(): RepositoryConfig | null {
    const repositories = this.getRepositories();
    return (
      repositories.find((repo) => repo.isDefault) || repositories[0] || null
    );
  }

  static setDefaultRepository(owner: string, repo: string): void {
    const githubConfig = this.getGitHubConfig();
    if (!githubConfig) {
      throw new Error("GitHub configuration not found");
    }

    // Initialize repositories array if it doesn't exist
    if (!githubConfig.repositories) {
      githubConfig.repositories = [];
    }

    // Unset all repositories as default
    githubConfig.repositories.forEach((repo) => (repo.isDefault = false));

    // Set the specified repository as default
    const targetRepo = githubConfig.repositories.find(
      (r) => r.owner === owner && r.repo === repo
    );

    if (!targetRepo) {
      throw new Error(`Repository ${owner}/${repo} not found`);
    }

    targetRepo.isDefault = true;
    this.setGitHubConfig(githubConfig);
  }
}
