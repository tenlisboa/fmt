# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FMT CLI is a Go-based command-line tool for analyzing team and individual performance by integrating with GitHub and Jira APIs. It's designed for technical leaders to gain objective insights into development workflow health and identify bottlenecks.

## Code Style

- Do not comment

## Build and Development Commands

This is a standard Go project. Use these commands:

- **Build**: `go build -o fmt ./cmd/cli`
- **Run**: `go run ./cmd/cli`
- **Test**: `go test ./...`
- **Dependencies**: `go mod download`
- **Format**: `go fmt ./...`
- **Lint**: `go vet ./...`

## Architecture

The codebase follows a clean architecture pattern:

```
├── cmd/cli/           # Main application entry point
├── internal/core/     # Core domain models (Member, Team, Report)
├── internal/datastore/    # SQLite database layer (planned)
├── internal/integrations/ # GitHub and Jira API clients (planned)
└── config/            # Configuration management (planned)
```

### Key Components

- **CLI Framework**: Uses HashiCorp CLI library for command structure
- **Configuration**: Viper for config management (YAML/JSON)
- **Database**: SQLite for local data storage to avoid API rate limits
- **APIs**: GitHub and Jira integrations for data collection

### Core Commands (Per Specs)

- `init`/`configure`: Setup configuration with teams and repositories
- `sync`: Fetch data from APIs and store locally with retry mechanisms
- `report`: Generate team/individual performance reports with filters

### Key Metrics Tracked

- Cycle Time (first commit to merge)
- Deployment Frequency (merges per day)
- Pull Request Size (lines added/deleted)
- Code Review Feedback (comments and review rounds)

## Security Requirements

- API credentials must be stored in environment variables only
- No sensitive data should be committed to the repository
- Local SQLite database for performance and rate limit management
