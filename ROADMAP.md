## MVP Roadmap: AI-Powered CLI for Tech Leads

### Goal of the MVP

Enable the user (you) to ask questions like:

> "How is Alice performing this sprint?"
> And get a concise summary that cross-references GitHub (commits, PRs) and Jira (tickets worked, ticket states, velocity).

---

## Phase 1: Foundations (Week 1)

### CLI Scaffold & Project Setup

- Create a CLI wrapper (e.g. using [`yargs`](https://www.npmjs.com/package/yargs))
- Basic LangChain setup integrated with OpenAI/GPT
- Add `.env` for managing API keys
- CLI Command: `ask "question"` → prints out dummy LLM response

### API Integrations (Mocked)

- GitHub API wrapper (use `@octokit/rest`)
- Jira API wrapper (via `jira-client` or direct REST)
- Define and normalize a **TeamMemberActivity interface**:

  ```ts
  interface MemberActivity {
    name: string;
    commits: Commit[];
    pullRequests: PullRequest[];
    issues: JiraTicket[];
    sprintVelocity: number;
    lastActive: Date;
  }
  ```

---

## Phase 2: Agent Core (Week 2)

### Build LangGraph-style Flow

- Graph Nodes:

  - `query_classifier` – parse input (e.g. identify person / intent)
  - `fetch_github_data` – get PRs, commits
  - `fetch_jira_data` – get issues
  - `summarize_data` – send structured data to LLM for synthesis

- Use LangChain Expression Language (LCEL) to link nodes into a simple graph

### Example Flow:

```
"How is Alice performing this sprint?" →
→ [parse name + intent]
→ [fetch GitHub + Jira]
→ [merge + summarize]
→ [return overview]
```

---

## Phase 3: MVP Completion (Week 3)

### Functional CLI

- Command: `ask "How is [name] doing?"`
- Output a structured answer like:

  ```
  Alice has completed 3 Jira tickets (2 bugs, 1 feature),
  opened 4 PRs (3 merged), and contributed 21 commits this sprint.
  Her average ticket resolution time is 1.2 days.
  ```

### Input Flexibility

- Handle aliases or short names (e.g. "João" → full name/email)
- Use LangChain memory (e.g. to cache user → Jira/GitHub mapping)

---

## Phase 4: Polishing & Dev Experience (Week 4)

### Developer Ergonomics

- Add CLI `config` command to setup:

  - GitHub token
  - Jira URL and token
  - Team member mapping file

- Add `who` command to list team members

- Add `activity` to get raw activity logs

### Caching / Performance

- Simple Redis or file-based cache for recent GitHub/Jira queries
- Debounce or throttle API calls where necessary

---

## Stretch Goals (Post-MVP)

- Add Slack notifications (e.g. daily summaries via webhook)
- Natural language understanding for more complex queries
- Weekly digest mode
- Extend to support Linear, Trello, etc.
- Web-based UI using same backend graph

---

## Prompting Strategy

Your agent should **not guess** when data is missing. For synthesis, use a prompt pattern like:

```
Given the following structured activity data for {{name}}, generate a concise overview of their recent performance.

Data:
- Commits: [...]
- Pull Requests: [...]
- Jira Tickets: [...]

Instructions:
- Summarize with clarity and neutrality
- Include both qualitative and quantitative data
- If any data source is missing, mention it explicitly
```