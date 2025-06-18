// src/app/api/ai/status/route.js - Enhanced with Theme Support
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import dbConnect from '@/lib/mongoose';
import UserSettings from '@/models/UserSettings';

// Safe imports with fallbacks
let rateLimiter = {
  checkRateLimit: async () => ({ allowed: true, remainingRequests: 30, resetTime: new Date() }),
  getStatus: async () => ({ remainingRequests: 30, resetTime: new Date() })
};

let responseCache = {
  getStats: async () => ({ totalEntries: 0, activeEntries: 0, hitStats: { avgHits: 0 } }),
  clear: async () => 0
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

// Theme detection function (same as in main Claude route)
async function detectUserTheme(userId, requestTheme = null) {
  console.log('Detecting theme for status endpoint user:', userId, 'requestTheme:', requestTheme);
  
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

export async function GET(request) {
    try {
        // Parse URL for theme parameter
        const url = new URL(request.url);
        const requestTheme = url.searchParams.get('theme');

        // Get user info if authenticated
        const headersList = headers();
        const authHeader = headersList.get('Authorization');
        let userId = null;
        let isAuthenticated = false;
        let userTheme = 'dark';

        console.log('Setting up database connections for status endpoint...');

        // Connect to database with error handling
        try {
            await connectToDatabase();
            await dbConnect();
            console.log('Database connected successfully for status endpoint');
        } catch (dbError) {
            console.error('Database connection error in status endpoint:', dbError);
            return NextResponse.json(
                { 
                    error: 'Database connection failed', 
                    details: dbError.message,
                    theme: 'dark'
                },
                { status: 500 }
            );
        }

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
                userId = decoded.id;
                isAuthenticated = true;
                console.log('User authenticated for status:', userId);
            } catch (error) {
                console.warn('Invalid token in status endpoint:', error.message);
            }
        }

        // Detect user theme
        userTheme = await detectUserTheme(userId, requestTheme);
        console.log('Detected user theme for status:', userTheme);

        const response = {
            timestamp: new Date().toISOString(),
            theme: userTheme,
            themeVariables: getThemeVariables(userTheme),
            user: {
                authenticated: isAuthenticated,
                userId: userId ? userId.substring(0, 8) + '...' : null,
                theme: userTheme
            },
            services: {
                claude: {
                    available: !!process.env.CLAUDE_API_KEY,
                    model: 'claude-3-haiku-20240307',
                    themeSupport: true
                },
                mcp: {
                    available: true,
                    version: process.env.MCP_SERVER_VERSION || '1.0.0',
                    features: ['community_search', 'web_search', 'quota_management']
                },
                tavily: {
                    available: !!process.env.TAVILY_API_KEY,
                    dailyLimit: parseInt(process.env.WEB_SEARCH_DAILY_LIMIT) || 30
                }
            }
        };

        // Get comprehensive rate limiting status if user is authenticated
        if (isAuthenticated && userId) {
            try {
                const fullStatus = await rateLimiter.getStatus(userId, 'manual');
                
                response.rateLimits = {
                    ai: fullStatus?.ai || {
                        maxRequests: 30,
                        usedRequests: 0,
                        remainingRequests: 30,
                        resetTime: new Date(Date.now() + 60 * 60 * 1000),
                        type: 'manual'
                    },
                    webSearch: fullStatus?.webSearch || {
                        remaining: 30,
                        used: 0,
                        limit: 30,
                        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                        tier: 'free'
                    }
                };
            } catch (error) {
                console.error('Error getting comprehensive rate limit status:', error);
                response.rateLimits = {
                    error: 'Unable to fetch rate limit status',
                    ai: { error: 'Unavailable' },
                    webSearch: { error: 'Unavailable' }
                };
            }
        } else {
            response.rateLimits = {
                message: 'Authentication required to view rate limit status'
            };
        }

        // Get cache statistics (keep existing)
        try {
            const cacheStats = await responseCache.getStats();
            response.cache = {
                enabled: true,
                totalEntries: cacheStats?.totalEntries || 0,
                activeEntries: cacheStats?.activeEntries || 0,
                hitRate: cacheStats?.hitStats?.avgHits > 0 ?
                    `${(cacheStats.hitStats.avgHits).toFixed(1)} avg hits per entry` :
                    'No hit data available'
            };
        } catch (error) {
            console.error('Error getting cache stats:', error);
            response.cache = {
                enabled: true,
                error: 'Unable to fetch cache statistics'
            };
        }

        // Add health check for database and MCP
        try {
            const { claudeDbService } = await import('@/lib/claudeDbService');
            const dbHealthy = await claudeDbService.init();
            
            // Test MCP functionality
            let mcpHealthy = false;
            try {
                const { mcpServer } = await import('@/lib/mcp/server');
                mcpHealthy = true;
            } catch (mcpError) {
                console.warn('MCP health check failed:', mcpError.message);
            }
            
            response.database = {
                status: dbHealthy ? 'connected' : 'error',
                lastChecked: new Date().toISOString()
            };
            
            response.mcp = {
                status: mcpHealthy ? 'available' : 'error',
                lastChecked: new Date().toISOString()
            };
        } catch (error) {
            response.database = {
                status: 'error',
                error: error.message,
                lastChecked: new Date().toISOString()
            };
            response.mcp = {
                status: 'error',
                error: 'MCP unavailable',
                lastChecked: new Date().toISOString()
            };
        }

        return NextResponse.json(response);

    } catch (error) {
        console.error('Status endpoint error:', error);
        return NextResponse.json({
            error: 'Unable to fetch status',
            message: error.message,
            timestamp: new Date().toISOString(),
            theme: 'dark'
        }, { status: 500 });
    }
}


// Admin endpoint for clearing cache (requires authentication) - Enhanced with theme support
export async function DELETE(request) {
    try {
        // Parse URL for theme parameter
        const url = new URL(request.url);
        const requestTheme = url.searchParams.get('theme');

        // Get user info
        const headersList = headers();
        const authHeader = headersList.get('Authorization');
        let userId = null;
        let userTheme = 'dark'; // Default theme

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ 
                error: 'Authentication required',
                theme: 'dark' // Safe fallback
            }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
            userId = decoded.id;
        } catch (error) {
            return NextResponse.json({ 
                error: 'Invalid token',
                theme: 'dark' // Safe fallback
            }, { status: 401 });
        }

        // Connect to database for theme detection
        try {
            await connectToDatabase();
            await dbConnect();
        } catch (dbError) {
            console.warn('Database connection failed for theme detection in DELETE:', dbError.message);
        }

        // Detect user theme
        userTheme = await detectUserTheme(userId, requestTheme);
        console.log('Detected user theme for cache clear:', userTheme);

        // Only allow cache clearing for admin users (implement your admin check here)
        // For now, allow any authenticated user
        const deletedCount = await responseCache.clear();

        return NextResponse.json({
            success: true,
            message: `Cache cleared: ${deletedCount} entries removed`,
            timestamp: new Date().toISOString(),
            theme: userTheme, // Include theme in response
            themeVariables: getThemeVariables(userTheme)
        });

    } catch (error) {
        console.error('Cache clear error:', error);
        return NextResponse.json({
            error: 'Failed to clear cache',
            message: error.message,
            timestamp: new Date().toISOString(),
            theme: 'dark' // Safe fallback theme
        }, { status: 500 });
    }
}

// NEW: Classification endpoint with theme support
export async function POST(request) {
    try {
        // Parse request body
        let requestData;
        try {
            requestData = await request.json();
        } catch (parseError) {
            return NextResponse.json(
                { 
                    error: 'Invalid request format', 
                    details: parseError.message,
                    theme: 'dark' // Safe fallback
                },
                { status: 400 }
            );
        }

        const {
            content,
            categories = ['Trending', 'Music', 'Gaming', 'Movies', 'News', 'Sports', 'Learning', 'Fashion', 'Podcasts', 'Lifestyle'],
            theme: requestTheme = null
        } = requestData;

        // Get user info if authenticated
        const headersList = headers();
        const authHeader = headersList.get('Authorization');
        let userId = null;
        let userTheme = 'dark'; // Default theme

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
                userId = decoded.id;
            } catch (error) {
                console.warn('Invalid token in classification endpoint:', error.message);
            }
        }

        // Connect to database for theme detection
        try {
            await connectToDatabase();
            await dbConnect();
        } catch (dbError) {
            console.warn('Database connection failed for theme detection in classification:', dbError.message);
        }

        // Detect user theme
        userTheme = await detectUserTheme(userId, requestTheme);
        console.log('Detected user theme for classification:', userTheme);

        if (!content) {
            return NextResponse.json(
                { 
                    error: 'Missing required content parameter',
                    theme: userTheme
                },
                { status: 400 }
            );
        }

        // Make sure we have Claude API key
        if (!process.env.CLAUDE_API_KEY) {
            console.error('CLAUDE_API_KEY is not defined in environment variables');
            return NextResponse.json(
                { 
                    error: 'API configuration error',
                    theme: userTheme
                },
                { status: 500 }
            );
        }

        // Fixed, clearly defined categories with explicit examples
        const CATEGORY_DEFINITIONS = {
            'Trending': {
                description: 'Popular or viral content with high engagement that doesn\'t fit other categories',
                examples: [
                    'Title: What Everyone Is Talking About Today',
                    'Title: The Latest Internet Sensation',
                    'Title: 10 Things Going Viral This Week'
                ]
            },
            'Music': {
                description: 'Content about songs, albums, artists, concerts, musical instruments, or the music industry',
                examples: [
                    'Title: New Album Review: Taylor Swift\'s Latest Release',
                    'Title: Top 10 Guitar Solos of All Time',
                    'Title: How to Start Your Music Production Career'
                ]
            },
            'Gaming': {
                description: 'Content about video games, gaming hardware, esports, streamers, or game development',
                examples: [
                    'Title: Elden Ring DLC Announcement Details',
                    'Title: Best Budget Gaming PCs in 2024',
                    'Title: How Pro Gamers Train for Tournaments'
                ]
            },
            'Movies': {
                description: 'Content about films, cinema, actors, directors, or the film industry',
                examples: [
                    'Title: Marvel Announces Next Phase of Superhero Films',
                    'Title: Oscar Nominations Breakdown',
                    'Title: Review: The Latest Christopher Nolan Film'
                ]
            },
            'News': {
                description: 'Current events, politics, world affairs, breaking stories, or journalism',
                examples: [
                    'Title: Breaking: Election Results Announced',
                    'Title: Economic Impact of New Trade Deal',
                    'Title: Climate Summit Reaches Historic Agreement'
                ]
            },
            'Sports': {
                description: 'Athletic competitions, teams, players, sporting events, or physical activities',
                examples: [
                    'Title: NBA Finals Game 7 Recap',
                    'Title: Olympic Medal Count Update',
                    'Title: How to Improve Your Tennis Serve'
                ]
            },
            'Learning': {
                description: 'Educational content, tutorials, courses, academic subjects, or skill development',
                examples: [
                    'Title: Complete Guide to Machine Learning Algorithms',
                    'Title: How to Learn a New Language in 3 Months',
                    'Title: Understanding Quantum Physics Basics'
                ]
            },
            'Fashion': {
                description: 'Clothing, style trends, designers, models, or the fashion industry',
                examples: [
                    'Title: Summer Fashion Trends for 2024',
                    'Title: Sustainable Clothing Brands to Support',
                    'Title: Paris Fashion Week Highlights'
                ]
            },
            'Podcasts': {
                description: 'Audio shows, podcast episodes, podcast hosts, or podcast platforms',
                examples: [
                    'Title: Best True Crime Podcasts to Binge',
                    'Title: Interview with Joe Rogan on Podcast Success',
                    'Title: How to Start Your First Podcast'
                ]
            },
            'Lifestyle': {
                description: 'Daily living, wellness, health, home, food, travel, or personal development',
                examples: [
                    'Title: 30-Day Meditation Challenge Results',
                    'Title: Best Destinations for Digital Nomads',
                    'Title: Simple Meal Prep Ideas for Busy Professionals'
                ]
            }
        };

        // Extract title and description from content
        const titleMatch = content.match(/Title:\s*(.*?)(?:\n|$)/);
        const descriptionMatch = content.match(/Description:\s*(.*?)(?:\n|$)/);
        
        const title = titleMatch ? titleMatch[1].trim() : '';
        const description = descriptionMatch ? descriptionMatch[1].trim() : '';
        
        if (!title) {
            return NextResponse.json(
                { 
                    error: 'Missing title in content',
                    theme: userTheme
                },
                { status: 400 }
            );
        }

        // Build detailed category descriptions with examples
        const categoryGuide = categories.map(cat => {
            const def = CATEGORY_DEFINITIONS[cat];
            if (!def) return `- ${cat}: General category`;
            
            return `- ${cat}: ${def.description}\n  Examples:\n  * ${def.examples.join('\n  * ')}`;
        }).join('\n\n');

        // Create Claude API request with specific system prompt for categorization
        const claudeRequest = {
            model: "claude-3-haiku-20240307",
            system: `You are a precise content categorization AI that analyzes post titles and descriptions to assign exactly ONE category that best represents the content's subject matter. 

Your job is to determine the primary topic of the post by analyzing the semantic meaning of the FULL title and description.

DETAILED CATEGORY GUIDE:
${categoryGuide}

CATEGORIZATION RULES:
1. Read and analyze the COMPLETE title and description text word by word.
2. Focus on the PRIMARY subject matter and main topic of the content.
3. Look for specific subject indicators that clearly match a defined category.
4. If content fits multiple categories, select the one that best represents the PRIMARY focus.
5. Use "Trending" ONLY if the content truly doesn't fit well into any other category.
6. Consider these category assignments mutually exclusive - a post belongs in exactly ONE category.

Your response must ONLY contain the single category name, with no other text.`,
            messages: [
                {
                    role: "user",
                    content: `I need you to analyze this post and categorize it:

Title: ${title}
${description ? `Description: ${description}` : ''}

Based on a thorough analysis of the title${description ? ' and description' : ''}, what is the ONE most appropriate category for this content? Choose from: ${categories.join(', ')}`
                }
            ],
            max_tokens: 10,
            temperature: 0.0, // Use 0 temperature for maximum consistency
        };

        // Call Claude API
        console.log(`Classifying: "${title}" with theme: ${userTheme}`);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(claudeRequest)
        });

        // Handle API response errors
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Claude API error: ${response.status} - ${errorText}`);
        }

        // Parse response
        const data = await response.json();
        const rawResponse = data.content[0]?.text || "";
        
        // Clean the response - get only the category name
        const cleanedResponse = rawResponse.trim().split(/[\s\n]+/)[0];
        
        // Validate against available categories
        let category = null;
        
        // First try exact match
        if (categories.includes(cleanedResponse)) {
            category = cleanedResponse;
        } else {
            // Try case-insensitive match
            const lowerResponse = cleanedResponse.toLowerCase();
            for (const validCategory of categories) {
                if (validCategory.toLowerCase() === lowerResponse) {
                    category = validCategory;
                    break;
                }
            }
            
            // If still not found, try partial match
            if (!category) {
                for (const validCategory of categories) {
                    if (lowerResponse.includes(validCategory.toLowerCase()) || 
                        validCategory.toLowerCase().includes(lowerResponse)) {
                        category = validCategory;
                        break;
                    }
                }
            }
        }

        // If still no valid category, default to Trending
        if (!category) {
            console.warn(`Invalid category response: "${rawResponse}", defaulting to Trending`);
            category = 'Trending';
        }

        console.log(`Classified "${title}" as: ${category} with theme: ${userTheme}`);
        return NextResponse.json({ 
            category, 
            originalResponse: rawResponse,
            theme: userTheme,
            themeVariables: getThemeVariables(userTheme)
        }, { status: 200 });

    } catch (error) {
        console.error('Content classification error:', error);
        return NextResponse.json(
            { 
                error: 'Classification failed', 
                message: error.message,
                theme: 'dark' // Safe fallback theme
            },
            { status: 500 }
        );
    }
}