export const command = 'who';
export const describe = 'List known team members and aliases';
export const handler = () => {
    // TODO: Load from config or mapping file
    console.log('👥 Team members:');
    console.log('- Alice');
    console.log('- Bob');
    console.log('- Charlie');
};
