import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Post from '@/models/Post';
import Follow from '@/models/Follow';
import HiddenPost from '@/models/HiddenPost'; // Import the HiddenPost model

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;
    
    console.log('GET /api/posts/feed - Fetching feed posts');
    console.log('Pagination:', { page, limit, skip });
    
    // Connect to database
    await dbConnect();
    
    // Get current user from token
    const headersList = headers();
    const authHeader = headersList.get('Authorization');
    let currentUserId = null;
    let query = {};
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
        currentUserId = decoded.id;
        
        // Get the user's hidden posts
        const hiddenPosts = await HiddenPost.find({ userId: currentUserId });
        const hiddenPostIds = hiddenPosts.map(hp => hp.postId);
        
        // Add hiddenPostIds to query to exclude them
        if (hiddenPostIds.length > 0) {
          query._id = { $nin: hiddenPostIds };
          console.log(`Filtering out ${hiddenPostIds.length} hidden posts for user ${currentUserId}`);
        }
        
      } catch (error) {
        // Invalid token, continue as unauthenticated
        console.error('Token verification error:', error);
      }
    }
    
    // Show posts, filtering out hidden ones if authenticated
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    console.log(`Found ${posts.length} posts for feed`);
    
    // Get total count for pagination (excluding hidden posts for authenticated users)
    const totalCount = await Post.countDocuments(query);
    
    // Get user IDs from posts
    const userIds = [...new Set(posts.map(post => post.userId))];
    
    // Fetch users in a single query for efficiency
    const users = await User.find({ 
      _id: { $in: userIds } 
    }).select('_id profilePicture username');
    
    // Create a lookup map of user ID to profile picture
    const userDataMap = {};
    users.forEach(user => {
      userDataMap[user._id.toString()] = {
        profilePicture: user.profilePicture || '/profile-placeholder.jpg',
        username: user.username
      };
    });
    
    console.log(`Fetched profile data for ${users.length} users`);
    
    // Format posts with profilePicture included
    const formattedPosts = posts.map(post => {
      // Convert to plain object if it's a Mongoose document
      const postObj = post.toObject ? post.toObject() : {...post};
      const userId = postObj.userId.toString();
      
      // Add profile picture from the map
      return {
        id: postObj._id,
        title: postObj.title,
        content: postObj.content,
        image: postObj.image,
        videoUrl: postObj.videoUrl,
        hashtags: postObj.hashtags || [],
        discussions: postObj.discussions || 0,
        shares: postObj.shares || 0,
        username: postObj.username,
        userId: userId,
        createdAt: postObj.createdAt,
        // Add profile picture from our efficient lookup
        profilePicture: userDataMap[userId]?.profilePicture || '/profile-placeholder.jpg',
        // Keep userImage for backward compatibility
        userImage: userDataMap[userId]?.profilePicture || '/profile-placeholder.jpg',
        timeAgo: getTimeAgo(postObj.createdAt)
      };
    });
    
    return NextResponse.json({
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Feed error:', error);
    return NextResponse.json({ 
      message: 'Internal server error', 
      error: error.message 
    }, { status: 500 });
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