// src/app/api/explore/category/route.js - Enhanced with 2-Tier Categorization System
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const ITEMS_PER_PAGE = 12;

// Enhanced Category Definitions with Contextual Phrases
const ENHANCED_CATEGORY_CONFIG = {
  'Trending': {
    tier2_phrases: [
      'viral content', 'trending now', 'popular discussion', 'hot topic', 'breaking news',
      'everyone talking', 'must watch', 'going viral', 'latest buzz', 'trending topic'
    ],
    tier3_keywords: ['viral', 'trending', 'popular', 'hot', 'buzz', 'breaking'],
    exclude_phrases: [], // No exclusions for trending
    context_clues: ['views', 'shares', 'engagement', 'discussion']
  },
  'Music': {
    tier2_phrases: [
      'music video', 'new album', 'song review', 'music production', 'artist interview',
      'concert review', 'music theory', 'band announcement', 'song analysis', 'music news',
      'album release', 'music industry', 'streaming music', 'music recommendation'
    ],
    tier3_keywords: ['music', 'song', 'album', 'artist', 'band', 'concert', 'spotify', 'playlist'],
    exclude_phrases: ['game music', 'gaming soundtrack', 'movie soundtrack', 'background music for'],
    context_clues: ['lyrics', 'melody', 'rhythm', 'vocals', 'instruments']
  },
  'Gaming': {
    tier2_phrases: [
      'game review', 'gaming setup', 'esports tournament', 'game trailer', 'gaming news',
      'game walkthrough', 'gaming tips', 'game release', 'gaming community', 'game streaming',
      'video game', 'game development', 'gaming hardware', 'game discussion'
    ],
    tier3_keywords: ['game', 'gaming', 'xbox', 'playstation', 'nintendo', 'steam', 'esports'],
    exclude_phrases: ['music game', 'game show', 'sports game score'],
    context_clues: ['gameplay', 'levels', 'characters', 'multiplayer', 'console']
  },
  'Movies': {
    tier2_phrases: [
      'movie review', 'film analysis', 'movie trailer', 'cinema news', 'film discussion',
      'movie recommendation', 'film industry', 'actor interview', 'movie release', 'film critique',
      'hollywood news', 'movie streaming', 'film festival', 'director spotlight'
    ],
    tier3_keywords: ['movie', 'film', 'cinema', 'hollywood', 'actor', 'director', 'netflix'],
    exclude_phrases: ['game movie', 'music video', 'sports documentary'],
    context_clues: ['screenplay', 'cinematography', 'plot', 'characters', 'genre']
  },
  'News': {
    tier2_phrases: [
      'breaking news', 'news update', 'current events', 'news analysis', 'world news',
      'political news', 'news report', 'latest news', 'news discussion', 'news commentary',
      'business news', 'tech news', 'news summary', 'news opinion'
    ],
    tier3_keywords: ['news', 'politics', 'world', 'breaking', 'report', 'update'],
    exclude_phrases: ['gaming news', 'music news', 'movie news', 'sports news'],
    context_clues: ['journalism', 'reporter', 'headline', 'current', 'events']
  },
  'Sports': {
    tier2_phrases: [
      'sports news', 'game highlights', 'sports analysis', 'match result', 'sports update',
      'athlete interview', 'sports commentary', 'team news', 'tournament update', 'sports event',
      'match preview', 'sports statistics', 'player performance', 'sports discussion'
    ],
    tier3_keywords: ['sports', 'football', 'basketball', 'soccer', 'nba', 'nfl', 'athlete'],
    exclude_phrases: ['esports', 'video game', 'sports game console'],
    context_clues: ['score', 'match', 'team', 'player', 'championship']
  },
  'Learning': {
    tier2_phrases: [
      'online course', 'tutorial video', 'educational content', 'learning resource', 'study tips',
      'academic discussion', 'skill development', 'educational review', 'learning experience',
      'study guide', 'educational platform', 'learning journey', 'course review'
    ],
    tier3_keywords: ['learn', 'education', 'course', 'tutorial', 'study', 'university'],
    exclude_phrases: ['game tutorial', 'music lesson as entertainment'],
    context_clues: ['knowledge', 'skills', 'academic', 'certification', 'training']
  },
  'Fashion': {
    tier2_phrases: [
      'fashion trend', 'style guide', 'outfit ideas', 'fashion review', 'clothing brand',
      'fashion news', 'style inspiration', 'fashion industry', 'designer collection', 'fashion tips',
      'wardrobe essentials', 'fashion week', 'style advice', 'fashion discussion'
    ],
    tier3_keywords: ['fashion', 'style', 'clothing', 'outfit', 'designer', 'trend'],
    exclude_phrases: ['game character style', 'music artist style'],
    context_clues: ['clothing', 'accessories', 'trends', 'wardrobe', 'designers']
  },
  'Podcasts': {
    tier2_phrases: [
      'podcast episode', 'podcast review', 'podcast recommendation', 'podcast discussion',
      'audio content', 'podcast host', 'podcast series', 'podcast interview', 'podcast news',
      'audio show', 'podcast platform', 'podcast community', 'podcast analysis'
    ],
    tier3_keywords: ['podcast', 'episode', 'host', 'interview', 'audio'],
    exclude_phrases: ['music podcast as music', 'gaming podcast as gaming'],
    context_clues: ['audio', 'host', 'episode', 'listening', 'conversation']
  },
  'Lifestyle': {
    tier2_phrases: [
      'lifestyle tips', 'wellness journey', 'health advice', 'life improvement', 'daily routine',
      'lifestyle blog', 'personal development', 'life hacks', 'wellness content', 'lifestyle change',
      'healthy living', 'lifestyle inspiration', 'work life balance', 'lifestyle discussion'
    ],
    tier3_keywords: ['lifestyle', 'wellness', 'health', 'fitness', 'food', 'travel'],
    exclude_phrases: ['gaming lifestyle', 'celebrity lifestyle news'],
    context_clues: ['wellness', 'habits', 'routine', 'personal', 'improvement']
  }
};

// Cache for AI categorization results (in production, use Redis or similar)
const categorizationCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'Trending';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || String(ITEMS_PER_PAGE), 10);

    console.log(`🎯 Enhanced Explore API called for category: ${category}, page: ${page}`);

    // Connect to database
    const { db } = await connectToDatabase();

    // Get current user with token handling for personalization
    let currentUserId = null;
    const headersList = headers();
    const authHeader = headersList.get('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
        currentUserId = decoded.id;
      } catch (error) {
        console.warn('Invalid token in explore API:', error.message);
      }
    }

    // Get hidden posts to exclude from results
    let hiddenPostIds = [];
    if (currentUserId) {
      try {
        const hiddenPosts = await db.collection('hiddenposts').find({
          userId: new ObjectId(currentUserId)
        }).toArray();

        hiddenPostIds = hiddenPosts.map(hp =>
          typeof hp.postId === 'string' ? new ObjectId(hp.postId) : hp.postId
        );

        console.log(`🚫 Found ${hiddenPostIds.length} hidden posts for user ${currentUserId}`);
      } catch (error) {
        console.error('Error filtering hidden posts:', error);
      }
    }

    // Base query to exclude hidden posts
    let baseQuery = {};
    if (hiddenPostIds.length > 0) {
      baseQuery._id = { $nin: hiddenPostIds };
    }

    // Special handling for Trending category
    if (category === 'Trending') {
      console.log('📈 Fetching trending posts based on engagement metrics');
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      baseQuery.createdAt = { $gte: thirtyDaysAgo };

      const trendingPosts = await db.collection('posts')
        .find(baseQuery)
        .sort({ discussions: -1, shares: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      const totalPosts = await db.collection('posts').countDocuments(baseQuery);
      const items = await formatPostsForExplore(db, trendingPosts);

      return NextResponse.json({
        category,
        items,
        pagination: {
          page,
          limit,
          totalItems: totalPosts,
          totalPages: Math.ceil(totalPosts / limit)
        },
        source: 'trending_algorithm'
      }, { status: 200 });
    }

    // Enhanced 2-Tier Categorization System
    console.log(`🎯 Starting 2-tier categorization for: ${category}`);
    
    const categoryResults = await enhancedCategorization(
      db, 
      category, 
      baseQuery, 
      page, 
      limit
    );

    if (categoryResults.items.length === 0) {
      console.log(`⚠️ No results found for ${category}, showing no content message`);
      
      // Return no content message with suggestion
      return NextResponse.json({
        category,
        items: [],
        pagination: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0
        },
        source: 'no_content',
        message: getNoContentMessage(category)
      }, { status: 200 });
    }

    return NextResponse.json(categoryResults, { status: 200 });

  } catch (error) {
    console.error('❌ Enhanced Explore API error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch explore content', error: error.message },
      { status: 500 }
    );
  }
}

// Enhanced 2-Tier Categorization System
async function enhancedCategorization(db, category, baseQuery, page, limit) {
  const config = ENHANCED_CATEGORY_CONFIG[category];
  if (!config) {
    console.warn(`⚠️ No configuration found for category: ${category}`);
    return { items: [], pagination: { page, limit, totalItems: 0, totalPages: 0 }, source: 'no_config' };
  }

  console.log(`🔍 Tier 1: AI-Powered Intent Analysis for ${category}`);
  
  // Get candidate posts for AI analysis (more than needed for filtering)
  const candidatePosts = await db.collection('posts')
    .find(baseQuery)
    .sort({ createdAt: -1 })
    .limit(limit * 4) // Get 4x more for better filtering
    .toArray();

  console.log(`📄 Found ${candidatePosts.length} candidate posts for analysis`);

  // Tier 1: AI-Powered Intent Analysis
  const tier1Results = await aiPoweredCategorization(candidatePosts, category, config);
  console.log(`🤖 Tier 1 (AI): ${tier1Results.length} posts matched`);

  // If we have enough results from Tier 1, use them
  if (tier1Results.length >= limit) {
    const paginatedResults = tier1Results.slice((page - 1) * limit, page * limit);
    const items = await formatPostsForExplore(db, paginatedResults);
    
    return {
      category,
      items,
      pagination: {
        page,
        limit,
        totalItems: tier1Results.length,
        totalPages: Math.ceil(tier1Results.length / limit)
      },
      source: 'ai_categorization'
    };
  }

  console.log(`🔍 Tier 2: Enhanced Phrase Matching for ${category}`);
  
  // Tier 2: Enhanced Phrase Matching
  const tier2Results = await enhancedPhraseMatching(db, category, config, baseQuery, limit * 2);
  console.log(`📝 Tier 2 (Enhanced Phrases): ${tier2Results.posts.length} posts matched`);

  // Combine Tier 1 and Tier 2 results, removing duplicates
  const combinedResults = [...tier1Results];
  const existingIds = new Set(tier1Results.map(post => post._id.toString()));
  
  tier2Results.posts.forEach(post => {
    if (!existingIds.has(post._id.toString())) {
      combinedResults.push(post);
      existingIds.add(post._id.toString());
    }
  });

  console.log(`🔗 Combined Tier 1+2: ${combinedResults.length} posts`);

  // Return whatever we found (no minimum threshold)
  const paginatedResults = combinedResults.slice((page - 1) * limit, page * limit);
  const items = await formatPostsForExplore(db, paginatedResults);

  const sourceType = tier1Results.length > 0 ? 'ai_and_phrases' : 
                     tier2Results.posts.length > 0 ? 'enhanced_phrases' : 'no_content';

  return {
    category,
    items,
    pagination: {
      page,
      limit,
      totalItems: combinedResults.length,
      totalPages: Math.ceil(Math.max(combinedResults.length, 1) / limit)
    },
    source: sourceType
  };
}

// Tier 1: AI-Powered Intent Analysis
async function aiPoweredCategorization(posts, category, config) {
  try {
    if (!process.env.CLAUDE_API_KEY) {
      console.warn('⚠️ No Claude API key, skipping AI categorization');
      return [];
    }

    // Process posts in batches to avoid API limits
    const batchSize = 5;
    const matchedPosts = [];

    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      
      try {
        const batchResults = await analyzePostsBatch(batch, category, config);
        matchedPosts.push(...batchResults);
        
        // Small delay to respect API limits
        if (i + batchSize < posts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (batchError) {
        console.warn(`⚠️ Batch ${i / batchSize + 1} failed:`, batchError.message);
        continue;
      }
    }

    console.log(`🤖 AI categorization completed: ${matchedPosts.length}/${posts.length} posts matched`);
    return matchedPosts;
  } catch (error) {
    console.error('❌ AI categorization failed:', error);
    return [];
  }
}

// Analyze a batch of posts with Claude AI
async function analyzePostsBatch(posts, category, config) {
  try {
    // Create cache keys
    const cacheKeys = posts.map(post => `${post._id.toString()}-${category}`);
    const cachedResults = [];
    const uncachedPosts = [];

    // Check cache first
    posts.forEach((post, index) => {
      const cached = categorizationCache.get(cacheKeys[index]);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        if (cached.matches) {
          cachedResults.push(post);
        }
      } else {
        uncachedPosts.push({ post, cacheKey: cacheKeys[index] });
      }
    });

    if (uncachedPosts.length === 0) {
      console.log(`💾 All ${posts.length} posts found in cache`);
      return cachedResults;
    }

    // Prepare content for AI analysis
    const postsContent = uncachedPosts.map(({ post }, index) => 
      `Post ${index + 1}:
Title: ${post.title || 'No title'}
Content: ${(post.content || '').substring(0, 200)}${post.content && post.content.length > 200 ? '...' : ''}
Hashtags: ${(post.hashtags || []).join(', ') || 'None'}`
    ).join('\n\n');

    const claudeRequest = {
      model: "claude-3-haiku-20240307",
      system: `You are a content categorization expert. Analyze posts to determine if they truly belong to the "${category}" category.

IMPORTANT RULES:
1. Focus on the PRIMARY INTENT and main topic of the post
2. Exclude content that only mentions ${category.toLowerCase()} tangentially
3. For ${category}: ${config.tier2_phrases.slice(0, 3).join(', ')} are good examples
4. EXCLUDE these patterns: ${config.exclude_phrases.join(', ')}

Return only a JSON array of numbers (1-based) for posts that TRULY belong to ${category}. 
Example: [1, 3, 5] means posts 1, 3, and 5 match the category.
If no posts match, return: []`,
      messages: [
        {
          role: "user",
          content: `Analyze these posts for the "${category}" category:

${postsContent}

Which posts truly belong to ${category}? Return only the JSON array of post numbers.`
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
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.content[0]?.text || "[]";
    
    // Parse AI response
    let matchedIndices = [];
    try {
      matchedIndices = JSON.parse(aiResponse.trim());
      if (!Array.isArray(matchedIndices)) {
        matchedIndices = [];
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse AI response:', aiResponse);
      matchedIndices = [];
    }

    // Cache results and collect matched posts
    const matchedPosts = [...cachedResults];
    
    uncachedPosts.forEach(({ post, cacheKey }, index) => {
      const matches = matchedIndices.includes(index + 1);
      
      // Cache the result
      categorizationCache.set(cacheKey, {
        matches,
        timestamp: Date.now()
      });

      if (matches) {
        matchedPosts.push(post);
      }
    });

    console.log(`🤖 AI batch analysis: ${matchedPosts.length} posts matched for ${category}`);
    return matchedPosts;

  } catch (error) {
    console.error('❌ AI batch analysis failed:', error);
    return [];
  }
}

// Tier 2: Enhanced Phrase Matching
async function enhancedPhraseMatching(db, category, config, baseQuery, limit) {
  try {
    // Create enhanced regex patterns for phrases
    const phraseRegexes = config.tier2_phrases.map(phrase => 
      new RegExp(phrase.replace(/\s+/g, '\\s+'), 'i')
    );

    // Create exclusion patterns
    const exclusionRegexes = config.exclude_phrases.map(phrase => 
      new RegExp(phrase.replace(/\s+/g, '\\s+'), 'i')
    );

    // Build search query
    const searchQuery = {
      ...baseQuery,
      $and: [
        {
          $or: [
            // Match tier 2 phrases in title (high priority)
            ...phraseRegexes.map(regex => ({ title: regex })),
            // Match tier 2 phrases in content (medium priority)
            ...phraseRegexes.map(regex => ({ content: regex })),
            // Match hashtags
            { hashtags: { $in: config.tier2_phrases.map(p => p.toLowerCase().replace(/\s+/g, '')) } }
          ]
        },
        // Exclude unwanted content
        ...exclusionRegexes.length > 0 ? [{
          $and: exclusionRegexes.map(regex => ({
            $and: [
              { title: { $not: regex } },
              { content: { $not: regex } }
            ]
          }))
        }] : []
      ]
    };

    const posts = await db.collection('posts')
      .find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const totalPosts = await db.collection('posts').countDocuments(searchQuery);

    console.log(`📝 Enhanced phrase matching found ${posts.length} posts for ${category}`);
    
    return {
      posts,
      totalPosts
    };
  } catch (error) {
    console.error('❌ Enhanced phrase matching failed:', error);
    return { posts: [], totalPosts: 0 };
  }
}

// Generate category-specific "no content" messages with suggestions
function getNoContentMessage(category) {
  const messages = {
    'Trending': {
      title: 'No trending content right now',
      description: 'Be the first to create content that gets everyone talking!',
      suggestion: 'Share something interesting and start the conversation.'
    },
    'Music': {
      title: 'No music discussions found yet',
      description: 'The music community is waiting for your voice!',
      suggestion: 'Share your favorite album, song review, or music discovery.'
    },
    'Gaming': {
      title: 'No gaming content available',
      description: 'Level up this category with your gaming insights!',
      suggestion: 'Post about your latest game, review, or gaming setup.'
    },
    'Movies': {
      title: 'No movie discussions found',
      description: 'The cinema community needs your perspective!',
      suggestion: 'Share a movie review, film analysis, or recommendation.'
    },
    'News': {
      title: 'No news discussions yet',
      description: 'Stay informed and keep others updated!',
      suggestion: 'Share important news or start a current events discussion.'
    },
    'Sports': {
      title: 'No sports content found',
      description: 'Score the first goal in this category!',
      suggestion: 'Post about your favorite team, game highlights, or sports news.'
    },
    'Learning': {
      title: 'No educational content yet',
      description: 'Knowledge sharing starts with you!',
      suggestion: 'Share a tutorial, course recommendation, or learning resource.'
    },
    'Fashion': {
      title: 'No fashion discussions found',
      description: 'Set the style trend in this community!',
      suggestion: 'Share outfit ideas, fashion tips, or style inspiration.'
    },
    'Podcasts': {
      title: 'No podcast content available',
      description: 'Tune in the conversation!',
      suggestion: 'Recommend a great podcast episode or share your thoughts on audio content.'
    },
    'Lifestyle': {
      title: 'No lifestyle content found',
      description: 'Live your best life and inspire others!',
      suggestion: 'Share wellness tips, daily routines, or lifestyle inspiration.'
    }
  };

  return messages[category] || {
    title: `No ${category.toLowerCase()} content found yet`,
    description: 'This category is waiting for great content!',
    suggestion: 'Be the first to contribute and help build this community.'
  };
}

// Helper function to format posts for the explore grid (unchanged)
async function formatPostsForExplore(db, posts) {
  if (!posts || posts.length === 0) return [];

  // Get user information for each post in a single batch
  const userIds = [...new Set(posts.map(post => {
    if (post.userId) {
      return post.userId instanceof ObjectId ? post.userId : new ObjectId(post.userId);
    }
    return null;
  }))].filter(id => id !== null);

  const users = await db.collection('users')
    .find({ _id: { $in: userIds } })
    .project({ _id: 1, username: 1, name: 1, profilePicture: 1 })
    .toArray();

  // Create a map for fast user lookup
  const userMap = {};
  users.forEach(user => {
    userMap[user._id.toString()] = {
      username: user.username || user.name?.toLowerCase().replace(/\s+/g, '_') || 'unnamed',
      profilePicture: user.profilePicture || '/profile-placeholder.jpg'
    };
  });

  // Format each post with user information
  return posts.map(post => {
    const userId = post.userId?.toString() || 'unknown';
    const user = userMap[userId] || { username: post.username || 'unnamed', profilePicture: '/profile-placeholder.jpg' };

    // Calculate time ago
    const postDate = post.createdAt || new Date();
    const timeAgo = getTimeAgo(postDate);

    return {
      id: post._id.toString(),
      username: user.username,
      timeAgo,
      title: post.title,
      description: post.content?.substring(0, 120) + (post.content?.length > 120 ? '...' : '') || '',
      imageUrl: post.image || '/api/placeholder/600/300',
      videoUrl: post.videoUrl || null,
      discussionCount: formatCount(post.discussions || 0),
      hashtags: post.hashtags || [],
      profilePicture: user.profilePicture
    };
  });
}

// Helper function to format time ago (unchanged)
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  if (diffInSeconds < minute) {
    return 'just now';
  } else if (diffInSeconds < hour) {
    const minutes = Math.floor(diffInSeconds / minute);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  } else if (diffInSeconds < day) {
    const hours = Math.floor(diffInSeconds / hour);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  } else if (diffInSeconds < week) {
    const days = Math.floor(diffInSeconds / day);
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  } else if (diffInSeconds < month) {
    const weeks = Math.floor(diffInSeconds / week);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  } else if (diffInSeconds < year) {
    const months = Math.floor(diffInSeconds / month);
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  } else {
    const years = Math.floor(diffInSeconds / year);
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }
}

// Helper function to format large numbers (unchanged)
function formatCount(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}