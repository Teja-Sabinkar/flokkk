// src/app/api/explore/category/route.js - Simplified Hashtag-Based Categorization
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const ITEMS_PER_PAGE = 12;

export async function GET(request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'Trending';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || String(ITEMS_PER_PAGE), 10);

    console.log(`🎯 Explore API called for category: ${category}, page: ${page}`);

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

    let posts = [];
    let totalPosts = 0;

    // Special handling for Trending category
    if (category === 'Trending') {
      console.log('📈 Fetching trending posts based on engagement metrics');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      baseQuery.createdAt = { $gte: thirtyDaysAgo };

      posts = await db.collection('posts')
        .find(baseQuery)
        .sort({ discussions: -1, shares: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      totalPosts = await db.collection('posts').countDocuments(baseQuery);
    } else {
      // Hashtag-based categorization for all other categories
      console.log(`🏷️ Searching for posts with #${category} hashtag`);

      // Create case-insensitive regex for the category hashtag
      const categoryHashtagRegex = new RegExp(`^#${category}$`, 'i');

      // Query for posts that have this category hashtag
      const categoryQuery = {
        ...baseQuery,
        hashtags: categoryHashtagRegex
      };

      posts = await db.collection('posts')
        .find(categoryQuery)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      totalPosts = await db.collection('posts').countDocuments(categoryQuery);

      console.log(`📝 Found ${posts.length} posts with #${category} hashtag`);
    }

    // Format the posts for display
    const items = await formatPostsForExplore(db, posts);

    // Return response
    if (items.length === 0 && category !== 'Trending') {
      console.log(`⚠️ No results found for ${category}`);

      return NextResponse.json({
        category,
        items: [],
        pagination: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0
        },
        source: 'hashtag_search',
        message: getNoContentMessage(category)
      }, { status: 200 });
    }

    return NextResponse.json({
      category,
      items,
      pagination: {
        page,
        limit,
        totalItems: totalPosts,
        totalPages: Math.ceil(totalPosts / limit)
      },
      source: category === 'Trending' ? 'trending_algorithm' : 'hashtag_search'
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Explore API error:', error);
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
      videoUrl: post.videoUrl || null,
      discussionCount: formatCount(post.discussions || 0),
      hashtags: post.hashtags || [],
      profilePicture: user.profilePicture,
      // Make sure these lines are preserving the original arrays
      creatorLinks: Array.isArray(post.creatorLinks) ? post.creatorLinks : [],
      communityLinks: Array.isArray(post.communityLinks) ? post.communityLinks : []
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

// Helper function to format large numbers
function formatCount(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

// Generate category-specific "no content" messages with suggestions
function getNoContentMessage(category) {
  const messages = {
    'Music': {
      title: 'No music discussions yet',
      description: 'Be the first to share music content!',
      suggestion: 'Create a post and add #Music to share your favorite songs, albums, or artists.'
    },
    'Gaming': {
      title: 'No gaming content yet',
      description: 'Start the gaming conversation!',
      suggestion: 'Share your gaming experiences and add #Gaming to your post.'
    },
    'Movies': {
      title: 'No movie discussions yet',
      description: 'Be the first to talk about movies!',
      suggestion: 'Create a post about your favorite films and add #Movies.'
    },
    'News': {
      title: 'No news content yet',
      description: 'Share what\'s happening!',
      suggestion: 'Post current events and add #News to keep everyone informed.'
    },
    'Sports': {
      title: 'No sports content yet',
      description: 'Kick off the sports talk!',
      suggestion: 'Share sports updates and add #Sports to your post.'
    },
    'Learning': {
      title: 'No educational content yet',
      description: 'Start sharing knowledge!',
      suggestion: 'Post educational content and add #Learning to help others grow.'
    },
    'Fashion': {
      title: 'No fashion content yet',
      description: 'Set the style trends!',
      suggestion: 'Share fashion tips and add #Fashion to your post.'
    },
    'Podcasts': {
      title: 'No podcast content yet',
      description: 'Start the audio conversation!',
      suggestion: 'Share podcast recommendations and add #Podcasts.'
    },
    'Lifestyle': {
      title: 'No lifestyle content yet',
      description: 'Share your lifestyle tips!',
      suggestion: 'Post about wellness, habits, or daily life and add #Lifestyle.'
    }
  };

  return messages[category] || {
    title: `No ${category.toLowerCase()} content yet`,
    description: 'Be the first to contribute!',
    suggestion: `Create a post and add #${category} to help others find it.`
  };
}