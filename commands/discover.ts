import { Argv } from "yargs";
import chalk from "chalk";
import prompts from "prompts";
import { createDiscoveryService } from "../services/discovery.js";
import { ConfigManager } from "../lib/config.js";
import { TeamMember } from "../types.js";
import { DiscoveredMember, MemberMatch } from "../services/types.js";

export const command = "discover";
export const describe =
  "Automatically discover team members from GitHub and Jira";
export const builder = (yargs: Argv) => {
  return yargs
    .option("force", {
      type: "boolean",
      describe: "Skip confirmation and use all discovered members",
    })
    .option("github-only", {
      type: "boolean",
      describe: "Only discover from GitHub",
    })
    .option("jira-only", {
      type: "boolean",
      describe: "Only discover from Jira",
    })
    .option("days-back", {
      type: "number",
      describe: "Number of days back to look for activity",
      default: 30,
    });
};

export const handler = async (argv: any) => {
  const { force, githubOnly, jiraOnly, daysBack } = argv;

  console.log(chalk.blue("🔍 Starting team member discovery..."));
  console.log(
    chalk.gray(
      "This will analyze your GitHub repository and Jira project for active team members.\n"
    )
  );

  try {
    // Check if required services are configured
    const githubConfig = ConfigManager.getGitHubConfig();
    const jiraConfig = ConfigManager.getJiraConfig();

    if (!githubConfig && !jiraConfig) {
      console.error(
        chalk.red("❌ No services configured. Please run 'fmt config' first.")
      );
      process.exit(1);
    }

    if (githubOnly && !githubConfig) {
      console.error(
        chalk.red(
          "❌ GitHub not configured. Please run 'fmt config' to configure GitHub."
        )
      );
      process.exit(1);
    }

    if (jiraOnly && !jiraConfig) {
      console.error(
        chalk.red(
          "❌ Jira not configured. Please run 'fmt config' to configure Jira."
        )
      );
      process.exit(1);
    }

    // Create discovery service
    const discoveryService = createDiscoveryService();

    // Test connections
    console.log(chalk.gray("Testing connections..."));
    const connections = await discoveryService.testConnections();

    if (!connections.github && !connections.jira) {
      console.error(
        chalk.red("❌ Failed to connect to any configured services.")
      );
      process.exit(1);
    }

    if (connections.github)
      console.log(chalk.green("✅ GitHub connection successful"));
    if (connections.jira)
      console.log(chalk.green("✅ Jira connection successful"));

    // Discover members
    const result = await discoveryService.discoverMembers({
      githubOnly,
      jiraOnly,
      daysBack,
    });

    // Display discovery results
    displayDiscoveryResults(result);

    if (force) {
      // Auto-confirm all matches
      await confirmAllMatches(result);
    } else {
      // Interactive confirmation
      await interactiveConfirmation(result);
    }

    console.log(chalk.green("\n🎉 Team discovery completed successfully!"));
    console.log(
      chalk.gray("You can now use 'fmt ask' to query team performance.")
    );
  } catch (error) {
    console.error(chalk.red(`❌ Discovery failed: ${error}`));
    process.exit(1);
  }
};

function displayDiscoveryResults(result: any) {
  console.log(chalk.blue("\n📊 Discovery Results:"));
  console.log(`  GitHub members: ${result.githubMembers.length}`);
  console.log(`  Jira members: ${result.jiraMembers.length}`);
  console.log(`  Suggested matches: ${result.suggestedMatches.length}`);

  if (result.githubMembers.length > 0) {
    console.log(chalk.cyan("\n🐙 GitHub Members:"));
    result.githubMembers.forEach((member: DiscoveredMember) => {
      const activity = member.activityCount
        ? ` (${member.activityCount} commits)`
        : "";
      const lastActive = member.lastActive
        ? ` - Last active: ${member.lastActive.toLocaleDateString()}`
        : "";
      console.log(`  • ${member.username}${activity}${lastActive}`);
    });
  }

  if (result.jiraMembers.length > 0) {
    console.log(chalk.cyan("\n🔷 Jira Members:"));
    result.jiraMembers.forEach((member: DiscoveredMember) => {
      const activity = member.activityCount
        ? ` (${member.activityCount} issues)`
        : "";
      const lastActive = member.lastActive
        ? ` - Last active: ${member.lastActive.toLocaleDateString()}`
        : "";
      console.log(`  • ${member.username}${activity}${lastActive}`);
    });
  }

  if (result.suggestedMatches.length > 0) {
    console.log(chalk.cyan("\n🔗 Suggested Matches:"));
    result.suggestedMatches.forEach((match: MemberMatch, index: number) => {
      const confidenceColor =
        match.confidence === "high"
          ? chalk.green
          : match.confidence === "medium"
          ? chalk.yellow
          : chalk.red;
      console.log(
        `  ${index + 1}. ${match.githubMember.username} ↔ ${
          match.jiraMember.username
        }`
      );
      console.log(
        `     ${confidenceColor(match.confidence.toUpperCase())} - ${
          match.reason
        }`
      );
    });
  }
}

async function confirmAllMatches(result: any) {
  console.log(
    chalk.yellow("\n⚠️  Auto-confirming all matches (--force flag used)")
  );

  const confirmedMatches = result.suggestedMatches.map(
    (match: MemberMatch) => ({
      githubUsername: match.githubMember.username,
      jiraUsername: match.jiraMember.username,
      name: match.githubMember.displayName || match.githubMember.username,
    })
  );

  // Add unmatched GitHub members
  const matchedGithubUsernames = new Set(
    result.suggestedMatches.map((m: MemberMatch) => m.githubMember.username)
  );
  result.githubMembers.forEach((member: DiscoveredMember) => {
    if (!matchedGithubUsernames.has(member.username)) {
      confirmedMatches.push({
        githubUsername: member.username,
        jiraUsername: "",
        name: member.displayName || member.username,
      });
    }
  });

  // Add unmatched Jira members
  const matchedJiraUsernames = new Set(
    result.suggestedMatches.map((m: MemberMatch) => m.jiraMember.username)
  );
  result.jiraMembers.forEach((member: DiscoveredMember) => {
    if (!matchedJiraUsernames.has(member.username)) {
      confirmedMatches.push({
        githubUsername: "",
        jiraUsername: member.username,
        name: member.displayName || member.username,
      });
    }
  });

  await saveTeamMembers(confirmedMatches);
}

async function interactiveConfirmation(result: any) {
  console.log(chalk.blue("\n🤝 Interactive Confirmation"));
  console.log(chalk.gray("Review and confirm the suggested matches:"));

  const confirmedMatches: Array<{
    githubUsername: string;
    jiraUsername: string;
    name: string;
  }> = [];

  // Process suggested matches
  for (const match of result.suggestedMatches) {
    const response = await prompts({
      type: "confirm",
      name: "confirm",
      message: `Confirm match: ${match.githubMember.username} ↔ ${match.jiraMember.username} (${match.confidence})`,
      initial: match.confidence === "high",
    });

    if (response.confirm) {
      confirmedMatches.push({
        githubUsername: match.githubMember.username,
        jiraUsername: match.jiraMember.username,
        name: match.githubMember.displayName || match.githubMember.username,
      });
    }
  }

  // Handle unmatched members
  const matchedGithubUsernames = new Set(
    confirmedMatches.map((m) => m.githubUsername)
  );
  const matchedJiraUsernames = new Set(
    confirmedMatches.map((m) => m.jiraUsername)
  );

  const unmatchedGithub = result.githubMembers.filter(
    (m: DiscoveredMember) => !matchedGithubUsernames.has(m.username)
  );
  const unmatchedJira = result.jiraMembers.filter(
    (m: DiscoveredMember) => !matchedJiraUsernames.has(m.username)
  );

  if (unmatchedGithub.length > 0 || unmatchedJira.length > 0) {
    console.log(chalk.cyan("\n📝 Unmatched Members:"));

    // Ask about unmatched GitHub members
    for (const member of unmatchedGithub) {
      const response = await prompts({
        type: "text",
        name: "jiraUsername",
        message: `GitHub user '${member.username}' - Enter Jira username (or press Enter to skip):`,
        initial: "",
      });

      if (response.jiraUsername) {
        confirmedMatches.push({
          githubUsername: member.username,
          jiraUsername: response.jiraUsername,
          name: member.displayName || member.username,
        });
      }
    }

    // Ask about unmatched Jira members
    for (const member of unmatchedJira) {
      const response = await prompts({
        type: "text",
        name: "githubUsername",
        message: `Jira user '${member.username}' - Enter GitHub username (or press Enter to skip):`,
        initial: "",
      });

      if (response.githubUsername) {
        confirmedMatches.push({
          githubUsername: response.githubUsername,
          jiraUsername: member.username,
          name: member.displayName || member.username,
        });
      }
    }
  }

  await saveTeamMembers(confirmedMatches);
}

async function saveTeamMembers(
  confirmedMatches: Array<{
    githubUsername: string;
    jiraUsername: string;
    name: string;
  }>
) {
  // Convert to TeamMember format
  const teamMembers: TeamMember[] = confirmedMatches.map((match) => ({
    name: match.name,
    githubUsername: match.githubUsername || undefined,
    jiraUsername: match.jiraUsername || undefined,
  }));

  // Merge with existing team members
  const existingMembers = ConfigManager.getTeamMembers() || [];
  const mergedMembers = mergeTeamMembers(existingMembers, teamMembers);

  // Save to configuration
  ConfigManager.setTeamMembers(mergedMembers);

  console.log(
    chalk.green(
      `\n✅ Saved ${teamMembers.length} team members to configuration`
    )
  );
  console.log(chalk.gray(`Total team members: ${mergedMembers.length}`));
}

function mergeTeamMembers(
  existing: TeamMember[],
  newMembers: TeamMember[]
): TeamMember[] {
  const merged = [...existing];

  for (const newMember of newMembers) {
    // Check if member already exists (by GitHub or Jira username)
    const existingIndex = merged.findIndex(
      (existing) =>
        (newMember.githubUsername &&
          existing.githubUsername === newMember.githubUsername) ||
        (newMember.jiraUsername &&
          existing.jiraUsername === newMember.jiraUsername)
    );

    if (existingIndex >= 0) {
      // Update existing member with new information
      const existing = merged[existingIndex];
      merged[existingIndex] = {
        name: newMember.name || existing.name,
        githubUsername: newMember.githubUsername || existing.githubUsername,
        jiraUsername: newMember.jiraUsername || existing.jiraUsername,
      };
    } else {
      // Add new member
      merged.push(newMember);
    }
  }

  return merged;
}
