// Modified route.js for /api/community-posts/[id]/vote

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import CommunityPost from '@/models/CommunityPost';
import { createNotification } from '@/lib/notifications';
import { trackPostVoted } from '@/lib/analytics';

// POST to vote on a community post
export async function POST(request, { params }) {
  try {
    // Get post ID from params
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
    
    // Find the community post
    const post = await CommunityPost.findById(id);
    
    if (!post) {
      return NextResponse.json(
        { message: 'Community post not found' },
        { status: 404 }
      );
    }
    
    // Get vote data from request body
    const data = await request.json();
    const voteValue = data.vote;
    
    // Validate vote value
    if (![1, -1, 0].includes(voteValue)) {
      return NextResponse.json(
        { message: 'Invalid vote value. Must be 1 (upvote), -1 (downvote), or 0 (remove vote)' },
        { status: 400 }
      );
    }
    
    // Check if user has already voted on this post
    const existingVoteIndex = post.votes.findIndex(
      v => v.userId.toString() === user._id.toString()
    );
    
    let voteChange = 0;
    let shouldSendNotification = false;
    let voteAction = '';
    
    if (existingVoteIndex >= 0) {
      // User has already voted
      const existingVote = post.votes[existingVoteIndex];
      
      if (voteValue === 0) {
        // Remove the vote
        voteChange = -existingVote.vote;
        post.votes.splice(existingVoteIndex, 1);
        // No notification for removing votes
      } else if (existingVote.vote !== voteValue) {
        // Change the vote
        voteChange = voteValue - existingVote.vote;
        post.votes[existingVoteIndex].vote = voteValue;
        // Send notification for changing vote type
        shouldSendNotification = true;
        voteAction = voteValue === 1 ? 'upvoted' : 'downvoted';
      }
      // If the vote is the same, no change
    } else if (voteValue !== 0) {
      // User hasn't voted yet and isn't trying to remove a non-existent vote
      voteChange = voteValue;
      post.votes.push({
        userId: user._id,
        vote: voteValue
      });
      // Send notification for new vote
      shouldSendNotification = true;
      voteAction = voteValue === 1 ? 'upvoted' : 'downvoted';
    }
    
    // Update the vote count
    post.voteCount += voteChange;
    
    // Save the updated post
    await post.save();
    
    // Track vote
    const voteType = voteValue === 1 ? 'upvote' : voteValue === -1 ? 'downvote' : 'remove';
    trackPostVoted(id, voteType);
    
    // Don't send notification if user is voting on their own post
    if (shouldSendNotification && post.userId.toString() !== user._id.toString()) {
      try {
        // Create notification for post creator
        await createNotification({
          userId: post.userId, // Send to post creator
          type: 'like', // This will appear in the "Votings" tab
          content: `${user.username || user.name} has ${voteAction} your community post "${post.title.substring(0, 30)}${post.title.length > 30 ? '...' : ''}"`,
          sender: user._id,
          senderUsername: user.username || user.name,
          relatedId: post._id,
          onModel: 'CommunityPost'
        });
        
        console.log(`Notification sent to user ${post.userId} about vote from ${user.username || user.name}`);
      } catch (notificationError) {
        // Log error but don't fail the request
        console.error('Failed to create notification:', notificationError);
      }
    }
    
    return NextResponse.json({
      message: 'Vote recorded successfully',
      voteCount: post.voteCount,
      userVote: voteValue
    }, { status: 200 });
    
  } catch (error) {
    console.error('Community post vote error:', error);
    return NextResponse.json(
      { message: 'Failed to record vote: ' + error.message },
      { status: 500 }
    );
  }
}