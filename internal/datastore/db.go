package datastore

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"
)

const (
	dbFileName              = "fmt.db"
	createPullRequestsTable = `
		CREATE TABLE IF NOT EXISTS pull_requests (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			github_pr_id INTEGER NOT NULL,
			title TEXT NOT NULL,
			description TEXT,
			author TEXT NOT NULL,
			repository TEXT NOT NULL,
			created_at DATETIME NOT NULL,
			merged_at DATETIME,
			lines_added INTEGER NOT NULL DEFAULT 0,
			lines_deleted INTEGER NOT NULL DEFAULT 0,
			comments_count INTEGER NOT NULL DEFAULT 0,
			commits_count INTEGER NOT NULL DEFAULT 0,
			state TEXT NOT NULL,
			UNIQUE(github_pr_id, repository)
		);`

	createSyncRunsTable = `
		CREATE TABLE IF NOT EXISTS sync_runs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			repository TEXT NOT NULL,
			last_sync_at DATETIME NOT NULL,
			UNIQUE(repository)
		);`
)

type DB struct {
	conn *sql.DB
}

func NewDB() (*DB, error) {
	conn, err := sql.Open("sqlite", dbFileName)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db := &DB{conn: conn}
	if err := db.migrate(); err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return db, nil
}

func (db *DB) migrate() error {
	if _, err := db.conn.Exec(createPullRequestsTable); err != nil {
		return fmt.Errorf("failed to create pull_requests table: %w", err)
	}

	if _, err := db.conn.Exec(createSyncRunsTable); err != nil {
		return fmt.Errorf("failed to create sync_runs table: %w", err)
	}

	return nil
}

func (db *DB) Close() error {
	return db.conn.Close()
}
