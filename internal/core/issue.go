package core

import "time"

type Issue struct {
	ID          int
	JiraIssueID string
	Title       string
	Description string
	Status      string
	Priority    string
	Assignee    string
	Reporter    string
	Project     string
	IssueType   string
	Labels      []string
	StoryPoints *int
	CreatedAt   time.Time
	UpdatedAt   time.Time
	ResolvedAt  *time.Time
}

func (i *Issue) CycleTime() *time.Duration {
	if i.ResolvedAt == nil {
		return nil
	}
	duration := i.ResolvedAt.Sub(i.CreatedAt)
	return &duration
}

func (i *Issue) IsResolved() bool {
	return i.Status == "Done" || i.Status == "Closed" || i.Status == "Resolved"
}

func (i *Issue) DaysInProgress() int {
	endTime := time.Now()
	if i.ResolvedAt != nil {
		endTime = *i.ResolvedAt
	}
	return int(endTime.Sub(i.CreatedAt).Hours() / 24)
}
