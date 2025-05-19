import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function GET(request, { params }) {
  try {
    const { db } = await connectToDatabase();
    const { id } = params;
    
    // Create a valid ObjectId
    let postId;
    try {
      postId = new ObjectId(id);
    } catch (error) {
      console.error('Invalid ObjectId:', id, error.message);
      return NextResponse.json(
        { message: 'Invalid post ID format' },
        { status: 400 }
      );
    }
    
    // Find post by ID using direct MongoDB query
    const post = await db.collection('posts').findOne({ _id: postId });
    
    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Ensure all fields are properly included in the response
    const responsePost = {
      _id: post._id,
      id: post._id, // Include both formats
      userId: post.userId,
      username: post.username,
      title: post.title,
      content: post.content,
      image: post.image,
      videoUrl: post.videoUrl, // Explicitly include videoUrl
      hashtags: post.hashtags || [],
      discussions: post.discussions || 0,
      shares: post.shares || 0,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      creatorLinks: post.creatorLinks || [],
      allowContributions: post.allowContributions
    };
    
    // Return post data
    return NextResponse.json(responsePost, { status: 200 });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}