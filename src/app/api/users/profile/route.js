import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function GET(request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await dbConnect();
    
    // Find user by ID
    const user = await User.findById(id);
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Return user data
    return NextResponse.json({
      id: user._id,
      username: user.username,
      name: user.name,
      usertag: user.usertag,
      bio: user.bio || '',
      location: user.location || '',
      website: user.website || '',
      profilePicture: user.profilePicture || '/profile-placeholder.jpg',
      profileBanner: user.profileBanner || '',
      socialLinks: user.socialLinks || [],
      subscribers: user.subscribers || 0,
      discussions: user.discussions || 0,
      joinDate: user.joinDate,
      isFollowing: false, // Default value, you'd need to check this based on the current user
      canViewProfile: true // Default value, you'd need to check this based on privacy settings
    }, { status: 200 });
    
  } catch (error) {
    console.error('User profile by ID error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}