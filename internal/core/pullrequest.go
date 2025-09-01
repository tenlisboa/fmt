package core

import "time"

type PullRequest struct {
	ID            int
	GitHubPRID    int
	Title         string
	Description   string
	Author        string
	Repository    string
	CreatedAt     time.Time
	MergedAt      *time.Time
	LinesAdded    int
	LinesDeleted  int
	CommentsCount int
	CommitsCount  int
	State         string
}

func (pr *PullRequest) CycleTime() *time.Duration {
	if pr.MergedAt == nil {
		return nil
	}
	duration := pr.MergedAt.Sub(pr.CreatedAt)
	return &duration
}

func (pr *PullRequest) PRSize() int {
	return pr.LinesAdded + pr.LinesDeleted
}

func (pr *PullRequest) IsMerged() bool {
	return pr.State == "merged"
}
