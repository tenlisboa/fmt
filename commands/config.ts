export const command = 'config';
export const describe = 'Configure credentials and team settings';
export const builder = (yargs: any) => {
  return yargs
    .option('github-token', {
      type: 'string',
      describe: 'GitHub personal access token'
    })
    .option('jira-url', {
      type: 'string',
      describe: 'Jira base URL'
    })
    .option('jira-token', {
      type: 'string',
      describe: 'Jira API token'
    });
};

export const handler = (argv: any) => {
  console.log('🔧 Saving config...');
  // TODO: Persist config securely
};
