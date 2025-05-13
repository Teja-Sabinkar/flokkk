import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET endpoint to fetch recently viewed items using our new approach
export async function GET(request) {
  try {
    console.log('[RECENTLY VIEWED] API route called');
    
    // Get auth token from header
    const headersList = headers();
    const authHeader = headersList.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
      userId = decoded.id;
      console.log(`[RECENTLY VIEWED] User ID: ${userId}`);
    } catch (error) {
      console.error('[RECENTLY VIEWED] Token verification error:', error);
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 20;
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    console.log(`[RECENTLY VIEWED] Fetching recently viewed items for user ${userId}`);
    
    // Get user history directly from the user_history collection
    const userHistory = await db.collection('user_history').findOne({ userId: userId });
    
    if (!userHistory || !userHistory.recentlyViewed || userHistory.recentlyViewed.length === 0) {
      console.log(`[RECENTLY VIEWED] No history found for user ${userId}`);
      return NextResponse.json({ items: [], count: 0 }, { status: 200 });
    }
    
    const recentlyViewedCount = userHistory.recentlyViewed.length;
    console.log(`[RECENTLY VIEWED] Found ${recentlyViewedCount} items`);
    
    // Limit the number of items to return
    const recentlyViewed = userHistory.recentlyViewed.slice(0, limit);
    
    // Get post IDs as strings
    const postIds = recentlyViewed.map(item => item.postId);
    console.log(`[RECENTLY VIEWED] Post IDs:`, postIds);
    
    // Convert strings to ObjectIds for MongoDB query
    const objectIds = postIds.map(id => {
      try {
        return new ObjectId(id);
      } catch (e) {
        console.error(`[RECENTLY VIEWED] Error converting ${id} to ObjectId:`, e);
        return null;
      }
    }).filter(Boolean);
    
    // If no valid IDs, return the items with the metadata we have
    if (objectIds.length === 0) {
      console.log('[RECENTLY VIEWED] No valid post IDs found, using metadata');
      
      // Format items from the metadata we have
      const items = recentlyViewed.map(item => ({
        id: item.postId,
        title: item.postTitle || 'Unknown Post',
        description: 'Content unavailable',
        thumbnail: item.postImage || '/api/placeholder/600/300',
        author: {
          username: item.postAuthor || 'unknown'
        },
        authorAvatar: `/api/placeholder/64/64`,
        postedTime: 'Unknown',
        discussionCount: 0,
        lastViewed: getTimeAgo(item.viewedAt || new Date())
      }));
      
      return NextResponse.json({ items, count: items.length }, { status: 200 });
    }
    
    // Fetch posts in bulk
    const posts = await db.collection('posts')
      .find({ _id: { $in: objectIds } })
      .toArray();
    
    console.log(`[RECENTLY VIEWED] Found ${posts.length}/${objectIds.length} posts`);
    
    // Create a map of posts by ID
    const postsMap = {};
    posts.forEach(post => {
      postsMap[post._id.toString()] = post;
    });
    
    // Get all unique user IDs from the posts
    const userIds = [];
    posts.forEach(post => {
      if (post.userId) {
        const userIdString = typeof post.userId === 'object' ? 
          post.userId.toString() : post.userId;
        if (!userIds.includes(userIdString)) {
          userIds.push(userIdString);
        }
      }
    });
    
    console.log(`[RECENTLY VIEWED] Fetching data for ${userIds.length} unique authors`);
    
    // Fetch all users in one query
    const userObjectIds = userIds.map(id => {
      try {
        return new ObjectId(id);
      } catch (e) {
        console.error(`[RECENTLY VIEWED] Error converting user ID ${id} to ObjectId:`, e);
        return null;
      }
    }).filter(Boolean);
    
    const users = userObjectIds.length > 0 ? 
      await db.collection('users').find({ 
        _id: { $in: userObjectIds }
      }).toArray() : [];
    
    // Create a map of users by ID
    const usersMap = {};
    users.forEach(user => {
      usersMap[user._id.toString()] = user;
    });
    
    // Create view times map
    const viewTimeMap = {};
    recentlyViewed.forEach(item => {
      viewTimeMap[item.postId] = item.viewedAt;
    });
    
    // Build response items - maintain original order from recentlyViewed
    const items = recentlyViewed
      .map(item => {
        const postId = item.postId;
        const post = postsMap[postId];
        
        // If post not found, use metadata from history
        if (!post) {
          return {
            id: postId,
            title: item.postTitle || 'Unknown Post',
            description: 'Content unavailable',
            thumbnail: item.postImage || '/api/placeholder/600/300',
            author: {
              username: item.postAuthor || 'unknown'
            },
            authorAvatar: `/api/placeholder/64/64`,
            postedTime: 'Unknown',
            discussionCount: 0,
            lastViewed: getTimeAgo(item.viewedAt || new Date())
          };
        }
        
        // Get the user data for this post if available
        const userId = typeof post.userId === 'object' ? 
          post.userId.toString() : post.userId;
        const postAuthor = userId ? usersMap[userId] : null;
        
        // If post found, use post data with history metadata
        return {
          id: post._id.toString(),
          title: post.title || 'Untitled Post',
          description: post.content 
            ? (post.content.length > 200 ? post.content.substring(0, 197) + '...' : post.content) 
            : '',
          thumbnail: post.image || '/api/placeholder/600/300',
          author: {
            username: post.username || 'anonymous',
            profilePicture: postAuthor?.profilePicture || '/profile-placeholder.jpg'
          },
          authorAvatar: postAuthor?.profilePicture || '/profile-placeholder.jpg',
          postedTime: getTimeAgo(post.createdAt || new Date()),
          discussionCount: post.discussions || 0,
          lastViewed: getTimeAgo(item.viewedAt || new Date())
        };
      });
    
    console.log(`[RECENTLY VIEWED] Returning ${items.length} formatted items`);
    
    return NextResponse.json({ 
      items,
      count: items.length
    }, { status: 200 });
    
  } catch (error) {
    console.error('[RECENTLY VIEWED] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to calculate time ago
function getTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now - past) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
}