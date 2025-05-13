// src/app/api/explore/category/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const ITEMS_PER_PAGE = 12;

// Category keyword mappings for direct filtering
const CATEGORY_KEYWORDS = {
  'Trending': ['viral', 'trending', 'popular', 'hot'],
  'Music': ['music', 'song', 'album', 'artist', 'band', 'concert', 'spotify', 'playlist'],
  'Gaming': ['game', 'gaming', 'xbox', 'playstation', 'nintendo', 'steam', 'esports'],
  'Movies': ['movie', 'film', 'cinema', 'hollywood', 'actor', 'director', 'netflix'],
  'News': ['news', 'politics', 'world', 'breaking', 'report', 'update'],
  'Sports': ['sports', 'football', 'basketball', 'soccer', 'nba', 'nfl', 'athlete'],
  'Learning': ['learn', 'education', 'course', 'tutorial', 'study', 'university'],
  'Fashion': ['fashion', 'style', 'clothing', 'outfit', 'designer', 'trend'],
  'Podcasts': ['podcast', 'episode', 'host', 'interview', 'spotify', 'audio'],
  'Lifestyle': ['lifestyle', 'wellness', 'health', 'fitness', 'food', 'travel']
};

export async function GET(request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'Trending';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || String(ITEMS_PER_PAGE), 10);

    console.log(`Explore API called for category: ${category}, page: ${page}`);

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
        // Continue as anonymous user
      }
    }

    // Get hidden posts to exclude from results
    let hiddenPostIds = [];
    if (currentUserId) {
      try {
        // Get hidden posts for the current user
        const hiddenPosts = await db.collection('hiddenposts').find({
          userId: new ObjectId(currentUserId)
        }).toArray();
        
        // Extract post IDs
        hiddenPostIds = hiddenPosts.map(hp => 
          typeof hp.postId === 'string' ? new ObjectId(hp.postId) : hp.postId
        );
        
        console.log(`Found ${hiddenPostIds.length} hidden posts for user ${currentUserId}`);
      } catch (error) {
        console.error('Error filtering hidden posts:', error);
      }
    }

    // Base query to exclude hidden posts
    let query = {};
    if (hiddenPostIds.length > 0) {
      query._id = { $nin: hiddenPostIds };
    }

    // Special case for Trending - use engagement metrics
    if (category === 'Trending') {
      console.log('Fetching trending posts based on engagement');
      
      // Get posts from the last 30 days for trending
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.createdAt = { $gte: thirtyDaysAgo };
      
      const trendingPosts = await db.collection('posts')
        .find(query)
        .sort({ discussions: -1, shares: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();
      
      const totalPosts = await db.collection('posts').countDocuments(query);
      
      console.log(`Found ${trendingPosts.length} trending posts`);
      
      // Format trending posts
      const items = await formatPostsForExplore(db, trendingPosts);
      
      return NextResponse.json({
        category,
        items,
        pagination: {
          page,
          limit,
          totalItems: totalPosts,
          totalPages: Math.ceil(totalPosts / limit)
        }
      }, { status: 200 });
    }

    // For other categories, use keyword filtering approach
    console.log(`Fetching posts for category: ${category}`);
    const keywords = CATEGORY_KEYWORDS[category] || [];
    
    if (keywords.length === 0) {
      console.warn(`No keywords defined for category: ${category}`);
      return NextResponse.json({
        category,
        items: [],
        pagination: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0
        },
        message: 'No keywords defined for this category'
      }, { status: 200 });
    }
    
    // Create keyword regex patterns
    const keywordPatterns = keywords.map(keyword => 
      new RegExp(keyword, 'i')
    );
    
    // Add category name as a pattern as well
    keywordPatterns.push(new RegExp(category, 'i'));
    
    // Build the search query for this category
    const categoryQuery = {
      ...query,
      $or: [
        { title: { $in: keywordPatterns } },
        { content: { $in: keywordPatterns } },
        { hashtags: { $in: keywordPatterns } }
      ]
    };
    
    console.log(`Using keywords for ${category}:`, keywords);
    
    // Execute the query with pagination
    const categoryPosts = await db.collection('posts')
      .find(categoryQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();
    
    const totalCategoryPosts = await db.collection('posts').countDocuments(categoryQuery);
    
    console.log(`Found ${categoryPosts.length} posts for category: ${category}`);
    
    // If no posts found with keyword approach, try a more general query as fallback
    if (categoryPosts.length === 0) {
      console.log(`No posts found for ${category}, trying fallback`);
      
      // Create a simpler query that looks for the category name in any field
      const fallbackQuery = {
        ...query,
        $or: [
          { title: new RegExp(category, 'i') },
          { content: new RegExp(category, 'i') },
          { hashtags: new RegExp(category, 'i') }
        ]
      };
      
      const fallbackPosts = await db.collection('posts')
        .find(fallbackQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
        
      console.log(`Fallback found ${fallbackPosts.length} posts for category: ${category}`);
      
      if (fallbackPosts.length > 0) {
        const items = await formatPostsForExplore(db, fallbackPosts);
        
        return NextResponse.json({
          category,
          items,
          pagination: {
            page,
            limit,
            totalItems: await db.collection('posts').countDocuments(fallbackQuery),
            totalPages: Math.ceil(fallbackPosts.length / limit)
          },
          source: 'fallback'
        }, { status: 200 });
      }
      
      // If still no results, get most recent posts as a last resort
      console.log('No posts found with fallback, returning recent posts');
      const recentPosts = await db.collection('posts')
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
        
      const items = await formatPostsForExplore(db, recentPosts);
      
      return NextResponse.json({
        category,
        items,
        pagination: {
          page,
          limit,
          totalItems: await db.collection('posts').countDocuments(query),
          totalPages: Math.ceil(recentPosts.length / limit)
        },
        source: 'recent'
      }, { status: 200 });
    }
    
    // Format posts for the explore grid
    const items = await formatPostsForExplore(db, categoryPosts);
    
    return NextResponse.json({
      category,
      items,
      pagination: {
        page,
        limit,
        totalItems: totalCategoryPosts,
        totalPages: Math.ceil(totalCategoryPosts / limit)
      },
      source: 'category_match'
    }, { status: 200 });

  } catch (error) {
    console.error('Explore API error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch explore content', error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to format posts for the explore grid
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
      discussionCount: formatCount(post.discussions || 0),
      hashtags: post.hashtags || [],
      profilePicture: user.profilePicture // Include the profile picture
    };
  });
}

// Helper function to format time ago
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

// Helper function to format large numbers (e.g., 1.2K, 3.4M)
function formatCount(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}