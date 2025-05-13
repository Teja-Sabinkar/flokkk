// src/app/api/subscriptions/list/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Follow from '@/models/Follow';

export async function GET(request) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const sortBy = url.searchParams.get('sortBy') || 'recent'; // recent or alphabetical
    
    // Validate pagination parameters
    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { message: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
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
      
      // Get sort options based on preference
      let sortOption = {};
      if (sortBy === 'alphabetical') {
        sortOption = { 'userDetails.username': 1 }; // Alphabetical by username
      } else {
        sortOption = { createdAt: -1 }; // Most recent follow first
      }
      
      // Count total follows for pagination
      const totalFollows = await Follow.countDocuments({ follower: currentUser._id });
      const totalPages = Math.ceil(totalFollows / limit);
      
      // Find all follow relations with user details
      const followRelations = await Follow.find({ follower: currentUser._id })
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate('following', 'username name profilePicture bio')
        .lean();
      
      // Format the subscriptions
      const subscriptions = followRelations.map(relation => {
        const followedUser = relation.following;
        return {
          id: followedUser._id,
          username: followedUser.username,
          name: followedUser.name,
          profilePicture: followedUser.profilePicture || '/profile-placeholder.jpg',
          bio: followedUser.bio || '',
          followingSince: relation.createdAt,
          avatarColor: getAvatarColor(followedUser.username)
        };
      });
      
      // Return subscriptions with pagination info
      return NextResponse.json({
        subscriptions,
        pagination: {
          page,
          limit,
          totalSubscriptions: totalFollows,
          totalPages
        }
      }, { status: 200 });
      
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
  } catch (error) {
    console.error('Subscriptions list error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
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
  
  // Generate a consistent index based on username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Get a positive index in the range of our colors array
  const index = Math.abs(hash % colors.length);
  return colors[index];
}