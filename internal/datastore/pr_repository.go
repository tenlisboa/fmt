package datastore

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/tenlisboa/fmt/internal/core"
)

type PRRepository struct {
	db *DB
}

func NewPRRepository(db *DB) *PRRepository {
	return &PRRepository{db: db}
}

func (r *PRRepository) Save(pr *core.PullRequest) error {
	query := `
		INSERT OR REPLACE INTO pull_requests 
		(github_pr_id, title, description, author, repository, created_at, merged_at, 
		 lines_added, lines_deleted, comments_count, commits_count, state)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := r.db.conn.Exec(query,
		pr.GitHubPRID, pr.Title, pr.Description, pr.Author, pr.Repository,
		pr.CreatedAt, pr.MergedAt, pr.LinesAdded, pr.LinesDeleted,
		pr.CommentsCount, pr.CommitsCount, pr.State)

	if err != nil {
		return fmt.Errorf("failed to save pull request: %w", err)
	}

	return nil
}

func (r *PRRepository) GetByAuthor(author string) ([]*core.PullRequest, error) {
	query := `
		SELECT id, github_pr_id, title, description, author, repository, 
		       created_at, merged_at, lines_added, lines_deleted, 
		       comments_count, commits_count, state
		FROM pull_requests 
		WHERE author = ?
		ORDER BY created_at DESC`

	rows, err := r.db.conn.Query(query, author)
	if err != nil {
		return nil, fmt.Errorf("failed to query pull requests by author: %w", err)
	}
	defer rows.Close()

	return r.scanPullRequests(rows)
}

func (r *PRRepository) GetByRepository(repository string) ([]*core.PullRequest, error) {
	query := `
		SELECT id, github_pr_id, title, description, author, repository, 
		       created_at, merged_at, lines_added, lines_deleted, 
		       comments_count, commits_count, state
		FROM pull_requests 
		WHERE repository = ?
		ORDER BY created_at DESC`

	rows, err := r.db.conn.Query(query, repository)
	if err != nil {
		return nil, fmt.Errorf("failed to query pull requests by repository: %w", err)
	}
	defer rows.Close()

	return r.scanPullRequests(rows)
}

func (r *PRRepository) GetByDateRange(since, until time.Time) ([]*core.PullRequest, error) {
	query := `
		SELECT id, github_pr_id, title, description, author, repository, 
		       created_at, merged_at, lines_added, lines_deleted, 
		       comments_count, commits_count, state
		FROM pull_requests 
		WHERE created_at >= ? AND created_at <= ?
		ORDER BY created_at DESC`

	rows, err := r.db.conn.Query(query, since, until)
	if err != nil {
		return nil, fmt.Errorf("failed to query pull requests by date range: %w", err)
	}
	defer rows.Close()

	return r.scanPullRequests(rows)
}

func (r *PRRepository) UpdateLastSync(repository string) error {
	query := `INSERT OR REPLACE INTO sync_runs (repository, last_sync_at) VALUES (?, ?)`
	_, err := r.db.conn.Exec(query, repository, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update last sync: %w", err)
	}
	return nil
}

func (r *PRRepository) GetLastSync(repository string) (*time.Time, error) {
	query := `SELECT last_sync_at FROM sync_runs WHERE repository = ?`
	var lastSync time.Time
	err := r.db.conn.QueryRow(query, repository).Scan(&lastSync)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get last sync: %w", err)
	}
	return &lastSync, nil
}

func (r *PRRepository) scanPullRequests(rows *sql.Rows) ([]*core.PullRequest, error) {
	var prs []*core.PullRequest

	for rows.Next() {
		var pr core.PullRequest
		var mergedAt sql.NullTime

		err := rows.Scan(
			&pr.ID, &pr.GitHubPRID, &pr.Title, &pr.Description, &pr.Author,
			&pr.Repository, &pr.CreatedAt, &mergedAt, &pr.LinesAdded,
			&pr.LinesDeleted, &pr.CommentsCount, &pr.CommitsCount, &pr.State,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan pull request: %w", err)
		}

		if mergedAt.Valid {
			pr.MergedAt = &mergedAt.Time
		}

		prs = append(prs, &pr)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating pull request rows: %w", err)
	}

	return prs, nil
}
