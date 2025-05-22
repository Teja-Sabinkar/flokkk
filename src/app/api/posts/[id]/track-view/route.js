import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Post from '@/models/Post';
import PostEngagement from '@/models/PostEngagement';

export async function POST(request, { params }) {
    try {
        const { id: postId } = params;

        // Check post ID format
        if (!ObjectId.isValid(postId)) {
            return NextResponse.json(
                { message: 'Invalid post ID format' },
                { status: 400 }
            );
        }

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

        // Find user by id from token
        const user = await User.findById(decoded.id);

        if (!user) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        // Check if post exists
        const post = await Post.findById(postId);

        if (!post) {
            return NextResponse.json(
                { message: 'Post not found' },
                { status: 404 }
            );
        }

        // Find or create engagement record
        let engagement = await PostEngagement.findOne({
            postId: new ObjectId(postId),
            userId: user._id
        });

        if (!engagement) {
            // Create new engagement record
            engagement = new PostEngagement({
                postId: new ObjectId(postId),
                userId: user._id,
                hasViewed: true,
                lastViewedAt: new Date()
            });
        } else {
            // Update existing engagement record only if not already viewed
            if (!engagement.hasViewed) {
                engagement.hasViewed = true;
                engagement.lastViewedAt = new Date();
            }
        }

        await engagement.save();

        // Get updated engagement counts for this post
        const [saveCount, shareCount, viewedCount] = await Promise.all([
            PostEngagement.countDocuments({
                postId: new ObjectId(postId),
                hasSaved: true
            }),
            PostEngagement.countDocuments({
                postId: new ObjectId(postId),
                hasShared: true
            }),
            PostEngagement.countDocuments({
                postId: new ObjectId(postId),
                hasViewed: true
            })
        ]);

        return NextResponse.json({
            message: 'View tracked successfully',
            engagement: {
                hasSaved: engagement.hasSaved,
                hasShared: engagement.hasShared,
                hasViewed: engagement.hasViewed,
                lastSavedAt: engagement.lastSavedAt,
                lastSharedAt: engagement.lastSharedAt,
                lastViewedAt: engagement.lastViewedAt
            },
            counts: {
                saves: saveCount,
                shares: shareCount,
                viewed: viewedCount
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Error tracking view:', error);
        return NextResponse.json(
            { message: 'Internal server error: ' + error.message },
            { status: 500 }
        );
    }
}