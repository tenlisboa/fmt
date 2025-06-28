import Conf from 'conf';
import { GitHubConfig, JiraConfig } from '../services/types.js';

interface AppConfig {
  github?: GitHubConfig;
  jira?: JiraConfig;
}

const config = new Conf({
  projectName: 'fmt'
});

export class ConfigManager {
  static setGitHubConfig(githubConfig: GitHubConfig): void {
    config.set('github', githubConfig);
  }

  static getGitHubConfig(): GitHubConfig | null {
    const githubConfig = config.get('github') as GitHubConfig | undefined;
    return githubConfig || null;
  }

  static setJiraConfig(jiraConfig: JiraConfig): void {
    config.set('jira', jiraConfig);
  }

  static getJiraConfig(): JiraConfig | null {
    const jiraConfig = config.get('jira') as JiraConfig | undefined;
    return jiraConfig || null;
  }

  static hasGitHubConfig(): boolean {
    return config.has('github');
  }

  static hasJiraConfig(): boolean {
    return config.has('jira');
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
} 