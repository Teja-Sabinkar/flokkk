import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Post from '@/models/Post';
import LinkContribution from '@/models/LinkContribution';
import { createNotification } from '@/lib/notifications';

// POST to create a new link contribution
export async function POST(request) {
  try {
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
    
    // Parse request body
    const data = await request.json();
    
    // Validate required fields
    if (!data.postId || !data.title || !data.url || !data.creatorId) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check if the post exists
    const post = await Post.findById(data.postId);
    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Create the contribution
    const contribution = await LinkContribution.create({
      postId: data.postId,
      contributorId: user._id,
      contributorUsername: user.username || user.name.toLowerCase().replace(/\s+/g, '_'),
      creatorId: data.creatorId,
      title: data.title,
      url: data.url,
      description: data.description || '',
      status: 'pending',
      postTitle: data.postTitle || post.title || 'Post'
    });
    
    // Create notification for the post creator if contributor is not the creator
    if (post.userId.toString() !== user._id.toString()) {
      try {
        console.log(`Creating contribution notification for post creator: ${post.userId}`);
        
        await createNotification({
          userId: post.userId, // The post creator gets the notification
          type: 'contribution', // New notification type
          content: `${user.username || user.name} contributed a link "${data.title}" to your discussion: "${post.title}"`,
          sender: user._id,
          senderUsername: user.username || user.name,
          relatedId: post._id,
          onModel: 'Post',
          thumbnail: post.image || null
        });
        
        console.log('Contribution notification created successfully');
      } catch (notifyError) {
        // Log the error but don't fail the request
        console.error('Error creating contribution notification:', notifyError);
      }
    }
    
    return NextResponse.json({
      message: 'Link contribution submitted successfully',
      contribution
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating link contribution:', error);
    return NextResponse.json(
      { message: 'Failed to submit link contribution: ' + error.message },
      { status: 500 }
    );
  }
}

// GET to retrieve contributions
export async function GET(request) {
  try {
    console.log('GET /api/link-contributions - Fetching contributions');
    
    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const type = searchParams.get('type') || 'received';
    
    console.log(`Query params: status=${status}, type=${type}`);
    
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
      console.error('User not found with ID:', decoded.id);
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log(`User ${user.username || user._id} fetching contributions as ${type}`);
    
    // Build query based on type
    let query = {};
    
    if (type === 'received') {
      query.creatorId = user._id;
    } else if (type === 'sent') {
      query.contributorId = user._id;
    } else {
      console.warn(`Invalid type parameter: ${type}, defaulting to 'received'`);
      query.creatorId = user._id;
    }
    
    // Add status filter if not 'all'
    if (status !== 'all') {
      query.status = status;
    }
    
    console.log('Query:', JSON.stringify(query));
    
    // Get contributions
    const contributions = await LinkContribution.find(query)
      .sort({ createdAt: -1 })
      .populate('postId', 'title')
      .lean();
    
    console.log(`Found ${contributions.length} contributions`);
    
    // Format response data with time ago
    const formattedContributions = contributions.map(contrib => ({
      id: contrib._id.toString(),
      postId: contrib.postId ? 
        (typeof contrib.postId === 'object' ? contrib.postId._id?.toString() : contrib.postId.toString()) 
        : null,
      postTitle: contrib.postTitle || (contrib.postId && typeof contrib.postId === 'object' ? contrib.postId.title : 'Unknown Post'),
      title: contrib.title || 'Untitled Link',
      url: contrib.url || '#',
      description: contrib.description || '',
      status: contrib.status || 'pending',
      contributorUsername: contrib.contributorUsername || 'Unknown User',
      createdAt: contrib.createdAt,
      timeAgo: getTimeAgo(contrib.createdAt)
    }));
    
    return NextResponse.json({
      contributions: formattedContributions
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error fetching link contributions:', error);
    return NextResponse.json(
      { message: 'Failed to fetch link contributions: ' + error.message },
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