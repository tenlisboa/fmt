import { DiscoveredMember, MemberMatch } from "../services/types.js";

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);

  return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
}

/**
 * Check if two email addresses are the same (case-insensitive)
 */
export function emailsMatch(email1?: string, email2?: string): boolean {
  if (!email1 || !email2) return false;
  return email1.toLowerCase() === email2.toLowerCase();
}

/**
 * Check if a username is likely a bot
 */
export function isBotUsername(username: string): boolean {
  const botPatterns = [
    "bot",
    "ci",
    "github-actions",
    "dependabot",
    "renovate",
    "automation",
    "deploy",
    "build",
    "test",
    "jenkins",
    "travis",
  ];

  const lowerUsername = username.toLowerCase();
  return botPatterns.some((pattern) => lowerUsername.includes(pattern));
}

/**
 * Find matches between GitHub and Jira members
 */
export function findMemberMatches(
  githubMembers: DiscoveredMember[],
  jiraMembers: DiscoveredMember[]
): MemberMatch[] {
  const matches: MemberMatch[] = [];

  for (const githubMember of githubMembers) {
    for (const jiraMember of jiraMembers) {
      const match = evaluateMatch(githubMember, jiraMember);
      if (match) {
        matches.push(match);
      }
    }
  }

  // Sort by confidence (high -> medium -> low)
  return matches.sort((a, b) => {
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
  });
}

/**
 * Evaluate if two members are likely the same person
 */
function evaluateMatch(
  githubMember: DiscoveredMember,
  jiraMember: DiscoveredMember
): MemberMatch | null {
  // High confidence: Exact email match
  if (emailsMatch(githubMember.email, jiraMember.email)) {
    return {
      githubMember,
      jiraMember,
      confidence: "high",
      reason: "Exact email match",
    };
  }

  // Medium confidence: Display name similarity + recent activity
  if (githubMember.displayName && jiraMember.displayName) {
    const nameSimilarity = calculateSimilarity(
      githubMember.displayName,
      jiraMember.displayName
    );
    if (nameSimilarity >= 0.8) {
      const hasRecentActivity =
        (githubMember.lastActive && isRecent(githubMember.lastActive)) ||
        (jiraMember.lastActive && isRecent(jiraMember.lastActive));

      if (hasRecentActivity) {
        return {
          githubMember,
          jiraMember,
          confidence: "medium",
          reason: `Display name similarity: ${(nameSimilarity * 100).toFixed(
            0
          )}%`,
        };
      }
    }
  }

  // Low confidence: Username similarity
  const usernameSimilarity = calculateSimilarity(
    githubMember.username,
    jiraMember.username
  );
  if (usernameSimilarity >= 0.7) {
    return {
      githubMember,
      jiraMember,
      confidence: "low",
      reason: `Username similarity: ${(usernameSimilarity * 100).toFixed(0)}%`,
    };
  }

  return null;
}

/**
 * Check if a date is recent (within last 30 days)
 */
function isRecent(date: Date): boolean {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return date >= thirtyDaysAgo;
}

/**
 * Filter out bot accounts and inactive members
 */
export function filterValidMembers(
  members: DiscoveredMember[]
): DiscoveredMember[] {
  return members.filter((member) => {
    // Filter out bots
    if (isBotUsername(member.username)) {
      return false;
    }

    // Filter out members without recent activity (if we have activity data)
    if (member.lastActive && !isRecent(member.lastActive)) {
      return false;
    }

    return true;
  });
}
