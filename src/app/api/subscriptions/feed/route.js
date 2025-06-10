// src/app/api/subscriptions/feed/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Follow from '@/models/Follow';
import Post from '@/models/Post';
import HiddenPost from '@/models/HiddenPost'; // Added import for HiddenPost model

export async function GET(request) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Validate pagination parameters
    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1 || limit > 50) {
      return NextResponse.json(
        { message: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Get auth token from header
    const headersList = headers();
    const authHeader = headersList.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT token
    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);

      // Connect to database
      await dbConnect();

      // Find current user
      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return NextResponse.json(
          { message: 'User not found' },
          { status: 404 }
        );
      }

      console.log(`Finding subscriptions for user: ${currentUser.name || currentUser.username || currentUser._id}`);

      // Find all users that the current user follows
      const followRelations = await Follow.find({ follower: currentUser._id });
      const followingIds = followRelations.map(relation => relation.following);

      console.log(`User follows ${followingIds.length} accounts`);

      // If the user doesn't follow anyone, return empty array
      if (followingIds.length === 0) {
        return NextResponse.json({
          posts: [],
          pagination: {
            page,
            limit,
            totalPosts: 0,
            totalPages: 0
          }
        }, { status: 200 });
      }

      // Get hidden posts for the current user
      const hiddenPosts = await HiddenPost.find({ userId: currentUser._id });
      const hiddenPostIds = hiddenPosts.map(hp => hp.postId);

      console.log(`Found ${hiddenPostIds.length} hidden posts for user ${currentUser._id}`);

      // Create base query for posts from followed users
      let postsQuery = { userId: { $in: followingIds } };

      // Add filter to exclude hidden posts if there are any
      if (hiddenPostIds.length > 0) {
        postsQuery._id = { $nin: hiddenPostIds };
      }

      // Count total posts from followed users for pagination (excluding hidden posts)
      const totalPosts = await Post.countDocuments(postsQuery);
      const totalPages = Math.ceil(totalPosts / limit);

      console.log(`Found ${totalPosts} posts from followed users (excluding hidden posts)`);

      // Find posts with the updated query that excludes hidden posts
      const posts = await Post.find(postsQuery)
        .sort({ createdAt: -1 }) // Sort by most recent first
        .skip(skip)
        .limit(limit)
        .lean(); // Use lean() for better performance

      console.log(`Fetched ${posts.length} posts for page ${page}`);

      // Get user info for each post
      const postUserIds = [...new Set(posts.map(post => post.userId.toString()))];
      const users = await User.find({ _id: { $in: postUserIds } });

      // Create a map of userId to user info for efficient lookup
      const userMap = {};
      users.forEach(user => {
        userMap[user._id.toString()] = {
          username: user.username || user.name,
          name: user.name,
          profilePicture: user.profilePicture || user.avatar
        };
      });

      // Format posts with user info
      const formattedPosts = posts.map(post => {
        const userId = post.userId.toString();
        const userInfo = userMap[userId] || {
          username: 'Unknown',
          name: 'Unknown User',
          profilePicture: '/profile-placeholder.jpg'
        };

        return {
          id: post._id,
          title: post.title,
          content: post.content,
          image: post.image,
          videoUrl: post.videoUrl || null,
          hashtags: post.hashtags,
          discussions: post.discussions,
          shares: post.shares,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          username: userInfo.username,
          name: userInfo.name,
          profilePicture: userInfo.profilePicture,
          userId: userId,
          // Add these two properties to include links data
          creatorLinks: post.creatorLinks || [],
          communityLinks: post.communityLinks || []
        };
      });

      // Return posts with pagination info
      return NextResponse.json({
        posts: formattedPosts,
        pagination: {
          page,
          limit,
          totalPosts,
          totalPages
        }
      }, { status: 200 });

    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Subscription feed error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}