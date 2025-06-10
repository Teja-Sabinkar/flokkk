import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Post from '@/models/Post';
import Follow from '@/models/Follow';

export async function GET(request, { params }) {
  try {
    console.log("Posts API called with params:", params); // Debug log
    console.log("API Route Hit: /api/users/[username]/posts");
    console.log("Params:", params);
    console.log("URL:", request.url);

    // Get username from route params
    const { username } = params;
    if (!username) {
      return NextResponse.json(
        { message: 'Username is required' },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const id = searchParams.get('id'); // Check for ID parameter
    const skip = (page - 1) * limit;

    // Connect to database
    await dbConnect();

    console.log(`Finding user with username: ${username}`); // Debug log

    // Try to find user by ID first if provided (more reliable)
    let user = null;
    if (id) {
      try {
        user = await User.findById(id);
        console.log(`User lookup by ID result: ${user ? 'Found' : 'Not found'}`);
      } catch (err) {
        console.log('ID lookup failed, falling back to username');
      }
    }

    // If not found by ID or no ID provided, try multiple username matching strategies
    if (!user) {
      console.log(`Trying flexible username lookup for: ${username}`);

      // Find user by username with more flexible matching
      user = await User.findOne({
        $or: [
          { username: username },
          { username: username.toLowerCase() },
          { username: { $regex: new RegExp(`^${username}$`, 'i') } },
          // Add this line to also search by name
          { name: { $regex: new RegExp(`^${username}$`, 'i') } }
        ]
      });
    }

    if (!user) {
      console.log(`User not found: ${username}`); // Debug log
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    console.log(`Found user: ${user.username}, ID: ${user._id}`); // Debug log

    // Find posts by user ID
    const posts = await Post.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log(`Found ${posts.length} posts for user`); // Debug log

    // Get total count for pagination
    const totalPosts = await Post.countDocuments({ userId: user._id });

    // Format posts for response
    const formattedPosts = posts.map(post => ({
      id: post._id,
      title: post.title,
      content: post.content,
      image: post.image,
      videoUrl: post.videoUrl,
      hashtags: post.hashtags,
      discussions: post.discussions,
      shares: post.shares,
      username: post.username,
      profilePicture: user.profilePicture || '/profile-placeholder.jpg',
      createdAt: post.createdAt,
      timeAgo: getTimeAgo(post.createdAt),
      // ADD THESE MISSING FIELDS:
      creatorLinks: post.creatorLinks || [],
      communityLinks: post.communityLinks || []
    }));

    return NextResponse.json({
      posts: formattedPosts,
      canViewPosts: true,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit)
      }
    }, { status: 200 });

  } catch (error) {
    console.error('User posts error:', error);
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