// This is a simplified version showing the POST handler in your
// /api/community-posts/route.js file

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import CommunityPost from '@/models/CommunityPost';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  try {
    // Connect to the database
    await dbConnect();
    
    // Get the authentication token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
    
    // Verify user existence
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    
    // Get the post data from the request body
    const data = await request.json();
    
    // Create the community post
    const post = new CommunityPost({
      userId: user._id,
      username: user.username,
      title: data.title,
      content: data.content || '',
      image: data.image, // This will now be a Vercel Blob URL
      tags: data.tags || []
    });
    
    // Save the post
    await post.save();
    
    // Return the created post
    return NextResponse.json({ 
      success: true, 
      post: {
        id: post._id,
        userId: post.userId,
        username: post.username,
        title: post.title,
        content: post.content,
        image: post.image,
        voteCount: post.voteCount,
        tags: post.tags,
        createdAt: post.createdAt,
        timeAgo: 'just now'
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating community post:', error);
    return NextResponse.json({ 
      message: 'Failed to create community post', 
      error: error.message 
    }, { status: 500 });
  }
}