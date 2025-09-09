package github

import (
	"github.com/google/go-github/v74/github"
	"github.com/tenlisboa/fmt/internal/core"
)

func MapPRToDomain(ghPR *github.PullRequest, repository string) *core.PullRequest {
	pr := &core.PullRequest{
		GitHubPRID:  ghPR.GetNumber(),
		Title:       ghPR.GetTitle(),
		Description: ghPR.GetBody(),
		Repository:  repository,
		CreatedAt:   ghPR.GetCreatedAt().Time,
		State:       ghPR.GetState(),
	}

	if ghPR.User != nil {
		pr.Author = ghPR.User.GetLogin()
	}

	if ghPR.MergedAt != nil {
		mergedAt := ghPR.MergedAt.Time
		pr.MergedAt = &mergedAt
	}

	if pr.State == "closed" && pr.MergedAt != nil {
		pr.State = "merged"
	}

	stats := extractPRStats(ghPR)
	pr.LinesAdded = stats.LinesAdded
	pr.LinesDeleted = stats.LinesDeleted
	pr.CommentsCount = stats.CommentsCount
	pr.CommitsCount = stats.CommitsCount

	return pr
}
