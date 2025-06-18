import { claudeDbService } from '@/lib/claudeDbService';

export const databaseTools = {
    getToolDefinitions() {
        return [
            {
                name: "database_search_community",
                description: "Search flokkk community discussions, posts, and links for relevant content",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Search query for community content"
                        },
                        keywords: {
                            type: "array",
                            items: { type: "string" },
                            description: "Extracted keywords for better matching"
                        },
                        limit: {
                            type: "number",
                            description: "Maximum number of results to return",
                            default: 10
                        }
                    },
                    required: ["query"]
                }
            },
            {
                name: "database_get_post_details",
                description: "Get detailed information about a specific post",
                inputSchema: {
                    type: "object",
                    properties: {
                        postId: {
                            type: "string",
                            description: "ID of the post to retrieve"
                        }
                    },
                    required: ["postId"]
                }
            },
            {
                name: "database_find_similar_content",
                description: "Find content similar to given keywords with relevance scoring",
                inputSchema: {
                    type: "object",
                    properties: {
                        keywords: {
                            type: "array",
                            items: { type: "string" },
                            description: "Keywords to find similar content for"
                        },
                        limit: {
                            type: "number",
                            description: "Maximum number of results",
                            default: 15
                        }
                    },
                    required: ["keywords"]
                }
            }
        ];
    },

    async handleTool(toolName, args) {
        try {
            switch (toolName) {
                case 'database_search_community':
                    return await this.searchCommunity(args);
                case 'database_get_post_details':
                    return await this.getPostDetails(args);
                case 'database_find_similar_content':
                    return await this.findSimilarContent(args);
                default:
                    throw new Error(`Unknown database tool: ${toolName}`);
            }
        } catch (error) {
            return {
                content: [{
                    type: "text",
                    text: `Database search error: ${error.message}`
                }],
                isError: true
            };
        }
    },

    async searchCommunity(args) {
        const { query, keywords, limit = 10 } = args;
        
        // Use existing claudeDbService for comprehensive search
        const results = await claudeDbService.comprehensiveSearch(query, limit);
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    source: "flokkk_community",
                    query: query,
                    results: results,
                    hasContent: results.posts.length > 0 || results.links.length > 0,
                    summary: `Found ${results.posts.length} discussions and ${results.links.length} links in flokkk community`
                })
            }]
        };
    },

    async getPostDetails(args) {
        const { postId } = args;
        const post = await claudeDbService.getPostById(postId);
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    source: "flokkk_community",
                    post: post,
                    hasContent: !!post
                })
            }]
        };
    },

    async findSimilarContent(args) {
        const { keywords, limit = 15 } = args;
        const results = await claudeDbService.findSimilarByKeywords(keywords, limit);
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    source: "flokkk_community",
                    keywords: keywords,
                    results: results,
                    hasContent: results.posts.length > 0 || results.links.length > 0,
                    relevanceThreshold: 0.7
                })
            }]
        };
    }
};