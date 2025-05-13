import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Playlist from '@/models/Playlist';

export async function DELETE(request, { params }) {
  try {
    // Get the playlist ID and post ID from the route parameters
    const { id: playlistId, postId } = params;
    
    console.log(`DELETE request to remove post ${postId} from playlist ${playlistId}`);
    
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
    
    console.log(`Before removal: playlist has ${playlist.posts.length} posts`);
    
    // Convert all posts to strings for comparison
    const stringPostIds = playlist.posts.map(id => id.toString());
    
    // Check if post exists in playlist
    if (!stringPostIds.includes(postId.toString())) {
      return NextResponse.json(
        { message: 'Post not found in this playlist' },
        { status: 404 }
      );
    }
    
    // Remove the post from the playlist's posts array
    playlist.posts = playlist.posts.filter(id => id.toString() !== postId.toString());
    
    console.log(`After removal: playlist has ${playlist.posts.length} posts`);
    
    // Save the updated playlist
    await playlist.save();
    
    return NextResponse.json({
      message: 'Post removed from playlist successfully',
      playlistId: playlist._id,
      postCount: playlist.posts.length
    }, { status: 200 });
  } catch (error) {
    console.error('Error removing post from playlist:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}