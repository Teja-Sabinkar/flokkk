import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Playlist from '@/models/Playlist';

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
    
    // Find current user by ID from token
    const currentUser = await User.findById(decoded.id);
    
    if (!currentUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get request body
    const { originalPlaylistId, title, description, visibility } = await request.json();
    
    if (!originalPlaylistId) {
      return NextResponse.json(
        { message: 'Original playlist ID is required' },
        { status: 400 }
      );
    }
    
    // Find original playlist
    const originalPlaylist = await Playlist.findById(originalPlaylistId).populate('posts');
    
    if (!originalPlaylist) {
      return NextResponse.json(
        { message: 'Original playlist not found' },
        { status: 404 }
      );
    }
    
    // Check if the playlist is already saved by the user
    const existingSavedPlaylist = await Playlist.findOne({
      userId: currentUser._id,
      originalPlaylistId: originalPlaylist._id
    });
    
    if (existingSavedPlaylist) {
      return NextResponse.json(
        { message: 'You have already saved this playlist' },
        { status: 400 }
      );
    }
    
    // Create a new playlist in the current user's collection
    const newPlaylist = new Playlist({
      userId: currentUser._id,
      title: title || `${originalPlaylist.title} (Saved)`,
      description: description || originalPlaylist.description || '',
      image: originalPlaylist.image || '/api/placeholder/240/135',
      visibility: visibility || 'private',
      posts: originalPlaylist.posts.map(post => post._id),
      originalPlaylistId: originalPlaylist._id // Reference to the original playlist
    });
    
    // Save the new playlist
    await newPlaylist.save();
    
    // Format for response
    const formattedPlaylist = {
      id: newPlaylist._id,
      title: newPlaylist.title,
      imageSrc: newPlaylist.image,
      videoCount: `${newPlaylist.posts.length} forums`,
      updatedAt: 'just now',
      description: newPlaylist.description,
      visibility: newPlaylist.visibility
    };
    
    return NextResponse.json({
      message: 'Playlist saved successfully',
      playlist: formattedPlaylist
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error saving playlist:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}