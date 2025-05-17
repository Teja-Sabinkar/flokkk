// File: src/app/api/posts/[id]/comments/route.js

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Post from '@/models/Post';
import Comment from '@/models/Comment';
import { ObjectId } from 'mongodb';
import { createNotification } from '@/lib/notifications';
import { trackCommentAdded } from '@/lib/analytics';

// Clean comment content before saving to database
const sanitizeCommentContent = (content) => {
  if (!content) return '';
  
  // Convert visible &nbsp; text to spaces
  let cleaned = content.replace(/&nbsp;/g, ' ');
  
  // Convert actual HTML entity non-breaking spaces to regular spaces
  cleaned = cleaned.replace(/\u00A0/g, ' ');
  
  // Trim trailing and leading spaces
  cleaned = cleaned.trim();
  
  return cleaned;
};

// POST endpoint to create a comment
export async function POST(request, { params }) {
  try {
    console.log('Comment POST API called with params:', params);
    
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
    
    // Get post ID from route params
    const { id: postId } = params;
    console.log('Post ID:', postId);
    
    // Find user by id from token
    const user = await User.findById(decoded.id);
    
    if (!user) {
      console.error('User not found');
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      console.error('Post not found');
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Parse request body
    const data = await request.json();
    console.log('Comment data received:', data);
    
    if (!data.content) {
      return NextResponse.json(
        { message: 'Comment content is required' },
        { status: 400 }
      );
    }
    
    // Sanitize the content
    const sanitizedContent = sanitizeCommentContent(data.content);
    
    // Prepare the comment data
    const commentData = {
      postId: post._id,
      userId: user._id,
      username: user.username || user.name.toLowerCase().replace(/\s+/g, '_'),
      content: sanitizedContent, // Use sanitized content
      likes: 1, // Start with 1 like (user's own)
      isEdited: false,
      votes: [{
        userId: user._id,
        vote: 1 // Auto upvote your own comment
      }]
    };
    
    // Handle direct replies to comments (normal threading)
    if (data.parentId) {
      try {
        const parentComment = await Comment.findById(data.parentId);
        
        if (!parentComment) {
          console.error('Parent comment not found');
          return NextResponse.json(
            { message: 'Parent comment not found' },
            { status: 404 }
          );
        }
        
        commentData.parentId = parentComment._id;
        commentData.level = parentComment.level + 1;
        
        console.log(`Creating nested reply at level ${commentData.level}`);
        
        // NEW CODE: Create notification for parent comment author if commenter is not the author
        if (parentComment.userId.toString() !== user._id.toString()) {
          try {
            console.log(`Creating notification for comment author: ${parentComment.userId}`);
            
            await createNotification({
              userId: parentComment.userId, // The comment author gets the notification
              type: 'reply', // Type 'reply' will show in the 'Comments' tab
              content: `${user.username || user.name} replied to your comment on "${post.title}"`,
              sender: user._id,
              senderUsername: user.username || user.name,
              relatedId: post._id, // Link to the post containing the comment
              onModel: 'Post',
              thumbnail: post.image || null
            });
            
            console.log('Comment reply notification created successfully');
          } catch (notifyError) {
            // Log the error but don't fail the request
            console.error('Error creating comment reply notification:', notifyError);
          }
        }
      } catch (error) {
        console.error('Error processing parent comment:', error);
        return NextResponse.json(
          { message: 'Error processing parent comment' },
          { status: 500 }
        );
      }
    }
    
    // Handle continuation threads - comments that reply to deep nested comments
    if (data.replyToId) {
      try {
        const replyToComment = await Comment.findById(data.replyToId);
        if (replyToComment) {
          commentData.replyToId = replyToComment._id;
          commentData.replyToUsername = data.replyToUsername || replyToComment.username;
          console.log(`Creating continuation thread reply to ${commentData.replyToUsername}`);
        }
      } catch (error) {
        console.error('Error processing replyTo comment:', error);
      }
    }
    
    console.log('Final comment data to save:', commentData);
    
    // Create the comment
    const newComment = await Comment.create(commentData);
    console.log('New comment created:', newComment._id.toString());
    
    // Track comment added
    trackCommentAdded(postId);
    
    // Increment post discussion count
    await Post.findByIdAndUpdate(post._id, { $inc: { discussions: 1 } });
    
    // NEW CODE: Create notification for the post creator if commenter is not the creator
    if (post.userId.toString() !== user._id.toString()) {
      try {
        // Import createNotification function at the top of the file
        // import { createNotification } from '@/lib/notifications';
        
        console.log(`Creating notification for post creator: ${post.userId}`);
        
        await createNotification({
          userId: post.userId, // The post creator gets the notification
          type: 'reply', // Type 'reply' will show in both 'All' and 'Comments' tabs
          content: `${user.username || user.name} commented on your discussion: "${post.title}"`,
          sender: user._id,
          senderUsername: user.username || user.name,
          relatedId: post._id,
          onModel: 'Post',
          thumbnail: post.image || null
        });
        
        console.log('Notification created successfully');
      } catch (notifyError) {
        // Log the error but don't fail the request
        console.error('Error creating notification:', notifyError);
      }
    }
    
    return NextResponse.json(newComment, { status: 201 });
    
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch comments for a post
export async function GET(request, { params }) {
  try {
    console.log('Comment GET API called with params:', params);
    
    // Get post ID from route params
    const { id: postId } = params;
    
    // Connect to database
    await dbConnect();
    
    console.log('Fetching comments for post:', postId);
    
    // Find all comments for this post
    const comments = await Comment.find({ postId }).sort({ createdAt: -1 }).lean();
    
    console.log(`Found ${comments.length} comments for post ${postId}`);
    
    // Get the current authenticated user if any
    const headersList = headers();
    const authHeader = headersList.get('Authorization');
    let currentUserId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
        currentUserId = decoded.id;
      } catch (error) {
        // Token invalid, but we can still return comments
      }
    }
    
    // NEW CODE: Collect all unique user IDs from comments
    const userIds = [...new Set(comments.map(comment => comment.userId.toString()))];
    
    // NEW CODE: Fetch user profile pictures in a single query
    const users = await User.find(
      { _id: { $in: userIds } },
      { _id: 1, profilePicture: 1 }
    ).lean();
    
    // NEW CODE: Create a lookup map for user profile pictures
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = {
        profilePicture: user.profilePicture || '/profile-placeholder.jpg'
      };
    });
    
    // Transform the comments to the expected format
    const transformedComments = comments.map(comment => {
      // Check if user has voted on this comment
      let isLiked = false;
      let isDownvoted = false;
      
      if (currentUserId && comment.votes) {
        const userVote = comment.votes.find(
          vote => vote.userId.toString() === currentUserId
        );
        
        if (userVote) {
          isLiked = userVote.vote === 1;
          isDownvoted = userVote.vote === -1;
        }
      }
      
      // NEW CODE: Get the user's profile picture from our map
      const userProfilePicture = userMap[comment.userId.toString()]?.profilePicture || '/profile-placeholder.jpg';
      
      // Log the comment to debug
      console.log(`Processing comment ID: ${comment._id}, parentId: ${comment.parentId || 'null'}`);
      
      // Clean content when returning it too
      const cleanedContent = sanitizeCommentContent(comment.content);
      
      return {
        id: comment._id.toString(),
        parentId: comment.parentId ? comment.parentId.toString() : null,
        text: cleanedContent, // Use cleaned content
        user: {
          username: comment.username,
          avatar: userProfilePicture, // UPDATED: Use the real profile picture
          isMod: false,
          isAdmin: false
        },
        timestamp: comment.createdAt,
        likes: comment.likes || 0,
        isLiked,
        isDownvoted,
        isCollapsed: false,
        isEdited: comment.isEdited || false,
        level: comment.level || 0,
        replyToUser: comment.replyToUsername,
        replyToId: comment.replyToId ? comment.replyToId.toString() : null,
        replies: []
      };
    });
    
    // Build comment tree
    const commentTree = [];
    const commentMap = {};
    
    // Create a map for O(1) lookup
    transformedComments.forEach(comment => {
      commentMap[comment.id] = comment;
    });
    
    // Build the tree
    transformedComments.forEach(comment => {
      if (comment.parentId) {
        // This is a child comment
        const parent = commentMap[comment.parentId];
        if (parent) {
          if (!parent.replies) {
            parent.replies = [];
          }
          parent.replies.push(comment);
        } else {
          // If parent not found (shouldn't happen, but just in case)
          console.warn(`Parent comment not found for comment ${comment.id} with parentId ${comment.parentId}`);
          commentTree.push(comment); // Add as top-level comment
        }
      } else {
        // This is a top-level comment (no parent)
        commentTree.push(comment);
      }
    });
    
    // Sort comments - top-level by recency, replies by likes
    commentTree.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Sort replies by likes
    const sortRepliesByLikes = (replies) => {
      if (!replies || !replies.length) return;
      
      replies.sort((a, b) => b.likes - a.likes);
      
      // Recursively sort nested replies
      replies.forEach(reply => {
        if (reply.replies && reply.replies.length > 0) {
          sortRepliesByLikes(reply.replies);
        }
      });
    };
    
    // Sort all reply threads
    commentTree.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        sortRepliesByLikes(comment.replies);
      }
    });
    
    console.log(`Returning ${commentTree.length} top-level comments in tree structure`);
    
    return NextResponse.json({ comments: commentTree }, { status: 200 });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}