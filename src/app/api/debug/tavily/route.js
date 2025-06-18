// Create this file: src/app/api/debug/tavily/route.js
// This API route will help debug Tavily connectivity

import { NextResponse } from 'next/server';

export async function GET() {
    const debugResults = {
        timestamp: new Date().toISOString(),
        environment: {},
        tavilyTest: {},
        connectivity: {}
    };

    try {
        // 1. Check environment variables
        console.log('🔍 Checking environment variables...');
        debugResults.environment = {
            hasTavilyKey: !!process.env.TAVILY_API_KEY,
            keyLength: process.env.TAVILY_API_KEY?.length || 0,
            keyPrefix: process.env.TAVILY_API_KEY?.substring(0, 8) || 'None',
            nodeEnv: process.env.NODE_ENV
        };

        if (!process.env.TAVILY_API_KEY) {
            debugResults.tavilyTest.error = 'TAVILY_API_KEY not found in environment';
            return NextResponse.json(debugResults, { status: 500 });
        }

        // 2. Test Tavily API connectivity
        console.log('🌐 Testing Tavily API...');
        
        const tavilyResponse = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
            },
            body: JSON.stringify({
                query: 'test query for debugging',
                search_depth: "basic",
                include_images: false,
                include_answer: true,
                max_results: 2,
                include_domains: [],
                exclude_domains: []
            })
        });

        debugResults.tavilyTest = {
            status: tavilyResponse.status,
            statusText: tavilyResponse.statusText,
            ok: tavilyResponse.ok,
            headers: Object.fromEntries(tavilyResponse.headers.entries())
        };

        if (tavilyResponse.ok) {
            const data = await tavilyResponse.json();
            debugResults.tavilyTest.success = true;
            debugResults.tavilyTest.resultsCount = data.results?.length || 0;
            debugResults.tavilyTest.hasAnswer = !!data.answer;
            debugResults.tavilyTest.sampleResult = data.results?.[0]?.title || 'No results';
        } else {
            const errorText = await tavilyResponse.text();
            debugResults.tavilyTest.success = false;
            debugResults.tavilyTest.error = errorText;
        }

        // 3. Test network connectivity
        console.log('🔗 Testing network connectivity...');
        try {
            const connectivityTest = await fetch('https://api.tavily.com/', {
                method: 'GET',
                timeout: 5000
            });
            debugResults.connectivity.reachable = true;
            debugResults.connectivity.status = connectivityTest.status;
        } catch (connError) {
            debugResults.connectivity.reachable = false;
            debugResults.connectivity.error = connError.message;
        }

        return NextResponse.json(debugResults);

    } catch (error) {
        console.error('❌ Debug API error:', error);
        debugResults.error = error.message;
        debugResults.stack = error.stack;
        return NextResponse.json(debugResults, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { query } = await request.json();
        
        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        console.log(`🧪 Testing Tavily with custom query: ${query}`);

        // Test with the provided query
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
            },
            body: JSON.stringify({
                query: query,
                search_depth: "basic",
                include_images: false,
                include_answer: true,
                max_results: 5,
                include_domains: [],
                exclude_domains: []
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({
                success: false,
                status: response.status,
                error: errorText
            }, { status: response.status });
        }

        const data = await response.json();
        
        return NextResponse.json({
            success: true,
            query: query,
            resultsCount: data.results?.length || 0,
            hasAnswer: !!data.answer,
            answer: data.answer,
            results: data.results?.map(result => ({
                title: result.title,
                url: result.url,
                content: result.content?.substring(0, 200) + '...'
            })) || []
        });

    } catch (error) {
        console.error('❌ POST debug error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}