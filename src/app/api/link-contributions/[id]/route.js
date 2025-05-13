import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import dbConnect from '@/lib/mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Post from '@/models/Post';
import LinkContribution from '@/models/LinkContribution';
import { createNotification } from '@/lib/notifications'; // Add this import

export async function PATCH(request, { params }) {
  try {
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
    
    // Find the contribution
    const contribution = await LinkContribution.findById(id);
    
    if (!contribution) {
      return NextResponse.json(
        { message: 'Contribution not found' },
        { status: 404 }
      );
    }
    
    // Check if the user is the creator who should approve/reject
    if (contribution.creatorId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { message: 'Only the post creator can approve or reject contributions' },
        { status: 403 }
      );
    }
    
    // Get action from request
    const { action } = await request.json();
    
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { message: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }
    
    // Get post data for notifications
    const post = await Post.findById(contribution.postId);
    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Handle approval
    if (action === 'approve') {
      // Update contribution status
      contribution.status = 'approved';
      await contribution.save();
      
      try {
        // Get the post
        const postObjectId = new ObjectId(contribution.postId);
        const postFromDB = await db.collection('posts').findOne({ _id: postObjectId });
        
        if (!postFromDB) {
          return NextResponse.json(
            { message: 'Post not found' },
            { status: 404 }
          );
        }
        
        // Add the link to community links
        // Create an array if it doesn't exist
        const communityLinks = postFromDB.communityLinks || [];
        
        // Add the new link
        communityLinks.push({
          title: contribution.title,
          url: contribution.url,
          description: contribution.description,
          contributorId: contribution.contributorId,
          contributorUsername: contribution.contributorUsername,
          votes: 0
        });
        
        // Update the post
        await db.collection('posts').updateOne(
          { _id: postObjectId },
          { $set: { communityLinks } }
        );
        
        // NEW CODE: Notify the contributor that their link was approved
        try {
          console.log(`Creating approval notification for contributor: ${contribution.contributorId}`);
          
          await createNotification({
            userId: contribution.contributorId, // The contributor gets the notification
            type: 'contribution', // Using 'contribution' type
            content: `${user.username || user.name} approved your link contribution "${contribution.title}" to the discussion: "${post.title}"`,
            sender: user._id,
            senderUsername: user.username || user.name,
            relatedId: post._id,
            onModel: 'Post',
            thumbnail: post.image || null
          });
          
          console.log('Approval notification created successfully');
        } catch (notifyError) {
          // Log the error but don't fail the request
          console.error('Error creating approval notification:', notifyError);
        }
        
        return NextResponse.json({
          message: 'Contribution approved and added to community links',
          contribution
        }, { status: 200 });
      } catch (error) {
        console.error('Error updating post with community link:', error);
        return NextResponse.json(
          { message: 'Error adding link to post: ' + error.message },
          { status: 500 }
        );
      }
    }
    
    // Handle rejection
    if (action === 'reject') {
      contribution.status = 'declined';
      await contribution.save();
      
      // NEW CODE: Notify the contributor that their link was rejected
      try {
        console.log(`Creating rejection notification for contributor: ${contribution.contributorId}`);
        
        await createNotification({
          userId: contribution.contributorId, // The contributor gets the notification
          type: 'contribution', // Using 'contribution' type
          content: `${user.username || user.name} declined your link contribution "${contribution.title}" to the discussion: "${post.title}"`,
          sender: user._id,
          senderUsername: user.username || user.name,
          relatedId: post._id,
          onModel: 'Post',
          thumbnail: post.image || null
        });
        
        console.log('Rejection notification created successfully');
      } catch (notifyError) {
        // Log the error but don't fail the request
        console.error('Error creating rejection notification:', notifyError);
      }
      
      return NextResponse.json({
        message: 'Contribution rejected',
        contribution
      }, { status: 200 });
    }
    
  } catch (error) {
    console.error('Error processing contribution action:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}