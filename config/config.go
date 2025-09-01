package config

type Config struct {
	Integrations Integrations `yaml:"integrations" json:"integrations"`
	Teams        []Team       `yaml:"teams" json:"teams"`
}

type Integrations struct {
	Jira   JiraConfig   `yaml:"jira" json:"jira"`
	GitHub GitHubConfig `yaml:"github" json:"github"`
}

type JiraConfig struct {
	URL string `yaml:"url" json:"url"`
}

type GitHubConfig struct {
	Organization string   `yaml:"organization" json:"organization"`
	Repositories []string `yaml:"repositories" json:"repositories"`
}

type Team struct {
	Name    string   `yaml:"name" json:"name"`
	Members []Member `yaml:"members" json:"members"`
}

type Member struct {
	Name           string `yaml:"name" json:"name"`
	Email          string `yaml:"email" json:"email"`
	GitHubUsername string `yaml:"github_username" json:"github_username"`
	JiraUsername   string `yaml:"jira_username" json:"jira_username"`
}
