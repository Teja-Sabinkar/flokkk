import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import UserSettings from '@/models/UserSettings';
import Follow from '@/models/Follow';

export async function GET(request, { params }) {
  try {
    // Get username from route params
    const { username } = params;

    // Get optional ID from query params
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    console.log('API route called with:', { username, id });

    // Connect to database
    await dbConnect();

    // Try to find user by ID first (most reliable)
    let user = null;
    if (id) {
      try {
        user = await User.findById(id);
        console.log('User lookup by ID result:', user ? 'Found' : 'Not found');
      } catch (idError) {
        console.log('ID lookup failed, falling back to username');
      }
    }

    // If not found by ID or no ID provided, try username with case-insensitive search
    if (!user) {
      user = await User.findOne({ 
        name: { $regex: new RegExp(`^${username}$`, 'i') } 
      });
    }


    if (!user) {
      return NextResponse.json(
        { message: `User "${username}" was not found` },
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

    // Get user's privacy settings or use defaults if not set
    const userSettings = await UserSettings.findOne({ userId: user._id }) || {
      privacySettings: {
        profileVisibility: 'public',
        showLocation: true,
        showEmail: false,
        showSocialLinks: true,
        showSubscriberCount: true
      },
      contentSettings: {
        postsVisibility: 'public',
        playlistsVisibility: 'public',
        communityVisibility: 'public'
      }
    };

    // Check if current user is following this user
    let isFollowing = false;
    let canViewProfile = true;

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
      canViewProfile = false;
    } else if (userSettings.privacySettings.profileVisibility === 'followers' &&
      (!currentUser || (!isFollowing && currentUser?._id.toString() !== user._id.toString()))) {
      canViewProfile = false;
    }

    // Get follower and following counts
    const followerCount = await Follow.countDocuments({ following: user._id });
    const followingCount = await Follow.countDocuments({ follower: user._id });

    // Construct response based on visibility settings
    const profileData = {
      id: user._id,
      username: user.username,
      name: user.name,
      usertag: user.usertag,
      bio: canViewProfile ? (user.bio || '') : '',
      profilePicture: user.profilePicture || '/profile-placeholder.jpg',
      profileBanner: user.profileBanner || '',
      subscribers: userSettings.privacySettings.showSubscriberCount ? followerCount : null,
      discussions: user.discussions || 0,
      joinDate: user.joinDate,
      isFollowing: isFollowing,
      canViewProfile: canViewProfile,
      followers: followerCount,
      following: followingCount,
      // Only include location, website, and socialLinks if allowed
      ...(canViewProfile && userSettings.privacySettings.showLocation ? { location: user.location || '' } : {}),
      ...(canViewProfile ? { website: user.website || '' } : {}),
      ...(canViewProfile && userSettings.privacySettings.showSocialLinks ? { socialLinks: user.socialLinks || [] } : {}),
      // Add content visibility flags
      contentVisibility: {
        posts: userSettings.contentSettings.postsVisibility,
        playlists: userSettings.contentSettings.playlistsVisibility,
        community: userSettings.contentSettings.communityVisibility
      }
    };

    return NextResponse.json(profileData, { status: 200 });

  } catch (error) {
    console.error('User profile error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}