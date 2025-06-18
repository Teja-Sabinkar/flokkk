// src/app/api/comments/[id]/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import dbConnect from '@/lib/mongoose';
import Comment from '@/models/Comment';
import User from '@/models/User';

// DELETE endpoint to soft delete a comment
export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    // Check comment ID format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'Invalid comment ID format' },
        { status: 400 }
      );
    }
    
    // Verify authentication
    const headersList = await headers();
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
    
    // Find user to check verification status
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user's email is verified
    if (!user.isEmailVerified) {
      return NextResponse.json(
        { 
          message: 'Email verification required to manage comments', 
          verificationRequired: true 
        },
        { status: 403 }
      );
    }
    
    // Find comment by ID
    const comment = await Comment.findById(id);
    
    if (!comment) {
      return NextResponse.json(
        { message: 'Comment not found' },
        { status: 404 }
      );
    }
    
    // Check if user has permission to delete this comment
    if (comment.userId.toString() !== decoded.id) {
      return NextResponse.json(
        { message: 'You do not have permission to delete this comment' },
        { status: 403 }
      );
    }
    
    // Check if comment is already deleted
    if (comment.isDeleted) {
      return NextResponse.json(
        { message: 'Comment is already deleted' },
        { status: 400 }
      );
    }
    
    // Soft delete: Update comment to mark as deleted
    const updatedComment = await Comment.findByIdAndUpdate(
      id,
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          // Keep original content for admin purposes but replace display content
          originalContent: comment.content,
          content: '[deleted]'
        }
      },
      { new: true }
    );
    
    return NextResponse.json({
      message: 'Comment deleted successfully',
      comment: {
        _id: updatedComment._id,
        isDeleted: updatedComment.isDeleted,
        content: updatedComment.content,
        deletedAt: updatedComment.deletedAt
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}