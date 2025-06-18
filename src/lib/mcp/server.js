import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { databaseTools } from './tools/database-tools.js';
import { webSearchTools } from './tools/web-search-tools.js';
import { quotaTools } from './tools/quota-tools.js';

export class FlokkkMCPServer {
    constructor() {
        this.server = new Server(
            {
                name: process.env.MCP_SERVER_NAME || 'flokkk-mcp',
                version: process.env.MCP_SERVER_VERSION || '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupToolHandlers();
    }

    setupToolHandlers() {
        // List all available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            console.log('MCP: Listing tools');
            return {
                tools: [
                    ...databaseTools.getToolDefinitions(),
                    ...webSearchTools.getToolDefinitions(),
                    ...quotaTools.getToolDefinitions(),
                ]
            };
        });

        // Handle tool execution
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            console.log(`MCP: Executing tool ${name} with args:`, args);

            try {
                let result;

                // Route to appropriate tool handler
                if (name.startsWith('database_')) {
                    result = await databaseTools.handleTool(name, args);
                } else if (name.startsWith('web_')) {
                    result = await webSearchTools.handleTool(name, args);
                } else if (name.startsWith('quota_')) {
                    result = await quotaTools.handleTool(name, args);
                } else {
                    throw new Error(`Unknown tool: ${name}`);
                }

                console.log(`MCP: Tool ${name} executed successfully`);
                return result;

            } catch (error) {
                console.error(`MCP: Tool ${name} failed:`, error);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            error: error.message,
                            tool: name,
                            timestamp: new Date().toISOString()
                        })
                    }],
                    isError: true
                };
            }
        });
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.log('Flokkk MCP Server started successfully');
        return this.server;
    }

    // Method for in-process usage (Next.js integration)
    async handleToolCall(toolName, args) {
        try {
            console.log(`Direct MCP call: ${toolName}`);
            
            if (toolName.startsWith('database_')) {
                return await databaseTools.handleTool(toolName, args);
            } else if (toolName.startsWith('web_')) {
                return await webSearchTools.handleTool(toolName, args);
            } else if (toolName.startsWith('quota_')) {
                return await quotaTools.handleTool(toolName, args);
            } else {
                throw new Error(`Unknown tool: ${toolName}`);
            }
        } catch (error) {
            console.error(`Direct MCP call failed: ${toolName}`, error);
            throw error;
        }
    }
}

// Export singleton instance for in-process usage
export const mcpServer = new FlokkkMCPServer();