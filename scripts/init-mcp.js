// MCP system initialization script
const { StartupInitializer } = require('../src/lib/startup-init.js');

async function initializeMCP() {
    try {
        console.log('Starting MCP initialization...');
        
        const result = await StartupInitializer.initialize();
        
        console.log('MCP initialization completed successfully');
        process.exit(0);
        
    } catch (error) {
        console.error('MCP initialization failed:', error);
        process.exit(1);
    }
}

initializeMCP();