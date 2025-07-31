/**
 * Utility functions shared across the application
 */

import { ConfigManager } from "./config.js";
import { createLLMService } from "../services/llm.js";
import { createMemberActivityService } from "../services/member-activity.js";

/**
 * Calculate similarity between two strings using character overlap
 * @param str1 First string to compare
 * @param str2 Second string to compare
 * @returns Similarity score between 0 and 1
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  // Simple character overlap
  const chars1 = new Set(s1.split(""));
  const chars2 = new Set(s2.split(""));
  const intersection = new Set([...chars1].filter((x) => chars2.has(x)));
  const union = new Set([...chars1, ...chars2]);

  return intersection.size / union.size;
}

/**
 * Centralized configuration validation and service creation
 */
export function validateAndCreateServices() {
  const llmConfig = ConfigManager.getLLMConfig();
  if (!llmConfig) {
    throw new Error(
      'LLM configuration not found. Please run "fmt config" to set up OpenAI credentials.'
    );
  }

  const githubConfig = ConfigManager.getGitHubConfig();
  const jiraConfig = ConfigManager.getJiraConfig();

  if (!githubConfig && !jiraConfig) {
    throw new Error(
      "At least one data source (GitHub or Jira) must be configured. Please run 'fmt config' first."
    );
  }

  const llmService = createLLMService(llmConfig);
  let memberActivityService = null;

  if (githubConfig && jiraConfig) {
    memberActivityService = createMemberActivityService(
      githubConfig,
      jiraConfig
    );
  }

  return {
    llmService,
    memberActivityService,
    githubConfig,
    jiraConfig,
    llmConfig,
  };
}
