import { ConfigManager } from '../lib/config.js';

export const command = 'config';
export const describe = 'Configure credentials and team settings';
export const builder = (yargs: any) => {
  return yargs
    .option('github-token', {
      type: 'string',
      describe: 'GitHub personal access token'
    })
    .option('github-owner', {
      type: 'string',
      describe: 'GitHub repository owner'
    })
    .option('github-repo', {
      type: 'string',
      describe: 'GitHub repository name'
    })
    .option('jira-host', {
      type: 'string',
      describe: 'Jira host (e.g., company.atlassian.net)'
    })
    .option('jira-username', {
      type: 'string',
      describe: 'Jira username'
    })
    .option('jira-password', {
      type: 'string',
      describe: 'Jira API token or password'
    })
    .option('jira-project-key', {
      type: 'string',
      describe: 'Jira project key (optional)'
    })
    .option('show', {
      type: 'boolean',
      describe: 'Show current configuration'
    })
    .option('clear', {
      type: 'boolean',
      describe: 'Clear all configuration'
    });
};

export const handler = (argv: any) => {
  if (argv.show) {
    console.log('📋 Current configuration:');
    const config = ConfigManager.getAllConfig();
    
    if (ConfigManager.hasGitHubConfig()) {
      console.log('  GitHub:');
      console.log(`    Owner: ${config.github?.owner}`);
      console.log(`    Repository: ${config.github?.repo}`);
      console.log(`    Token: ${'*'.repeat(8)}`);
    } else {
      console.log('  GitHub: Not configured');
    }
    
    if (ConfigManager.hasJiraConfig()) {
      console.log('  Jira:');
      console.log(`    Host: ${config.jira?.host}`);
      console.log(`    Username: ${config.jira?.username}`);
      console.log(`    Project Key: ${config.jira?.projectKey || 'Not set'}`);
      console.log(`    Token: ${'*'.repeat(8)}`);
    } else {
      console.log('  Jira: Not configured');
    }
    
    console.log(`\nConfig file: ${ConfigManager.getConfigPath()}`);
    return;
  }

  if (argv.clear) {
    ConfigManager.clearAllConfig();
    console.log('🗑️  Configuration cleared');
    return;
  }

  let updated = false;

  if (argv.githubToken && argv.githubOwner && argv.githubRepo) {
    ConfigManager.setGitHubConfig({
      token: argv.githubToken,
      owner: argv.githubOwner,
      repo: argv.githubRepo
    });
    console.log('✅ GitHub configuration saved');
    updated = true;
  } else if (argv.githubToken || argv.githubOwner || argv.githubRepo) {
    console.error('❌ GitHub configuration requires all three options: --github-token, --github-owner, --github-repo');
  }

  if (argv.jiraHost && argv.jiraUsername && argv.jiraPassword) {
    ConfigManager.setJiraConfig({
      host: argv.jiraHost,
      username: argv.jiraUsername,
      password: argv.jiraPassword,
      projectKey: argv.jiraProjectKey
    });
    console.log('✅ Jira configuration saved');
    updated = true;
  } else if (argv.jiraHost || argv.jiraUsername || argv.jiraPassword) {
    console.error('❌ Jira configuration requires at least: --jira-host, --jira-username, --jira-password');
  }

  if (!updated && !argv.show && !argv.clear) {
    console.log('🔧 Use --show to view current config or provide configuration options to update');
    console.log('\nExamples:');
    console.log('  fmt config --github-token ghp_xxx --github-owner myorg --github-repo myrepo');
    console.log('  fmt config --jira-host company.atlassian.net --jira-username user@company.com --jira-password xxx');
    console.log('  fmt config --show');
    console.log('  fmt config --clear');
  }
};
