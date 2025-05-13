import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request, { params }) {
  try {
    console.log("COMMUNITY VOTE API CALLED");
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
    
    // Make sure communityLinks array exists
    if (!Array.isArray(post.communityLinks) || linkIdx >= post.communityLinks.length) {
      return NextResponse.json(
        { message: 'Link not found' },
        { status: 404 }
      );
    }
    
    // Handle the case where the community link might have votes as a number
    // We need to migrate to the new structure with userVotes
    const communityLink = post.communityLinks[linkIdx];
    let currentVoteCount = 0;
    
    if (typeof communityLink.votes === 'number') {
      // Old structure - votes is a number
      currentVoteCount = communityLink.votes;
      
      // Migrate to new structure - create userVotes object
      await db.collection('posts').updateOne(
        { _id: postObjectId },
        { 
          $set: { 
            [`communityLinks.${linkIdx}.userVotes`]: {},
            [`communityLinks.${linkIdx}.voteCount`]: currentVoteCount
          }
        }
      );
    } else if (typeof communityLink.voteCount === 'number') {
      // Already using new structure
      currentVoteCount = communityLink.voteCount;
    } else {
      // Initialize voteCount if it doesn't exist
      await db.collection('posts').updateOne(
        { _id: postObjectId },
        { 
          $set: { 
            [`communityLinks.${linkIdx}.userVotes`]: {},
            [`communityLinks.${linkIdx}.voteCount`]: 0
          }
        }
      );
    }
    
    // Get the updated post after migration if needed
    if (typeof communityLink.votes === 'number' || !communityLink.userVotes || !communityLink.voteCount) {
      const updatedPost = await db.collection('posts').findOne({ _id: postObjectId });
      communityLink.userVotes = updatedPost.communityLinks[linkIdx].userVotes || {};
      communityLink.voteCount = updatedPost.communityLinks[linkIdx].voteCount || 0;
    }
    
    // Get current vote (if any)
    const currentVote = communityLink.userVotes?.[userId] || 0;
    
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
        $inc: { [`communityLinks.${linkIdx}.voteCount`]: voteDiff },
        $unset: { [`communityLinks.${linkIdx}.userVotes.${userId}`]: "" }
      };
    } else {
      // Set or update user's vote
      updateOperation = {
        $inc: { [`communityLinks.${linkIdx}.voteCount`]: voteDiff },
        $set: { [`communityLinks.${linkIdx}.userVotes.${userId}`]: vote }
      };
    }
    
    // Execute the update
    await db.collection('posts').updateOne(
      { _id: postObjectId },
      updateOperation
    );
    
    // Get updated post
    const updatedPost = await db.collection('posts').findOne({ _id: postObjectId });
    const updatedLink = updatedPost.communityLinks[linkIdx];
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
    if (!Array.isArray(post.communityLinks) || linkIdx >= post.communityLinks.length) {
      return NextResponse.json(
        { message: 'Link not found' },
        { status: 404 }
      );
    }
    
    const communityLink = post.communityLinks[linkIdx];
    let userVote = 0;
    let voteCount = 0;
    
    // Handle different data structures
    if (typeof communityLink.votes === 'number') {
      // Old structure
      voteCount = communityLink.votes;
    } else {
      // New structure
      userVote = communityLink.userVotes?.[userId] || 0;
      voteCount = communityLink.voteCount || 0;
    }
    
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