// API endpoint to handle community post deletion
// File path: src/app/api/community-posts/[id]/route.js

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import CommunityPost from '@/models/CommunityPost';
import { del } from '@vercel/blob';

// Handle DELETE request for community posts
export async function DELETE(request, { params }) {
  try {
    // Get post ID from params
    const { id } = params;

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

    // Find the community post
    const post = await CommunityPost.findById(id);

    if (!post) {
      return NextResponse.json(
        { message: 'Community post not found' },
        { status: 404 }
      );
    }

    // Check if current user is the post author
    if (post.userId.toString() !== user._id.toString() && post.username !== user.username) {
      return NextResponse.json(
        { message: 'You are not authorized to delete this post' },
        { status: 403 }
      );
    }

    // Delete the image from the blob storage if it exists
    if (post.image && post.image.includes('blob.vercel-storage.com')) {
      try {
        await del(post.image);
        console.log('Post image deleted from storage:', post.image);
      } catch (deleteError) {
        console.error('Failed to delete image from storage:', deleteError);
        // Continue with post deletion even if image deletion fails
      }
    }

    // Delete the post
    await CommunityPost.findByIdAndDelete(id);

    return NextResponse.json({
      message: 'Community post deleted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Community post deletion error:', error);
    return NextResponse.json(
      { message: 'Failed to delete community post: ' + error.message },
      { status: 500 }
    );
  }
}