import prompts from 'prompts';
import { ConfigManager } from '../lib/config.js';
import { TeamMember } from '../types.js';

export const command = 'setup';
export const describe = 'Setup and manage team members';
export const builder = (yargs: any) => {
  return yargs
    .option('show', {
      type: 'boolean',
      describe: 'Show current team members'
    })
    .option('clear', {
      type: 'boolean',
      describe: 'Clear all team members'
    });
};

async function promptTeamMember(): Promise<TeamMember | null> {
  console.log('\n👤 Add Team Member');
  
  const response = await prompts([
    {
      type: 'text',
      name: 'name',
      message: 'What is the team member\'s name?',
      validate: (value: string) => value.trim().length > 0 || 'Name is required'
    },
    {
      type: 'text',
      name: 'email',
      message: 'What is their email address? (optional, press Enter to skip)',
      initial: '',
      validate: (value: string) => {
        if (!value.trim()) return true; // Optional field
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) || 'Please enter a valid email address';
      }
    },
    {
      type: 'text',
      name: 'githubUsername',
      message: 'What is their GitHub username? (optional, press Enter to skip)',
      initial: ''
    },
    {
      type: 'text',
      name: 'jiraUsername',
      message: 'What is their Jira username? (optional, press Enter to skip)',
      initial: ''
    }
  ]);

  if (!response.name) {
    console.log('❌ Team member setup cancelled');
    return null;
  }

  return {
    name: response.name.trim(),
    email: response.email?.trim() || undefined,
    githubUsername: response.githubUsername?.trim() || undefined,
    jiraUsername: response.jiraUsername?.trim() || undefined
  };
}

async function addTeamMembers(): Promise<void> {
  const existingMembers = ConfigManager.getTeamMembers() || [];
  const newMembers: TeamMember[] = [...existingMembers];

  while (true) {
    const member = await promptTeamMember();
    if (!member) break;

    // Check if member already exists (by name)
    const existingMember = newMembers.find(m => m.name.toLowerCase() === member.name.toLowerCase());
    if (existingMember) {
      const overwrite = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: `Team member "${member.name}" already exists. Do you want to update their information?`,
        initial: false
      });

      if (overwrite.overwrite) {
        const index = newMembers.findIndex(m => m.name.toLowerCase() === member.name.toLowerCase());
        newMembers[index] = member;
        console.log(`✅ Updated team member: ${member.name}`);
      } else {
        console.log(`⏭️  Skipped: ${member.name}`);
      }
    } else {
      newMembers.push(member);
      console.log(`✅ Added team member: ${member.name}`);
    }

    const addAnother = await prompts({
      type: 'confirm',
      name: 'continue',
      message: 'Would you like to add another team member?',
      initial: true
    });

    if (!addAnother.continue) break;
  }

  if (newMembers.length > existingMembers.length || 
      JSON.stringify(newMembers) !== JSON.stringify(existingMembers)) {
    ConfigManager.setTeamMembers(newMembers);
    console.log('\n🎉 Team members saved successfully!');
  } else {
    console.log('\n📋 No changes made to team members.');
  }
}

function displayTeamMembers(): void {
  const teamMembers = ConfigManager.getTeamMembers();
  
  if (!teamMembers || teamMembers.length === 0) {
    console.log('👥 No team members configured');
    return;
  }

  console.log('👥 Current team members:');
  teamMembers.forEach((member, index) => {
    console.log(`\n  ${index + 1}. ${member.name}`);
    if (member.email) console.log(`     📧 Email: ${member.email}`);
    if (member.githubUsername) console.log(`     🐙 GitHub: ${member.githubUsername}`);
    if (member.jiraUsername) console.log(`     🔷 Jira: ${member.jiraUsername}`);
  });
  
  console.log(`\nTotal: ${teamMembers.length} team member${teamMembers.length === 1 ? '' : 's'}`);
}

export const handler = async (argv: any) => {
  if (argv.show) {
    displayTeamMembers();
    return;
  }

  if (argv.clear) {
    const teamMembers = ConfigManager.getTeamMembers();
    if (!teamMembers || teamMembers.length === 0) {
      console.log('👥 No team members to clear');
      return;
    }

    const response = await prompts({
      type: 'confirm',
      name: 'confirmClear',
      message: `Are you sure you want to remove all ${teamMembers.length} team member${teamMembers.length === 1 ? '' : 's'}?`,
      initial: false
    });

    if (response.confirmClear) {
      ConfigManager.setTeamMembers([]);
      console.log('🗑️  All team members cleared successfully!');
    } else {
      console.log('❌ Clear operation cancelled');
    }
    return;
  }

  // Interactive team member setup mode
  console.log('👥 Welcome to FMT Team Setup!');
  console.log('Let\'s configure your team members step by step.\n');

  const existingMembers = ConfigManager.getTeamMembers();
  if (existingMembers && existingMembers.length > 0) {
    console.log(`📋 You currently have ${existingMembers.length} team member${existingMembers.length === 1 ? '' : 's'} configured.`);
    displayTeamMembers();
    console.log();
  }

  const action = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      { title: 'Add new team members', value: 'add' },
      { title: 'Show current team members', value: 'show' },
      { title: 'Clear all team members', value: 'clear' }
    ]
  });

  switch (action.action) {
    case 'add':
      await addTeamMembers();
      console.log('\n💡 Tip: Use `fmt setup --show` to view your team members anytime.');
      break;
    case 'show':
      displayTeamMembers();
      break;
    case 'clear':
      const response = await prompts({
        type: 'confirm',
        name: 'confirmClear',
        message: 'Are you sure you want to clear all team members?',
        initial: false
      });

      if (response.confirmClear) {
        ConfigManager.setTeamMembers([]);
        console.log('🗑️  All team members cleared successfully!');
      } else {
        console.log('❌ Clear operation cancelled');
      }
      break;
    default:
      console.log('❌ No action selected');
  }
}; 