package commands

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/tenlisboa/fmt/config"
)

type InitCommand struct{}

func (c *InitCommand) Help() string {
	return `Usage: fmt init

Initialize configuration file for the FMT CLI tool.
This command will guide you through setting up:
- Jira integration URL
- GitHub organization and repositories
- Teams and team members

The configuration will be saved to config.yaml in the current directory.`
}

func (c *InitCommand) Synopsis() string {
	return "Initialize configuration file"
}

func (c *InitCommand) Run(args []string) int {
	if config.ConfigExists() {
		fmt.Println(fmt.Printf("Configuration file already exists. edit the %s", config.ConfigFileName()))
		return 1
	}

	fmt.Println("Welcome to FMT CLI setup!")
	fmt.Println("This wizard will help you configure your team performance tracking setup.")

	cfg := &config.Config{}

	if err := c.configureIntegrations(cfg); err != nil {
		fmt.Printf("Error configuring integrations: %v\n", err)
		return 1
	}

	if err := c.configureTeams(cfg); err != nil {
		fmt.Printf("Error configuring teams: %v\n", err)
		return 1
	}

	if err := config.SaveConfig(cfg); err != nil {
		fmt.Printf("Error saving configuration: %v\n", err)
		return 1
	}

	fmt.Printf("\n✅ Configuration saved to %s\n", config.ConfigFileName())
	fmt.Println("You can now run 'fmt sync' to start collecting data.")

	return 0
}

func (c *InitCommand) configureIntegrations(cfg *config.Config) error {
	reader := bufio.NewReader(os.Stdin)

	fmt.Println("=== Integration Setup ===")

	fmt.Print("Jira URL (e.g., https://company.atlassian.net): ")
	jiraURL, err := reader.ReadString('\n')
	if err != nil {
		return err
	}
	cfg.Integrations.Jira.URL = strings.TrimSpace(jiraURL)

	fmt.Print("GitHub Organization: ")
	githubOrg, err := reader.ReadString('\n')
	if err != nil {
		return err
	}
	cfg.Integrations.GitHub.Organization = strings.TrimSpace(githubOrg)

	fmt.Print("GitHub Repositories (comma-separated): ")
	reposInput, err := reader.ReadString('\n')
	if err != nil {
		return err
	}
	reposStr := strings.TrimSpace(reposInput)
	if reposStr != "" {
		repos := strings.Split(reposStr, ",")
		for i, repo := range repos {
			repos[i] = strings.TrimSpace(repo)
		}
		cfg.Integrations.GitHub.Repositories = repos
	}

	fmt.Println()
	return nil
}

func (c *InitCommand) configureTeams(cfg *config.Config) error {
	reader := bufio.NewReader(os.Stdin)

	fmt.Println("=== Team Setup ===")
	fmt.Print("How many teams do you want to configure? ")
	var teamCount int
	if _, err := fmt.Scanf("%d\n", &teamCount); err != nil {
		return err
	}

	for i := 0; i < teamCount; i++ {
		fmt.Printf("\n--- Team %d ---\n", i+1)

		fmt.Print("Team name: ")
		teamName, err := reader.ReadString('\n')
		if err != nil {
			return err
		}

		team := config.Team{
			Name:    strings.TrimSpace(teamName),
			Members: []config.Member{},
		}

		fmt.Print("How many members in this team? ")
		var memberCount int
		if _, err := fmt.Scanf("%d\n", &memberCount); err != nil {
			return err
		}

		for j := 0; j < memberCount; j++ {
			fmt.Printf("\n  Member %d:\n", j+1)

			fmt.Print("  Name: ")
			name, err := reader.ReadString('\n')
			if err != nil {
				return err
			}

			fmt.Print("  Email: ")
			email, err := reader.ReadString('\n')
			if err != nil {
				return err
			}

			fmt.Print("  GitHub Username: ")
			githubUsername, err := reader.ReadString('\n')
			if err != nil {
				return err
			}

			fmt.Print("  Jira Username: ")
			jiraUsername, err := reader.ReadString('\n')
			if err != nil {
				return err
			}

			member := config.Member{
				Name:           strings.TrimSpace(name),
				Email:          strings.TrimSpace(email),
				GitHubUsername: strings.TrimSpace(githubUsername),
				JiraUsername:   strings.TrimSpace(jiraUsername),
			}

			team.Members = append(team.Members, member)
		}

		cfg.Teams = append(cfg.Teams, team)
	}

	return nil
}
