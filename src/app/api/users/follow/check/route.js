// api/users/follow/check/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Follow from '@/models/Follow';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  try {
    // Verify authentication
    const headersList = headers();
    const authHeader = headersList.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Get target user ID from query
    const url = new URL(request.url);
    const targetId = url.searchParams.get('targetId');
    const targetUsername = url.searchParams.get('targetUsername');
    
    if (!targetId && !targetUsername) {
      return NextResponse.json(
        { message: 'Target user ID or username required' },
        { status: 400 }
      );
    }
    
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Connect to database
    await dbConnect();
    
    // Find current user by id from token
    const currentUser = await User.findById(decoded.id);
    
    if (!currentUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find target user
    let targetUser = null;
    
    if (targetId) {
      try {
        targetUser = await User.findById(targetId);
      } catch (error) {
        console.error('Error finding user by ID:', error);
      }
    }
    
    if (!targetUser && targetUsername) {
      targetUser = await User.findOne({ username: targetUsername });
    }
    
    if (!targetUser) {
      return NextResponse.json(
        { message: 'Target user not found' },
        { status: 404 }
      );
    }
    
    // Check if current user is following target user
    const followRecord = await Follow.findOne({
      follower: currentUser._id,
      following: targetUser._id
    });
    
    // Return result
    return NextResponse.json({
      isFollowing: !!followRecord,
      followerCount: await Follow.countDocuments({ following: targetUser._id })
    }, { status: 200 });
    
  } catch (error) {
    console.error('Check follow status error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}