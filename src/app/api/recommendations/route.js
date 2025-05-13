// src/app/api/recommendations/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Map of content categories to related keywords for context search
const CATEGORY_KEYWORDS = {
  gaming: ['game', 'gaming', 'playstation', 'xbox', 'nintendo', 'steam', 'pc game', 'console', 'fps', 'rpg', 'mmorpg'],
  technology: ['tech', 'computer', 'software', 'hardware', 'programming', 'code', 'developer', 'app', 'mobile'],
  sports: ['sport', 'football', 'basketball', 'soccer', 'baseball', 'nfl', 'nba', 'athlete', 'team', 'league'],
  entertainment: ['movie', 'film', 'tv', 'television', 'series', 'actor', 'actress', 'director', 'hollywood', 'streaming'],
  music: ['music', 'song', 'album', 'artist', 'band', 'concert', 'spotify', 'playlist', 'genre', 'singer'],
  food: ['food', 'recipe', 'cooking', 'chef', 'restaurant', 'meal', 'cuisine', 'diet', 'ingredient', 'drink'],
  travel: ['travel', 'vacation', 'trip', 'destination', 'hotel', 'flight', 'tourism', 'country', 'city', 'beach'],
  science: ['science', 'research', 'study', 'experiment', 'physics', 'chemistry', 'biology', 'space', 'discovery', 'theory'],
  health: ['health', 'fitness', 'exercise', 'workout', 'diet', 'nutrition', 'wellness', 'medical', 'doctor', 'medicine'],
  finance: ['finance', 'money', 'investing', 'stock', 'market', 'economy', 'business', 'crypto', 'bitcoin', 'trading']
};

// Game-specific keywords for better context matching
const GAME_TITLES = [
  'red dead redemption', 'grand theft auto', 'gta', 'call of duty', 'minecraft', 'fortnite', 
  'league of legends', 'valorant', 'overwatch', 'elder scrolls', 'skyrim', 'fallout', 
  'assassin\'s creed', 'cyberpunk', 'fifa', 'nba 2k', 'madden', 'final fantasy', 'zelda'
];

// Detect content category based on title keywords
function detectCategory(title) {
  const titleLower = title.toLowerCase();
  
  // Check for game title matches first (more specific)
  for (const gameTitle of GAME_TITLES) {
    if (titleLower.includes(gameTitle)) {
      return 'gaming';
    }
  }
  
  // Check for category keyword matches
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (titleLower.includes(keyword)) {
        return category;
      }
    }
  }
  
  // Default to general category if no match
  return 'general';
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const currentTitle = searchParams.get('title') || '';
    const currentPostId = searchParams.get('postId') || '';
    const limit = parseInt(searchParams.get('limit') || '5');
    
    console.log(`DEBUG API: Getting recommendations for: "${currentTitle}" (ID: ${currentPostId})`);
    
    if (!currentTitle) {
      console.log('DEBUG API: No title provided');
      return NextResponse.json(
        { message: 'Post title is required', recommendations: [] },
        { status: 400 }
      );
    }
    
    // Connect to MongoDB
    console.log('DEBUG API: Connecting to MongoDB');
    const { db } = await connectToDatabase();
    console.log('DEBUG API: MongoDB connection successful');
    
    const posts = db.collection('posts');
    console.log('DEBUG API: Got posts collection');
    
    // Check if posts collection exists and has documents
    const postsCount = await posts.countDocuments();
    console.log(`DEBUG API: Posts collection has ${postsCount} documents`);
    
    if (postsCount === 0) {
      console.log('DEBUG API: Posts collection is empty, returning empty results');
      return NextResponse.json({ 
        recommendations: [],
        debug: {
          message: 'Posts collection is empty',
          title: currentTitle,
          postsCount: 0
        }
      }, { status: 200 });
    }
    
    // 1. First attempt: Direct title keyword search
    const titleKeywords = currentTitle
      .split(/\s+/)
      .filter(word => word.length > 3)  // Only use meaningful words
      .map(word => word.toLowerCase());
    
    // Create search conditions for direct matches
    let searchConditions = titleKeywords.map(keyword => ({
      title: { $regex: keyword, $options: 'i' }
    }));
    
    // Exclude the current post from results
    let excludeCondition = {};
    if (currentPostId) {
      try {
        excludeCondition = { _id: { $ne: new ObjectId(currentPostId) } };
      } catch (e) {
        console.warn('Invalid post ID format:', currentPostId);
        excludeCondition = { _id: { $ne: currentPostId } };
      }
    }
    
    // Find posts with matching keywords in the title
    let recommendedPosts = [];
    if (searchConditions.length > 0) {
      recommendedPosts = await posts.find({
        $and: [
          { $or: searchConditions },
          excludeCondition
        ]
      })
      .sort({ discussions: -1, createdAt: -1 })
      .limit(limit)
      .toArray();
    }
    
    console.log(`Found ${recommendedPosts.length} direct title matches`);
    
    // 2. Second attempt: Context-based search if no direct matches
    if (recommendedPosts.length === 0) {
      // Detect content category
      const category = detectCategory(currentTitle);
      console.log(`No direct matches, using context search for category: ${category}`);
      
      // Get keywords for detected category
      const contextKeywords = CATEGORY_KEYWORDS[category] || [];
      
      if (contextKeywords.length > 0) {
        // Create search conditions for context-based matches
        const contextSearchConditions = contextKeywords.map(keyword => ({
          $or: [
            { title: { $regex: keyword, $options: 'i' } },
            { content: { $regex: keyword, $options: 'i' } },
            { hashtags: { $regex: keyword, $options: 'i' } }
          ]
        }));
        
        // Find posts with matching context
        recommendedPosts = await posts.find({
          $and: [
            { $or: contextSearchConditions },
            excludeCondition
          ]
        })
        .sort({ discussions: -1, createdAt: -1 })
        .limit(limit)
        .toArray();
        
        console.log(`Found ${recommendedPosts.length} context-based matches for category: ${category}`);
      }
      
      // 3. Final fallback: Get most popular discussions if still no results
      if (recommendedPosts.length === 0) {
        console.log('DEBUG API: No context matches, falling back to popular discussions');
        
        try {
          recommendedPosts = await posts.find(excludeCondition)
            .sort({ discussions: -1, createdAt: -1 })
            .limit(limit)
            .toArray();
            
          console.log(`DEBUG API: Found ${recommendedPosts.length} popular posts`);
        } catch (err) {
          console.error('DEBUG API: Error fetching popular posts:', err);
          recommendedPosts = [];
        }
      }
      
      // If still no results after all attempts, provide test data
      if (recommendedPosts.length === 0) {
        console.log('DEBUG API: Using test data as a last resort');
        recommendedPosts = [
          {
            _id: 'test1',
            title: 'Test Post 1 - From API',
            username: 'apiuser1',
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            discussions: 2500000
          },
          {
            _id: 'test2',
            title: 'Test Post 2 - From API',
            username: 'apiuser2',
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
            discussions: 300000
          },
          {
            _id: 'test3',
            title: 'Test Post 3 - From API',
            username: 'apiuser3',
            createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
            discussions: 1200000
          },
          {
            _id: 'test4',
            title: 'Test Post 4 - From API',
            username: 'apiuser4',
            createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
            discussions: 450000
          },
          {
            _id: 'test5',
            title: 'Test Post 5 - From API',
            username: 'apiuser5',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            discussions: 180000
          }
        ];
      }
    }
    
    // Format the results with required fields
    const formattedRecommendations = recommendedPosts.map(post => {
      // Generate initials from username for avatar
      const initial = (post.username && post.username.length > 0) 
        ? post.username[0].toUpperCase() 
        : 'U';
      
      // Generate a color based on username for avatar background
      const colors = [
        '#3b82f6', // Blue
        '#ef4444', // Red
        '#06b6d4', // Cyan
        '#10b981', // Green
        '#f59e0b', // Yellow
        '#8b5cf6', // Purple
        '#ec4899', // Pink
        '#6366f1'  // Indigo
      ];
      
      // Use username string to deterministically select a color
      const colorIndex = post.username 
        ? post.username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
        : 0;
      
      // Format timestamp
      const timeAgo = formatTimeAgo(post.createdAt);
      
      // Format discussion count
      const discussionCount = formatNumber(post.discussions || 0);
      
      return {
        id: post._id.toString(),
        title: post.title,
        username: post.username,
        avatar: initial,
        avatarColor: colors[colorIndex],
        timeAgo: timeAgo,
        discussions: `${discussionCount} Discussions`
      };
    });
    
    return NextResponse.json({ 
      recommendations: formattedRecommendations
    }, { status: 200 });
    
  } catch (error) {
    console.error('Recommendations API error:', error);
    return NextResponse.json(
      { message: 'Failed to get recommendations', error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to format time ago
function formatTimeAgo(dateString) {
  const date = dateString ? new Date(dateString) : new Date();
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  // Less than a minute
  if (seconds < 60) {
    return 'just now';
  }
  
  // Less than an hour
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  // Less than a day
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  // Less than a week
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  
  // Less than a month
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  
  // Less than a year
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  
  // Years
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

// Helper function to format numbers (e.g., 1.2K, 3M)
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}