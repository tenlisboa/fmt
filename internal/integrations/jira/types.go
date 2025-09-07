package jira

import (
	"time"

	jiraClient "github.com/andygrunwald/go-jira/v2/cloud"
)

type IssueFilter struct {
	Project   string
	Assignee  string
	Since     *time.Time
	Status    string
	IssueType string
}

type IssueStats struct {
	StoryPoints   *int
	LabelsCount   int
	CommentsCount int
}

func extractIssueStats(issue *jiraClient.Issue) *IssueStats {
	stats := &IssueStats{}

	if issue.Fields != nil {
		if issue.Fields.Labels != nil {
			stats.LabelsCount = len(issue.Fields.Labels)
		}

		if issue.Fields.Comments != nil && len(issue.Fields.Comments.Comments) > 0 {
			stats.CommentsCount = len(issue.Fields.Comments.Comments)
		}
	}

	return stats
}
