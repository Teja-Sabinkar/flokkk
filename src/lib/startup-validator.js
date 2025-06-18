// Startup validation to ensure all required services are available
export class StartupValidator {
    static async validateEnvironment() {
        const errors = [];
        const warnings = [];

        // Required environment variables
        const requiredEnvVars = [
            'CLAUDE_API_KEY',
            'MONGODB_URI',
            'NEXTAUTH_SECRET'
        ];

        // Optional but recommended
        const optionalEnvVars = [
            'TAVILY_API_KEY',
            'WEB_SEARCH_DAILY_LIMIT',
            'MCP_SERVER_NAME'
        ];

        // Check required variables
        requiredEnvVars.forEach(varName => {
            if (!process.env[varName]) {
                errors.push(`Missing required environment variable: ${varName}`);
            }
        });

        // Check optional variables
        optionalEnvVars.forEach(varName => {
            if (!process.env[varName]) {
                warnings.push(`Missing optional environment variable: ${varName}`);
            }
        });

        // Validate API keys format
        if (process.env.CLAUDE_API_KEY && !process.env.CLAUDE_API_KEY.startsWith('sk-ant-')) {
            warnings.push('CLAUDE_API_KEY format appears invalid');
        }

        if (process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY.length < 20) {
            warnings.push('TAVILY_API_KEY appears too short');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    static async validateServices() {
        const results = {
            database: false,
            claude: false,
            tavily: false,
            mcp: false
        };

        // Test database connection
        try {
            const { connectToDatabase } = await import('@/lib/mongodb');
            await connectToDatabase();
            results.database = true;
        } catch (error) {
            console.error('Database validation failed:', error.message);
        }

        // Test Claude API
        if (process.env.CLAUDE_API_KEY) {
            try {
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': process.env.CLAUDE_API_KEY,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: "claude-3-haiku-20240307",
                        max_tokens: 1,
                        messages: [{ role: "user", content: "test" }]
                    })
                });
                
                results.claude = response.status !== 401; // Any response other than unauthorized is good
            } catch (error) {
                console.error('Claude API validation failed:', error.message);
            }
        }

        // Test Tavily API
        if (process.env.TAVILY_API_KEY) {
            try {
                const response = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
                    },
                    body: JSON.stringify({
                        query: "test",
                        max_results: 1
                    })
                });
                
                results.tavily = response.status !== 401;
            } catch (error) {
                console.error('Tavily API validation failed:', error.message);
            }
        }

        // Test MCP server
        try {
            const { mcpServer } = await import('@/lib/mcp/server');
            results.mcp = !!mcpServer;
        } catch (error) {
            console.error('MCP validation failed:', error.message);
        }

        return results;
    }
}