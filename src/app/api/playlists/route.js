import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Playlist from '@/models/Playlist';
import Post from '@/models/Post';

// GET all playlists for the current user
export async function GET(request) {
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

      // Get playlists for this user and populate posts to get their images
      const playlists = await Playlist.find({ userId: user._id })
        .populate('posts', 'image title') // Include post images and titles
        .lean();

      // Format playlists for response
      const formattedPlaylists = playlists.map(playlist => {
        // Get the first post's image, or fallback to default
        let imageSrc = '/api/placeholder/240/135'; // Default image
        if (playlist.posts && playlist.posts.length > 0 && playlist.posts[0].image) {
          imageSrc = playlist.posts[0].image;
        }

        return {
          id: playlist._id,
          title: playlist.title,
          imageSrc: imageSrc, // Use the first post's image if available
          videoCount: `${playlist.posts.length} forums`,
          updatedAt: getTimeAgo(playlist.updatedAt),
          description: playlist.description,
          visibility: playlist.visibility
        };
      });

      return NextResponse.json({ playlists: formattedPlaylists }, { status: 200 });

    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST to create a new playlist
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

      // Get request body
      const data = await request.json();

      if (!data.title) {
        return NextResponse.json(
          { message: 'Playlist title is required' },
          { status: 400 }
        );
      }

      // Create new playlist
      const newPlaylist = new Playlist({
        userId: user._id,
        title: data.title,
        description: data.description || '',
        image: data.image || '/api/placeholder/240/135',
        visibility: data.visibility || 'public',
        posts: []
      });

      // If posts are provided, add them to the playlist
      if (data.posts && Array.isArray(data.posts) && data.posts.length > 0) {
        const postIds = data.posts.map(post => post.id || post._id).filter(Boolean);

        // Verify that the posts exist
        const existingPosts = await Post.find({ _id: { $in: postIds } });

        // Add existing post IDs to the playlist
        newPlaylist.posts = existingPosts.map(post => post._id);
      }

      // Save the playlist
      await newPlaylist.save();

      // Get post images if there are posts
      let postImages = [];
      if (newPlaylist.posts && newPlaylist.posts.length > 0) {
        const postIds = newPlaylist.posts.slice(0, 4);
        const posts = await Post.find(
          { _id: { $in: postIds } },
          { image: 1 }
        ).limit(4).lean();

        postImages = posts
          .map(post => post.image)
          .filter(image => image);
      }

      // Format for response
      const formattedPlaylist = {
        id: newPlaylist._id,
        title: newPlaylist.title,
        imageSrc: newPlaylist.image,
        videoCount: `${newPlaylist.posts.length} forums`,
        updatedAt: 'just now',
        description: newPlaylist.description,
        visibility: newPlaylist.visibility,
        postImages: postImages
      };

      return NextResponse.json(formattedPlaylist, { status: 201 });

    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error creating playlist:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
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