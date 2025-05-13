// This file should be placed at /src/app/api/forums/[id]/route.js

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Forum from '@/models/Forum';

// GET - Fetch a specific forum
export async function GET(request, { params }) {
    try {
        const { id } = params;

        // Connect to database
        await dbConnect();

        // Find forum by ID
        const forum = await Forum.findById(id);

        if (!forum) {
            return NextResponse.json(
                { message: 'Forum not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            id: forum._id,
            title: forum.title,
            description: forum.description || '',
            postCount: forum.posts?.length || 0,
            userId: forum.userId,
            username: forum.username,
            posts: forum.posts || [],
            updatedAt: forum.updatedAt,
            createdAt: forum.createdAt,
            image: forum.image || '/api/placeholder/400/200'
        }, { status: 200 });
    } catch (error) {
        console.error('Fetch forum error:', error);
        return NextResponse.json(
            { message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}

// PATCH - Update a forum
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

        // Find forum by ID
        const forum = await Forum.findById(id);

        if (!forum) {
            return NextResponse.json(
                { message: 'Forum not found' },
                { status: 404 }
            );
        }

        // Check if user owns this forum
        if (forum.userId.toString() !== user._id.toString()) {
            return NextResponse.json(
                { message: 'Not authorized to update this forum' },
                { status: 403 }
            );
        }

        // Get request body
        const data = await request.json();
        
        // Handle different update types
        if (data.removePostId) {
            // HANDLE POST REMOVAL
            const postIdToRemove = data.removePostId;
            console.log(`Removing post ${postIdToRemove} from forum ${id}`);
            
            // Filter out the post to remove
            const updatedPosts = forum.posts.filter(post => {
                // Handle both cases - where post is an object with postId, or just the ID itself
                const currentPostId = post.postId ? post.postId.toString() : post.toString();
                return currentPostId !== postIdToRemove.toString();
            });
            
            forum.posts = updatedPosts;
        } else {
            // HANDLE REGULAR FORUM UPDATE
            if (data.title) forum.title = data.title;
            if (data.description !== undefined) forum.description = data.description;
            if (data.image) forum.image = data.image;
        }

        forum.updatedAt = new Date();
        await forum.save();

        return NextResponse.json({
            message: data.removePostId ? 'Post removed from forum successfully' : 'Forum updated successfully',
            forum: {
                id: forum._id,
                title: forum.title,
                description: forum.description,
                postCount: forum.posts?.length || 0,
                updatedAt: 'Just now',
                imageSrc: forum.image || '/api/placeholder/400/200'
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Update forum error:', error);
        return NextResponse.json(
            { message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}

// DELETE - Delete a forum
export async function DELETE(request, { params }) {
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

        // Find forum by ID
        const forum = await Forum.findById(id);

        if (!forum) {
            return NextResponse.json(
                { message: 'Forum not found' },
                { status: 404 }
            );
        }

        // Check if user owns this forum
        if (forum.userId.toString() !== user._id.toString()) {
            return NextResponse.json(
                { message: 'Not authorized to delete this forum' },
                { status: 403 }
            );
        }

        // Delete forum
        await Forum.findByIdAndDelete(id);

        return NextResponse.json({
            message: 'Forum deleted successfully'
        }, { status: 200 });
    } catch (error) {
        console.error('Delete forum error:', error);
        return NextResponse.json(
            { message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}