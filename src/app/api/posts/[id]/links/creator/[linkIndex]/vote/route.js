import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function POST(request, { params }) {
  try {
    const { id, linkIndex } = params;
    const linkIdx = parseInt(linkIndex);
    
    // Validate linkIndex is a number
    if (isNaN(linkIdx) || linkIdx < 0) {
      return NextResponse.json(
        { message: 'Invalid link index' },
        { status: 400 }
      );
    }
    
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
    const { db } = await connectToDatabase();
    
    // Find user by id from token
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Create a valid ObjectId for the post
    let postObjectId;
    try {
      postObjectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid post ID' },
        { status: 400 }
      );
    }
    
    // Get post data
    const post = await db.collection('posts').findOne({ _id: postObjectId });
    
    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Check if creatorLinks array exists
    if (!post.creatorLinks || !Array.isArray(post.creatorLinks)) {
      // Initialize creatorLinks if it doesn't exist
      await db.collection('posts').updateOne(
        { _id: postObjectId },
        { $set: { creatorLinks: [] } }
      );
      
      return NextResponse.json(
        { message: 'No creator links found for this post' },
        { status: 404 }
      );
    }
    
    // Check if the link index is valid
    if (linkIdx >= post.creatorLinks.length) {
      return NextResponse.json(
        { message: 'Link index out of range' },
        { status: 404 }
      );
    }
    
    // Get vote data from request
    const data = await request.json();
    const vote = data.vote;
    
    // Validate vote value
    if (![1, -1, 0].includes(vote)) {
      return NextResponse.json(
        { message: 'Invalid vote value. Must be 1 (upvote), -1 (downvote), or 0 (remove vote)' },
        { status: 400 }
      );
    }
    
    // First, ensure we have a votes object and voteCount field for this link
    // This ensures the fields exist before we try to update them
    await db.collection('posts').updateOne(
      { 
        _id: postObjectId,
        [`creatorLinks.${linkIdx}`]: { $exists: true }
      },
      { 
        $set: {
          [`creatorLinks.${linkIdx}.votes`]: post.creatorLinks[linkIdx].votes || {},
          [`creatorLinks.${linkIdx}.voteCount`]: post.creatorLinks[linkIdx].voteCount || 0
        }
      }
    );
    
    // Get the current vote value (if any)
    const userCurrentVote = post.creatorLinks[linkIdx].votes?.[user._id.toString()] || 0;
    
    // Calculate vote difference
    let voteDiff = 0;
    
    if (vote === 0) {
      // User is removing their vote
      voteDiff = -userCurrentVote;
      
      // Delete the user's vote
      await db.collection('posts').updateOne(
        { _id: postObjectId },
        { 
          $unset: { [`creatorLinks.${linkIdx}.votes.${user._id.toString()}`]: "" },
          $inc: { [`creatorLinks.${linkIdx}.voteCount`]: voteDiff }
        }
      );
    } else {
      // User is adding or changing vote
      if (userCurrentVote === 0) {
        // New vote
        voteDiff = vote;
      } else if (userCurrentVote !== vote) {
        // Changing vote (e.g., from upvote to downvote)
        voteDiff = vote - userCurrentVote;
      } else {
        // Same vote again, no change
        voteDiff = 0;
      }
      
      if (voteDiff !== 0) {
        // Update the vote and vote count
        await db.collection('posts').updateOne(
          { _id: postObjectId },
          { 
            $set: { [`creatorLinks.${linkIdx}.votes.${user._id.toString()}`]: vote },
            $inc: { [`creatorLinks.${linkIdx}.voteCount`]: voteDiff }
          }
        );
      }
    }
    
    // Get updated post data
    const updatedPost = await db.collection('posts').findOne({ _id: postObjectId });
    const updatedLink = updatedPost.creatorLinks[linkIdx];
    
    return NextResponse.json({
      link: {
        title: updatedLink.title,
        url: updatedLink.url,
        description: updatedLink.description || '',
        voteCount: updatedLink.voteCount || 0
      },
      userVote: vote,
      message: 'Vote recorded successfully'
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error voting on creator link:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}