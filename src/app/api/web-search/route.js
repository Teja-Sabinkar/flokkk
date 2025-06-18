// Update your /api/web-search/route.js with enhanced debugging

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { SearchHandler } from '@/lib/mcp/handlers/search-handler';
import { connectToDatabase } from '@/lib/mongodb';
import dbConnect from '@/lib/mongoose';

export async function POST(request) {
    console.log('🚀 WEB SEARCH API CALLED');
    
    try {
        // Connect to database
        await connectToDatabase();
        await dbConnect();
        console.log('✅ Database connected');

        // Get user authentication
        const headersList = headers();
        const authHeader = headersList.get('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('❌ No authorization header');
            return NextResponse.json(
                { error: 'Authentication required for web search' },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];
        let userId;
        
        try {
            const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
            userId = decoded.id;
            console.log('✅ User authenticated:', userId);
        } catch (error) {
            console.error('❌ Token verification failed:', error);
            return NextResponse.json(
                { error: 'Invalid authentication token' },
                { status: 401 }
            );
        }

        // Parse request body
        const { query, theme = 'dark' } = await request.json();
        
        if (!query) {
            console.error('❌ No query provided');
            return NextResponse.json(
                { error: 'Query is required' },
                { status: 400 }
            );
        }

        console.log(`🔍 Web search requested by user ${userId}: "${query}"`);
        console.log('🎨 Theme:', theme);

        // DEBUG: Test Tavily directly first
        console.log('🧪 Testing Tavily API directly...');
        try {
            const tavilyResponse = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
                },
                body: JSON.stringify({
                    query: query,
                    search_depth: "basic",
                    include_answer: true,
                    max_results: 3
                })
            });

            if (tavilyResponse.ok) {
                const tavilyData = await tavilyResponse.json();
                console.log('✅ Tavily direct test successful:', {
                    resultsCount: tavilyData.results?.length || 0,
                    hasAnswer: !!tavilyData.answer
                });
            } else {
                console.error('❌ Tavily direct test failed:', tavilyResponse.status);
            }
        } catch (tavilyError) {
            console.error('❌ Tavily direct test error:', tavilyError.message);
        }

        // Handle web search request through SearchHandler
        console.log('🔄 Calling SearchHandler with webSearchRequested = true');
        const result = await SearchHandler.handleUserQuery(
            query,
            userId,
            theme,
            true // webSearchRequested = true - THIS IS KEY!
        );

        console.log('📊 SearchHandler result:', {
            hasResponse: !!result.response,
            responseLength: result.response?.length || 0,
            quotaRemaining: result.quotaRemaining,
            webSearchUsed: result.webSearchUsed,
            webSearchFailed: result.webSearchFailed,
            hasCommunityContent: result.hasCommunityContent
        });

        // Check if we actually got web search results
        if (!result.webSearchUsed && !result.webSearchFailed) {
            console.warn('⚠️ WARNING: Web search was requested but not used!');
            console.warn('📊 Result details:', result);
        }

        // Check response content for web search indicators
        if (result.response) {
            const hasWebSearchContent = result.response.includes('🌐 From the broader web:') || 
                                      result.response.includes('web-search-header');
            const hasCommunityContent = result.response.includes('🏠 From flokkk Community:') || 
                                      result.response.includes('community-header');
            
            console.log('🔍 Response content analysis:', {
                hasWebSearchContent,
                hasCommunityContent,
                responsePreview: result.response.substring(0, 200) + '...'
            });

            if (!hasWebSearchContent && hasCommunityContent) {
                console.error('🚨 PROBLEM: Response contains only community content, no web search results!');
            }
        }

        return NextResponse.json({
            response: result.response,
            quotaRemaining: result.quotaRemaining,
            webSearchUsed: result.webSearchUsed || false,
            webSearchFailed: result.webSearchFailed || false,
            // DEBUG: Add more info
            debug: {
                userId,
                query,
                hasCommunityContent: result.hasCommunityContent,
                searchHandlerResult: {
                    webSearchUsed: result.webSearchUsed,
                    webSearchFailed: result.webSearchFailed,
                    quotaRemaining: result.quotaRemaining
                }
            }
        });

    } catch (error) {
        console.error('💥 Web search API error:', error);
        console.error('🔥 Stack trace:', error.stack);
        return NextResponse.json(
            {
                error: 'Web search failed',
                message: error.message,
                debug: {
                    errorType: error.constructor.name,
                    stack: error.stack
                }
            },
            { status: 500 }
        );
    }
}