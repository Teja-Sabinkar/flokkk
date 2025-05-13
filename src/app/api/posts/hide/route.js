// src/app/api/posts/hide/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import HiddenPost from '@/models/HiddenPost';

export async function POST(request) {
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
    
    // Get request body
    const data = await request.json();
    
    if (!data.postId) {
      return NextResponse.json(
        { message: 'Post ID is required' },
        { status: 400 }
      );
    }
    
    // Add post to user's hidden posts
    try {
      const hiddenPost = new HiddenPost({
        userId: user._id,
        postId: data.postId
      });
      
      await hiddenPost.save();
      
      return NextResponse.json({
        message: 'Post hidden successfully'
      }, { status: 200 });
    } catch (error) {
      // Handle duplicate key error (post already hidden)
      if (error.code === 11000) {
        return NextResponse.json({
          message: 'Post already hidden'
        }, { status: 200 });
      }
      
      throw error;
    }
    
  } catch (error) {
    console.error('Error hiding post:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}