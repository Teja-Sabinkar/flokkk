// src/app/api/comments/[id]/vote/route.js

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Comment from '@/models/Comment';
import { createNotification } from '@/lib/notifications';
import Post from '@/models/Post';
import { trackPostVoted } from '@/lib/analytics';

export async function POST(request, { params }) {
  try {
    console.log('Comment vote API called with params:', params);

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

    // Get comment ID from route params
    const { id: commentId } = params;

    // Find user by id from token
    const user = await User.findById(decoded.id);

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Find comment by ID
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return NextResponse.json(
        { message: 'Comment not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const data = await request.json();
    console.log('Vote data received:', data);

    // Validate vote value (1 for upvote, -1 for downvote, 0 for removing vote)
    if (![1, -1, 0].includes(data.vote)) {
      return NextResponse.json(
        { message: 'Invalid vote value' },
        { status: 400 }
      );
    }

    // Check if user has already voted on this comment
    const existingVoteIndex = comment.votes.findIndex(
      vote => vote.userId.toString() === user._id.toString()
    );

    // Calculate vote change
    let voteChange = 0;

    if (existingVoteIndex >= 0) {
      // User has voted before
      const existingVote = comment.votes[existingVoteIndex];

      if (data.vote === 0) {
        // Remove vote
        voteChange = -existingVote.vote;
        comment.votes.splice(existingVoteIndex, 1);
      } else if (existingVote.vote !== data.vote) {
        // Change vote
        voteChange = data.vote * 2; // Double the effect since we're flipping
        comment.votes[existingVoteIndex].vote = data.vote;
      }
    } else if (data.vote !== 0) {
      // New vote
      voteChange = data.vote;
      comment.votes.push({
        userId: user._id,
        vote: data.vote
      });
    }

    // Update likes count
    comment.likes += voteChange;
    await comment.save();
    console.log(`Updated comment likes to ${comment.likes}`);

    // Track the vote
    const voteType = data.vote === 1 ? 'upvote' : data.vote === -1 ? 'downvote' : 'remove';
    trackPostVoted(comment.postId.toString(), voteType);

    // Create notification for the comment creator if voter is not the creator and vote is not 0 (removing vote)
    if (comment.userId.toString() !== user._id.toString() && data.vote !== 0) {
      try {
        // Fetch the post to get its title
        const post = await Post.findById(comment.postId);
        const postTitle = post ? post.title : 'a discussion';

        console.log(`Creating notification for comment creator: ${comment.userId}`);

        // Create action text based on vote type
        const action = data.vote === 1 ? 'upvoted' : 'downvoted';

        await createNotification({
          userId: comment.userId,
          type: 'like',
          content: `${user.username || user.name} ${action} your comment on "${postTitle}"`,
          sender: user._id,
          senderUsername: user.username || user.name,
          relatedId: post._id, // Use the post ID instead of comment ID
          onModel: 'Post', // Change to 'Post' since we're using post ID
          commentId: comment._id, // Store the comment ID in a new field
          thumbnail: post.image || null
        });

        console.log('Notification created successfully');
      } catch (notifyError) {
        // Log the error but don't fail the request
        console.error('Error creating notification:', notifyError);
      }
    }

    return NextResponse.json({
      likes: comment.likes,
      isLiked: data.vote === 1,
      isDownvoted: data.vote === -1
    }, { status: 200 });

  } catch (error) {
    console.error('Error voting on comment:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}