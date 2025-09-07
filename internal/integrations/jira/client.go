package jira

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	jiraClient "github.com/andygrunwald/go-jira/v2/cloud"
	"github.com/tenlisboa/fmt/internal/core"
)

type Client struct {
	client  *jiraClient.Client
	baseURL string
}

func NewClient(baseURL, username, apiToken string) *Client {
	httpClient := &http.Client{}
	client, _ := jiraClient.NewClient(baseURL, httpClient)

	return &Client{
		client:  client,
		baseURL: baseURL,
	}
}

func (c *Client) FetchIssues(ctx context.Context, filter *IssueFilter) ([]*core.Issue, error) {
	jql := c.buildJQL(filter)

	searchOptions := &jiraClient.SearchOptions{
		StartAt:    0,
		MaxResults: 100,
		Fields:     []string{"*all"},
		Expand:     "comments",
	}

	var allIssues []*core.Issue

	for {
		searchResult, _, err := c.client.Issue.Search(ctx, jql, searchOptions)
		if err != nil {
			return nil, fmt.Errorf("failed to search issues for project %s: %w", filter.Project, err)
		}

		for _, issue := range searchResult {
			domainIssue := MapIssueToDomain(&issue, filter.Project)
			allIssues = append(allIssues, domainIssue)
		}

		if len(searchResult) < searchOptions.MaxResults {
			break
		}

		searchOptions.StartAt += searchOptions.MaxResults

		time.Sleep(100 * time.Millisecond)
	}

	return allIssues, nil
}

func (c *Client) FetchIssuesForTeamMembers(ctx context.Context, project string, usernames []string, since *time.Time) ([]*core.Issue, error) {
	var allIssues []*core.Issue

	for _, username := range usernames {
		filter := &IssueFilter{
			Project:  project,
			Assignee: username,
			Since:    since,
		}

		issues, err := c.FetchIssues(ctx, filter)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch issues for user %s: %w", username, err)
		}

		allIssues = append(allIssues, issues...)

		time.Sleep(200 * time.Millisecond)
	}

	return allIssues, nil
}

func (c *Client) ValidateAccess(ctx context.Context, project string) error {
	_, _, err := c.client.Project.Get(ctx, project)
	if err != nil {
		return fmt.Errorf("cannot access project %s: %w", project, err)
	}
	return nil
}

func (c *Client) buildJQL(filter *IssueFilter) string {
	var conditions []string

	if filter.Project != "" {
		conditions = append(conditions, fmt.Sprintf("project = \"%s\"", filter.Project))
	}

	if filter.Assignee != "" {
		conditions = append(conditions, fmt.Sprintf("assignee = \"%s\"", filter.Assignee))
	}

	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = \"%s\"", filter.Status))
	}

	if filter.IssueType != "" {
		conditions = append(conditions, fmt.Sprintf("type = \"%s\"", filter.IssueType))
	}

	if filter.Since != nil {
		conditions = append(conditions, fmt.Sprintf("created >= \"%s\"", filter.Since.Format("2006-01-02")))
	}

	jql := strings.Join(conditions, " AND ")
	if jql == "" {
		jql = "created >= -30d"
	}

	return jql + " ORDER BY created DESC"
}
