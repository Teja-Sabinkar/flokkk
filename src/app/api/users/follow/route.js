import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Follow from '@/models/Follow';
import { createNotification } from '@/lib/notifications'; // Added import

export async function POST(request) {
  try {
    // Verify authentication
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
    
    // Get the raw data from the request
    const rawData = await request.json();
    console.log('Follow request data:', rawData);
    
    const { username, userId, action } = rawData;

    if ((!username && !userId) || !['follow', 'unfollow'].includes(action)) {
      return NextResponse.json(
        { message: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();
    
    // Find current user by id from token
    const currentUser = await User.findById(decoded.id);
    
    if (!currentUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find target user - try multiple approaches
    let targetUser = null;
    
    if (userId) {
      // If userId is provided, use that (most reliable)
      try {
        targetUser = await User.findById(userId);
      } catch (error) {
        console.error('Error finding user by ID:', error);
      }
    } 
    
    if (!targetUser && username) {
      targetUser = await User.findOne({ username: username });
    }
    
    if (!targetUser) {
      return NextResponse.json(
        { message: `Target user not found: ${username || userId}` },
        { status: 404 }
      );
    }

    // Cannot follow yourself
    if (currentUser._id.toString() === targetUser._id.toString()) {
      return NextResponse.json(
        { message: 'You cannot follow yourself' },
        { status: 400 }
      );
    }

    // Follow or unfollow based on action
    if (action === 'follow') {
      // Try to create a follow relationship
      try {
        await Follow.create({
          follower: currentUser._id,
          following: targetUser._id
        });
        
        // Create notification for the followed user
        try {
          await createNotification({
            userId: targetUser._id,
            type: 'follow',
            content: `${currentUser.username || currentUser.name} has started following you`,
            sender: currentUser._id,
            senderUsername: currentUser.username || currentUser.name,
            relatedId: currentUser._id,
            onModel: 'User'
          });
          
          console.log('Follow notification created successfully');
        } catch (notificationError) {
          console.error('Error creating follow notification:', notificationError);
        }
        
      } catch (error) {
        // If already following, just ignore the error
        if (error.code !== 11000) { // 11000 is the MongoDB duplicate key error code
          throw error;
        }
      }
    } else {
      // Remove the follow relationship
      await Follow.findOneAndDelete({
        follower: currentUser._id,
        following: targetUser._id
      });
    }

    // Get updated follower count
    const followerCount = await Follow.countDocuments({ following: targetUser._id });
    
    // Update the target user's subscribers count in the database
    await User.findByIdAndUpdate(targetUser._id, { subscribers: followerCount });
    
    // Log the update for debugging
    console.log(`Updated user ${targetUser.username || targetUser.name} subscribers count to ${followerCount}`);

    return NextResponse.json({
      message: action === 'follow' ? 'Successfully followed user' : 'Successfully unfollowed user',
      isFollowing: action === 'follow',
      followerCount
    }, { status: 200 });
    
  } catch (error) {
    console.error('Follow error:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}