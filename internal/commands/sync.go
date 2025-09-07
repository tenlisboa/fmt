package commands

import (
	"context"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/tenlisboa/fmt/config"
	"github.com/tenlisboa/fmt/internal/datastore"
	"github.com/tenlisboa/fmt/internal/integrations/github"
	"github.com/tenlisboa/fmt/internal/integrations/jira"
)

type SyncCommand struct{}

func (c *SyncCommand) Help() string {
	return `Usage: fmt sync [options]

Synchronize data from GitHub and Jira APIs for configured teams and repositories.

Options:
  -since=<date>    Sync PRs created since this date (format: 2006-01-02)
  -team=<name>     Sync data for specific team only
  -dry-run         Show what would be synced without actually doing it

Environment Variables:
  GITHUB_TOKEN     GitHub personal access token (required)
  JIRA_API_TOKEN   Jira API token (required)
  JIRA_USERNAME    Jira username (required)

Examples:
  fmt sync                           # Sync all teams and repositories
  fmt sync -since=2024-01-01         # Sync PRs created since Jan 1, 2024
  fmt sync -team="Backend Team"      # Sync only the Backend Team
  fmt sync -dry-run                  # Preview what would be synced`
}

func (c *SyncCommand) Synopsis() string {
	return "Synchronize data from GitHub and Jira APIs"
}

func (c *SyncCommand) Run(args []string) int {
	var (
		sinceFlag = flag.String("since", "", "Sync PRs created since this date (format: 2006-01-02)")
		teamFlag  = flag.String("team", "", "Sync data for specific team only")
		dryRun    = flag.Bool("dry-run", false, "Show what would be synced without actually doing it")
	)

	flag.CommandLine.Parse(args)

	if !config.ConfigExists() {
		fmt.Println("No configuration found. Run 'fmt init' first.")
		return 1
	}

	cfg, err := config.LoadConfig()
	if err != nil {
		fmt.Printf("Error loading configuration: %v\n", err)
		return 1
	}

	githubToken := os.Getenv("GITHUB_TOKEN")
	if githubToken == "" {
		fmt.Println("GITHUB_TOKEN environment variable is required")
		return 1
	}

	jiraAPIToken := os.Getenv("JIRA_API_TOKEN")
	jiraUsername := os.Getenv("JIRA_USERNAME")
	if jiraAPIToken == "" || jiraUsername == "" {
		fmt.Println("JIRA_API_TOKEN and JIRA_USERNAME environment variables are required")
		return 1
	}

	var since *time.Time
	if *sinceFlag != "" {
		parsedTime, err := time.Parse("2006-01-02", *sinceFlag)
		if err != nil {
			fmt.Printf("Invalid date format for -since: %v\n", err)
			return 1
		}
		since = &parsedTime
	}

	if *dryRun {
		return c.runDryRun(cfg, *teamFlag, since)
	}

	return c.runSync(cfg, githubToken, jiraAPIToken, jiraUsername, *teamFlag, since)
}

func (c *SyncCommand) runDryRun(cfg *config.Config, teamFilter string, since *time.Time) int {
	fmt.Println("=== Dry Run - What would be synced ===")

	teamsToSync := c.filterTeams(cfg.Teams, teamFilter)
	if len(teamsToSync) == 0 {
		fmt.Printf("No teams found matching filter: %s\n", teamFilter)
		return 1
	}

	fmt.Printf("GitHub Organization: %s\n", cfg.Integrations.GitHub.Organization)
	fmt.Printf("Repositories: %s\n", strings.Join(cfg.Integrations.GitHub.Repositories, ", "))
	fmt.Printf("Jira URL: %s\n", cfg.Integrations.Jira.URL)
	fmt.Printf("Jira Projects: %s\n", strings.Join(cfg.Integrations.Jira.Projects, ", "))

	if since != nil {
		fmt.Printf("Since: %s\n", since.Format("2006-01-02"))
	}

	fmt.Println("\nTeams and members to sync:")
	for _, team := range teamsToSync {
		fmt.Printf("  Team: %s\n", team.Name)
		for _, member := range team.Members {
			ghUser := member.GitHubUsername
			jiraUser := member.JiraUsername

			if ghUser != "" && jiraUser != "" {
				fmt.Printf("    - %s (@%s, jira: %s)\n", member.Name, ghUser, jiraUser)
			} else if ghUser != "" {
				fmt.Printf("    - %s (@%s, no Jira username)\n", member.Name, ghUser)
			} else if jiraUser != "" {
				fmt.Printf("    - %s (jira: %s, no GitHub username)\n", member.Name, jiraUser)
			} else {
				fmt.Printf("    - %s (no GitHub or Jira username configured)\n", member.Name)
			}
		}
	}

	return 0
}

func (c *SyncCommand) runSync(cfg *config.Config, githubToken, jiraAPIToken, jiraUsername, teamFilter string, since *time.Time) int {
	fmt.Println("Starting sync...")

	db, err := datastore.NewDB()
	if err != nil {
		fmt.Printf("Error initializing database: %v\n", err)
		return 1
	}
	defer db.Close()

	prRepo := datastore.NewPRRepository(db)
	issueRepo := datastore.NewIssueRepository(db)
	ghClient := github.NewClient(githubToken, cfg.Integrations.GitHub.Organization)
	jiraClient := jira.NewClient(cfg.Integrations.Jira.URL, jiraUsername, jiraAPIToken)

	teamsToSync := c.filterTeams(cfg.Teams, teamFilter)
	if len(teamsToSync) == 0 {
		fmt.Printf("No teams found matching filter: %s\n", teamFilter)
		return 1
	}

	ctx := context.Background()
	totalPRs := 0
	totalIssues := 0

	for _, repo := range cfg.Integrations.GitHub.Repositories {
		fmt.Printf("\n=== Syncing repository: %s ===\n", repo)

		if err := ghClient.ValidateAccess(ctx, repo); err != nil {
			fmt.Printf("Warning: Cannot access repository %s: %v\n", repo, err)
			continue
		}

		lastSync, err := prRepo.GetLastSync(repo)
		if err != nil {
			fmt.Printf("Warning: Could not get last sync time for %s: %v\n", repo, err)
		}

		syncSince := since
		if syncSince == nil && lastSync != nil {
			syncSince = lastSync
		}

		for _, team := range teamsToSync {
			fmt.Printf("  Team: %s\n", team.Name)

			usernames := c.extractGitHubUsernames(team.Members)
			if len(usernames) == 0 {
				fmt.Printf("    No GitHub usernames configured for this team\n")
				continue
			}

			prs, err := ghClient.FetchPRsForTeamMembers(ctx, repo, usernames, syncSince)
			if err != nil {
				fmt.Printf("    Error fetching PRs: %v\n", err)
				continue
			}

			fmt.Printf("    Found %d PRs\n", len(prs))

			for _, pr := range prs {
				if err := prRepo.Save(pr); err != nil {
					fmt.Printf("    Warning: Failed to save PR #%d: %v\n", pr.GitHubPRID, err)
				} else {
					totalPRs++
				}
			}
		}

		if err := prRepo.UpdateLastSync(repo); err != nil {
			fmt.Printf("Warning: Failed to update last sync time for %s: %v\n", repo, err)
		}
	}

	for _, project := range cfg.Integrations.Jira.Projects {
		fmt.Printf("\n=== Syncing Jira project: %s ===\n", project)

		if err := jiraClient.ValidateAccess(ctx, project); err != nil {
			fmt.Printf("Warning: Cannot access project %s: %v\n", project, err)
			continue
		}

		lastSync, err := issueRepo.GetLastSync(project)
		if err != nil {
			fmt.Printf("Warning: Could not get last sync time for %s: %v\n", project, err)
		}

		syncSince := since
		if syncSince == nil && lastSync != nil {
			syncSince = lastSync
		}

		for _, team := range teamsToSync {
			fmt.Printf("  Team: %s\n", team.Name)

			usernames := c.extractJiraUsernames(team.Members)
			if len(usernames) == 0 {
				fmt.Printf("    No Jira usernames configured for this team\n")
				continue
			}

			issues, err := jiraClient.FetchIssuesForTeamMembers(ctx, project, usernames, syncSince)
			if err != nil {
				fmt.Printf("    Error fetching issues: %v\n", err)
				continue
			}

			fmt.Printf("    Found %d issues\n", len(issues))

			for _, issue := range issues {
				if err := issueRepo.Save(issue); err != nil {
					fmt.Printf("    Warning: Failed to save issue %s: %v\n", issue.JiraIssueID, err)
				} else {
					totalIssues++
				}
			}
		}

		if err := issueRepo.UpdateLastSync(project); err != nil {
			fmt.Printf("Warning: Failed to update last sync time for %s: %v\n", project, err)
		}
	}

	fmt.Printf("\n✅ Sync completed! Processed %d PRs and %d issues total.\n", totalPRs, totalIssues)
	return 0
}

func (c *SyncCommand) filterTeams(teams []config.Team, filter string) []config.Team {
	if filter == "" {
		return teams
	}

	var filtered []config.Team
	for _, team := range teams {
		if strings.EqualFold(team.Name, filter) {
			filtered = append(filtered, team)
		}
	}

	return filtered
}

func (c *SyncCommand) extractGitHubUsernames(members []config.Member) []string {
	var usernames []string
	for _, member := range members {
		if member.GitHubUsername != "" {
			usernames = append(usernames, member.GitHubUsername)
		}
	}
	return usernames
}

func (c *SyncCommand) extractJiraUsernames(members []config.Member) []string {
	var usernames []string
	for _, member := range members {
		if member.JiraUsername != "" {
			usernames = append(usernames, member.JiraUsername)
		}
	}
	return usernames
}
