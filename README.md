# FMT - Team Performance Analytics CLI

FMT is a command-line tool that provides AI-powered analytics for software engineering teams by integrating with GitHub, Jira, and OpenAI to analyze team member performance and provide insights.

## Table of Contents
- [Installation](#installation)
- [Configuration](#configuration)
- [Available Commands](#available-commands)
- [Testing](#testing)
- [Debugging](#debugging)
- [Limitations](#limitations)
- [Development](#development)

## Installation

### Prerequisites
- Node.js 18+ (with ES Module support)
- npm or yarn package manager
- Access to GitHub repository (with appropriate permissions)
- Jira instance (optional but recommended)
- OpenAI API key

### Installation Steps

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd fmt
npm install
```

2. **Build the project:**
```bash
npm run build
```

3. **Install globally (optional):**
```bash
npm link
```

After installation, you can use the CLI either with:
- `npx tsx bin/index.ts` (development mode)
- `npm start` (development mode)
- `fmt` (if installed globally)

## Configuration

The configuration is managed through the `config` command and stores credentials securely using the `conf` package. Configuration files are stored in your system's standard config directory.

### Required Configuration

#### 1. GitHub Configuration
```bash
fmt config --github-token ghp_xxxxxxxxxxxx --github-owner myorg --github-repo myrepo
```

**Parameters:**
- `--github-token`: Personal access token with repository read permissions
- `--github-owner`: GitHub organization or username
- `--github-repo`: Repository name to analyze

**GitHub Token Permissions Required:**
- Repository access (read)
- Actions (read) - for workflow data
- Metadata (read)

#### 2. OpenAI Configuration
```bash
fmt config --openai-api-key sk-xxxxxxxxxxxx --openai-model gpt-4o-mini
```

**Parameters:**
- `--openai-api-key`: OpenAI API key
- `--openai-model`: Model to use (default: gpt-4o-mini)

#### 3. Jira Configuration (Optional)
```bash
fmt config --jira-host company.atlassian.net --jira-username user@company.com --jira-password xxxxxxxxxxxx --jira-project-key PROJ
```

**Parameters:**
- `--jira-host`: Jira instance hostname
- `--jira-username`: Jira username or email
- `--jira-password`: Jira API token (recommended) or password
- `--jira-project-key`: Project key (optional)

### Configuration Management

**View current configuration:**
```bash
fmt config --show
```

**Clear all configuration:**
```bash
fmt config --clear
```

**Configuration file location:**
The config file path is displayed when running `fmt config --show`. Typically located at:
- Linux: `~/.config/fmt/config.json`
- macOS: `~/Library/Preferences/fmt/config.json`
- Windows: `%APPDATA%\fmt\config.json`

## Available Commands

### 1. `ask` - Query Team Performance
Ask natural language questions about team members or overall team performance.

```bash
fmt ask "How is Alice doing this sprint?"
fmt ask "How is Gabriel Lisboa (gabriel.lisboa@px.center) github:tenlisboa doing?"
fmt ask "How is the team performing overall?"
fmt ask "What is the sprint status?"
```

**Supported query types:**
- Individual member performance analysis
- Team summary and overall performance
- Sprint status and velocity tracking

### 2. `config` - Manage Configuration
Configure and manage API credentials and settings.

```bash
fmt config --show                    # Show current configuration
fmt config --clear                   # Clear all configuration
fmt config [options]                 # Set configuration options
```

### 3. `who` - List Team Members
Display known team members (currently shows static examples).

```bash
fmt who
```

## Testing

### Running Tests
```bash
npm test
```

The project uses Vitest for testing with the following test structure:
- Unit tests for individual commands
- Integration tests for services
- Agent functionality tests

### Test Coverage
Tests cover:
- Command handlers (`ask`, `config`, `who`)
- Agent graph execution
- Service integrations (GitHub, Jira, LLM)
- Configuration management
- Error handling scenarios

### Manual Testing Commands
Based on the command history, here are examples of how the tool has been tested:

```bash
# Basic functionality test
npx tsx bin/index.ts ask "How is tenlisboa doing?"

# Member-specific analysis with GitHub username
npx tsx bin/index.ts ask "How is Gabriel Lisboa (gabriel.lisboa@px.center) github:tenlisboa doing?"

# Development mode with inspection
npx tsx --inspect bin/index.ts ask "How is Alice doing?"
```

## Debugging

### Development Mode
Run in development mode with TypeScript compilation:
```bash
npm start ask "Your question here"
```

### Debug Mode with Inspector
For advanced debugging with Node.js inspector:
```bash
npx tsx --inspect bin/index.ts ask "Your question here"
```

### Common Issues and Solutions

1. **Configuration not found errors:**
   - Run `fmt config --show` to verify configuration
   - Ensure all required fields are set for the services you want to use

2. **API connection failures:**
   - Verify API tokens have correct permissions
   - Check network connectivity to GitHub/Jira/OpenAI APIs
   - Validate API token expiration

3. **Member not found errors:**
   - Ensure GitHub usernames exist in the configured repository
   - Verify Jira usernames match the configured instance
   - Check that members have recent activity in the specified timeframe

4. **LLM analysis failures:**
   - Verify OpenAI API key is valid and has sufficient credits
   - Check if the selected model is available
   - Ensure query is clear and well-formed

### Logging and Verbosity
The application uses console logging with color-coded output:
- Blue: Analysis status
- Green: Success messages
- Red: Error messages
- Gray: Processing status

## Limitations

### Team Member Information Gathering

1. **Manual Team Member Configuration:**
   - The `who` command currently shows hardcoded examples (Alice, Bob, Charlie)
   - No automatic discovery of team member mappings between GitHub and Jira
   - Team member aliases and email mappings must be managed manually

2. **Username Mapping Challenges:**
   - GitHub usernames and Jira usernames often differ
   - No built-in mechanism to automatically link GitHub and Jira accounts
   - Requires manual specification of usernames in queries or configuration

3. **Limited Member Discovery:**
   - Only discovers contributors who have recent commits in the repository
   - Cannot automatically identify inactive or new team members
   - No integration with HR systems or team rosters

### Data Source Limitations

4. **GitHub Integration Constraints:**
   - Limited to single repository analysis per configuration
   - Only analyzes last 14 days of activity by default
   - Requires repository read permissions
   - Cannot access private repository data without proper token permissions

5. **Jira Integration Limitations:**
   - Project key configuration affects data scope
   - Sprint velocity calculation may be inaccurate without proper story point configuration
   - Limited to issues visible to the configured user account
   - No support for multiple Jira instances simultaneously

6. **OpenAI Dependency:**
   - Requires external API calls for all analysis
   - Analysis quality depends on the selected model
   - Subject to OpenAI API rate limits and costs
   - No offline analysis capability

### Functional Limitations

7. **Query Processing:**
   - Natural language processing depends on LLM accuracy
   - Complex queries may not be properly classified
   - Limited to predefined query intents (member performance, team summary)

8. **Real-time Analysis:**
   - No caching mechanism for API responses
   - Each query triggers fresh API calls to all configured services
   - No background data synchronization

9. **Historical Data:**
   - Limited historical analysis (typically 14 days)
   - No trend analysis over longer periods
   - No data persistence between sessions

### Security and Privacy

10. **Credential Storage:**
    - API keys stored in plain text in configuration files
    - No encryption of sensitive configuration data
    - Configuration files accessible to system users

11. **Data Privacy:**
    - All analyzed data is sent to OpenAI for processing
    - No option for local LLM processing
    - Subject to third-party data handling policies

## Development

### Project Structure
```
fmt/
├── bin/           # CLI entry point
├── commands/      # Command implementations
├── lib/           # Configuration management
├── services/      # API integrations (GitHub, Jira, LLM)
├── agent/         # AI agent implementation with LangGraph
├── tests/         # Test files
└── types.ts       # Type definitions
```

### Technology Stack
- **Runtime:** Node.js with ES Modules
- **Language:** TypeScript
- **CLI Framework:** Yargs
- **AI Framework:** LangChain + LangGraph
- **Testing:** Vitest
- **APIs:** GitHub REST API, Jira REST API, OpenAI API

### Adding New Commands
1. Create a new file in `commands/` directory
2. Export `command`, `describe`, `builder`, and `handler`
3. Follow the existing pattern from `commands/ask.ts` or `commands/config.ts`

### Contributing
1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass with `npm test`
5. Submit a pull request

---

For additional support or feature requests, please refer to the project's issue tracker or documentation. 