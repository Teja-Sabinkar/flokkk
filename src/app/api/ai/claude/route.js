// /api/ai/claude/route.js - Enhanced with Discussion Analysis, New Suggestion System, and Theme Support
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import dbConnect from '@/lib/mongoose';
import Post from '@/models/Post';
import Comment from '@/models/Comment';
import UserSettings from '@/models/UserSettings';

// Safe imports with fallbacks
let rateLimiter = {
    checkRateLimit: async () => ({ allowed: true, remainingRequests: 30, resetTime: new Date() })
};

let responseCache = {
    generateCacheKey: () => 'key',
    get: async () => null,
    set: async () => { }
};

// Try to import utilities
try {
    const rateLimitModule = await import('@/lib/rateLimiting');
    if (rateLimitModule.rateLimiter) {
        rateLimiter = rateLimitModule.rateLimiter;
    }
} catch (e) {
    console.warn('rateLimiting module not available:', e.message);
}

try {
    const responseCacheModule = await import('@/lib/responseCache');
    if (responseCacheModule.responseCache) {
        responseCache = responseCacheModule.responseCache;
    }
} catch (e) {
    console.warn('responseCache module not available:', e.message);
}

// Theme detection and CSS variable mapping
async function detectUserTheme(userId, requestTheme = null) {
    console.log('Detecting theme for user:', userId, 'requestTheme:', requestTheme);

    try {
        // First priority: theme from request
        if (requestTheme && ['light', 'dark', 'system'].includes(requestTheme)) {
            console.log('Using theme from request:', requestTheme);
            return requestTheme === 'system' ? 'dark' : requestTheme; // Default system to dark for server-side
        }

        // Second priority: user settings from database
        if (userId) {
            try {
                const userSettings = await UserSettings.findOne({ userId: new ObjectId(userId) }).lean();
                if (userSettings?.displaySettings?.theme) {
                    const dbTheme = userSettings.displaySettings.theme;
                    console.log('Using theme from user settings:', dbTheme);
                    return dbTheme === 'system' ? 'dark' : dbTheme; // Default system to dark for server-side
                }
            } catch (dbError) {
                console.warn('Error fetching user theme from database:', dbError.message);
            }
        }

        // Fallback: default to dark theme
        console.log('Using default theme: dark');
        return 'dark';
    } catch (error) {
        console.error('Error in theme detection:', error);
        return 'dark'; // Safe fallback
    }
}

// Get theme-aware CSS variables
function getThemeVariables(theme) {
    const themes = {
        dark: {
            '--bg-primary': '#141414',
            '--bg-secondary': '#141414',
            '--bg-tertiary': '#202020',
            '--text-primary': '#f8f9fa',
            '--text-secondary': '#e5e7eb',
            '--text-tertiary': '#9ca3af',
            '--text-fourth': '#ffffff',
            '--border-color': '#2d2d2d',
            '--accent-color': '#3b82f6',
            '--danger-color': '#ef4444',
            '--success-color': '#4ade80',
            '--hover-overlay': 'rgba(255, 255, 255, 0.05)'
        },
        light: {
            '--bg-primary': '#f8f9fa',
            '--bg-secondary': '#f8f9fa',
            '--bg-tertiary': '#ededed',
            '--text-primary': '#1c1c1c',
            '--text-secondary': '#4b5563',
            '--text-tertiary': '#6b7280',
            '--text-fourth': '#ffffff',
            '--border-color': '#d1d5db',
            '--accent-color': '#2563eb',
            '--danger-color': '#dc2626',
            '--success-color': '#10b981',
            '--hover-overlay': 'rgba(0, 0, 0, 0.05)'
        }
    };

    return themes[theme] || themes.dark;
}

// Helper function to generate CSS variables string
function generateThemeCSS(theme) {
    const variables = getThemeVariables(theme);
    return Object.entries(variables)
        .map(([property, value]) => `${property}: ${value}`)
        .join('; ');
}

// Helper function to get specific theme color
function getThemeColor(theme, colorVar) {
    const variables = getThemeVariables(theme);
    return variables[colorVar] || variables['--text-primary'];
}

export async function POST(request) {
    console.log('Claude API route called');

    try {
        // Get authentication info if available
        const headersList = headers();
        const authHeader = headersList.get('Authorization');
        let userId = null;
        let username = 'Anonymous User';
        let userTheme = 'dark'; // Default theme

        console.log('Setting up database connections...');

        // Connect to database with error handling
        try {
            await connectToDatabase();
            await dbConnect();
            console.log('Database connected successfully');
        } catch (dbError) {
            console.error('Database connection error:', dbError);
            return NextResponse.json(
                { error: 'Database connection failed', details: dbError.message },
                { status: 500 }
            );
        }

        // Verify user if token provided
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
                userId = decoded.id;
                console.log('User authenticated:', userId);
            } catch (error) {
                console.warn('Invalid token provided to Claude API:', error.message);
            }
        }

        // Parse request body
        let requestData;
        try {
            requestData = await request.json();
            console.log('Request data parsed:', Object.keys(requestData));
        } catch (parseError) {
            console.error('Request parsing error:', parseError);
            return NextResponse.json(
                { error: 'Invalid request format', details: parseError.message },
                { status: 400 }
            );
        }

        const {
            message,
            context,
            username: providedUsername,
            source = 'manual',
            suggestionType = null,
            postId = null,
            showMoreType = null,
            originalQuery = null,
            theme: requestTheme = null // NEW: Theme from frontend
        } = requestData;

        console.log('Processing request:', { source, suggestionType, postId, showMoreType, requestTheme });

        // Detect user theme
        userTheme = await detectUserTheme(userId, requestTheme);
        console.log('Detected user theme:', userTheme);

        // Use username from request if provided and no authenticated user
        if (providedUsername && !userId) {
            username = providedUsername;
        }

        // Validate required fields
        if (!message) {
            console.error('Missing message in request');
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Rate limiting check with fallback
        const rateLimitUserId = userId || 'anonymous';
        let rateLimit;
        try {
            rateLimit = await rateLimiter.checkRateLimit(rateLimitUserId, source);
            console.log('Rate limit check passed:', rateLimit.allowed);
        } catch (rateLimitError) {
            console.warn('Rate limit check failed:', rateLimitError);
            rateLimit = { allowed: true, remainingRequests: 30, resetTime: new Date() };
        }

        if (!rateLimit.allowed) {
            return NextResponse.json({
                error: 'Rate limit exceeded',
                message: rateLimit.message || 'Too many requests',
                resetTime: rateLimit.resetTime,
                remainingRequests: rateLimit.remainingRequests,
                theme: userTheme // Include theme in error response
            }, { status: 429 });
        }

        // Check Claude API key
        if (!process.env.CLAUDE_API_KEY) {
            console.error('CLAUDE_API_KEY is not defined in environment variables');
            return NextResponse.json(
                { error: 'Claude API not configured', theme: userTheme },
                { status: 500 }
            );
        }

        console.log('Processing request type:', { source, suggestionType, showMoreType });

        // Handle show more requests
        if (showMoreType && originalQuery) {
            console.log('Handling show more request:', showMoreType);
            try {
                const showMoreResult = await handleShowMoreRequest(showMoreType, originalQuery, message, postId, username, userTheme);
                return NextResponse.json({
                    ...showMoreResult,
                    theme: userTheme // Include theme in response
                }, {
                    headers: {
                        'X-RateLimit-Limit': source === 'suggestion' ? '60' : '30',
                        'X-RateLimit-Remaining': rateLimit.remainingRequests.toString(),
                        'X-RateLimit-Reset': rateLimit.resetTime.toISOString()
                    }
                });
            } catch (showMoreError) {
                console.error('Show more request failed:', showMoreError);
                return NextResponse.json({
                    response: "I couldn't load additional content. Please try again.",
                    model: "claude-3-haiku-20240307",
                    usage: null,
                    dataAvailable: [],
                    hasMoreDb: false,
                    hasMoreAi: false,
                    theme: userTheme
                }, { status: 200 });
            }
        }

        // Process the request based on source and type
        let responseData;
        try {
            if (source === 'suggestion') {
                console.log('Handling suggestion query:', suggestionType);
                responseData = await handleSuggestionQuery(message, suggestionType, postId, username, userTheme);
            } else {
                console.log('Handling manual query');
                responseData = await handleManualQuery(message, context, username, postId, userTheme);
            }
        } catch (processingError) {
            console.error('Request processing error:', processingError);
            return NextResponse.json(
                {
                    error: 'Processing failed',
                    details: processingError.message,
                    response: "I encountered an error processing your request. Please try again.",
                    theme: userTheme
                },
                { status: 200 } // Return 200 with error message instead of 500
            );
        }

        console.log('Request processed successfully');

        return NextResponse.json({
            ...responseData,
            theme: userTheme // Include theme in successful response
        }, {
            headers: {
                'X-RateLimit-Limit': source === 'suggestion' ? '60' : '30',
                'X-RateLimit-Remaining': rateLimit.remainingRequests.toString(),
                'X-RateLimit-Reset': rateLimit.resetTime.toISOString()
            }
        });

    } catch (error) {
        console.error('Claude AI handler error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error.message,
                response: "I'm experiencing technical difficulties. Please try again in a moment.",
                theme: 'dark' // Safe fallback theme
            },
            { status: 200 } // Return 200 with error message instead of 500
        );
    }
}

// Handle suggestion queries (theme-aware)
async function handleSuggestionQuery(message, suggestionType, postId, username, theme) {
    console.log('Processing suggestion:', suggestionType, 'for post:', postId, 'with theme:', theme);

    try {
        if (suggestionType === 'summarize') {
            return await handleSummarizeDiscussionSuggestion(message, postId, username, theme);
        } else if (suggestionType === 'similar') {
            return await handleSimilarTopicsDiscussionSuggestion(message, postId, username, theme);
        } else {
            console.warn('Unknown suggestion type:', suggestionType);
            return {
                response: "I don't understand this type of suggestion. Please try again.",
                model: "claude-3-haiku-20240307",
                usage: null,
                dataAvailable: [],
                hasMoreDb: false,
                hasMoreAi: false,
                theme
            };
        }
    } catch (error) {
        console.error('Error handling suggestion query:', error);
        return {
            response: "I couldn't process this suggestion. Please try again.",
            model: "claude-3-haiku-20240307",
            usage: null,
            dataAvailable: [],
            hasMoreDb: false,
            hasMoreAi: false,
            theme
        };
    }
}

// Handle manual queries from input field with enhanced relevance filtering (theme-aware)
async function handleManualQuery(message, context, username, postId, theme) {
    console.log('Processing manual query:', message, 'with theme:', theme);

    try {
        // Check if user is asking "who are you" type questions
        const whoAreYouPatterns = [
            /who\s+are\s+you/i,
            /what\s+are\s+you/i,
            /tell\s+me\s+about\s+yourself/i,
            /introduce\s+yourself/i,
            /what\s+is\s+your\s+name/i,
            /who\s+is\s+this/i,
            /what\s+do\s+you\s+do/i,
            /what\s+can\s+you\s+do/i,
            /what\s+are\s+your\s+capabilities/i,
            /explain\s+yourself/i,
            /describe\s+yourself/i,
            /what\s+is\s+this\s+bot/i,
            /what\s+kind\s+of\s+(assistant|ai|bot)\s+are\s+you/i,
            /tell\s+me\s+what\s+you\s+do/i,
            /what\s*\'?s\s+your\s+(purpose|role|function|job)/i,
            /what\s+are\s+you\s+for/i,
            /are\s+you\s+(an\s+)?(ai|bot|assistant)/i,
            /what\s+type\s+of\s+(ai|bot|assistant)/i,
            /can\s+you\s+introduce\s+yourself/i,
            /tell\s+me\s+your\s+purpose/i,
            /explain\s+what\s+you\s+do/i,
            /who\s+am\s+i\s+(talking|speaking)\s+to/i,
            /what\s+am\s+i\s+(talking|speaking)\s+to/i,
            /what\s+exactly\s+are\s+you/i,
            /help\s+me\s+understand\s+what\s+you\s+are/i,
            /flockkk/i  // Direct mention of the bot name
        ];

        const isWhoAreYouQuestion = whoAreYouPatterns.some(pattern => pattern.test(message.trim()));

        if (isWhoAreYouQuestion) {
            console.log('Detected "who are you" question, returning themed introduction');

            // Theme-aware responses with CSS variables
            const whoAreYouResponses = [
                // Original response with theme support
                `<div style="${generateThemeCSS(theme)}; padding: 15px 0; color: var(--text-tertiary); font-size: 14px; line-height: 1.6;">
          Hi there! I'm flockkk. I'm an AI assistant created to help you discover content and gain insights within this community platform.
        </div>`,

                // Alternate 1 - More casual/friendly
                `<div style="${generateThemeCSS(theme)}; padding: 15px 0; color: var(--text-tertiary); font-size: 14px; line-height: 1.6;">
          Hey! I'm flockkk, your AI companion for exploring this community. I'm here to help you find interesting discussions, discover useful links, and uncover insights from all the content shared here.
        </div>`,

                // Alternate 2 - More professional/informative
                `<div style="${generateThemeCSS(theme)}; padding: 15px 0; color: var(--text-tertiary); font-size: 14px; line-height: 1.6;">
          Hello! I'm flockkk, an AI-powered content discovery assistant. My role is to help you navigate through community discussions, find relevant resources, and provide meaningful insights based on the collective knowledge shared on this platform.
        </div>`,

                // Alternate 3 - Conversational/welcoming
                `<div style="${generateThemeCSS(theme)}; padding: 15px 0; color: var(--text-tertiary); font-size: 14px; line-height: 1.6;">
          Nice to meet you! I'm flockkk, and I'm here to be your guide through this community. Think of me as your personal assistant for finding the best discussions, most useful links, and valuable insights that match what you're looking for.
        </div>`,

                // Alternate 4 - Direct/helpful
                `<div style="${generateThemeCSS(theme)}; padding: 15px 0; color: var(--text-tertiary); font-size: 14px; line-height: 1.6;">
          I'm flockkk! I'm an AI assistant designed specifically for this community platform. My job is to help you discover relevant content, connect you with interesting discussions, and provide insights that enhance your experience here.
        </div>`,

                // Alternate 5 - Enthusiastic/engaging
                `<div style="${generateThemeCSS(theme)}; padding: 15px 0; color: var(--text-tertiary); font-size: 14px; line-height: 1.6;">
          Great question! I'm flockkk, your AI-powered community explorer. I love helping people like you discover amazing content, find exactly what they're looking for, and gain fresh perspectives from the wealth of knowledge shared in this community.
        </div>`
            ];

            // Randomly select one response
            const randomIndex = Math.floor(Math.random() * whoAreYouResponses.length);
            const formattedIntroduction = whoAreYouResponses[randomIndex];

            return {
                response: formattedIntroduction,
                model: "claude-3-haiku-20240307",
                usage: null,
                dataAvailable: [],
                hasMoreDb: false,
                hasMoreAi: false,
                theme
            };
        }

        // NEW: Check if user is asking about "flokkk" (the platform)
        const flokkkQuestionPatterns = [
            /what\s+is\s+flokkk/i,
            /tell\s+me\s+about\s+flokkk/i,
            /explain\s+flokkk/i,
            /how\s+does\s+flokkk\s+work/i,
            /what\s+does\s+flokkk\s+do/i,
            /flokkk\s+platform/i,
            /flokkk\s+mission/i,
            /flokkk\s+vision/i,
            /what\s+is\s+this\s+platform/i,
            /about\s+this\s+platform/i,
            /tell\s+me\s+about\s+this\s+site/i,
            /what\s+is\s+this\s+website/i,
            /how\s+does\s+this\s+platform\s+work/i,
            /mission\s+of\s+flokkk/i,
            /purpose\s+of\s+flokkk/i,
            /goals\s+of\s+flokkk/i,
            /flokkk\s+features/i,
            /community\s+curation/i,
            /transparent\s+vetting/i
        ];

        const isFlokkkQuestion = flokkkQuestionPatterns.some(pattern => pattern.test(message.trim()));

        if (isFlokkkQuestion) {
            console.log('Detected question about flokkk platform, returning platform information');

            // Array of comprehensive responses about flokkk based on the about page
            const flokkkResponses = [
                // Mission-focused response
                `<div style="${generateThemeCSS(theme)}; padding: 15px 0; color: var(--text-tertiary); font-size: 14px; line-height: 1.6;">
                    <h4 style="color: var(--accent-color); margin: 0 0 12px 0; font-size: 16px;">About Flokkk</h4>
                    <p style="margin: 0 0 12px 0;">Flokkk is rebuilding trust in digital information. We're creating a human-first, community-curated discovery platform where people find the most valuable resources on any topic—through collective intelligence, not algorithmic guesswork.</p>
                    
                    <h5 style="color: var(--text-primary); margin: 12px 0 8px 0; font-size: 14px;">How It Works:</h5>
                    <ul style="margin: 0; padding-left: 18px; color: var(--text-secondary); font-size: 13px;">
                        <li><strong>Community Curation:</strong> Users contribute, vote, and discuss the best content, turning scattered information into structured, peer-endorsed knowledge hubs.</li>
                        <li><strong>Transparent Vetting:</strong> Every link is vetted through honest peer review from real learners and subject-matter experts.</li>
                        <li><strong>AI-Powered Insights:</strong> Our AI serves resources based on what real learners have found useful, not just web scraping.</li>
                    </ul>
                </div>`,

                // Vision-focused response
                `<div style="${generateThemeCSS(theme)}; padding: 15px 0; color: var(--text-tertiary); font-size: 14px; line-height: 1.6;">
                    <h4 style="color: var(--accent-color); margin: 0 0 12px 0; font-size: 16px;">The Flokkk Vision</h4>
                    <p style="margin: 0 0 12px 0;">We're transforming shallow content consumption into informed, intentional learning. By combining human wisdom with intelligent technology, we're building a future where quality information is accessible, transparent, and truly valuable.</p>
                    
                    <p style="margin: 12px 0 0 0; color: var(--text-secondary); font-style: italic;">"Quality over quantity, depth over algorithms, and human insight over automated recommendations."</p>
                </div>`,

                // Feature-focused response
                `<div style="${generateThemeCSS(theme)}; padding: 15px 0; color: var(--text-tertiary); font-size: 14px; line-height: 1.6;">
                    <h4 style="color: var(--accent-color); margin: 0 0 12px 0; font-size: 16px;">Flokkk Platform</h4>
                    <p style="margin: 0 0 12px 0;">Flokkk is a human-first, community-curated discovery platform for meaningful learning. We're creating structured knowledge hubs where the best resources are found through collective intelligence.</p>
                    
                    <h5 style="color: var(--text-primary); margin: 12px 0 8px 0; font-size: 14px;">Key Features:</h5>
                    <ul style="margin: 0; padding-left: 18px; color: var(--text-secondary); font-size: 13px;">
                        <li>Community-driven content curation starting with YouTube and expanding to major platforms</li>
                        <li>Transparent peer review system with no hidden algorithms</li>
                        <li>AI assistant that ranks resources based on real learner feedback</li>
                        <li>Discussion forums and collaborative learning spaces</li>
                    </ul>
                </div>`,

                // Problem-solution focused response
                `<div style="${generateThemeCSS(theme)}; padding: 15px 0; color: var(--text-tertiary); font-size: 14px; line-height: 1.6;">
                    <h4 style="color: var(--accent-color); margin: 0 0 12px 0; font-size: 16px;">Why Flokkk Exists</h4>
                    <p style="margin: 0 0 12px 0;">Flokkk addresses the problem of information overload and unreliable recommendations online. Instead of algorithmic guesswork, we use community wisdom to surface the most valuable resources.</p>
                    
                    <p style="margin: 0 0 12px 0; color: var(--text-secondary);">Our three pillars:</p>
                    <ul style="margin: 0; padding-left: 18px; color: var(--text-secondary); font-size: 13px;">
                        <li><strong>Community Curation:</strong> Real people finding and sharing valuable content</li>
                        <li><strong>Transparent Vetting:</strong> Open peer review process with full transparency</li>
                        <li><strong>AI Enhancement:</strong> Technology that amplifies human intelligence rather than replacing it</li>
                    </ul>
                </div>`,

                // Comprehensive overview response
                `<div style="${generateThemeCSS(theme)}; padding: 15px 0; color: var(--text-tertiary); font-size: 14px; line-height: 1.6;">
                    <h4 style="color: var(--accent-color); margin: 0 0 12px 0; font-size: 16px;">Flokkk: Curating Information You Can Trust</h4>
                    <p style="margin: 0 0 12px 0;">Flokkk is a revolutionary platform that's rebuilding trust in digital information through community-driven curation and transparent vetting processes.</p>
                    
                    <h5 style="color: var(--text-primary); margin: 12px 0 8px 0; font-size: 14px;">Our Mission:</h5>
                    <p style="margin: 0 0 12px 0; color: var(--text-secondary); font-size: 13px;">Create a human-first discovery platform where people find the most valuable resources through collective intelligence, not algorithmic guesswork.</p>
                    
                    <h5 style="color: var(--text-primary); margin: 12px 0 8px 0; font-size: 14px;">Our Vision:</h5>
                    <p style="margin: 0; color: var(--text-secondary); font-size: 13px;">Transform shallow content consumption into informed, intentional learning by combining human wisdom with intelligent technology.</p>
                </div>`
            ];

            // Randomly select one response
            const randomIndex = Math.floor(Math.random() * flokkkResponses.length);
            const formattedFlokkkResponse = flokkkResponses[randomIndex];

            return {
                response: formattedFlokkkResponse,
                model: "claude-3-haiku-20240307",
                usage: null,
                dataAvailable: [],
                hasMoreDb: false,
                hasMoreAi: false,
                theme
            };
        }

        // Continue with existing keyword extraction and search logic...
        // Extract keywords from user's question
        const keywords = await extractKeywordsFromText(message);
        console.log('Extracted keywords:', keywords);

        // Find relevant discussions and links from database
        const searchResults = await findRelevantDiscussionsAndLinks(keywords, 15); // Get more results for better filtering
        console.log('Found search results:', searchResults.discussions.length, 'discussions,', searchResults.links.length, 'links');

        // Apply quality filtering for initial results
        const hasPhrasesInKeywords = keywords.some(keyword => keyword.includes(' '));
        const minDiscussionScore = hasPhrasesInKeywords ? 8 : 4;
        const minLinkScore = hasPhrasesInKeywords ? 8 : 5;

        // Get top quality discussions and links for initial response
        const topDiscussions = searchResults.discussions
            .filter(discussion => !discussion.relevanceScore || discussion.relevanceScore >= minDiscussionScore)
            .slice(0, 2);

        const topLinks = searchResults.links
            .filter(link => !link.relevanceScore || link.relevanceScore >= minLinkScore)
            .slice(0, 2);

        console.log('Top quality results:', topDiscussions.length, 'discussions,', topLinks.length, 'links');

        // Generate brief about the topics using Claude AI
        const briefResponse = await generateTopicBrief(message, keywords, topDiscussions, topLinks);

        // Build HTML response with theme support
        let htmlResponse = '';

        // Add discussions with theme-aware styling
        if (topDiscussions.length > 0) {
            topDiscussions.forEach(discussion => {
                htmlResponse += formatDiscussionCard(discussion, theme);
            });
        }

        // Add links with theme-aware styling
        if (topLinks.length > 0) {
            topLinks.forEach(link => {
                htmlResponse += formatLinkCard(link, theme);
            });
        }

        // Check for more quality content
        const remainingDiscussions = searchResults.discussions
            .filter(discussion => !discussion.relevanceScore || discussion.relevanceScore >= minDiscussionScore)
            .slice(2);

        const remainingLinks = searchResults.links
            .filter(link => !link.relevanceScore || link.relevanceScore >= minLinkScore)
            .slice(2);

        const validRemainingDiscussions = remainingDiscussions.filter(discussion =>
            validateContentRelevance(discussion.title, keywords)
        );

        const validRemainingLinks = remainingLinks.filter(link =>
            validateContentRelevance(link.title, keywords) || validateContentRelevance(link.description, keywords)
        );

        const hasMoreQualityContent = validRemainingDiscussions.length > 0 || validRemainingLinks.length > 0;

        console.log('Quality content check:', {
            remainingDiscussions: remainingDiscussions.length,
            remainingLinks: remainingLinks.length,
            validRemainingDiscussions: validRemainingDiscussions.length,
            validRemainingLinks: validRemainingLinks.length,
            hasMoreQualityContent
        });

        // Add show more button with theme-aware styling
        if (hasMoreQualityContent) {
            htmlResponse += `<div style="${generateThemeCSS(theme)}; color: var(--accent-color); font-size: 13px; padding: 10px 0 5px 0; cursor: pointer;" class="show-more-discussions-links" data-query="${encodeURIComponent(message)}" data-type="more-discussions-links">Show more relevant discussions & links</div>`;
        }

        // Add brief response with theme-aware styling
        htmlResponse += `<div style="${generateThemeCSS(theme)}; padding: 10px 0; color: var(--text-tertiary); font-size: 13px; line-height: 1.4;">${briefResponse}</div>`;

        // Add show more insights button with theme-aware styling
        htmlResponse += `<div style="${generateThemeCSS(theme)}; color: var(--accent-color); font-size: 13px; padding: 5px 0 10px 0; cursor: pointer;" class="show-more-insights" data-query="${encodeURIComponent(message)}" data-type="more-insights">Show more insights</div>`;

        return {
            response: htmlResponse || `<div style="${generateThemeCSS(theme)}; color: var(--text-secondary); font-size: 13px; padding: 10px 0;">No related content found for your question.</div>`,
            model: "claude-3-haiku-20240307",
            usage: null,
            dataAvailable: [],
            hasMoreDb: false,
            hasMoreAi: false,
            theme
        };

    } catch (error) {
        console.error('Error in manual query:', error);
        return {
            response: "I encountered an error processing your question. Please try again.",
            model: "claude-3-haiku-20240307",
            usage: null,
            dataAvailable: [],
            hasMoreDb: false,
            hasMoreAi: false,
            theme
        };
    }
}

// Handle summarize discussion suggestion (theme-aware)
async function handleSummarizeDiscussionSuggestion(message, postId, username, theme) {
    console.log('Handling summarize suggestion for post:', postId, 'with theme:', theme);

    try {
        // Extract comprehensive data from current post
        const postData = await extractCurrentPostData(postId);

        if (!postData) {
            console.warn('No post data found for ID:', postId);
            return {
                response: "I couldn't find the discussion content to summarize.",
                model: "claude-3-haiku-20240307",
                usage: null,
                dataAvailable: [],
                hasMoreDb: false,
                hasMoreAi: false,
                theme
            };
        }

        console.log('Post data extracted successfully');

        // Generate brief summary using Claude AI
        const briefSummary = await generateBriefSummary(postData, username);

        // Build response with show more button and theme support
        const htmlResponse = `
      <div style="${generateThemeCSS(theme)}; padding: 10px 0; color: var(--text-tertiary); font-size: 13px; line-height: 1.4;">
        ${briefSummary}
      </div>
      <div style="${generateThemeCSS(theme)}; color: var(--accent-color); font-size: 13px; padding: 10px 0 5px 0; cursor: pointer;" class="show-more-insights-links" data-query="${encodeURIComponent(message)}" data-post-id="${postId}" data-type="more-insights-links">Show more insights and links</div>
    `;

        return {
            response: htmlResponse,
            model: "claude-3-haiku-20240307",
            usage: null,
            dataAvailable: [],
            hasMoreDb: false,
            hasMoreAi: false,
            theme
        };

    } catch (error) {
        console.error('Error in summarize discussion suggestion:', error);
        return {
            response: "I couldn't summarize this discussion. Please try again.",
            model: "claude-3-haiku-20240307",
            usage: null,
            dataAvailable: [],
            hasMoreDb: false,
            hasMoreAi: false,
            theme
        };
    }
}

// Handle similar topics discussion suggestion (theme-aware)
async function handleSimilarTopicsDiscussionSuggestion(message, postId, username, theme) {
    console.log('Handling similar topics suggestion for post:', postId, 'with theme:', theme);

    try {
        // Extract post data and keywords
        const postData = await extractCurrentPostData(postId);
        if (!postData) {
            console.warn('No post data found for similar topics analysis:', postId);
            return {
                response: "I couldn't find the post to analyze for similar topics.",
                model: "claude-3-haiku-20240307",
                usage: null,
                dataAvailable: [],
                hasMoreDb: false,
                hasMoreAi: false,
                theme
            };
        }

        // Extract keywords from post title and content
        const keywords = await extractKeywordsFromPost(postData);
        console.log('Keywords extracted for similar topics:', keywords);

        // Find similar content from database with enhanced filtering
        const searchResults = await findRelevantDiscussionsAndLinks(keywords, 15);
        console.log('Similar content found:', searchResults.discussions.length, 'discussions,', searchResults.links.length, 'links');

        // Apply quality filtering
        const hasPhrasesInKeywords = keywords.some(keyword => keyword.includes(' '));
        const minDiscussionScore = hasPhrasesInKeywords ? 8 : 4;
        const minLinkScore = hasPhrasesInKeywords ? 8 : 5;

        // Get top quality discussions and links for initial response
        const topDiscussions = searchResults.discussions
            .filter(discussion => !discussion.relevanceScore || discussion.relevanceScore >= minDiscussionScore)
            .slice(0, 2);

        const topLinks = searchResults.links
            .filter(link => !link.relevanceScore || link.relevanceScore >= minLinkScore)
            .slice(0, 2);

        // Additional validation for similar topics
        const validDiscussions = topDiscussions.filter(discussion =>
            validateContentRelevance(discussion.title, keywords)
        );

        const validLinks = topLinks.filter(link =>
            validateContentRelevance(link.title, keywords) || validateContentRelevance(link.description, keywords)
        );

        console.log('Validated similar topics:', validDiscussions.length, 'discussions,', validLinks.length, 'links');

        // Generate small brief about similar topics
        const smallBrief = await generateSimilarTopicsBrief(keywords, validDiscussions, validLinks);

        // Build HTML response with theme support
        let htmlResponse = '';

        // Add validated discussions with theme-aware styling
        if (validDiscussions.length > 0) {
            validDiscussions.forEach(discussion => {
                htmlResponse += formatDiscussionCard(discussion, theme);
            });
        }

        // Add validated links with theme-aware styling
        if (validLinks.length > 0) {
            validLinks.forEach(link => {
                htmlResponse += formatLinkCard(link, theme);
            });
        }

        // Check for more quality content before showing "Show more" button
        const remainingDiscussions = searchResults.discussions
            .filter(discussion => !discussion.relevanceScore || discussion.relevanceScore >= minDiscussionScore)
            .slice(2);

        const remainingLinks = searchResults.links
            .filter(link => !link.relevanceScore || link.relevanceScore >= minLinkScore)
            .slice(2);

        const validRemainingDiscussions = remainingDiscussions.filter(discussion =>
            validateContentRelevance(discussion.title, keywords)
        );

        const validRemainingLinks = remainingLinks.filter(link =>
            validateContentRelevance(link.title, keywords) || validateContentRelevance(link.description, keywords)
        );

        const hasMoreQualityContent = validRemainingDiscussions.length > 0 || validRemainingLinks.length > 0;

        // Add show more button with theme-aware styling
        if (hasMoreQualityContent) {
            htmlResponse += `<div style="${generateThemeCSS(theme)}; color: var(--accent-color); font-size: 13px; padding: 10px 0 5px 0; cursor: pointer;" class="show-more-discussions-links" data-query="${encodeURIComponent(message)}" data-post-id="${postId}" data-type="more-discussions-links">Show more relevant discussions & links</div>`;
        }

        // Add small brief with theme-aware styling
        htmlResponse += `<div style="${generateThemeCSS(theme)}; padding: 10px 0; color: var(--text-tertiary); font-size: 13px; line-height: 1.4;">${smallBrief}</div>`;

        // Add show more insights button with theme-aware styling
        htmlResponse += `<div style="${generateThemeCSS(theme)}; color: var(--accent-color); font-size: 13px; padding: 5px 0 10px 0; cursor: pointer;" class="show-more-insights" data-query="${encodeURIComponent(message)}" data-post-id="${postId}" data-type="more-insights">Show more insights</div>`;

        return {
            response: htmlResponse,
            model: "claude-3-haiku-20240307",
            usage: null,
            dataAvailable: [],
            hasMoreDb: false,
            hasMoreAi: false,
            theme
        };

    } catch (error) {
        console.error('Error in similar topics discussion suggestion:', error);
        return {
            response: "I couldn't find similar topics. Please try again.",
            model: "claude-3-haiku-20240307",
            usage: null,
            dataAvailable: [],
            hasMoreDb: false,
            hasMoreAi: false,
            theme
        };
    }
}

// Handle show more requests (theme-aware)
async function handleShowMoreRequest(showMoreType, originalQuery, message, postId, username, theme) {
    console.log('Processing show more request:', { showMoreType, originalQuery, postId, theme });

    try {
        let result;

        switch (showMoreType) {
            case 'more-discussions-links':
                console.log('Handling more discussions/links with theme:', theme);
                result = await handleShowMoreDiscussionsLinks(originalQuery, postId, username, theme);
                break;

            case 'more-insights':
                console.log('Handling more insights with theme:', theme);
                result = await handleShowMoreInsights(originalQuery, postId, username, theme);
                break;

            case 'more-insights-links':
                console.log('Handling more insights and links with theme:', theme);
                result = await handleShowMoreInsightsAndLinks(originalQuery, postId, username, theme);
                break;

            default:
                console.warn('Unknown show more type:', showMoreType);
                result = {
                    response: "I don't understand this request type. Please try again.",
                    model: "claude-3-haiku-20240307",
                    usage: null,
                    dataAvailable: [],
                    hasMoreDb: false,
                    hasMoreAi: false,
                    theme
                };
        }

        console.log('Show more request completed successfully');
        return result;

    } catch (error) {
        console.error('Error in handleShowMoreRequest:', error);
        return {
            response: "I couldn't load the additional content. Please try again.",
            model: "claude-3-haiku-20240307",
            usage: null,
            dataAvailable: [],
            hasMoreDb: false,
            hasMoreAi: false,
            theme
        };
    }
}

// Handle show more discussions and links with enhanced relevance filtering (theme-aware)
async function handleShowMoreDiscussionsLinks(originalQuery, postId, username, theme) {
    console.log('Processing show more discussions/links for:', { originalQuery, postId, theme });

    try {
        let keywords = [];

        // Extract keywords safely
        try {
            if (postId) {
                console.log('Extracting keywords from post:', postId);
                const postData = await extractCurrentPostData(postId);
                if (postData) {
                    keywords = await extractKeywordsFromPost(postData);
                    console.log('Keywords from post:', keywords);
                }
            }

            if (keywords.length === 0) {
                console.log('Extracting keywords from query:', originalQuery);
                keywords = await extractKeywordsFromText(originalQuery);
                console.log('Keywords from query:', keywords);
            }
        } catch (keywordError) {
            console.warn('Keyword extraction failed:', keywordError.message);
            keywords = extractKeywordsSimple(originalQuery);
        }

        if (keywords.length === 0) {
            console.warn('No keywords found, using fallback');
            return {
                response: `<div style="${generateThemeCSS(theme)}; color: var(--text-secondary); font-size: 13px; padding: 10px 0;">No additional relevant content found.</div>`,
                model: "claude-3-haiku-20240307",
                usage: null,
                dataAvailable: [],
                hasMoreDb: false,
                hasMoreAi: false,
                theme
            };
        }

        // Find more relevant content with enhanced filtering
        console.log('Searching for additional relevant content with keywords:', keywords);
        const searchResults = await findRelevantDiscussionsAndLinks(keywords, 25); // Get more results for better selection
        console.log('Search results:', searchResults.discussions.length, 'discussions,', searchResults.links.length, 'links');

        // Apply stricter filtering for "show more" results
        const hasPhrasesInKeywords = keywords.some(keyword => keyword.includes(' '));
        const minDiscussionScore = hasPhrasesInKeywords ? 8 : 4;
        const minLinkScore = hasPhrasesInKeywords ? 8 : 5;

        // Filter discussions by relevance score (skip first 2, then get next high-quality results)
        const moreDiscussions = searchResults.discussions
            .filter(discussion => discussion.relevanceScore && discussion.relevanceScore >= minDiscussionScore)
            .slice(2, 6); // Skip first 2, get next 4

        // Filter links by relevance score (skip first 2, then get next high-quality results)
        const moreLinks = searchResults.links
            .filter(link => link.relevanceScore && link.relevanceScore >= minLinkScore)
            .slice(2, 6); // Skip first 2, get next 4

        console.log('Filtered show more results:', moreDiscussions.length, 'discussions,', moreLinks.length, 'links');

        // Additional validation: ensure results actually contain relevant keywords
        const validatedDiscussions = moreDiscussions.filter(discussion => {
            return validateContentRelevance(discussion.title, keywords);
        });

        const validatedLinks = moreLinks.filter(link => {
            return validateContentRelevance(link.title, keywords) || validateContentRelevance(link.description, keywords);
        });

        console.log('Validated show more results:', validatedDiscussions.length, 'discussions,', validatedLinks.length, 'links');

        let htmlResponse = '';

        // Add validated discussions with theme-aware styling
        if (validatedDiscussions.length > 0) {
            console.log('Adding', validatedDiscussions.length, 'validated discussions');
            validatedDiscussions.forEach(discussion => {
                htmlResponse += formatDiscussionCard(discussion, theme);
            });
        }

        // Add validated links with theme-aware styling
        if (validatedLinks.length > 0) {
            console.log('Adding', validatedLinks.length, 'validated links');
            validatedLinks.forEach(link => {
                htmlResponse += formatLinkCard(link, theme);
            });
        }

        // If no high-quality additional content found, return appropriate message
        if (!htmlResponse) {
            htmlResponse = `<div style="${generateThemeCSS(theme)}; color: var(--text-secondary); font-size: 13px; padding: 10px 0;">No additional high-quality content found for this topic.</div>`;
        }

        console.log('Show more discussions/links completed successfully');
        return {
            response: htmlResponse,
            model: "claude-3-haiku-20240307",
            usage: null,
            dataAvailable: [],
            hasMoreDb: false,
            hasMoreAi: false,
            theme
        };

    } catch (error) {
        console.error('Error in handleShowMoreDiscussionsLinks:', error);
        return {
            response: `<div style="${generateThemeCSS(theme)}; color: var(--text-secondary); font-size: 13px; padding: 10px 0;">Sorry, I couldn't load more discussions and links. Please try again.</div>`,
            model: "claude-3-haiku-20240307",
            usage: null,
            dataAvailable: [],
            hasMoreDb: false,
            hasMoreAi: false,
            theme
        };
    }
}

// Helper function to validate content relevance
function validateContentRelevance(content, keywords) {
    if (!content || !keywords || keywords.length === 0) return false;

    const contentLower = content.toLowerCase();

    // For multi-word keywords (phrases), check if phrase exists
    const phraseKeywords = keywords.filter(keyword => keyword.includes(' '));
    if (phraseKeywords.length > 0) {
        return phraseKeywords.some(phrase => contentLower.includes(phrase.toLowerCase()));
    }

    // For single words, require at least 2 matches for multi-word queries
    if (keywords.length > 1) {
        const matchedWords = keywords.filter(keyword => {
            const wordRegex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
            return wordRegex.test(contentLower);
        });
        return matchedWords.length >= Math.ceil(keywords.length / 2);
    }

    // For single keyword, just check if it exists with word boundaries
    const wordRegex = new RegExp(`\\b${keywords[0].toLowerCase()}\\b`, 'i');
    return wordRegex.test(contentLower);
}

// Handle show more insights (Claude AI elaborated response) (theme-aware)
async function handleShowMoreInsights(originalQuery, postId, username, theme) {
    console.log('Processing show more insights for:', { originalQuery, postId, theme });

    try {
        let keywords = [];
        let contextData = null;

        // Extract keywords and context safely
        try {
            if (postId) {
                console.log('Getting context data from post:', postId);
                contextData = await extractCurrentPostData(postId);
                if (contextData) {
                    keywords = await extractKeywordsFromPost(contextData);
                    console.log('Keywords from post context:', keywords);
                }
            }

            if (keywords.length === 0) {
                console.log('Extracting keywords from query:', originalQuery);
                keywords = await extractKeywordsFromText(originalQuery);
                console.log('Keywords from query:', keywords);
            }
        } catch (contextError) {
            console.warn('Context extraction failed:', contextError.message);
            keywords = extractKeywordsSimple(originalQuery);
        }

        // Get relevant content for context
        let searchResults = { discussions: [], links: [] };
        try {
            if (keywords.length > 0) {
                console.log('Getting search results for context');
                searchResults = await findRelevantDiscussionsAndLinks(keywords, 10);
                console.log('Context search results:', searchResults.discussions.length, 'discussions,', searchResults.links.length, 'links');
            }
        } catch (searchError) {
            console.warn('Search for context failed:', searchError.message);
        }

        // First generate the small brief to build upon
        console.log('Generating small brief to build upon');
        let smallBrief = '';
        try {
            const topDiscussions = searchResults.discussions.slice(0, 2);
            const topLinks = searchResults.links.slice(0, 2);
            smallBrief = await generateTopicBrief(originalQuery, keywords, topDiscussions, topLinks);
            console.log('Small brief generated for expansion');
        } catch (briefError) {
            console.warn('Small brief generation failed:', briefError.message);
            smallBrief = "This topic covers various aspects related to your question.";
        }

        // Generate elaborated insights that build upon the small brief
        console.log('Generating elaborated insights based on small brief');
        let elaboratedInsights = '';
        try {
            elaboratedInsights = await generateElaboratedInsights(originalQuery, keywords, searchResults, contextData, username, smallBrief);
            console.log('Elaborated insights generated successfully');
        } catch (insightsError) {
            console.warn('Insights generation failed:', insightsError.message);
            elaboratedInsights = "Here are some detailed insights about this topic based on the available information and related discussions in the community.";
        }

        // Generate educational external links based on the expanded insights
        let externalLinks = [];
        try {
            console.log('Generating educational external links based on expanded insights');
            const aiGeneratedLinks = await generateRelevantExternalLinks(originalQuery, keywords, elaboratedInsights);
            if (aiGeneratedLinks && aiGeneratedLinks.length > 0) {
                externalLinks.push(...aiGeneratedLinks);
            }

            // Also extract any existing links from post content as supplementary
            if (contextData && contextData.postContent) {
                const urlRegex = /https?:\/\/[^\s<>"']+/g;
                const foundUrls = contextData.postContent.match(urlRegex) || [];

                foundUrls.slice(0, Math.max(0, 4 - externalLinks.length)).forEach(url => {
                    if (!url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('tiktok.com')) {
                        const cleanUrl = url.replace(/[.,;!?)]+$/, ''); // Remove trailing punctuation
                        externalLinks.push({
                            title: cleanUrl.length > 50 ? cleanUrl.substring(0, 50) + '...' : cleanUrl,
                            url: cleanUrl,
                            description: 'Additional resource from discussion'
                        });
                    }
                });
            }

            console.log('Educational external links found:', externalLinks.length);
        } catch (linksError) {
            console.warn('External links extraction failed:', linksError.message);
        }

        // Wrap the elaborated insights in show-more-insights div with theme support
        let htmlResponse = `<div class="show-more-insights" style="${generateThemeCSS(theme)}">${elaboratedInsights}`;

        // Add educational external links if found with theme-aware styling
        if (externalLinks && externalLinks.length > 0) {
            htmlResponse += `<div style="padding: 15px 0 5px 0; color: var(--accent-color); font-size: 14px; font-weight: 500;">Educational Resources:</div>`;
            externalLinks.slice(0, 4).forEach(link => {
                htmlResponse += `
          <div style="padding: 8px 0; border-bottom: 1px solid var(--border-color);">
            <a href="${link.url}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-color); text-decoration: none; font-size: 13px; line-height: 1.4;">
              ${link.title}
            </a>
            ${link.description ? `<div style="color: var(--text-secondary); font-size: 12px; margin-top: 2px;">${link.description}</div>` : ''}
          </div>
        `;
            });
        }

        htmlResponse += `</div>`; // Close show-more-insights div

        console.log('Show more insights completed successfully');
        return {
            response: htmlResponse,
            model: "claude-3-haiku-20240307",
            usage: null,
            dataAvailable: [],
            hasMoreDb: false,
            hasMoreAi: false,
            theme
        };

    } catch (error) {
        console.error('Error in handleShowMoreInsights:', error);
        return {
            response: `<div class="show-more-insights" style="${generateThemeCSS(theme)}">I couldn't generate more insights at this time. Please try again.</div>`,
            model: "claude-3-haiku-20240307",
            usage: null,
            dataAvailable: [],
            hasMoreDb: false,
            hasMoreAi: false,
            theme
        };
    }
}

// Handle show more insights and links (for summarize suggestion) (theme-aware)
async function handleShowMoreInsightsAndLinks(originalQuery, postId, username, theme) {
    console.log('Processing show more insights and links for:', { originalQuery, postId, theme });

    try {
        // Extract comprehensive data from current post
        let postData = null;
        try {
            if (postId) {
                console.log('Extracting post data for insights and links:', postId);
                postData = await extractCurrentPostData(postId);
                if (!postData) {
                    console.warn('No post data found for insights and links');
                    return {
                        response: "I couldn't find the discussion content for detailed analysis.",
                        model: "claude-3-haiku-20240307",
                        usage: null,
                        dataAvailable: [],
                        hasMoreDb: false,
                        hasMoreAi: false,
                        theme
                    };
                }
                console.log('Post data extracted successfully for insights and links');
            }
        } catch (postError) {
            console.error('Error extracting post data:', postError);
            return {
                response: "I couldn't access the discussion content for analysis.",
                model: "claude-3-haiku-20240307",
                usage: null,
                dataAvailable: [],
                hasMoreDb: false,
                hasMoreAi: false,
                theme
            };
        }

        // Extract keywords for finding similar content
        let keywords = [];
        try {
            if (postData) {
                keywords = await extractKeywordsFromPost(postData);
                console.log('Keywords extracted for insights and links:', keywords);
            } else {
                keywords = await extractKeywordsFromText(originalQuery);
                console.log('Keywords from query for insights and links:', keywords);
            }
        } catch (keywordError) {
            console.warn('Keyword extraction failed for insights and links:', keywordError.message);
            keywords = extractKeywordsSimple(originalQuery || '');
        }

        // Find relevant discussions and links
        let searchResults = { discussions: [], links: [] };
        try {
            if (keywords.length > 0) {
                console.log('Finding relevant content for insights and links');
                searchResults = await findRelevantDiscussionsAndLinks(keywords, 15);
                console.log('Found for insights and links:', searchResults.discussions.length, 'discussions,', searchResults.links.length, 'links');
            }
        } catch (searchError) {
            console.warn('Search failed for insights and links:', searchError.message);
        }

        // Get top 4 discussions and 4 links
        const topDiscussions = searchResults.discussions.slice(0, 4);
        const topLinks = searchResults.links.slice(0, 4);

        let htmlResponse = `<div class="show-more-insights" style="${generateThemeCSS(theme)}">`;

        // Add relevant discussions with theme-aware styling
        if (topDiscussions.length > 0) {
            console.log('Adding', topDiscussions.length, 'relevant discussions');
            topDiscussions.forEach(discussion => {
                htmlResponse += formatDiscussionCard(discussion, theme);
            });
        }

        // Add relevant links with theme-aware styling
        if (topLinks.length > 0) {
            console.log('Adding', topLinks.length, 'relevant links');
            topLinks.forEach(link => {
                htmlResponse += formatLinkCard(link, theme);
            });
        }

        // Generate elaborated summary with side headings
        let elaboratedSummary = '';
        try {
            console.log('Generating elaborated summary with headings');
            elaboratedSummary = await generateElaboratedSummaryWithHeadings(postData, topDiscussions, topLinks, username);
            htmlResponse += elaboratedSummary;
            console.log('Elaborated summary generated successfully');
        } catch (summaryError) {
            console.warn('Summary generation failed:', summaryError.message);
            elaboratedSummary = `<div style="padding: 15px 0; color: var(--text-tertiary); font-size: 13px;">Here's a detailed analysis of the discussion and related content.</div>`;
            htmlResponse += elaboratedSummary;
        }

        // Extract and add external links based on the elaborated summary content
        try {
            console.log('Extracting external links for insights and links');
            const externalLinks = await extractAndGenerateExternalLinks(originalQuery, postData, keywords, elaboratedSummary);
            if (externalLinks && externalLinks.length > 0) {
                console.log('Adding', externalLinks.length, 'external links');
                htmlResponse += `<div style="padding: 15px 0 5px 0; color: var(--accent-color); font-size: 14px; font-weight: 500;">Educational Resources:</div>`;
                externalLinks.forEach(link => {
                    htmlResponse += `
            <div style="padding: 8px 0; border-bottom: 1px solid var(--border-color);">
              <a href="${link.url}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-color); text-decoration: none; font-size: 13px; line-height: 1.4;">
                ${link.title}
              </a>
              ${link.description ? `<div style="color: var(--text-secondary); font-size: 12px; margin-top: 2px;">${link.description}</div>` : ''}
            </div>
          `;
                });
            }
        } catch (linksError) {
            console.warn('External links extraction failed for insights and links:', linksError.message);
        }

        htmlResponse += '</div>'; // Close show-more-insights div

        console.log('Show more insights and links completed successfully');
        return {
            response: htmlResponse,
            model: "claude-3-haiku-20240307",
            usage: null,
            dataAvailable: [],
            hasMoreDb: false,
            hasMoreAi: false,
            theme
        };

    } catch (error) {
        console.error('Error in handleShowMoreInsightsAndLinks:', error);
        return {
            response: `<div class="show-more-insights" style="${generateThemeCSS(theme)}">I couldn't generate detailed insights and links at this time. Please try again.</div>`,
            model: "claude-3-haiku-20240307",
            usage: null,
            dataAvailable: [],
            hasMoreDb: false,
            hasMoreAi: false,
            theme
        };
    }
}

// Extract current post data (postTitle, postContent, links, comments)
async function extractCurrentPostData(postId) {
    console.log('Extracting post data for ID:', postId);

    try {
        if (!postId) {
            console.warn('No postId provided to extractCurrentPostData');
            return null;
        }

        // Validate ObjectId format
        if (!ObjectId.isValid(postId)) {
            console.warn('Invalid ObjectId format:', postId);
            return null;
        }

        // Get post data
        const post = await Post.findById(postId).lean();
        if (!post) {
            console.warn('Post not found for ID:', postId);
            return null;
        }

        console.log('Post found:', post.title);

        // Get comments for this post
        let comments = [];
        try {
            comments = await Comment.find({
                postId: new ObjectId(postId),
                isDeleted: { $ne: true }
            })
                .sort({ likes: -1, createdAt: -1 })
                .limit(10) // Limit to prevent memory issues
                .lean();

            console.log('Comments found:', comments.length);
        } catch (commentError) {
            console.warn('Error fetching comments:', commentError.message);
        }

        const result = {
            postTitle: post.title || '',
            postContent: post.content || '',
            creatorLinks: post.creatorLinks || [],
            communityLinks: post.communityLinks || [],
            comments: comments.map(comment => ({
                username: comment.username || 'Anonymous',
                content: comment.content || '',
                likes: comment.likes || 0
            })),
            hashtags: post.hashtags || []
        };

        console.log('Post data extracted successfully');
        return result;

    } catch (error) {
        console.error('Error extracting current post data:', error);
        return null;
    }
}

// Extract keywords from post title and content
async function extractKeywordsFromPost(postData) {
    try {
        const combinedText = `${postData.postTitle || ''} ${postData.postContent || ''}`;
        return await extractKeywordsFromText(combinedText);
    } catch (error) {
        console.error('Error extracting keywords from post:', error);
        return [];
    }
}

// Extract keywords from any text using contextual phrase approach
async function extractKeywordsFromText(text) {
    try {
        console.log('Extracting contextual keywords from:', text.substring(0, 100) + '...');

        // Use simple keyword extraction as primary method for phrases
        const simplePhrases = extractKeywordsSimple(text);
        console.log('Simple extraction found phrases:', simplePhrases);

        // Try AI keyword extraction for better contextual understanding
        let aiKeywords = [];
        try {
            aiKeywords = await extractKeywordsWithAI(text);
            console.log('AI extraction found keywords:', aiKeywords);
        } catch (aiError) {
            console.warn('AI keyword extraction failed, using simple extraction:', aiError.message);
        }

        // Combine and prioritize meaningful phrases
        const allKeywords = [];

        // First, add AI-generated contextual phrases (these are usually better)
        if (aiKeywords.length > 0) {
            allKeywords.push(...aiKeywords);
        }

        // Then add simple extraction phrases that aren't already covered
        simplePhrases.forEach(phrase => {
            const isAlreadyCovered = allKeywords.some(existing =>
                existing.toLowerCase().includes(phrase.toLowerCase()) ||
                phrase.toLowerCase().includes(existing.toLowerCase())
            );

            if (!isAlreadyCovered) {
                allKeywords.push(phrase);
            }
        });

        // Remove duplicates and limit to 10 most relevant
        const uniqueKeywords = [...new Set(allKeywords)];
        const finalKeywords = uniqueKeywords.slice(0, 10);

        console.log('Final contextual keywords:', finalKeywords);
        return finalKeywords;
    } catch (error) {
        console.error('Error in contextual keyword extraction:', error);
        // Fallback to simple extraction only
        return extractKeywordsSimple(text).slice(0, 8);
    }
}

// Simple keyword extraction with contextual phrases
function extractKeywordsSimple(text) {
    if (!text || typeof text !== 'string') return [];

    try {
        const cleanText = text
            .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
            'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her',
            'its', 'our', 'their', 'how', 'what', 'when', 'where', 'why', 'who', 'from', 'can', 'about',
            'get', 'make', 'take', 'go', 'come', 'see', 'know', 'think', 'say', 'want', 'need', 'like'
        ]);

        const words = cleanText.toLowerCase().split(/\s+/).filter(word => word.length > 2);
        const phrases = [];

        // Extract 2-word meaningful phrases
        for (let i = 0; i < words.length - 1; i++) {
            const word1 = words[i];
            const word2 = words[i + 1];

            // Skip if either word is a stop word
            if (stopWords.has(word1) || stopWords.has(word2)) continue;

            // Skip numbers only combinations
            if (/^\d+$/.test(word1) && /^\d+$/.test(word2)) continue;

            const phrase = `${word1} ${word2}`;
            if (phrase.length > 4) {
                phrases.push(phrase);
            }
        }

        // Extract 3-word meaningful phrases for better context
        for (let i = 0; i < words.length - 2; i++) {
            const word1 = words[i];
            const word2 = words[i + 1];
            const word3 = words[i + 2];

            // Skip if any word is a stop word
            if (stopWords.has(word1) || stopWords.has(word2) || stopWords.has(word3)) continue;

            // Prioritize phrases with proper nouns or important terms
            const phrase = `${word1} ${word2} ${word3}`;
            const hasCapitalizedWord = cleanText.includes(word1.charAt(0).toUpperCase() + word1.slice(1)) ||
                cleanText.includes(word2.charAt(0).toUpperCase() + word2.slice(1)) ||
                cleanText.includes(word3.charAt(0).toUpperCase() + word3.slice(1));

            if (hasCapitalizedWord && phrase.length > 6) {
                phrases.push(phrase);
            }
        }

        // Also include single important words as fallback
        const importantSingleWords = words.filter(word =>
            !stopWords.has(word) &&
            word.length > 3 &&
            !(/^\d+$/.test(word)) // Exclude pure numbers
        );

        // Combine phrases and important single words, prioritizing phrases
        const allKeywords = [...new Set([...phrases, ...importantSingleWords])];

        return allKeywords.slice(0, 10);
    } catch (error) {
        console.error('Error in simple keyword extraction:', error);
        return [];
    }
}

// AI-powered keyword extraction with contextual phrases
async function extractKeywordsWithAI(text) {
    try {
        if (!process.env.CLAUDE_API_KEY) {
            throw new Error('No Claude API key available');
        }

        const claudeRequest = {
            model: "claude-3-haiku-20240307",
            system: `Extract meaningful keywords and phrases from the text that capture the context and intent. Focus on:
1. 2+ word meaningful phrases that represent key concepts
2. Contextual combinations (e.g., "History of India" instead of just "India")
3. Important multi-word terms that better represent what the user is asking about
4. Proper nouns and specific topics as complete phrases

Return comma-separated keywords/phrases. Prioritize 2-3 word phrases over single words. Maximum 8 items total.

Examples:
- "history of India from 1915" → "History of India, Indian independence movement, Colonial India, Modern Indian history"
- "digital marketing strategies" → "digital marketing strategies, online marketing, digital advertising, marketing techniques"
- "Narendra Modi policies" → "Narendra Modi, Indian Prime Minister, Modi government policies, BJP leadership"`,
            messages: [
                {
                    role: "user",
                    content: `Extract contextual keywords and phrases from: "${text.substring(0, 800)}"`
                }
            ],
            max_tokens: 100,
            temperature: 0.1,
        };

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(claudeRequest)
        });

        if (!response.ok) {
            throw new Error(`AI keyword extraction failed: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.content[0]?.text || "";

        return aiResponse
            .split(',')
            .map(keyword => keyword.trim())
            .filter(keyword => keyword.length > 1)
            .slice(0, 8);
    } catch (error) {
        console.warn('AI keyword extraction failed:', error.message);
        return [];
    }
}

// Find relevant discussions and links from database with enhanced relevance filtering
async function findRelevantDiscussionsAndLinks(keywords, limit = 10) {
    try {
        if (!keywords || keywords.length === 0) {
            console.warn('No keywords provided for search');
            return { discussions: [], links: [] };
        }

        console.log('Searching for content with keywords:', keywords);

        // Create both phrase-based and individual word regex patterns
        const phraseRegexes = keywords
            .filter(keyword => keyword.includes(' ')) // Multi-word phrases
            .map(phrase => new RegExp(phrase.replace(/\s+/g, '\\s+'), 'i'));

        const wordRegexes = keywords
            .filter(keyword => !keyword.includes(' ')) // Single words
            .map(word => new RegExp(`\\b${word}\\b`, 'i')); // Word boundaries for exact matches

        const allRegexes = [...phraseRegexes, ...wordRegexes];

        // Enhanced search query that prioritizes phrase matches
        const searchQuery = {
            $or: [
                // High priority: exact phrase matches in title
                ...phraseRegexes.map(regex => ({ title: regex })),
                // Medium priority: exact phrase matches in content  
                ...phraseRegexes.map(regex => ({ content: regex })),
                // Lower priority: individual word matches with word boundaries
                ...wordRegexes.map(regex => ({ title: regex })),
                ...wordRegexes.map(regex => ({ content: regex })),
                // Hashtag matches (converted to lowercase)
                { hashtags: { $in: keywords.map(k => k.toLowerCase().replace(/\s+/g, '')) } }
            ]
        };

        // Find relevant discussions (posts) with enhanced scoring
        let discussions = [];
        try {
            discussions = await Post.aggregate([
                {
                    $match: searchQuery
                },
                {
                    $addFields: {
                        // Enhanced relevance scoring
                        relevanceScore: {
                            $add: [
                                // Base engagement score
                                { $ifNull: ["$discussions", 0] },
                                { $multiply: [{ $size: { $ifNull: ["$creatorLinks", []] } }, 2] },
                                { $multiply: [{ $size: { $ifNull: ["$communityLinks", []] } }, 2] },
                                // Bonus for phrase matches in title (high weight)
                                ...phraseRegexes.map(regex => ({
                                    $cond: {
                                        if: { $regexMatch: { input: "$title", regex: regex.source, options: "i" } },
                                        then: 10, // High bonus for phrase in title
                                        else: 0
                                    }
                                })),
                                // Bonus for phrase matches in content (medium weight)
                                ...phraseRegexes.map(regex => ({
                                    $cond: {
                                        if: { $regexMatch: { input: "$content", regex: regex.source, options: "i" } },
                                        then: 5, // Medium bonus for phrase in content
                                        else: 0
                                    }
                                })),
                                // Smaller bonus for individual word matches
                                ...wordRegexes.map(regex => ({
                                    $cond: {
                                        if: { $regexMatch: { input: "$title", regex: regex.source, options: "i" } },
                                        then: 2, // Small bonus for word in title
                                        else: 0
                                    }
                                }))
                            ]
                        }
                    }
                },
                {
                    // Filter out low relevance results
                    $match: {
                        relevanceScore: { $gte: phraseRegexes.length > 0 ? 8 : 4 } // Higher threshold for phrase searches
                    }
                },
                {
                    $sort: { relevanceScore: -1, createdAt: -1 }
                },
                {
                    $limit: Math.min(limit * 2, 50) // Get more results for better filtering
                }
            ]);

            console.log('Found discussions before filtering:', discussions.length);
        } catch (discussionError) {
            console.warn('Error finding discussions:', discussionError.message);
        }

        // Find relevant links from posts with enhanced relevance
        const linkResults = [];
        try {
            const linkSearchQuery = {
                $or: [
                    // High priority: phrase matches in link titles/descriptions
                    ...phraseRegexes.map(regex => ({ "creatorLinks.title": regex })),
                    ...phraseRegexes.map(regex => ({ "creatorLinks.description": regex })),
                    ...phraseRegexes.map(regex => ({ "communityLinks.title": regex })),
                    ...phraseRegexes.map(regex => ({ "communityLinks.description": regex })),
                    // Lower priority: word matches in link titles/descriptions
                    ...wordRegexes.map(regex => ({ "creatorLinks.title": regex })),
                    ...wordRegexes.map(regex => ({ "creatorLinks.description": regex })),
                    ...wordRegexes.map(regex => ({ "communityLinks.title": regex })),
                    ...wordRegexes.map(regex => ({ "communityLinks.description": regex }))
                ]
            };

            const posts = await Post.find(linkSearchQuery).limit(30).lean();
            console.log('Found posts with matching links:', posts.length);

            posts.forEach(post => {
                // Process creator links
                if (post.creatorLinks && Array.isArray(post.creatorLinks)) {
                    post.creatorLinks.forEach((link, index) => {
                        const relevanceScore = calculateEnhancedLinkRelevance(link, keywords, phraseRegexes, wordRegexes);
                        const minThreshold = phraseRegexes.length > 0 ? 8 : 5; // Higher threshold for phrase searches

                        if (relevanceScore >= minThreshold) {
                            linkResults.push({
                                id: `${post._id.toString()}-creator-${index}`,
                                title: link.title || 'Untitled Link',
                                url: link.url || '#',
                                description: link.description || '',
                                votes: link.voteCount || link.votes || 0,
                                contributorUsername: post.username || 'Unknown',
                                postId: post._id.toString(),
                                type: 'creator',
                                relevanceScore
                            });
                        }
                    });
                }

                // Process community links
                if (post.communityLinks && Array.isArray(post.communityLinks)) {
                    post.communityLinks.forEach((link, index) => {
                        const relevanceScore = calculateEnhancedLinkRelevance(link, keywords, phraseRegexes, wordRegexes);
                        const minThreshold = phraseRegexes.length > 0 ? 8 : 5; // Higher threshold for phrase searches

                        if (relevanceScore >= minThreshold) {
                            linkResults.push({
                                id: `${post._id.toString()}-community-${index}`,
                                title: link.title || 'Untitled Link',
                                url: link.url || '#',
                                description: link.description || '',
                                votes: link.votes || 0,
                                contributorUsername: link.contributorUsername || 'Unknown',
                                postId: post._id.toString(),
                                type: 'community',
                                relevanceScore
                            });
                        }
                    });
                }
            });

            // Sort links by relevance score first, then by votes
            linkResults.sort((a, b) => {
                if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
                return b.votes - a.votes;
            });

            console.log('Found relevant links after filtering:', linkResults.length);
        } catch (linkError) {
            console.warn('Error finding links:', linkError.message);
        }

        // Final filtering to ensure high quality results
        const filteredDiscussions = discussions
            .filter(post => post.relevanceScore >= (phraseRegexes.length > 0 ? 8 : 4))
            .slice(0, limit);

        const filteredLinks = linkResults
            .filter(link => link.relevanceScore >= (phraseRegexes.length > 0 ? 8 : 5))
            .slice(0, limit);

        console.log('Final filtered results:', filteredDiscussions.length, 'discussions,', filteredLinks.length, 'links');

        return {
            discussions: filteredDiscussions.map(post => ({
                id: post._id.toString(),
                title: post.title || 'Untitled Post',
                username: post.username || 'Unknown',
                discussions: post.discussions || 0,
                linkCount: (post.creatorLinks?.length || 0) + (post.communityLinks?.length || 0),
                engagementScore: post.engagementScore || 0,
                relevanceScore: post.relevanceScore || 0,
                createdAt: post.createdAt
            })),
            links: filteredLinks
        };
    } catch (error) {
        console.error('Error finding relevant discussions and links:', error);
        return { discussions: [], links: [] };
    }
}

// Enhanced helper function to calculate link relevance score with phrase prioritization
function calculateEnhancedLinkRelevance(link, keywords, phraseRegexes, wordRegexes) {
    let score = 0;
    const title = (link.title || '').toLowerCase();
    const description = (link.description || '').toLowerCase();
    const url = (link.url || '').toLowerCase();

    // High scoring: exact phrase matches
    phraseRegexes.forEach(phraseRegex => {
        const phrase = phraseRegex.source.replace(/\\s\+/g, ' ').toLowerCase();
        if (title.includes(phrase)) score += 10; // Very high score for phrase in title
        if (description.includes(phrase)) score += 8; // High score for phrase in description
        if (url.includes(phrase.replace(/\s+/g, ''))) score += 3; // Medium score for phrase in URL
    });

    // Medium scoring: individual word matches with word boundaries
    wordRegexes.forEach(wordRegex => {
        const word = wordRegex.source.replace(/\\b/g, '').toLowerCase();
        const wordBoundaryRegex = new RegExp(`\\b${word}\\b`, 'i');

        if (wordBoundaryRegex.test(title)) score += 3; // Medium score for word in title
        if (wordBoundaryRegex.test(description)) score += 2; // Lower score for word in description
        if (wordBoundaryRegex.test(url)) score += 1; // Low score for word in URL
    });

    // Additional scoring for multi-word queries - require multiple word matches
    if (keywords.length > 1) {
        const matchedWords = keywords.filter(keyword => {
            if (keyword.includes(' ')) {
                // For phrases, check if the phrase exists
                return title.includes(keyword.toLowerCase()) || description.includes(keyword.toLowerCase());
            } else {
                // For individual words, check with word boundaries
                const wordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
                return wordRegex.test(title) || wordRegex.test(description);
            }
        });

        // Bonus for matching multiple keywords (helps with contextual relevance)
        if (matchedWords.length > 1) {
            score += matchedWords.length * 2;
        }

        // Penalty if less than half of keywords match (filters out weak matches)
        if (matchedWords.length < Math.ceil(keywords.length / 2)) {
            score = Math.max(0, score - 5);
        }
    }

    return score;
}

// Legacy function for backward compatibility
function calculateLinkRelevance(link, keywords) {
    let score = 0;
    const title = (link.title || '').toLowerCase();
    const description = (link.description || '').toLowerCase();
    const url = (link.url || '').toLowerCase();

    keywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase();
        if (title.includes(keywordLower)) score += 2;
        if (description.includes(keywordLower)) score += 1;
        if (url.includes(keywordLower)) score += 0.5;
    });

    return score;
}

// Generate brief summary using Claude AI
async function generateBriefSummary(postData, username) {
    try {
        if (!process.env.CLAUDE_API_KEY) {
            return "Here's a summary of the discussion based on the content and links shared.";
        }

        let contentToSummarize = '';

        if (postData.postTitle) {
            contentToSummarize += `Title: ${postData.postTitle}\n\n`;
        }

        if (postData.postContent) {
            contentToSummarize += `Content: ${postData.postContent.substring(0, 800)}${postData.postContent.length > 800 ? '...' : ''}\n\n`;
        }

        if (postData.creatorLinks && postData.creatorLinks.length > 0) {
            contentToSummarize += `Creator Links:\n${postData.creatorLinks.slice(0, 3).map(link =>
                `- ${link.title}: ${(link.description || 'No description').substring(0, 80)}`
            ).join('\n')}\n\n`;
        }

        if (postData.comments && postData.comments.length > 0) {
            contentToSummarize += `Top Comments:\n${postData.comments.slice(0, 3).map(comment =>
                `- ${comment.username}: ${comment.content.substring(0, 80)}`
            ).join('\n')}\n`;
        }

        const claudeRequest = {
            model: "claude-3-haiku-20240307",
            system: `Provide a brief, engaging summary in 2-3 sentences that captures the main points of the discussion. Keep it conversational and informative.`,
            messages: [
                {
                    role: "user",
                    content: `Summarize this discussion:\n\n${contentToSummarize}`
                }
            ],
            max_tokens: 150,
            temperature: 0.7,
        };

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(claudeRequest)
        });

        if (!response.ok) {
            throw new Error(`Summary generation failed: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0]?.text || "Here's a summary of the key points from this discussion.";
    } catch (error) {
        console.error('Error generating brief summary:', error);
        return "Here's a summary of the discussion based on the content and links shared.";
    }
}

// Generate similar topics brief
async function generateSimilarTopicsBrief(keywords, discussions, links) {
    try {
        if (!process.env.CLAUDE_API_KEY) {
            return "These topics are connected through common themes and interests in the community.";
        }

        const claudeRequest = {
            model: "claude-3-haiku-20240307",
            system: "Create a brief summary about similar topics found. Focus on connections and themes. Keep it conversational in 2-3 sentences.",
            messages: [
                {
                    role: "user",
                    content: `Keywords: ${keywords.join(', ')}. Found ${discussions.length} discussions and ${links.length} links. Explain connections.`
                }
            ],
            max_tokens: 120,
            temperature: 0.7,
        };

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(claudeRequest)
        });

        if (!response.ok) {
            throw new Error(`Topics brief failed: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0]?.text || "These topics are connected through common themes and interests.";
    } catch (error) {
        console.error('Error generating similar topics brief:', error);
        return "These topics are connected through common themes and interests in the community.";
    }
}

// Generate topic brief for manual queries
async function generateTopicBrief(question, keywords, discussions, links) {
    try {
        if (!process.env.CLAUDE_API_KEY) {
            return "Here's a brief overview of this topic based on the related discussions and links.";
        }

        const claudeRequest = {
            model: "claude-3-haiku-20240307",
            system: "Provide a brief overview about the main topic/subject that the user is asking about. Focus on explaining what the topic is and why it's relevant, not directly answering their specific question. Keep it informative in 2-3 sentences.",
            messages: [
                {
                    role: "user",
                    content: `User asked: "${question}". Keywords: ${keywords.join(', ')}. Found ${discussions.length} discussions and ${links.length} links. Provide a brief overview about the main topic/subject of this question.`
                }
            ],
            max_tokens: 120,
            temperature: 0.7,
        };

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(claudeRequest)
        });

        if (!response.ok) {
            throw new Error(`Topic brief failed: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0]?.text || "Here's a brief overview of this topic based on the related discussions and links.";
    } catch (error) {
        console.error('Error generating topic brief:', error);
        return "Here's a brief overview of this topic based on the related discussions and links.";
    }
}

// Generate elaborated insights using Claude AI
async function generateElaboratedInsights(query, keywords, searchResults, contextData, username, smallBrief = null) {
    try {
        if (!process.env.CLAUDE_API_KEY) {
            return "Here are some detailed insights about this topic based on the available information.";
        }

        const claudeRequest = {
            model: "claude-3-haiku-20240307",
            system: `You are providing detailed insights about the specific topic the user asked about. Stay focused on their exact query and don't get distracted by unrelated content. 

CRITICAL: The user's query is about "${query}". Your response must be directly about this topic only.

Provide detailed analysis with HTML headings (use <h3>, <h4>, <h5>) and structured content. Include bullet points with <ul><li> for key insights. Make it comprehensive with 3-4 sections covering different aspects of the topic the user actually asked about. Use proper HTML formatting.

If the user asked about a person, focus on that person. If they asked about a technology, focus on that technology. Do not mix topics or discuss unrelated subjects.`,
            messages: [
                {
                    role: "user",
                    content: `I want detailed insights about: "${query}"

Keywords related to this topic: ${keywords.join(', ')}

Please provide comprehensive insights specifically about "${query}" with proper HTML structure and formatting. Focus only on this topic and ignore any unrelated information.`
                }
            ],
            max_tokens: 700,
            temperature: 0.7,
        };

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(claudeRequest)
        });

        if (!response.ok) {
            throw new Error(`Insights generation failed: ${response.status}`);
        }

        const data = await response.json();
        const generatedContent = data.content[0]?.text || "Here are some detailed insights about this topic.";

        // Validation: Check if the response is actually about the queried topic
        const queryWords = query.toLowerCase().split(' ');
        const contentLower = generatedContent.toLowerCase();
        const hasRelevantContent = queryWords.some(word => word.length > 3 && contentLower.includes(word));

        if (!hasRelevantContent) {
            console.warn('Generated content seems unrelated to query:', query);
            return `<h3>About ${query}</h3><p>Here are detailed insights about ${query} based on available information and community discussions.</p>`;
        }

        return generatedContent;
    } catch (error) {
        console.error('Error generating elaborated insights:', error);
        return `<h3>About ${query}</h3><p>Here are detailed insights about ${query} based on the available information.</p>`;
    }
}

// Generate elaborated summary with side headings
async function generateElaboratedSummaryWithHeadings(postData, discussions, links, username) {
    try {
        if (!process.env.CLAUDE_API_KEY) {
            return '<div style="padding: 15px 0; color: var(--text-tertiary); font-size: 13px;">Here\'s a detailed summary of the discussion and related content.</div>';
        }

        let contentInfo = '';
        if (postData.postTitle) {
            contentInfo += `Title: ${postData.postTitle}\n`;
        }
        if (postData.postContent) {
            contentInfo += `Content: ${postData.postContent.substring(0, 400)}...\n`;
        }

        const claudeRequest = {
            model: "claude-3-haiku-20240307",
            system: `You are summarizing the specific discussion content provided. Stay focused on the actual discussion topic and content.

Provide a detailed summary with subheadings (<h3>, <h4>, <h5>) and structured content. Use bullet points (<ul><li>) for key insights. Cover the main points from the discussion content in 3-4 sections.

Focus specifically on the discussion topic shown in the title and content - do not introduce unrelated topics.

Do not mention formatting instructions in your response - just provide the content directly.`,
            messages: [
                {
                    role: "user",
                    content: `Please summarize this discussion content:\n\n${contentInfo}\n\nFound ${discussions.length} related discussions and ${links.length} related links in the community.\n\nProvide a detailed summary with subheadings that focuses on the actual discussion content.`
                }
            ],
            max_tokens: 800,
            temperature: 0.7,
        };

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(claudeRequest)
        });

        if (!response.ok) {
            throw new Error(`Summary generation failed: ${response.status}`);
        }

        const data = await response.json();
        let content = data.content[0]?.text || "Here's a detailed summary of the discussion.";

        // Clean up any mentions of formatting instructions that might slip through
        content = content
            .replace(/with proper HTML formatting[:\.]?/gi, '')
            .replace(/using HTML formatting[:\.]?/gi, '')
            .replace(/with HTML structure[:\.]?/gi, '')
            .replace(/Here (?:is|are) (?:a )?detailed (?:summary|analysis|overview) (?:of|about) .+ with .+formatting[:\.]?\s*/gi, '')
            .trim();

        return `<div style="padding: 15px 0; color: var(--text-tertiary); font-size: 13px; line-height: 1.5;">${content}</div>`;
    } catch (error) {
        console.error('Error generating elaborated summary:', error);
        return '<div style="padding: 15px 0; color: var(--text-tertiary); font-size: 13px;">Here\'s a detailed summary of the discussion and related content.</div>';
    }
}

// Generate relevant external links based on insights content
async function generateRelevantExternalLinks(query, keywords, insights) {
    try {
        if (!process.env.CLAUDE_API_KEY) {
            console.warn('No Claude API key for external link generation');
            return [];
        }

        const claudeRequest = {
            model: "claude-3-haiku-20240307",
            system: `Based on the specific topic "${query}" and the insights content provided, suggest 3-4 relevant educational resources as JSON array. Each item should have 'title', 'url', and 'description' fields. 

Focus on reputable sources like:
- Educational institutions (.edu sites)
- Government websites (.gov sites) 
- Established organizations
- Well-known educational platforms (Coursera, edX, Khan Academy, etc.)
- Wikipedia for general topics
- Official websites for specific people/organizations

IMPORTANT: The links must be directly related to "${query}" - do not suggest links about unrelated topics.

Return only a valid JSON array with no additional text or formatting instructions.`,
            messages: [
                {
                    role: "user",
                    content: `Topic: "${query}"
Keywords: ${keywords.join(', ')}
Insights Content: ${insights.substring(0, 600)}

Suggest relevant educational links specifically about "${query}" as JSON array.`
                }
            ],
            max_tokens: 300,
            temperature: 0.3,
        };

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(claudeRequest)
        });

        if (!response.ok) {
            throw new Error(`External links generation failed: ${response.status}`);
        }

        const data = await response.json();
        let aiResponse = data.content[0]?.text || "";

        // Clean up any formatting mentions that might slip through
        aiResponse = aiResponse
            .replace(/with proper HTML formatting[:\.]?/gi, '')
            .replace(/using HTML formatting[:\.]?/gi, '')
            .replace(/with HTML structure[:\.]?/gi, '')
            .trim();

        try {
            // Try to parse the JSON response
            const suggestedLinks = JSON.parse(aiResponse);
            if (Array.isArray(suggestedLinks)) {
                return suggestedLinks.slice(0, 4).map(link => ({
                    title: link.title || 'Educational Resource',
                    url: link.url || '#',
                    description: link.description || 'Additional learning resource'
                }));
            }
        } catch (parseError) {
            console.warn('Failed to parse AI-generated links JSON:', parseError.message);

            // Fallback: Extract any URLs mentioned in the response
            const urlMatches = aiResponse.match(/https?:\/\/[^\s"',]+/g);
            if (urlMatches && urlMatches.length > 0) {
                return urlMatches.slice(0, 3).map((url, index) => ({
                    title: `Educational Resource ${index + 1}`,
                    url: url.replace(/[.,;!?)]+$/, ''), // Remove trailing punctuation
                    description: 'Additional learning resource related to the topic'
                }));
            }
        }

        // If AI generation fails, return some generic educational resources based on the actual query
        return generateFallbackEducationalLinks(keywords, query);

    } catch (error) {
        console.error('Error generating relevant external links:', error);
        return generateFallbackEducationalLinks(keywords, query);
    }
}

// Generate fallback educational links when AI generation fails
function generateFallbackEducationalLinks(keywords, query = null) {
    try {
        const fallbackLinks = [];
        const searchTerm = query || keywords[0] || 'technology';

        // Generate some educational platform links based on the actual query or keywords
        const educationalPlatforms = [
            {
                title: `Learn about ${searchTerm} on Wikipedia`,
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(searchTerm.replace(/\s+/g, '_'))}`,
                description: 'Comprehensive encyclopedia article'
            },
            {
                title: `${searchTerm} courses on Coursera`,
                url: `https://www.coursera.org/search?query=${encodeURIComponent(searchTerm)}`,
                description: 'Online courses and certifications'
            },
            {
                title: `${searchTerm} resources on Khan Academy`,
                url: `https://www.khanacademy.org/search?search_again=1&page_search_query=${encodeURIComponent(searchTerm)}`,
                description: 'Free educational resources and tutorials'
            }
        ];

        return educationalPlatforms.slice(0, 2);
    } catch (error) {
        console.error('Error generating fallback links:', error);
        return [];
    }
}

// Extract and generate external links based on insights content
async function extractAndGenerateExternalLinks(query, postData, keywords, insightsContent = null) {
    try {
        const externalLinks = [];

        // First, try to generate AI-powered links based on insights content if available
        if (insightsContent) {
            console.log('Generating AI-powered external links based on insights content');
            try {
                const aiGeneratedLinks = await generateRelevantExternalLinks(query, keywords, insightsContent);
                if (aiGeneratedLinks && aiGeneratedLinks.length > 0) {
                    externalLinks.push(...aiGeneratedLinks);
                    console.log('Added', aiGeneratedLinks.length, 'AI-generated educational links');
                }
            } catch (aiError) {
                console.warn('AI link generation failed:', aiError.message);
            }
        }

        // If we still don't have enough links, extract from post content as supplementary
        if (externalLinks.length < 3 && postData && postData.postContent) {
            console.log('Extracting supplementary links from post content');
            const urlRegex = /https?:\/\/[^\s<>"']+/g;
            const foundUrls = postData.postContent.match(urlRegex) || [];

            foundUrls.slice(0, 4 - externalLinks.length).forEach(url => {
                // Filter out video platforms and focus on educational content
                if (!url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('tiktok.com')) {
                    const cleanUrl = url.replace(/[.,;!?)]+$/, ''); // Remove trailing punctuation
                    externalLinks.push({
                        title: cleanUrl.length > 50 ? cleanUrl.substring(0, 50) + '...' : cleanUrl,
                        url: cleanUrl,
                        description: 'Additional resource from discussion'
                    });
                }
            });
        }

        // If we still don't have any links, generate fallback educational links
        if (externalLinks.length === 0) {
            console.log('Generating fallback educational links');
            const fallbackLinks = generateFallbackEducationalLinks(keywords, query);
            externalLinks.push(...fallbackLinks);
        }

        return externalLinks.slice(0, 4);
    } catch (error) {
        console.error('Error extracting and generating external links:', error);
        return generateFallbackEducationalLinks(keywords, query);
    }
}

// Format discussion card HTML with theme support
function formatDiscussionCard(discussion, theme) {
    const commentCount = discussion.discussions || 0;
    const linkCount = discussion.linkCount || 0;
    const themeCSS = generateThemeCSS(theme);

    return `
    <div style="${themeCSS}; padding: 12px; margin: 8px 0; border: 1px solid var(--border-color); border-radius: 8px; background-color: var(--bg-tertiary);">
      <div style="font-size: 14px; color: var(--text-primary); margin-bottom: 6px; line-height: 1.3;">
        ${discussion.title}
      </div>
      <div style="font-size: 12px; color: var(--accent-color); margin-bottom: 8px;">@${discussion.username}</div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <div style="background-color: var(--bg-primary); color: var(--text-tertiary); padding: 3px 8px; border-radius: 10px; font-size: 11px;">
          💬 ${commentCount} comment${commentCount !== 1 ? 's' : ''}
        </div>
        <div style="background-color: var(--bg-primary); color: var(--text-tertiary); padding: 3px 8px; border-radius: 10px; font-size: 11px;">
          🔗 ${linkCount} link${linkCount !== 1 ? 's' : ''}
        </div>
        <a href="/discussion?id=${discussion.id}" style="background-color: var(--bg-secondary); color: var(--accent-color); border: none; padding: 3px 10px; border-radius: 10px; font-size: 11px; text-decoration: none; margin-left: auto;">View</a>
      </div>
    </div>
  `;
}

// Format link card HTML with theme support
function formatLinkCard(link, theme) {
    const votes = link.votes || 0;
    const formattedVotes = votes > 1000 ? (votes / 1000).toFixed(1) + 'k' : votes.toString();
    const themeCSS = generateThemeCSS(theme);

    return `
    <div style="${themeCSS}; padding: 12px; margin: 8px 0; border: 1px solid var(--accent-color); border-radius: 8px; background-color: var(--bg-tertiary); opacity: 0.9;">
      <div style="font-size: 14px; color: var(--text-primary); margin-bottom: 6px; line-height: 1.3; word-break: break-word;">
        ${link.title}
      </div>
      <div style="font-size: 12px; color: var(--accent-color); margin-bottom: 8px;">@${link.contributorUsername}</div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="color: var(--text-tertiary); font-size: 11px; display: flex; align-items: center;">
          <span style="margin-right: 4px;">👍</span>
          ${formattedVotes}
        </div>
        <a href="${link.url}" target="_blank" rel="noopener noreferrer" style="background-color: var(--bg-secondary); color: var(--accent-color); border: none; padding: 3px 10px; border-radius: 10px; font-size: 11px; text-decoration: none;">Visit</a>
      </div>
    </div>
  `;
}