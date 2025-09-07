package datastore

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/tenlisboa/fmt/internal/core"
)

type IssueRepository struct {
	db *DB
}

func NewIssueRepository(db *DB) *IssueRepository {
	return &IssueRepository{db: db}
}

func (r *IssueRepository) Save(issue *core.Issue) error {
	labelsStr := ""
	if len(issue.Labels) > 0 {
		labelsStr = strings.Join(issue.Labels, ",")
	}

	query := `
		INSERT OR REPLACE INTO issues 
		(jira_issue_id, title, description, status, priority, assignee, reporter, 
		 project, issue_type, labels, story_points, created_at, updated_at, resolved_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := r.db.conn.Exec(query,
		issue.JiraIssueID, issue.Title, issue.Description, issue.Status, issue.Priority,
		issue.Assignee, issue.Reporter, issue.Project, issue.IssueType, labelsStr,
		issue.StoryPoints, issue.CreatedAt, issue.UpdatedAt, issue.ResolvedAt)

	if err != nil {
		return fmt.Errorf("failed to save issue: %w", err)
	}

	return nil
}

func (r *IssueRepository) GetByAssignee(assignee string) ([]*core.Issue, error) {
	query := `
		SELECT id, jira_issue_id, title, description, status, priority, assignee, 
		       reporter, project, issue_type, labels, story_points, created_at, 
		       updated_at, resolved_at
		FROM issues 
		WHERE assignee = ?
		ORDER BY created_at DESC`

	rows, err := r.db.conn.Query(query, assignee)
	if err != nil {
		return nil, fmt.Errorf("failed to query issues by assignee: %w", err)
	}
	defer rows.Close()

	return r.scanIssues(rows)
}

func (r *IssueRepository) GetByProject(project string) ([]*core.Issue, error) {
	query := `
		SELECT id, jira_issue_id, title, description, status, priority, assignee, 
		       reporter, project, issue_type, labels, story_points, created_at, 
		       updated_at, resolved_at
		FROM issues 
		WHERE project = ?
		ORDER BY created_at DESC`

	rows, err := r.db.conn.Query(query, project)
	if err != nil {
		return nil, fmt.Errorf("failed to query issues by project: %w", err)
	}
	defer rows.Close()

	return r.scanIssues(rows)
}

func (r *IssueRepository) GetByDateRange(since, until time.Time) ([]*core.Issue, error) {
	query := `
		SELECT id, jira_issue_id, title, description, status, priority, assignee, 
		       reporter, project, issue_type, labels, story_points, created_at, 
		       updated_at, resolved_at
		FROM issues 
		WHERE created_at >= ? AND created_at <= ?
		ORDER BY created_at DESC`

	rows, err := r.db.conn.Query(query, since, until)
	if err != nil {
		return nil, fmt.Errorf("failed to query issues by date range: %w", err)
	}
	defer rows.Close()

	return r.scanIssues(rows)
}

func (r *IssueRepository) UpdateLastSync(project string) error {
	query := `INSERT OR REPLACE INTO jira_sync_runs (project, last_sync_at) VALUES (?, ?)`
	_, err := r.db.conn.Exec(query, project, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update last sync: %w", err)
	}
	return nil
}

func (r *IssueRepository) GetLastSync(project string) (*time.Time, error) {
	query := `SELECT last_sync_at FROM jira_sync_runs WHERE project = ?`
	var lastSync time.Time
	err := r.db.conn.QueryRow(query, project).Scan(&lastSync)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get last sync: %w", err)
	}
	return &lastSync, nil
}

func (r *IssueRepository) scanIssues(rows *sql.Rows) ([]*core.Issue, error) {
	var issues []*core.Issue

	for rows.Next() {
		var issue core.Issue
		var resolvedAt sql.NullTime
		var labelsStr sql.NullString
		var storyPoints sql.NullInt64

		err := rows.Scan(
			&issue.ID, &issue.JiraIssueID, &issue.Title, &issue.Description,
			&issue.Status, &issue.Priority, &issue.Assignee, &issue.Reporter,
			&issue.Project, &issue.IssueType, &labelsStr, &storyPoints,
			&issue.CreatedAt, &issue.UpdatedAt, &resolvedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan issue: %w", err)
		}

		if resolvedAt.Valid {
			issue.ResolvedAt = &resolvedAt.Time
		}

		if labelsStr.Valid && labelsStr.String != "" {
			issue.Labels = strings.Split(labelsStr.String, ",")
		}

		if storyPoints.Valid {
			sp := int(storyPoints.Int64)
			issue.StoryPoints = &sp
		}

		issues = append(issues, &issue)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating issue rows: %w", err)
	}

	return issues, nil
}
