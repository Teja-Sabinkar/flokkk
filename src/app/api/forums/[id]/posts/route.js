import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Forum from '@/models/Forum';
import Post from '@/models/Post';

// GET - Get posts for a forum
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Connect to database
    await dbConnect();
    
    // Find forum by ID
    const forum = await Forum.findById(id);
    
    if (!forum) {
      return NextResponse.json(
        { message: 'Forum not found' },
        { status: 404 }
      );
    }
    
    // Get posts from the forum
    const postIds = forum.posts || [];
    
    // If no posts, return empty array
    if (postIds.length === 0) {
      return NextResponse.json({
        posts: []
      }, { status: 200 });
    }
    
    // Find posts by IDs
    const posts = await Post.find({
      _id: { $in: postIds.map(p => p.postId || p) }
    });
    
    // Format posts for response
    const formattedPosts = posts.map(post => ({
      id: post._id,
      title: post.title,
      content: post.content || '',
      image: post.image,
      videoUrl: post.videoUrl,
      username: post.username,
      userId: post.userId,
      createdAt: post.createdAt,
      timeAgo: getTimeAgo(post.createdAt),
      discussionsCount: post.discussions || 0
    }));
    
    return NextResponse.json({
      posts: formattedPosts
    }, { status: 200 });
  } catch (error) {
    console.error('Get forum posts error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Add a post to a forum
export async function POST(request, { params }) {
  try {
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
    
    // Find forum by ID
    const forum = await Forum.findById(id);
    
    if (!forum) {
      return NextResponse.json(
        { message: 'Forum not found' },
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
    
    // Find post by ID
    const post = await Post.findById(data.postId);
    
    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Check if post already exists in the forum
    const postExists = forum.posts?.some(p => 
      (p.postId ? p.postId.toString() : p.toString()) === data.postId.toString()
    );
    
    if (postExists) {
      return NextResponse.json(
        { message: 'Post already exists in this forum' },
        { status: 400 }
      );
    }
    
    // Add post to forum
    forum.posts = [...(forum.posts || []), { postId: data.postId }];
    forum.updatedAt = new Date();
    await forum.save();
    
    return NextResponse.json({
      message: 'Post added to forum successfully',
      postId: data.postId
    }, { status: 200 });
  } catch (error) {
    console.error('Add post to forum error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to calculate time ago
function getTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now - past) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
}