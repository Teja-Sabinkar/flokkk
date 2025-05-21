// src/app/api/studio/metrics/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Post from '@/models/Post';
import CommunityPost from '@/models/CommunityPost';
import Comment from '@/models/Comment';

export async function GET(request) {
    try {
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

        // Get counts for different content types
        const discussionsCount = await Post.countDocuments({ userId: user._id });
        const publishedDiscussionsCount = await Post.countDocuments({
            userId: user._id,
            status: 'published'
        });
        const draftDiscussionsCount = await Post.countDocuments({
            userId: user._id,
            status: 'draft'
        });

        const communityPostsCount = await CommunityPost.countDocuments({ userId: user._id });

        // Get total views across all content
        const discussions = await Post.find({ userId: user._id });
        const communityPosts = await CommunityPost.find({ userId: user._id });

        // Calculate total views
        const discussionViews = discussions.reduce((sum, post) => sum + (post.views || 0), 0);
        const communityViews = communityPosts.reduce((sum, post) => sum + (post.views || 0), 0);
        const totalViews = discussionViews + communityViews;

        // Get comments count
        const discussionIds = discussions.map(d => d._id);
        const commentsCount = await Comment.countDocuments({
            postId: { $in: discussionIds }
        });

        // Calculate engagement rate (comments + community links + votes) / views
        const communityLinks = discussions.reduce((sum, post) => {
            return sum + (post.communityLinks?.length || 0);
        }, 0);

        let engagementRate = 0;
        if (totalViews > 0) {
            engagementRate = ((commentsCount + communityLinks) / totalViews) * 100;
        }

        // Format engagement rate to 2 decimal places
        engagementRate = Math.round(engagementRate * 100) / 100;

        // Get most viewed posts (top 5)
        const topDiscussions = await Post.find({ userId: user._id })
            .sort({ views: -1 })
            .limit(5)
            .select('_id title views');

        const topCommunityPosts = await CommunityPost.find({ userId: user._id })
            .sort({ views: -1 })
            .limit(5)
            .select('_id title views');

        // Combine and sort to get top 5 overall
        const allTopPosts = [...topDiscussions, ...topCommunityPosts]
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 5)
            .map(post => ({
                id: post._id,
                title: post.title,
                views: post.views || 0,
                type: topDiscussions.some(d => d._id.equals(post._id)) ? 'discussion' : 'community'
            }));

        return NextResponse.json({
            totalPosts: discussionsCount + communityPostsCount,
            discussions: {
                total: discussionsCount,
                published: publishedDiscussionsCount,
                draft: draftDiscussionsCount
            },
            communityPosts: communityPostsCount,
            views: totalViews,
            comments: commentsCount,
            communityLinks: communityLinks,
            engagementRate: engagementRate,
            topPosts: allTopPosts
        }, { status: 200 });

    } catch (error) {
        console.error('Error fetching studio metrics:', error);
        return NextResponse.json(
            { message: 'Internal server error: ' + error.message },
            { status: 500 }
        );
    }
}