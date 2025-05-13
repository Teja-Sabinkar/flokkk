import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { createNotification } from '@/lib/notifications'; // Add this import for notifications

export async function POST(request, { params }) {
    try {
        console.log('POST /api/posts/[id]/links - Adding links to post:', params.id);

        // Get auth token from header
        const headersList = headers();
        const authHeader = headersList.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { message: 'Unauthorized - No token provided' },
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
                { message: 'Unauthorized - Invalid token' },
                { status: 401 }
            );
        }

        // Connect to MongoDB (using direct client for more flexibility)
        const { db } = await connectToDatabase();

        // Also connect via mongoose for the User model
        await dbConnect();

        // Find user by id from token
        const user = await User.findById(decoded.id);

        if (!user) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        // Get post ID from route params
        const { id: postId } = params;

        // Create a valid ObjectId
        let postObjectId;
        try {
            postObjectId = new ObjectId(postId);
        } catch (error) {
            console.error('Invalid post ID format:', postId);
            return NextResponse.json(
                { message: 'Invalid post ID format' },
                { status: 400 }
            );
        }

        // Find the post
        const post = await db.collection('posts').findOne({ _id: postObjectId });

        if (!post) {
            return NextResponse.json(
                { message: 'Post not found' },
                { status: 404 }
            );
        }

        // Check if user is the post creator
        // Compare the userId if it's stored as string or ObjectId
        const postUserId = post.userId.toString();
        const currentUserId = user._id.toString();

        if (postUserId !== currentUserId) {
            return NextResponse.json(
                { message: 'Only the post creator can update creator links' },
                { status: 403 }
            );
        }

        // Parse request data
        const data = await request.json();

        if (!data.creatorLinks || !Array.isArray(data.creatorLinks)) {
            return NextResponse.json(
                { message: 'Creator links are required and must be an array' },
                { status: 400 }
            );
        }

        // Validate each creator link
        const validatedLinks = data.creatorLinks.map(link => ({
            title: link.title || 'Untitled Link',
            url: link.url || '#',
            description: link.description || ''
        }));

        console.log('Updating post creator links:', validatedLinks);

        // Update the post
        const result = await db.collection('posts').updateOne(
            { _id: postObjectId },
            { $set: { creatorLinks: validatedLinks } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { message: 'Post not found' },
                { status: 404 }
            );
        }

        if (result.modifiedCount === 0) {
            console.log('No changes made to the post');
        } else {
            console.log('Post updated successfully');
        }

        // Return the updated post
        const updatedPost = await db.collection('posts').findOne({ _id: postObjectId });

        return NextResponse.json({
            message: 'Creator links updated successfully',
            creatorLinks: updatedPost.creatorLinks
        }, { status: 200 });

    } catch (error) {
        console.error('Error updating creator links:', error);
        return NextResponse.json(
            { message: 'Internal server error: ' + error.message },
            { status: 500 }
        );
    }
}