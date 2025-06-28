import { Argv } from 'yargs';

export const command = 'ask <question>';
export const describe = 'Ask the AI agent about a team member or status';
export const builder = (yargs: Argv) => {
  return yargs.positional('question', {
    describe: 'The question to ask (e.g., "How is Alice doing this sprint?")',
    type: 'string'
  });
};

export const handler = async (argv: any) => {
  const { question } = argv;
  console.log(`🤖 Thinking about: "${question}"`);
  // TODO: Call agent logic
  // const response = await agent.query(question);
  // console.log(response);
};
