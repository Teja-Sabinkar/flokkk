// Update your search-handler.js with enhanced debugging

import { databaseTools } from '../tools/database-tools.js';
import { webSearchTools } from '../tools/web-search-tools.js';
import { quotaTools } from '../tools/quota-tools.js';
import { ResponseFormatter } from '../utils/response-formatter.js';

export class SearchHandler {
    static async handleUserQuery(query, userId, theme = 'dark', webSearchRequested = false) {
        console.log('🔍 SearchHandler.handleUserQuery called with:', {
            query,
            userId,
            theme,
            webSearchRequested
        });

        try {
            // Step 1: Always search community database first
            console.log('1️⃣ Searching community database...');
            const communityResults = await this.searchCommunityFirst(query);
            console.log('✅ Community search completed:', {
                postsFound: communityResults.posts?.length || 0,
                linksFound: communityResults.links?.length || 0
            });

            // Step 2: If web search is requested, check quota and search
            if (webSearchRequested) {
                console.log('2️⃣ Web search requested, proceeding...');
                return await this.handleWebSearchRequest(query, userId, communityResults, theme);
            } else {
                console.log('2️⃣ Web search NOT requested, returning community results only');
            }

            // Step 3: Format community-only response with web search option
            console.log('3️⃣ Formatting community-only response...');
            return await this.formatCommunityOnlyResponse(query, userId, communityResults, theme);

        } catch (error) {
            console.error('💥 SearchHandler error:', error);
            return {
                response: ResponseFormatter.formatErrorResponse(error.message, theme),
                hasMoreOptions: false,
                quotaRemaining: 0
            };
        }
    }

    static async searchCommunityFirst(query) {
        try {
            console.log('🏠 Searching community database for:', query);

            // Extract keywords for better searching
            const keywords = this.extractKeywords(query);
            console.log('🔑 Extracted keywords:', keywords);

            // Search community database
            const databaseResult = await databaseTools.handleTool('database_search_community', {
                query: query,
                keywords: keywords,
                limit: 10
            });

            const communityData = JSON.parse(databaseResult.content[0].text);
            console.log('📊 Community search results:', {
                postsFound: communityData.results?.posts?.length || 0,
                linksFound: communityData.results?.links?.length || 0
            });

            return communityData.results;

        } catch (error) {
            console.error('💥 Community search error:', error);
            return { posts: [], links: [], comments: [] };
        }
    }

    static async handleWebSearchRequest(query, userId, communityResults, theme) {
        console.log('🌐 handleWebSearchRequest called');

        try {
            // Check web search quota
            console.log('📊 Checking web search quota...');
            const quotaResult = await quotaTools.handleTool('quota_check_web_search', { userId });
            const quotaData = JSON.parse(quotaResult.content[0].text);

            console.log('📊 Quota check result:', quotaData);

            if (!quotaData.canSearch) {
                console.warn('⚠️ Web search quota exceeded');
                return {
                    response: ResponseFormatter.formatErrorResponse(
                        `Web search quota exceeded. ${quotaData.webSearchQuota.remaining} searches remaining today.`,
                        theme
                    ),
                    hasMoreOptions: false,
                    quotaRemaining: quotaData.webSearchQuota.remaining,
                    webSearchFailed: true
                };
            }

            console.log('✅ Quota check passed, proceeding with web search');

            // Perform web search
            console.log('🔍 Calling web search tool...');
            const webSearchResult = await webSearchTools.handleTool('web_search_with_tavily', {
                query: query,
                userId: userId,
                maxResults: 5
            });

            if (webSearchResult.isError) {
                console.error('❌ Web search tool error:', webSearchResult.content[0].text);
                return await this.handleWebSearchFailure(query, userId, communityResults, theme, webSearchResult.content[0].text);
            }

            const webData = JSON.parse(webSearchResult.content[0].text);
            console.log('✅ Web search successful:', {
                resultsCount: webData.results?.length || 0,
                hasAnswer: !!webData.answer,
                fromCache: webData.fromCache
            });

            // Format web-only response (no community results)
            console.log('🎨 Formatting web-only response...');
            const webOnlyResponse = ResponseFormatter.formatWebSearchResponse(
                webData,
                query,
                webData.quotaRemaining,
                theme
            );

            console.log('✅ Web-only response formatted, length:', webOnlyResponse.length);

            return {
                response: webOnlyResponse,
                hasMoreOptions: false,
                quotaRemaining: webData.quotaRemaining,
                webSearchUsed: true,
                hasCommunityContent: communityResults.posts.length > 0 || communityResults.links.length > 0
            };

        } catch (error) {
            console.error('💥 Web search request error:', error);
            return await this.handleWebSearchFailure(query, userId, communityResults, theme, error.message);
        }
    }

    static async handleWebSearchFailure(query, userId, communityResults, theme, errorMessage) {
        console.log('⚠️ Handling web search failure');

        // If web search fails, show community results with error
        const communityResponse = ResponseFormatter.formatCommunityResponse(communityResults, query, theme);
        const errorNote = ResponseFormatter.formatErrorResponse(
            "flokkk failed to get information from the web. Please try again later.",
            theme
        );

        return {
            response: communityResponse + errorNote,
            hasMoreOptions: false,
            quotaRemaining: 0,
            webSearchFailed: true,
            webSearchFailureReason: errorMessage
        };
    }

    static async formatCommunityOnlyResponse(query, userId, communityResults, theme) {
        try {
            console.log('🏠 Formatting community-only response');

            // Get web search quota to show button
            const quotaResult = await quotaTools.handleTool('quota_check_web_search', { userId });
            const quotaData = JSON.parse(quotaResult.content[0].text);

            let response = '';

            // Format community results
            if (communityResults.posts.length > 0 || communityResults.links.length > 0) {
                response = ResponseFormatter.formatCommunityResponse(communityResults, query, theme);
            } else {
                response = ResponseFormatter.formatNoCommunityContent(query, theme);
            }

            // Add web search button
            response += ResponseFormatter.formatWebSearchButton(
                query,
                quotaData.webSearchQuota.remaining,
                theme
            );

            return {
                response: response,
                hasMoreOptions: quotaData.webSearchQuota.remaining > 0,
                quotaRemaining: quotaData.webSearchQuota.remaining,
                hasCommunityContent: communityResults.posts.length > 0 || communityResults.links.length > 0
            };

        } catch (error) {
            console.error('💥 Error formatting community response:', error);
            return {
                response: ResponseFormatter.formatCommunityResponse(communityResults, query, theme),
                hasMoreOptions: false,
                quotaRemaining: 0
            };
        }
    }

    static extractKeywords(query) {
        // Simple keyword extraction - can be enhanced later
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those'
        ]);

        const words = query.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word));

        // Extract 2-word phrases as well
        const phrases = [];
        for (let i = 0; i < words.length - 1; i++) {
            phrases.push(`${words[i]} ${words[i + 1]}`);
        }

        return [...new Set([...words, ...phrases])].slice(0, 8);
    }
}