import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Forum from '@/models/Forum';

// GET - Fetch user's forums
export async function GET(request) {
  try {
    // Get parameters from query
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username'); // Keep for backward compatibility
    const user = searchParams.get('user');        // Add new parameter
    const name = searchParams.get('name');        // Also support name parameter
    const id = searchParams.get('id');            // User ID for direct lookup
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;

    // Connect to database
    await dbConnect();

    // Get current user from token
    const headersList = headers();
    const authHeader = headersList.get('Authorization');
    let currentUser = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
        currentUser = await User.findById(decoded.id);
      } catch (error) {
        console.error('Token verification error:', error);
      }
    }

    if (!currentUser) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build the query with multiple lookup options
    let query = {};
    
    if (id) {
      // If an ID is provided, use that first (most reliable)
      query.userId = id;
    } else if (user) {
      // Find user by the user parameter
      const userDoc = await User.findOne({ 
        $or: [
          { username: user }, 
          { name: user }
        ]
      });
      
      if (userDoc) {
        query.userId = userDoc._id;
      } else {
        // Try to find forums directly using username field
        query.username = user;
      }
    } else if (username) {
      // Legacy - find user by username field
      const userDoc = await User.findOne({ 
        username: { $regex: new RegExp(`^${username}$`, 'i') }
      });
      
      if (userDoc) {
        query.userId = userDoc._id;
      } else {
        // Try direct match on forum username field
        query.username = username;
      }
    } else if (name) {
      // Find user by name field
      const userDoc = await User.findOne({ name });
      
      if (userDoc) {
        query.userId = userDoc._id;
      } else {
        return NextResponse.json(
          { message: 'User not found' },
          { status: 404 }
        );
      }
    } else {
      // If no parameters, default to current user's forums
      query.userId = currentUser._id;
    }

    // Fetch forums
    const forums = await Forum.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalForums = await Forum.countDocuments(query);

    // Format forums for response
    const formattedForums = forums.map(forum => ({
      id: forum._id,
      title: forum.title,
      description: forum.description || '',
      postCount: forum.posts?.length || 0,
      updatedAt: getTimeAgo(forum.updatedAt || forum.createdAt),
      imageSrc: forum.image || '/api/placeholder/400/200'
    }));

    return NextResponse.json({
      forums: formattedForums,
      pagination: {
        page,
        limit,
        totalForums,
        totalPages: Math.ceil(totalForums / limit)
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Fetch forums error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new forum
export async function POST(request) {
  try {
    // Get current user from token
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
    
    // Get request body
    const { title, description, image } = await request.json();
    
    if (!title) {
      return NextResponse.json(
        { message: 'Forum title is required' },
        { status: 400 }
      );
    }
    
    // Create new forum with both username and user (name) fields
    const forum = new Forum({
      title,
      description: description || '',
      image: image || '/api/placeholder/400/200',
      userId: user._id,
      username: user.username || user.name.toLowerCase().replace(/\s+/g, '_'),
      user: user.name, // Add the user field that stores the name
      posts: []
    });
    
    await forum.save();
    
    return NextResponse.json({
      message: 'Forum created successfully',
      forum: {
        id: forum._id,
        title: forum.title,
        description: forum.description,
        postCount: 0,
        updatedAt: 'Just now',
        imageSrc: forum.image
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Create forum error:', error);
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