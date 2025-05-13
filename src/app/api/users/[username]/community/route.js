import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import CommunityPost from '@/models/CommunityPost';
import UserSettings from '@/models/UserSettings';
import Follow from '@/models/Follow';

export async function GET(request, { params }) {
  try {
    console.log('API route called: GET /api/users/[username]/community');
    
    // Get username from route params
    const { username } = params;
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const userId = searchParams.get('id'); // Get user ID from query
    const skip = (page - 1) * limit;

    console.log(`Request params:`, { username, userId, page, limit });

    // Connect to database
    await dbConnect();

    // Find user by username or ID with more flexible matching
    let user = null;
    
    // First try to find by ID if provided
    if (userId) {
      try {
        user = await User.findById(userId);
        console.log('User lookup by ID result:', user ? 'Found' : 'Not found');
      } catch (idError) {
        console.log('ID lookup failed, falling back to username');
      }
    }
    
    // If not found by ID, use flexible username matching
    if (!user) {
      user = await User.findOne({ 
        $or: [
          { username: username },
          { username: username.toLowerCase() },
          { username: { $regex: new RegExp(`^${username}$`, 'i') } },
          // Add this line to also search by name
          { name: { $regex: new RegExp(`^${username}$`, 'i') } }
        ]
      });
    }

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Get current user if authenticated
    let currentUser = null;
    const headersList = headers();
    const authHeader = headersList.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
        currentUser = await User.findById(decoded.id);
      } catch (error) {
        // Invalid token, continue as unauthenticated
      }
    }

    // Get user's content visibility settings or use defaults
    const userSettings = await UserSettings.findOne({ userId: user._id }) || {
      contentSettings: {
        communityVisibility: 'public'
      }
    };

    // Check if current user is following this user
    let isFollowing = false;

    if (currentUser) {
      const followRecord = await Follow.findOne({
        follower: currentUser._id,
        following: user._id
      });
      
      isFollowing = !!followRecord;
    }

    // Check if current user can view community posts
    let canViewCommunity = true;
    
    if (userSettings.contentSettings.communityVisibility === 'private' && 
        (!currentUser || (!isFollowing && currentUser?._id.toString() !== user._id.toString()))) {
      canViewCommunity = false;
    } else if (userSettings.contentSettings.communityVisibility === 'followers' && 
               (!currentUser || (!isFollowing && currentUser?._id.toString() !== user._id.toString()))) {
      canViewCommunity = false;
    }

    if (!canViewCommunity) {
      return NextResponse.json({
        message: 'You do not have permission to view this user\'s community posts',
        canViewCommunity: false,
        communityPosts: []
      }, { status: 403 });
    }

    // Query from CommunityPost model instead of Post model
    const communityPosts = await CommunityPost.find({ 
      userId: user._id
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log(`Found ${communityPosts.length} community posts for user`);
    
    // Get total count for pagination
    const totalPosts = await CommunityPost.countDocuments({ 
      userId: user._id
    });

    // Format posts for response
    const formattedPosts = communityPosts.map(post => ({
      id: post._id,
      title: post.title,
      content: post.content,
      image: post.image,
      videoUrl: post.videoUrl,
      tags: post.tags || [],
      username: post.username,
      avatarSrc: '/api/placeholder/64/64', // Default avatar for display
      userId: post.userId.toString(),
      createdAt: post.createdAt,
      timeAgo: getTimeAgo(post.createdAt),
      voteCount: post.voteCount || 0,
      commentCount: post.commentCount || 0,
      shareCount: post.shareCount || 0
    }));

    return NextResponse.json({
      communityPosts: formattedPosts,
      canViewCommunity: true,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit)
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('User community posts error:', error);
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