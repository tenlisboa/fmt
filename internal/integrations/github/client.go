package github

import (
	"context"
	"fmt"
	"time"

	"github.com/google/go-github/v74/github"
	"github.com/tenlisboa/fmt/internal/core"
	"golang.org/x/oauth2"
)

type Client struct {
	gh  *github.Client
	org string
}

func NewClient(token, organization string) *Client {
	ctx := context.Background()
	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: token},
	)
	tc := oauth2.NewClient(ctx, ts)

	return &Client{
		gh:  github.NewClient(tc),
		org: organization,
	}
}

func (c *Client) FetchPRs(ctx context.Context, filter *PRFilter) ([]*core.PullRequest, error) {
	opts := &github.PullRequestListOptions{
		State:     filter.State,
		Sort:      "created",
		Direction: "desc",
		ListOptions: github.ListOptions{
			PerPage: 100,
		},
	}

	var allPRs []*core.PullRequest

	for {
		prs, resp, err := c.gh.PullRequests.List(ctx, c.org, filter.Repository, opts)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch PRs for %s/%s: %w", c.org, filter.Repository, err)
		}

		for _, pr := range prs {
			if filter.Author != "" && pr.User.GetLogin() != filter.Author {
				continue
			}

			if filter.Since != nil && pr.GetCreatedAt().Time.Before(*filter.Since) {
				continue
			}

			domainPR := MapPRToDomain(pr, filter.Repository)
			allPRs = append(allPRs, domainPR)
		}

		if resp.NextPage == 0 {
			break
		}
		opts.Page = resp.NextPage

		time.Sleep(100 * time.Millisecond)
	}

	return allPRs, nil
}

func (c *Client) FetchPRsForTeamMembers(ctx context.Context, repository string, usernames []string, since *time.Time) ([]*core.PullRequest, error) {
	var allPRs []*core.PullRequest

	for _, username := range usernames {
		filter := &PRFilter{
			Repository: repository,
			Author:     username,
			Since:      since,
			State:      "all",
		}

		prs, err := c.FetchPRs(ctx, filter)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch PRs for user %s: %w", username, err)
		}

		allPRs = append(allPRs, prs...)

		time.Sleep(200 * time.Millisecond)
	}

	return allPRs, nil
}

func (c *Client) ValidateAccess(ctx context.Context, repository string) error {
	_, _, err := c.gh.Repositories.Get(ctx, c.org, repository)
	if err != nil {
		return fmt.Errorf("cannot access repository %s/%s: %w", c.org, repository, err)
	}
	return nil
}
