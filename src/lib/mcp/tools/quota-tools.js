import { QuotaManager } from '../utils/quota-manager.js';

export const quotaTools = {
    getToolDefinitions() {
        return [
            {
                name: "quota_get_status",
                description: "Get comprehensive quota status for a user (AI requests + web searches)",
                inputSchema: {
                    type: "object",
                    properties: {
                        userId: {
                            type: "string",
                            description: "User ID to check status for"
                        }
                    },
                    required: ["userId"]
                }
            },
            {
                name: "quota_check_web_search",
                description: "Check specifically web search quota for user",
                inputSchema: {
                    type: "object",
                    properties: {
                        userId: {
                            type: "string",
                            description: "User ID to check web search quota for"
                        }
                    },
                    required: ["userId"]
                }
            }
        ];
    },

    async handleTool(toolName, args) {
        try {
            switch (toolName) {
                case 'quota_get_status':
                    return await this.getFullStatus(args);
                case 'quota_check_web_search':
                    return await this.checkWebSearchQuota(args);
                default:
                    throw new Error(`Unknown quota tool: ${toolName}`);
            }
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        error: error.message,
                        quotaCheckFailed: true
                    })
                }],
                isError: true
            };
        }
    },

    async getFullStatus(args) {
        const { userId } = args;
        const status = await QuotaManager.getFullStatus(userId);
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    status: status,
                    timestamp: new Date().toISOString()
                })
            }]
        };
    },

    async checkWebSearchQuota(args) {
        const { userId } = args;
        const quota = await QuotaManager.checkWebSearchQuota(userId);
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    webSearchQuota: quota,
                    canSearch: quota.allowed,
                    remaining: quota.remaining
                })
            }]
        };
    }
};