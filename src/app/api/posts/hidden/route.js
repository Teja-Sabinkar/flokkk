// src/app/api/posts/hidden/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import HiddenPost from '@/models/HiddenPost';

export async function GET(request) {
  try {
    // Connect to database
    await dbConnect();
    
    // Get auth token from header
    const headersList = headers();
    const authHeader = headersList.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
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
    
    // Find user by id from token
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get all hidden posts for the user
    const hiddenPosts = await HiddenPost.find({ userId: user._id });
    
    return NextResponse.json({
      hiddenPosts: hiddenPosts.map(hp => ({
        postId: hp.postId.toString(),
        hiddenAt: hp.hiddenAt
      }))
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error fetching hidden posts:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}