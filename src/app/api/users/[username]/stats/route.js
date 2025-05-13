import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Follow from '@/models/Follow';
import UserSettings from '@/models/UserSettings';

export async function GET(request, { params }) {
  try {
    // Get username from route params
    const { username } = params;

    // Connect to database
    await dbConnect();

    // Find user by username
    const user = await User.findOne({ 
      username: username.toLowerCase() 
    });

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
    
    // Get user's privacy settings or use defaults
    const userSettings = await UserSettings.findOne({ userId: user._id }) || {
      privacySettings: {
        profileVisibility: 'public',
        showSubscriberCount: true
      }
    };

    // Check if current user is following this user
    let isFollowing = false;
    let canViewStats = true;

    if (currentUser) {
      const followRecord = await Follow.findOne({
        follower: currentUser._id,
        following: user._id
      });
      
      isFollowing = !!followRecord;
    }

    // Check profile visibility
    if (userSettings.privacySettings.profileVisibility === 'private' && 
        (!currentUser || (!isFollowing && currentUser?._id.toString() !== user._id.toString()))) {
      canViewStats = false;
    } else if (userSettings.privacySettings.profileVisibility === 'followers' && 
              (!currentUser || (!isFollowing && currentUser?._id.toString() !== user._id.toString()))) {
      canViewStats = false;
    }

    if (!canViewStats) {
      return NextResponse.json({
        message: 'You do not have permission to view this user\'s stats',
        canViewStats: false
      }, { status: 403 });
    }

    // Get follower and following counts
    const followerCount = await Follow.countDocuments({ following: user._id });
    const followingCount = await Follow.countDocuments({ follower: user._id });

    // Prepare stats response
    const stats = {
      followers: userSettings.privacySettings.showSubscriberCount ? followerCount : null,
      following: userSettings.privacySettings.showSubscriberCount ? followingCount : null,
      isFollowing: isFollowing,
      discussions: user.discussions || 0,
      canViewStats: true
    };

    return NextResponse.json(stats, { status: 200 });
    
  } catch (error) {
    console.error('User stats error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}