package jira

import (
	"strings"
	"time"

	jiraClient "github.com/andygrunwald/go-jira/v2/cloud"
	"github.com/tenlisboa/fmt/internal/core"
)

func MapIssueToDomain(jiraIssue *jiraClient.Issue, project string) *core.Issue {
	issue := &core.Issue{
		JiraIssueID: jiraIssue.Key,
		Project:     project,
		CreatedAt:   time.Time(jiraIssue.Fields.Created),
		UpdatedAt:   time.Time(jiraIssue.Fields.Updated),
	}

	if jiraIssue.Fields.Summary != "" {
		issue.Title = jiraIssue.Fields.Summary
	}

	if jiraIssue.Fields.Description != "" {
		issue.Description = jiraIssue.Fields.Description
	}

	if jiraIssue.Fields.Status != nil {
		issue.Status = jiraIssue.Fields.Status.Name
	}

	if jiraIssue.Fields.Priority != nil {
		issue.Priority = jiraIssue.Fields.Priority.Name
	}

	if jiraIssue.Fields.Assignee != nil {
		issue.Assignee = jiraIssue.Fields.Assignee.Name
	}

	if jiraIssue.Fields.Reporter != nil {
		issue.Reporter = jiraIssue.Fields.Reporter.Name
	}

	if jiraIssue.Fields.Type.Name != "" {
		issue.IssueType = jiraIssue.Fields.Type.Name
	}

	if len(jiraIssue.Fields.Labels) > 0 {
		issue.Labels = jiraIssue.Fields.Labels
	}

	if !time.Time(jiraIssue.Fields.Resolutiondate).IsZero() {
		resolvedTime := time.Time(jiraIssue.Fields.Resolutiondate)
		issue.ResolvedAt = &resolvedTime
	}

	stats := extractIssueStats(jiraIssue)
	if stats.StoryPoints != nil {
		issue.StoryPoints = stats.StoryPoints
	}

	if issue.Status != "" && isResolvedStatus(issue.Status) && issue.ResolvedAt == nil {
		issue.ResolvedAt = &issue.UpdatedAt
	}

	return issue
}

func isResolvedStatus(status string) bool {
	resolvedStatuses := []string{"done", "closed", "resolved", "complete", "completed"}
	lowerStatus := strings.ToLower(status)

	for _, resolved := range resolvedStatuses {
		if lowerStatus == resolved {
			return true
		}
	}

	return false
}
