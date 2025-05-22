// src/app/api/studio/metrics/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Post from '@/models/Post';
import CommunityPost from '@/models/CommunityPost';
import Comment from '@/models/Comment';
import PostEngagement from '@/models/PostEngagement'; // NEW: Import PostEngagement model

export async function GET(request, { params }) {
    try {
        // NEW: Handle params if they exist (though this route may not use them)
        const resolvedParams = params ? await params : {};
        
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

        // Get all user's posts to calculate engagement metrics
        const discussions = await Post.find({ userId: user._id });
        const communityPosts = await CommunityPost.find({ userId: user._id });

        // NEW: Calculate engagement metrics using PostEngagement model
        const discussionIds = discussions.map(d => d._id);
        
        // Get total engagement counts across all user's posts
        const [totalAppeared, totalViewed, totalPenetrated, totalSaved, totalShared] = await Promise.all([
            PostEngagement.countDocuments({
                postId: { $in: discussionIds },
                hasAppeared: true
            }),
            PostEngagement.countDocuments({
                postId: { $in: discussionIds },
                hasViewed: true
            }),
            PostEngagement.countDocuments({
                postId: { $in: discussionIds },
                hasPenetrated: true
            }),
            PostEngagement.countDocuments({
                postId: { $in: discussionIds },
                hasSaved: true
            }),
            PostEngagement.countDocuments({
                postId: { $in: discussionIds },
                hasShared: true
            })
        ]);

        // Get comments count
        const commentsCount = await Comment.countDocuments({
            postId: { $in: discussionIds }
        });

        // Calculate community links from discussions
        const communityLinks = discussions.reduce((sum, post) => {
            return sum + (post.communityLinks?.length || 0);
        }, 0);

        // NEW: Calculate engagement rate using appeared instead of views
        // Engagement = (penetrated + saved + shared + comments + community links) / appeared
        let engagementRate = 0;
        if (totalAppeared > 0) {
            const totalEngagements = totalPenetrated + totalSaved + totalShared + commentsCount + communityLinks;
            engagementRate = (totalEngagements / totalAppeared) * 100;
        }

        // Format engagement rate to 2 decimal places
        engagementRate = Math.round(engagementRate * 100) / 100;

        // NEW: Get top posts by appeared count instead of views
        const postsWithEngagement = await Promise.all(
            discussions.map(async (post) => {
                const [appeared, viewed, penetrated, saved, shared] = await Promise.all([
                    PostEngagement.countDocuments({
                        postId: post._id,
                        hasAppeared: true
                    }),
                    PostEngagement.countDocuments({
                        postId: post._id,
                        hasViewed: true
                    }),
                    PostEngagement.countDocuments({
                        postId: post._id,
                        hasPenetrated: true
                    }),
                    PostEngagement.countDocuments({
                        postId: post._id,
                        hasSaved: true
                    }),
                    PostEngagement.countDocuments({
                        postId: post._id,
                        hasShared: true
                    })
                ]);

                return {
                    id: post._id,
                    title: post.title,
                    appeared: appeared,
                    viewed: viewed,
                    penetrated: penetrated,
                    saved: saved,
                    shared: shared,
                    type: 'discussion'
                };
            })
        );

        // Get top community posts (keeping existing logic but adding appeared tracking if needed)
        const topCommunityPosts = await CommunityPost.find({ userId: user._id })
            .sort({ views: -1 })
            .limit(5)
            .select('_id title views');

        // Combine and sort to get top 5 overall by appeared count
        const communityPostsFormatted = topCommunityPosts.map(post => ({
            id: post._id,
            title: post.title,
            appeared: post.views || 0, // Use views as fallback for community posts
            viewed: 0,
            penetrated: 0,
            saved: 0,
            shared: 0,
            type: 'community'
        }));

        const allTopPosts = [...postsWithEngagement, ...communityPostsFormatted]
            .sort((a, b) => b.appeared - a.appeared)
            .slice(0, 5)
            .map(post => ({
                id: post.id,
                title: post.title,
                appeared: post.appeared,
                viewed: post.viewed,
                penetrated: post.penetrated,
                saved: post.saved,
                shared: post.shared,
                type: post.type
            }));

        // NEW: Return updated metrics with appeared tracking
        return NextResponse.json({
            totalPosts: discussionsCount + communityPostsCount,
            discussions: {
                total: discussionsCount,
                published: publishedDiscussionsCount,
                draft: draftDiscussionsCount
            },
            communityPosts: communityPostsCount,
            // NEW: Replace views with appeared
            appeared: totalAppeared, // Total unique users who saw content (viewed & scrolled)
            viewed: totalViewed,     // Total users who played videos
            penetrated: totalPenetrated, // Total users who opened discussions
            saved: totalSaved,       // Total users who saved content
            shared: totalShared,     // Total users who shared content
            comments: commentsCount,
            communityLinks: communityLinks,
            engagementRate: engagementRate, // Now calculated based on appeared
            topPosts: allTopPosts,
            // Additional breakdown for detailed analytics
            engagement: {
                appeared: totalAppeared,
                viewed: totalViewed,
                penetrated: totalPenetrated,
                saved: totalSaved,
                shared: totalShared,
                comments: commentsCount,
                communityLinks: communityLinks,
                rate: engagementRate
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Error fetching studio metrics:', error);
        return NextResponse.json(
            { message: 'Internal server error: ' + error.message },
            { status: 500 }
        );
    }
}