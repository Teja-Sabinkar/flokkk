import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request, { params }) {
  try {
    console.log("CREATOR VOTE API CALLED");
    const { id } = params;
    
    // Parse request body
    const data = await request.json();
    console.log("Request data:", data);
    
    // Extract vote info
    const { linkIndex, voteValue } = data;
    
    if (voteValue === undefined || linkIndex === undefined) {
      return NextResponse.json(
        { message: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    const linkIdx = parseInt(linkIndex);
    const vote = parseInt(voteValue);
    
    // Validate vote value (-1, 0, or 1)
    if (![1, 0, -1].includes(vote)) {
      return NextResponse.json(
        { message: 'Invalid vote value' },
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
    
    // Verify JWT token and extract user ID
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
      userId = decoded.id;
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Create ObjectId for post
    let postObjectId;
    try {
      postObjectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid post ID format' },
        { status: 400 }
      );
    }
    
    // Get the post document
    const post = await db.collection('posts').findOne({ _id: postObjectId });
    
    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Make sure creatorLinks array exists
    if (!Array.isArray(post.creatorLinks) || linkIdx >= post.creatorLinks.length) {
      return NextResponse.json(
        { message: 'Link not found' },
        { status: 404 }
      );
    }
    
    // Initialize userVotes if it doesn't exist
    if (!post.creatorLinks[linkIdx].userVotes) {
      await db.collection('posts').updateOne(
        { _id: postObjectId },
        { $set: { [`creatorLinks.${linkIdx}.userVotes`]: {} } }
      );
    }
    
    // Get current vote (if any)
    const currentVote = post.creatorLinks[linkIdx].userVotes?.[userId] || 0;
    
    // Calculate vote difference
    let voteDiff = 0;
    
    if (vote === 0) {
      // User is removing their vote
      voteDiff = -currentVote;
    } else if (currentVote === vote) {
      // User is toggling off their current vote
      voteDiff = -vote;
      vote = 0; // Set to 0 for toggling off
    } else {
      // User is changing vote or voting for first time
      voteDiff = vote - currentVote;
    }
    
    // Update vote count and user's vote
    let updateOperation;
    
    if (vote === 0) {
      // Remove user's vote
      updateOperation = {
        $inc: { [`creatorLinks.${linkIdx}.voteCount`]: voteDiff },
        $unset: { [`creatorLinks.${linkIdx}.userVotes.${userId}`]: "" }
      };
    } else {
      // Set or update user's vote
      updateOperation = {
        $inc: { [`creatorLinks.${linkIdx}.voteCount`]: voteDiff },
        $set: { [`creatorLinks.${linkIdx}.userVotes.${userId}`]: vote }
      };
    }
    
    // Execute the update
    await db.collection('posts').updateOne(
      { _id: postObjectId },
      updateOperation
    );
    
    // Get updated post
    const updatedPost = await db.collection('posts').findOne({ _id: postObjectId });
    const updatedLink = updatedPost.creatorLinks[linkIdx];
    const updatedVoteCount = updatedLink.voteCount || 0;
    const userVoteValue = updatedLink.userVotes?.[userId] || 0;
    
    return NextResponse.json({
      message: 'Vote recorded successfully',
      voteCount: updatedVoteCount,
      userVote: userVoteValue
    }, { status: 200 });
    
  } catch (error) {
    console.error("Vote API error:", error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch current user's vote status
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const linkIndex = searchParams.get('linkIndex');
    
    if (!linkIndex) {
      return NextResponse.json(
        { message: 'Missing linkIndex parameter' },
        { status: 400 }
      );
    }
    
    const linkIdx = parseInt(linkIndex);
    
    // Get auth token
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
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
      userId = decoded.id;
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Create ObjectId for post
    let postObjectId;
    try {
      postObjectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid post ID format' },
        { status: 400 }
      );
    }
    
    // Get the post document
    const post = await db.collection('posts').findOne({ _id: postObjectId });
    
    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Check if link exists
    if (!Array.isArray(post.creatorLinks) || linkIdx >= post.creatorLinks.length) {
      return NextResponse.json(
        { message: 'Link not found' },
        { status: 404 }
      );
    }
    
    // Get user's vote status
    const userVote = post.creatorLinks[linkIdx].userVotes?.[userId] || 0;
    const voteCount = post.creatorLinks[linkIdx].voteCount || 0;
    
    return NextResponse.json({
      userVote,
      voteCount
    }, { status: 200 });
    
  } catch (error) {
    console.error("Get vote status error:", error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}