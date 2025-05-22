import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function GET(request) {
  try {
    // Get auth token from header
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
      
      // Connect to database
      await dbConnect();
      
      // Find user by id from token
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return NextResponse.json(
          { message: 'User not found' },
          { status: 404 }
        );
      }
      
      // Return complete user profile data
      return NextResponse.json({
        id: user._id,
        username: user.username || user.name.toLowerCase().replace(/\s+/g, '_'),
        name: user.name,
        email: user.email,
        usertag: user.usertag,
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        contactInfo: user.contactInfo || '',
        profilePicture: user.profilePicture || '/profile-placeholder.jpg',
        profileBanner: user.profileBanner || '',
        socialLinks: user.socialLinks || [],
        subscribers: user.subscribers || 0,
        discussions: user.discussions || 0,
        joinDate: user.joinDate,
        createdAt: user.createdAt,
        isEmailVerified: user.isEmailVerified
      }, { status: 200 });
      
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}