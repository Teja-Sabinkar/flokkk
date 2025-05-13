import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { createNotification } from '@/lib/notifications'; // Add this import

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
    
    // Check if communityLinks array exists
    if (!post.communityLinks || !Array.isArray(post.communityLinks)) {
      // Initialize communityLinks if it doesn't exist
      await db.collection('posts').updateOne(
        { _id: postObjectId },
        { $set: { communityLinks: [] } }
      );
      
      return NextResponse.json(
        { message: 'No community links found for this post' },
        { status: 404 }
      );
    }
    
    // Check if the link index is valid
    if (linkIdx >= post.communityLinks.length) {
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
    
    // Determine how to handle the vote structure
    // If votes is a number, we need to convert it to an object and rename it to something else
    const communityLink = post.communityLinks[linkIdx];
    let voteCount = 0;
    let userVotes = {};
    
    if (typeof communityLink.votes === 'number') {
      // Current votes is a number, need to convert structure
      voteCount = communityLink.votes || 0;
      // Store user votes separately in userVotes field
    } else if (typeof communityLink.votes === 'object' && communityLink.votes !== null) {
      // Votes already exists as an object for user votes
      userVotes = communityLink.votes;
      // Check where vote count is stored
      if (typeof communityLink.voteCount === 'number') {
        voteCount = communityLink.voteCount;
      } else {
        // No separate voteCount, compute from userVotes
        voteCount = Object.values(userVotes).reduce((sum, value) => sum + value, 0);
      }
    }
    
    // Get the current user's vote (if any)
    const userCurrentVote = userVotes[user._id.toString()] || 0;
    
    // Calculate vote difference
    let voteDiff = 0;
    
    if (vote === 0) {
      // User is removing their vote
      voteDiff = -userCurrentVote;
      
      // Delete the user's vote
      delete userVotes[user._id.toString()];
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
        // Set the user's vote
        userVotes[user._id.toString()] = vote;
      }
    }
    
    // Calculate new vote count
    voteCount += voteDiff;
    
    // Update the database with the new structure
    await db.collection('posts').updateOne(
      { _id: postObjectId },
      { 
        $set: { 
          [`communityLinks.${linkIdx}.votes`]: userVotes,
          [`communityLinks.${linkIdx}.voteCount`]: voteCount
        }
      }
    );
    
    // Get updated post data
    const updatedPost = await db.collection('posts').findOne({ _id: postObjectId });
    const updatedLink = updatedPost.communityLinks[linkIdx];
    
    // NEW CODE: Send notification to both the post creator and the link contributor
    if (voteDiff !== 0 && vote !== 0) {
      try {
        // Get the contributorId from the community link
        const contributorId = communityLink.contributorId;
        
        // Only send notification if the voter is not the contributor
        if (contributorId && contributorId.toString() !== user._id.toString()) {
          console.log(`Creating vote notification for link contributor: ${contributorId}`);
          
          // Create action text based on vote type
          const action = vote === 1 ? 'upvoted' : 'downvoted';
          
          await createNotification({
            userId: contributorId, // The link contributor gets the notification
            type: 'like', // Using 'like' for votes to show in "Votings" tab
            content: `${user.username || user.name} ${action} your link contribution "${updatedLink.title}" on discussion: "${post.title}"`,
            sender: user._id,
            senderUsername: user.username || user.name,
            relatedId: post._id,
            onModel: 'Post',
            thumbnail: post.image || null
          });
          
          console.log('Link vote notification created successfully');
        }
        
        // Also notify the post creator if different from both the voter and contributor
        if (post.userId && 
            post.userId.toString() !== user._id.toString() && 
            post.userId.toString() !== (contributorId ? contributorId.toString() : '')) {
          
          console.log(`Creating vote notification for post creator: ${post.userId}`);
          
          // Create action text based on vote type
          const action = vote === 1 ? 'upvoted' : 'downvoted';
          
          await createNotification({
            userId: post.userId, // The post creator gets the notification
            type: 'like', // Using 'like' for votes to show in "Votings" tab
            content: `${user.username || user.name} ${action} a link "${updatedLink.title}" on your discussion: "${post.title}"`,
            sender: user._id,
            senderUsername: user.username || user.name,
            relatedId: post._id,
            onModel: 'Post',
            thumbnail: post.image || null
          });
          
          console.log('Post creator vote notification created successfully');
        }
      } catch (notifyError) {
        // Log the error but don't fail the request
        console.error('Error creating vote notification:', notifyError);
      }
    }
    
    return NextResponse.json({
      link: {
        title: updatedLink.title,
        url: updatedLink.url,
        description: updatedLink.description || '',
        voteCount: updatedLink.voteCount || 0,
        contributorUsername: updatedLink.contributorUsername
      },
      userVote: vote,
      message: 'Vote recorded successfully'
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error voting on community link:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}