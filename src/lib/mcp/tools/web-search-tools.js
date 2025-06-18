// Update your web-search-tools.js with enhanced debugging

import { QuotaManager } from '../utils/quota-manager.js';
import { webSearchCache } from '../utils/cache-manager.js';
import { QuotaNotifications } from '../utils/quota-notifications.js';
import { ErrorMonitor } from '../../error-monitoring.js';

export const webSearchTools = {
    getToolDefinitions() {
        return [
            {
                name: "web_search_with_tavily",
                description: "Search the web using Tavily API when community content is insufficient",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Search query for web search"
                        },
                        userId: {
                            type: "string",
                            description: "User ID for quota management"
                        },
                        includeImages: {
                            type: "boolean",
                            description: "Whether to include images in results",
                            default: false
                        },
                        maxResults: {
                            type: "number",
                            description: "Maximum number of results to return",
                            default: 5
                        }
                    },
                    required: ["query", "userId"]
                }
            },
            {
                name: "web_check_quota",
                description: "Check user's remaining web search quota",
                inputSchema: {
                    type: "object",
                    properties: {
                        userId: {
                            type: "string",
                            description: "User ID to check quota for"
                        }
                    },
                    required: ["userId"]
                }
            }
        ];
    },

    async handleTool(toolName, args) {
        console.log(`🔧 webSearchTools.handleTool called: ${toolName}`, args);
        
        try {
            switch (toolName) {
                case 'web_search_with_tavily':
                    return await this.searchWeb(args);
                case 'web_check_quota':
                    return await this.checkQuota(args);
                default:
                    throw new Error(`Unknown web search tool: ${toolName}`);
            }
        } catch (error) {
            console.error(`💥 Web search tool error (${toolName}):`, error);
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        error: error.message,
                        fallbackMessage: "flokkk failed to get information from the web. Please try again later."
                    })
                }],
                isError: true
            };
        }
    },

    async checkQuota(args) {
        console.log('📊 Checking web search quota...');
        const { userId } = args;
        const quota = await QuotaManager.checkWebSearchQuota(userId);
        
        console.log('📊 Quota check result:', quota);

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    quota: quota,
                    canSearch: quota.allowed
                })
            }]
        };
    },

    async searchWeb(args) {
        const { query, userId, includeImages = false, maxResults = 5 } = args;
        console.log(`🌐 searchWeb called with query: "${query}", userId: ${userId}`);

        // Check cache first (24-hour cache as per business plan)
        console.log('🗄️ Checking cache...');
        const cachedResults = await webSearchCache.get(query);
        if (cachedResults) {
            console.log('✅ Found cached results for:', query);

            // Still consume quota for cached results (business decision)
            await QuotaManager.consumeWebSearchQuota(userId);
            const updatedQuota = await QuotaManager.checkWebSearchQuota(userId);

            // Send quota warning if needed
            await QuotaNotifications.sendQuotaWarning(
                userId, 
                updatedQuota.remaining, 
                updatedQuota.limit
            );

            // Send exhausted notification if quota is now 0
            if (updatedQuota.remaining === 0) {
                await QuotaNotifications.sendQuotaExhausted(userId);
            }

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        source: "web_search",
                        query: query,
                        results: cachedResults.results || [],
                        answer: cachedResults.answer || null,
                        quotaRemaining: updatedQuota.remaining,
                        searchSuccessful: true,
                        fromCache: true
                    })
                }]
            };
        }

        console.log('❌ No cached results found');

        // Check quota
        console.log('📊 Checking quota before search...');
        const quota = await QuotaManager.checkWebSearchQuota(userId);
        console.log('📊 Quota status:', quota);
        
        if (!quota.allowed) {
            const errorMsg = `Web search quota exceeded. ${quota.remaining} searches remaining today.`;
            console.error('❌ Quota exceeded:', errorMsg);
            throw new Error(errorMsg);
        }

        // Consume quota before search
        console.log('📉 Consuming web search quota...');
        await QuotaManager.consumeWebSearchQuota(userId);

        try {
            // Call Tavily API
            console.log('🔍 Calling Tavily API...');
            console.log('🔑 Using API key:', process.env.TAVILY_API_KEY ? 'Present' : 'Missing');
            
            const tavilyPayload = {
                query: query,
                search_depth: "basic",
                include_images: includeImages,
                include_answer: true,
                max_results: maxResults,
                include_domains: [],
                exclude_domains: []
            };
            
            console.log('📤 Tavily request payload:', tavilyPayload);
            
            const response = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
                },
                body: JSON.stringify(tavilyPayload)
            });

            console.log('📡 Tavily response status:', response.status);
            console.log('📡 Tavily response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Tavily API error response:', errorText);
                throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ Tavily API success:', {
                resultsCount: data.results?.length || 0,
                hasAnswer: !!data.answer,
                sampleResult: data.results?.[0]?.title || 'No results'
            });

            // IMPORTANT: Validate we actually got web search results
            if (!data.results || data.results.length === 0) {
                console.warn('⚠️ Tavily returned no results for query:', query);
            }

            // Cache the results for 24 hours
            console.log('🗄️ Caching results...');
            await webSearchCache.set(query, {
                results: data.results || [],
                answer: data.answer || null,
                timestamp: new Date()
            });

            const updatedQuota = await QuotaManager.checkWebSearchQuota(userId);
            console.log('📊 Updated quota after search:', updatedQuota.remaining);

            // Send quota warning if needed
            await QuotaNotifications.sendQuotaWarning(
                userId, 
                updatedQuota.remaining, 
                updatedQuota.limit
            );

            // Send exhausted notification if quota is now 0
            if (updatedQuota.remaining === 0) {
                await QuotaNotifications.sendQuotaExhausted(userId);
            }

            const result = {
                source: "web_search",
                query: query,
                results: data.results || [],
                answer: data.answer || null,
                quotaRemaining: updatedQuota.remaining,
                searchSuccessful: true,
                fromCache: false
            };

            console.log('🎉 Web search completed successfully:', {
                resultsCount: result.results.length,
                hasAnswer: !!result.answer,
                quotaRemaining: result.quotaRemaining
            });

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(result)
                }]
            };

        } catch (searchError) {
            console.error('💥 Web search failed:', searchError);
            console.error('🔥 Search error stack:', searchError.stack);
            throw new Error(`Web search failed: ${searchError.message}`);
        }
    }
};