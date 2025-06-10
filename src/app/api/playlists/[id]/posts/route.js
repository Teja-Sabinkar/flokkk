import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Playlist from '@/models/Playlist';
import Post from '@/models/Post';


export async function POST(request, { params }) {
  try {
    const { id: playlistId } = params;

    // Connect to database
    await dbConnect();

    // Get auth token from header
    const headersList = headers();
    const authHeader = headersList.get('Authorization');

    // Authentication check
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT token
    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);

      // Find user by id from token
      const user = await User.findById(decoded.id);

      if (!user) {
        return NextResponse.json(
          { message: 'User not found' },
          { status: 404 }
        );
      }

      // Find the playlist by ID
      const playlist = await Playlist.findById(playlistId);

      if (!playlist) {
        return NextResponse.json(
          { message: 'Playlist not found' },
          { status: 404 }
        );
      }

      // Check if the user owns this playlist
      if (playlist.userId.toString() !== user._id.toString()) {
        return NextResponse.json(
          { message: 'You do not have permission to modify this playlist' },
          { status: 403 }
        );
      }

      // Parse request body
      const data = await request.json();

      // Validate postId
      if (!data.postId) {
        return NextResponse.json(
          { message: 'Post ID is required' },
          { status: 400 }
        );
      }

      // Find the post by ID
      const post = await Post.findById(data.postId);

      if (!post) {
        return NextResponse.json(
          { message: 'Post not found' },
          { status: 404 }
        );
      }

      // Check if the post is already in the playlist
      if (playlist.posts.includes(post._id)) {
        return NextResponse.json(
          { message: 'Post already exists in this playlist' },
          { status: 400 }
        );
      }

      // Add the post to the playlist
      playlist.posts.push(post._id);

      // Save the updated playlist
      await playlist.save();

      return NextResponse.json({
        message: 'Post added to playlist successfully',
        playlistId: playlist._id,
        title: playlist.title,
        postCount: playlist.posts.length
      }, { status: 200 });
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return NextResponse.json(
          { message: 'Invalid token' },
          { status: 401 }
        );
      }

      if (error.name === 'TokenExpiredError') {
        return NextResponse.json(
          { message: 'Token expired' },
          { status: 401 }
        );
      }

      console.error('Error in playlist post API:', error);
      return NextResponse.json(
        { message: 'Internal server error: ' + error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Playlist post API error:', error);
    return NextResponse.json(
      { message: 'Failed to process request: ' + error.message },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    console.log('API route called: GET /api/playlists/[id]/posts');

    // Get playlist ID from route params
    const { id } = params;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;

    console.log(`Request params:`, { playlistId: id, page, limit });

    // Connect to database
    await dbConnect();

    // Get auth token from header
    const headersList = headers();
    const authHeader = headersList.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized - No token provided' },
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
        { message: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Find user by id from token
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Find the playlist
    const playlist = await Playlist.findById(id).populate('posts');

    if (!playlist) {
      return NextResponse.json(
        { message: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Check if the playlist is public or belongs to the current user
    const isOwner = playlist.userId.toString() === currentUser._id.toString();

    if (!isOwner && playlist.visibility !== 'public') {
      return NextResponse.json(
        { message: 'You do not have permission to view this playlist' },
        { status: 403 }
      );
    }

    // If the playlist is empty, return empty array
    if (!playlist.posts || playlist.posts.length === 0) {
      return NextResponse.json({
        posts: [],
        pagination: {
          page,
          limit,
          totalPosts: 0,
          totalPages: 0
        }
      }, { status: 200 });
    }

    // Get post details for all posts in the playlist
    const postIds = playlist.posts.map(post => post._id);

    const posts = await Post.find({
      _id: { $in: postIds }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log(`Found ${posts.length} posts in playlist`);

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
      createdAt: post.createdAt,
      timeAgo: getTimeAgo(post.createdAt),
      // ADD THESE MISSING FIELDS:
      creatorLinks: post.creatorLinks || [],
      communityLinks: post.communityLinks || []
    }));

    // Return the posts
    return NextResponse.json({
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        totalPosts: postIds.length,
        totalPages: Math.ceil(postIds.length / limit)
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching playlist posts:', error);
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