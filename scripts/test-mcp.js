// Test script for MCP functionality
const { SearchHandler } = require('../src/lib/mcp/handlers/search-handler');
const { mcpServer } = require('../src/lib/mcp/server');

async function testMCPFunctionality() {
    console.log('🧪 Testing MCP Functionality...\n');

    try {
        // Test 1: Community search
        console.log('1️⃣ Testing community search...');
        const communityResult = await SearchHandler.handleUserQuery(
            'React best practices',
            'test-user-id',
            'dark',
            false
        );
        console.log('✅ Community search completed');
        console.log('Has community content:', communityResult.hasCommunityContent);
        console.log('Quota remaining:', communityResult.quotaRemaining);
        console.log('');

        // Test 2: Database tools directly
        console.log('2️⃣ Testing database tools...');
        const dbResult = await mcpServer.handleToolCall('database_search_community', {
            query: 'JavaScript frameworks',
            limit: 5
        });
        console.log('✅ Database tool test completed');
        console.log('');

        // Test 3: Quota tools
        console.log('3️⃣ Testing quota tools...');
        const quotaResult = await mcpServer.handleToolCall('quota_check_web_search', {
            userId: 'test-user-id'
        });
        console.log('✅ Quota tool test completed');
        console.log('');

        console.log('🎉 All MCP tests passed!');

    } catch (error) {
        console.error('❌ MCP test failed:', error);
    }
}

// Run tests if called directly
if (require.main === module) {
    testMCPFunctionality();
}

module.exports = { testMCPFunctionality };