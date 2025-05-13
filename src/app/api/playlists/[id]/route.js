import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Playlist from '@/models/Playlist';
import Post from '@/models/Post';

// GET a specific playlist with its posts
export async function GET(request, { params }) {
  try {
    // Connect to database
    await dbConnect();
    
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
      
      // Find the playlist by ID and populate posts
      const playlist = await Playlist.findById(id)
        .populate({
          path: 'posts',
          model: 'Post',
          select: '_id title content image videoUrl hashtags discussions createdAt username'
        });
      
      if (!playlist) {
        return NextResponse.json(
          { message: 'Playlist not found' },
          { status: 404 }
        );
      }
      
      // Check if the user owns this playlist
      if (playlist.userId.toString() !== user._id.toString()) {
        // User doesn't own this playlist
        // Here you could add more complex permission checks based on visibility settings
        return NextResponse.json(
          { message: 'You do not have permission to access this playlist' },
          { status: 403 }
        );
      }
      
      // Format posts
      const formattedPosts = playlist.posts.map(post => ({
        id: post._id,
        title: post.title,
        content: post.content,
        image: post.image,
        videoUrl: post.videoUrl,
        hashtags: post.hashtags,
        discussions: post.discussions,
        username: post.username,
        createdAt: post.createdAt,
        timeAgo: getTimeAgo(post.createdAt)
      }));
      
      // Format playlist for response
      const formattedPlaylist = {
        id: playlist._id,
        title: playlist.title,
        imageSrc: playlist.image,
        videoCount: `${playlist.posts.length} forums`,
        updatedAt: getTimeAgo(playlist.updatedAt),
        description: playlist.description,
        visibility: playlist.visibility,
        posts: formattedPosts
      };
      
      return NextResponse.json(formattedPlaylist, { status: 200 });
      
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error fetching playlist:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH/Update playlist
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    
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
      
      // Find playlist by id
      const playlist = await Playlist.findById(id);
      
      if (!playlist) {
        return NextResponse.json(
          { message: 'Playlist not found' },
          { status: 404 }
        );
      }
      
      // Check if user owns the playlist
      if (playlist.userId.toString() !== user._id.toString()) {
        return NextResponse.json(
          { message: 'You do not have permission to modify this playlist' },
          { status: 403 }
        );
      }
      
      // Parse request body
      const updateData = await request.json();
      
      // Validate title if provided
      if (updateData.title !== undefined) {
        if (typeof updateData.title !== 'string' || updateData.title.trim() === '') {
          return NextResponse.json(
            { message: 'Title is required and must be a non-empty string' },
            { status: 400 }
          );
        }
        
        if (updateData.title.length > 100) {
          return NextResponse.json(
            { message: 'Title cannot be more than 100 characters' },
            { status: 400 }
          );
        }
      }
      
      // Update allowed fields only
      const allowedUpdates = {
        title: updateData.title,
        description: updateData.description,
        visibility: updateData.visibility
      };
      
      // Remove undefined values
      Object.keys(allowedUpdates).forEach(key => 
        allowedUpdates[key] === undefined && delete allowedUpdates[key]
      );
      
      // Update playlist
      const updatedPlaylist = await Playlist.findByIdAndUpdate(
        id,
        { $set: allowedUpdates },
        { new: true, runValidators: true }
      );
      
      // Format playlist for response
      const formattedPlaylist = {
        id: updatedPlaylist._id,
        title: updatedPlaylist.title,
        imageSrc: updatedPlaylist.image,
        videoCount: `${updatedPlaylist.posts.length} forums`,
        updatedAt: getTimeAgo(updatedPlaylist.updatedAt),
        description: updatedPlaylist.description,
        visibility: updatedPlaylist.visibility
      };
      
      return NextResponse.json(formattedPlaylist, { status: 200 });
      
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
      
      throw error;
    }
    
  } catch (error) {
    console.error('Playlist update error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE playlist
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
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
      
      // Find playlist by id
      const playlist = await Playlist.findById(id);
      
      if (!playlist) {
        return NextResponse.json(
          { message: 'Playlist not found' },
          { status: 404 }
        );
      }
      
      // Check if user owns the playlist
      if (playlist.userId.toString() !== user._id.toString()) {
        return NextResponse.json(
          { message: 'You do not have permission to delete this playlist' },
          { status: 403 }
        );
      }
      
      // Delete playlist
      await Playlist.findByIdAndDelete(id);
      
      return NextResponse.json(
        { message: 'Playlist deleted successfully' },
        { status: 200 }
      );
      
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
  } catch (error) {
    console.error('Playlist deletion error:', error);
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