package github

import (
	"time"

	"github.com/google/go-github/v74/github"
)

type PRFilter struct {
	Repository string
	Author     string
	Since      *time.Time
	State      string
}

type PRStats struct {
	LinesAdded    int
	LinesDeleted  int
	CommentsCount int
	CommitsCount  int
}

func extractPRStats(pr *github.PullRequest) *PRStats {
	stats := &PRStats{}

	if pr.Additions != nil {
		stats.LinesAdded = *pr.Additions
	}

	if pr.Deletions != nil {
		stats.LinesDeleted = *pr.Deletions
	}

	if pr.Comments != nil {
		stats.CommentsCount = *pr.Comments
	}

	if pr.Commits != nil {
		stats.CommitsCount = *pr.Commits
	}

	return stats
}
