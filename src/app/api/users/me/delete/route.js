// src/app/api/users/me/delete/route.js

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Post from '@/models/Post';
import CommunityPost from '@/models/CommunityPost';
import Playlist from '@/models/Playlist';
import Follow from '@/models/Follow';
import UserSettings from '@/models/UserSettings';
import Notification from '@/models/Notification';
import RecentlyViewed from '@/models/RecentlyViewed';
import Report from '@/models/Report';
import LinkContribution from '@/models/LinkContribution';
import HiddenPost from '@/models/HiddenPost';
import Forum from '@/models/Forum';

export async function DELETE(request) {
    try {
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

        // Find user by id from token
        const user = await User.findById(decoded.id);

        if (!user) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        // Create a transaction or series of operations to delete all user data
        // This is a critical operation, so we should log key information
        console.log(`Account deletion initiated for user: ${user.username || user.name} (${user._id})`);

        // Start deleting user-related data
        try {
            // 1. Delete all user's posts
            const postsResult = await Post.deleteMany({ userId: user._id });
            console.log(`Deleted ${postsResult.deletedCount} posts`);

            // 2. Delete all user's community posts
            const communityPostsResult = await CommunityPost.deleteMany({ userId: user._id });
            console.log(`Deleted ${communityPostsResult.deletedCount} community posts`);

            // 3. Delete all user's playlists
            const playlistsResult = await Playlist.deleteMany({ userId: user._id });
            console.log(`Deleted ${playlistsResult.deletedCount} playlists`);

            // 4. Delete all user's follow relationships (both following and followers)
            const followingResult = await Follow.deleteMany({ follower: user._id });
            const followersResult = await Follow.deleteMany({ following: user._id });
            console.log(`Deleted ${followingResult.deletedCount} following relationships and ${followersResult.deletedCount} follower relationships`);

            // 5. Delete user settings
            const userSettingsResult = await UserSettings.deleteOne({ userId: user._id });
            console.log(`Deleted user settings: ${userSettingsResult.deletedCount}`);

            // 6. Delete notifications related to the user (sent by or to the user)
            const sentNotificationsResult = await Notification.deleteMany({ sender: user._id });
            const receivedNotificationsResult = await Notification.deleteMany({ userId: user._id });
            console.log(`Deleted ${sentNotificationsResult.deletedCount} sent notifications and ${receivedNotificationsResult.deletedCount} received notifications`);

            // 7. Delete user's recently viewed history
            const recentlyViewedResult = await RecentlyViewed.deleteMany({ userId: user._id });
            console.log(`Deleted ${recentlyViewedResult.deletedCount} recently viewed items`);

            // 8. Delete user's reports
            const reportsResult = await Report.deleteMany({ userId: user._id });
            console.log(`Deleted ${reportsResult.deletedCount} reports`);

            // 9. Delete user's link contributions
            const linkContributionsResult = await LinkContribution.deleteMany({ userId: user._id });
            console.log(`Deleted ${linkContributionsResult.deletedCount} link contributions`);

            // 10. Delete user's hidden posts
            const hiddenPostsResult = await HiddenPost.deleteMany({ userId: user._id });
            console.log(`Deleted ${hiddenPostsResult.deletedCount} hidden posts`);

            // 11. Delete user's forums
            const forumsResult = await Forum.deleteMany({ userId: user._id });
            console.log(`Deleted ${forumsResult.deletedCount} forums`);

            // 12. Finally, delete the user account itself
            const userDeletionResult = await User.deleteOne({ _id: user._id });
            console.log(`User account deleted: ${userDeletionResult.deletedCount === 1 ? 'success' : 'failed'}`);

            if (userDeletionResult.deletedCount !== 1) {
                throw new Error('Failed to delete user account');
            }

            // Account deletion successful
            return NextResponse.json({
                message: 'Account deleted successfully',
                success: true
            }, { status: 200 });

        } catch (deleteError) {
            console.error('Error during account deletion:', deleteError);
            return NextResponse.json(
                { message: 'Failed to delete account. Please try again later.' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Account deletion request error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}