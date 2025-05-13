import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Playlist from '@/models/Playlist';
import UserSettings from '@/models/UserSettings';
import Follow from '@/models/Follow';

export async function GET(request, { params }) {
  try {
    console.log('API route called: GET /api/users/[username]/playlists');
    
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
        playlistsVisibility: 'public'
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

    // Check if current user can view playlists
    let canViewPlaylists = true;
    
    if (userSettings.contentSettings.playlistsVisibility === 'private' && 
        (!currentUser || (!isFollowing && currentUser?._id.toString() !== user._id.toString()))) {
      canViewPlaylists = false;
    } else if (userSettings.contentSettings.playlistsVisibility === 'followers' && 
               (!currentUser || (!isFollowing && currentUser?._id.toString() !== user._id.toString()))) {
      canViewPlaylists = false;
    }

    if (!canViewPlaylists) {
      return NextResponse.json({
        message: 'You do not have permission to view this user\'s playlists',
        canViewPlaylists: false,
        playlists: []
      }, { status: 403 });
    }

    // Actually query the database for playlists
    const playlists = await Playlist.find({ userId: user._id })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    console.log(`Found ${playlists.length} playlists for user`);
    
    // Get total count for pagination
    const totalPlaylists = await Playlist.countDocuments({ userId: user._id });

    // Format playlists for response
    const formattedPlaylists = playlists.map(playlist => ({
      id: playlist._id,
      title: playlist.title,
      imageSrc: playlist.image || '/api/placeholder/240/135',
      videoCount: `${playlist.posts?.length || 0} forums`,
      updatedAt: getTimeAgo(playlist.updatedAt || playlist.createdAt),
      description: playlist.description || '',
      visibility: playlist.visibility || 'public'
    }));

    // Return playlists with pagination info
    return NextResponse.json({
      playlists: formattedPlaylists,
      canViewPlaylists: true,
      pagination: {
        page,
        limit,
        totalPlaylists,
        totalPages: Math.ceil(totalPlaylists / limit)
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('User playlists error:', error);
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