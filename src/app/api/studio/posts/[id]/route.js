// src/app/api/studio/posts/[id]/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import dbConnect from '@/lib/mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Post from '@/models/Post';
import CommunityPost from '@/models/CommunityPost';

export async function PATCH(request, { params }) {
    try {
        const { id } = params;

        // Check post ID format
        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { message: 'Invalid post ID format' },
                { status: 400 }
            );
        }

        // Parse request body
        const data = await request.json();

        // Get content type - if not specified, try to determine automatically
        const { contentType, ...updateData } = data;

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

        // Convert ID to ObjectId
        const postObjectId = new ObjectId(id);

        // Try to determine content type if not specified
        let determinedContentType = contentType;
        if (!determinedContentType) {
            // Check if it's a discussion post
            const discussionPost = await Post.findOne({ _id: postObjectId, userId: user._id });
            if (discussionPost) {
                determinedContentType = 'discussion';
            } else {
                const communityPost = await CommunityPost.findOne({ _id: postObjectId, userId: user._id });
                if (communityPost) {
                    determinedContentType = 'communityPost';
                }
            }
        }

        if (!determinedContentType) {
            return NextResponse.json(
                { message: 'Post not found or content type not determined' },
                { status: 404 }
            );
        }

        // Update based on content type
        let result;
        if (determinedContentType === 'discussion') {
            // Prepare fields to update
            const updateFields = {};
            if (updateData.title) updateFields.title = updateData.title;
            if (updateData.content) updateFields.content = updateData.content;
            if (updateData.status) updateFields.status = updateData.status;
            if (updateData.hashtags) updateFields.hashtags = updateData.hashtags;
            updateFields.updatedAt = new Date();

            result = await db.collection('posts').findOneAndUpdate(
                { _id: postObjectId, userId: user._id },
                { $set: updateFields },
                { returnDocument: 'after' }
            );

        } else if (determinedContentType === 'communityPost') {
            // Prepare fields to update
            const updateFields = {};
            if (updateData.title) updateFields.title = updateData.title;
            if (updateData.content) updateFields.content = updateData.content;
            if (updateData.status) updateFields.status = updateData.status;
            if (updateData.hashtags) updateFields.hashtags = updateData.hashtags;
            updateFields.updatedAt = new Date();

            result = await db.collection('communityposts').findOneAndUpdate(
                { _id: postObjectId, userId: user._id },
                { $set: updateFields },
                { returnDocument: 'after' }
            );
        }

        if (!result) {
            return NextResponse.json(
                { message: 'Post not found or you do not have permission to edit it' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: 'Post updated successfully',
            post: {
                ...result,
                contentType: determinedContentType
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Error updating post:', error);
        return NextResponse.json(
            { message: 'Internal server error: ' + error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = params;

        // Check post ID format
        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { message: 'Invalid post ID format' },
                { status: 400 }
            );
        }

        // Get content type from query params
        const { searchParams } = new URL(request.url);
        const contentType = searchParams.get('type');

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

        // Convert ID to ObjectId
        const postObjectId = new ObjectId(id);

        // Try to determine content type if not specified
        let determinedContentType = contentType;
        if (!determinedContentType) {
            // Check if it's a discussion post
            const discussionPost = await Post.findOne({ _id: postObjectId, userId: user._id });
            if (discussionPost) {
                determinedContentType = 'discussion';
            } else {
                const communityPost = await CommunityPost.findOne({ _id: postObjectId, userId: user._id });
                if (communityPost) {
                    determinedContentType = 'communityPost';
                }
            }
        }

        if (!determinedContentType) {
            return NextResponse.json(
                { message: 'Post not found or content type not determined' },
                { status: 404 }
            );
        }

        // Delete based on content type
        let result;
        if (determinedContentType === 'discussion') {
            result = await db.collection('posts').findOneAndDelete({
                _id: postObjectId,
                userId: user._id
            });

            // Also delete related comments
            await db.collection('comments').deleteMany({
                postId: postObjectId
            });

        } else if (determinedContentType === 'communityPost') {
            result = await db.collection('communityposts').findOneAndDelete({
                _id: postObjectId,
                userId: user._id
            });
        }

        if (!result) {
            return NextResponse.json(
                { message: 'Post not found or you do not have permission to delete it' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: 'Post deleted successfully',
            postId: id,
            contentType: determinedContentType
        }, { status: 200 });

    } catch (error) {
        console.error('Error deleting post:', error);
        return NextResponse.json(
            { message: 'Internal server error: ' + error.message },
            { status: 500 }
        );
    }
}