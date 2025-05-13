// src/app/api/subscriptions/recent/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Follow from '@/models/Follow';
import Post from '@/models/Post';
import mongoose from 'mongoose';

export async function GET(request) {
  try {
    // Parse query parameter
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '5');
    
    // Validate limit parameter
    if (isNaN(limit) || limit < 1 || limit > 20) {
      return NextResponse.json(
        { message: 'Invalid limit parameter' },
        { status: 400 }
      );
    }
    
    // Get auth token from header
    const headersList = headers();
    const authHeader = headersList.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
      
      // Connect to database
      await dbConnect();
      
      // Find current user
      const currentUser = await User.findById(decoded.id);
      
      if (!currentUser) {
        return NextResponse.json(
          { message: 'User not found' },
          { status: 404 }
        );
      }
      
      // Find all users that the current user follows
      const followRelations = await Follow.find({ follower: currentUser._id });
      const followingIds = followRelations.map(relation => relation.following);
      
      console.log(`User ${currentUser.name || currentUser.username || currentUser._id} follows ${followingIds.length} accounts`);
      
      // If the user doesn't follow anyone, return empty array
      if (followingIds.length === 0) {
        return NextResponse.json({ subscriptions: [] }, { status: 200 });
      }
      
      // Use aggregation to find the most recently active users
      // that the current user follows
      const recentlyActiveUsers = await Post.aggregate([
        { $match: { userId: { $in: followingIds } } },
        { $sort: { createdAt: -1 } },
        { $group: {
            _id: '$userId',
            latestPostId: { $first: '$_id' },
            latestPostTitle: { $first: '$title' },
            latestPostTime: { $first: '$createdAt' },
            postCount: { $sum: 1 }
        }},
        { $sort: { latestPostTime: -1 } },
        { $limit: limit }
      ]);
      
      // Get full user details for each active user
      const userIds = recentlyActiveUsers.map(user => user._id);
      const userDetails = await User.find(
        { _id: { $in: userIds } }
      );
      
      // Create a map of userId to user details
      const userMap = {};
      userDetails.forEach(user => {
        userMap[user._id.toString()] = {
          username: user.username || user.name,
          name: user.name,
          profilePicture: user.profilePicture || user.avatar,
          bio: user.bio
        };
      });
      
      // Get latest post details
      const postIds = recentlyActiveUsers.map(user => 
        mongoose.Types.ObjectId.isValid(user.latestPostId) ? 
          user.latestPostId : null
      ).filter(id => id !== null);
      
      const latestPosts = await Post.find(
        { _id: { $in: postIds } },
        'title image discussions'
      );
      
      // Create a map of postId to post details
      const postMap = {};
      latestPosts.forEach(post => {
        postMap[post._id.toString()] = {
          title: post.title,
          thumbnail: post.image,
          discussionCount: post.discussions
        };
      });
      
      // Format the final response
      const subscriptions = recentlyActiveUsers.map(user => {
        const userId = user._id.toString();
        const userDetail = userMap[userId] || { 
          username: 'Unknown', 
          name: 'Unknown User',
          profilePicture: '/profile-placeholder.jpg',
          bio: ''
        };
        
        const postDetail = postMap[user.latestPostId?.toString()] || {
          title: user.latestPostTitle || 'Untitled Post',
          thumbnail: '/api/placeholder/240/135',
          discussionCount: 0
        };
        
        // Calculate how long ago the post was created
        const postTime = user.latestPostTime;
        const timeAgo = getTimeAgo(postTime);
        
        return {
          id: userId,
          username: userDetail.username,
          name: userDetail.name,
          avatarColor: getAvatarColor(userDetail.username || userDetail.name), // Generate consistent color
          profilePicture: userDetail.profilePicture,
          title: postDetail.title,
          description: userDetail.bio?.substring(0, 150) || '',
          thumbnail: postDetail.thumbnail,
          lastPostTime: timeAgo,
          discussionCount: postDetail.discussionCount || 0
        };
      });
      
      return NextResponse.json({ subscriptions }, { status: 200 });
      
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
  } catch (error) {
    console.error('Recent subscriptions error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to format time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  
  return new Date(date).toLocaleDateString();
}

// Helper function to generate consistent avatar colors
function getAvatarColor(username) {
  // List of pleasing colors
  const colors = [
    '#4169E1', // Royal Blue
    '#6E56CF', // Purple
    '#2E7D32', // Green
    '#D32F2F', // Red
    '#9C27B0', // Violet
    '#1976D2', // Blue
    '#F57C00', // Orange
    '#388E3C', // Green
    '#7B1FA2', // Purple
    '#C2185B', // Pink
  ];
  
  if (!username) return colors[0]; // Default color if no username
  
  // Generate a consistent index based on username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Get a positive index in the range of our colors array
  const index = Math.abs(hash % colors.length);
  return colors[index];
}