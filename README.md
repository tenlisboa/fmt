### Functional Specifications: FMT CLI

---

#### 1. Project Overview

The **FMT CLI** is a command-line tool designed for technical leaders (Tech Leads, Staff+ Engineers, and Managers) to analyze team and individual performance. The tool will integrate with GitHub and Jira to collect relevant data, store it locally, and generate a variety of reports. The primary objective is to provide objective insights into development workflow health and identify potential bottlenecks, rather than to serve as a micro-management tool.

---

#### 2. Functional Requirements

- **Configuration Management:**
  - The CLI will read API credentials for GitHub and Jira from environment variables to ensure secure handling.
  - A dedicated command (e.g., `init` or `configure`) will create a configuration file (YAML or JSON) where the user can define teams, assign members, and specify relevant repositories for each team.
- **Data Synchronization:**
  - A primary command, `sync`, will be responsible for fetching data from the GitHub and Jira APIs.
  - This process will write all collected data to a local SQLite database to mitigate API rate limiting and provide historical data for analysis.
  - The sync process should include a retry mechanism with exponential backoff to handle temporary API errors and rate limit responses gracefully.
- **Reporting:**
  - The core functionality will be a `report` command with filters.
  - **Team Performance Report:** A flag (e.g., `--team`) will generate an aggregated report for all members within a configured team.
  - **Individual Performance Report:** A flag or argument (e.g., `--member [username]`) will filter the report to show data for a specific individual.
  - **Key Metrics:** The reports will include actionable metrics such as:
    - **Cycle Time:** Time from first commit to merge.
    - **Deployment Frequency:** Number of code merges per day.
    - **Pull Request Size:** Lines of code added/deleted.
    - **Code Review Feedback:** Number of comments and review rounds.
- **Data Visualization (CLI):**
  - Reports will be presented in a clear, text-based format suitable for a command-line interface.

---

#### 3. Non-Functional Requirements

- **Security:** API credentials must not be stored on disk. Use of environment variables is a mandatory requirement.
- **Performance:** The use of a local database and a dedicated sync command is critical to ensure reports can be generated quickly without being dependent on real-time API calls.
- **Maintainability and Extensibility:** The code must be structured in a modular fashion to allow for the easy addition of new integrations (e.g., GitLab, Trello) or new metrics without requiring a major refactor.
- **Reliability:** The synchronization process must be robust, handling network interruptions and API rate limits.
- **Usability:** The CLI should be intuitive, with clear command names, flags, and help documentation.

---

#### 4. Recommended Technical Stack

- **Language:** Go
- **CLI Framework:** [hashicorp/cli](https://github.com/hashicorp/cli)
- **Configuration Management:** [spf13/viper](https://github.com/spf13/viper)
- **Database:** [SQLite](https://github.com/mattn/go-sqlite3)
- **External APIs**: [GitHub API](https://github.com/andygrunwald/go-jira), [Jira API](https://github.com/google/go-github)
