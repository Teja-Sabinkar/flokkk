import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function GET(request, { params }) {
  try {
    console.log('Attempting to connect to MongoDB...');
    const { db } = await connectToDatabase();
    console.log('MongoDB connection successful');
    
    const { id } = params;
    console.log('API Route - Fetching post with ID:', id);
    
    // Create a valid ObjectId
    let postId;
    try {
      postId = new ObjectId(id);
      console.log('Valid ObjectId created');
    } catch (error) {
      console.error('Invalid ObjectId:', id, error.message);
      return NextResponse.json(
        { message: 'Invalid post ID format' },
        { status: 400 }
      );
    }
    
    // Log auth info
    const headersList = headers();
    const authHeader = headersList.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    
    // Find post by ID using direct MongoDB query
    console.log('Querying database for post:', id);
    const post = await db.collection('posts').findOne({ _id: postId });
    
    if (!post) {
      console.log('Post not found with ID:', id);
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }
    
    console.log('Post found:', post._id.toString());
    console.log('Fields present:', Object.keys(post));
    
    // Return post data
    return NextResponse.json(post, { status: 200 });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}