// src/app/api/users/me/route.js - Add DELETE method
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Post from '@/models/Post';
import CommunityPost from '@/models/CommunityPost';
import Playlist from '@/models/Playlist'; // Add this import
import UserSettings from '@/models/UserSettings';
import Follow from '@/models/Follow';
import Notification from '@/models/Notification';
import { ObjectId } from 'mongodb';

// Existing GET and PATCH methods would be here...

export async function DELETE(request) {
    try {
        console.log('Account deletion request received');

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

        const userId = user._id;
        const userIdString = userId.toString();

        console.log(`Deleting user account: ${userId}`);

        try {
            // 1. Delete all user's posts
            console.log('Deleting user posts...');
            const posts = await Post.find({ userId });
            const postIds = posts.map(post => post._id);

            if (postIds.length > 0) {
                // Delete posts
                const deletePostsResult = await Post.deleteMany({ userId });
                console.log(`Deleted ${deletePostsResult.deletedCount} posts`);

                // Delete comments on posts
                const deleteCommentsResult = await db.collection('comments').deleteMany({
                    $or: [
                        { postId: { $in: postIds.map(id => new ObjectId(id)) } },
                        { userId: new ObjectId(userId) }
                    ]
                });
                console.log(`Deleted ${deleteCommentsResult.deletedCount} comments`);
            } else {
                console.log('No posts to delete');
            }

            // 2. Delete all user's community posts
            console.log('Deleting user community posts...');
            const deleteCommunityPostsResult = await CommunityPost.deleteMany({ userId });
            console.log(`Deleted ${deleteCommunityPostsResult.deletedCount} community posts`);

            // 3. Delete user settings
            console.log('Deleting user settings...');
            await UserSettings.deleteOne({ userId });

            // 4. Delete follow relationships
            console.log('Deleting follow relationships...');
            await Follow.deleteMany({
                $or: [
                    { follower: userId },
                    { following: userId }
                ]
            });

            // 5. Delete notifications
            console.log('Deleting notifications...');
            await Notification.deleteMany({
                $or: [
                    { userId },
                    { sender: userId }
                ]
            });

            // 6. Delete viewing history (both implementations)
            // Legacy implementation (RecentlyViewed model)
            console.log('Deleting user viewing history (legacy)...');
            await db.collection('recentlyviewed').deleteMany({ userId: userIdString });

            // New implementation (user_history collection)
            console.log('Deleting user viewing history (new)...');
            await db.collection('user_history').deleteOne({ userId: userIdString });

            // 7. Delete playlists
            console.log('Deleting user playlists...');
            await Playlist.deleteMany({ userId });

            // 8. Remove user from other users' playlists (references)
            // This would be complex, so we might just leave these references

            // 9. Remove likes and other engagements
            console.log('Deleting user likes and engagements...');
            await db.collection('likes').deleteMany({ userId: new ObjectId(userId) });

            // 10. Clean up votes on posts
            console.log('Cleaning up votes...');
            // This would require updating vote counts in posts where this user voted
            // For simplicity we might skip this in the initial implementation

            // 11. Finally, delete the user account
            console.log('Deleting user account...');
            await User.deleteOne({ _id: userId });

            console.log('Account deletion complete');

            return NextResponse.json({
                message: 'Account deleted successfully'
            }, { status: 200 });

        } catch (error) {
            console.error('Error during account deletion:', error);
            return NextResponse.json({
                message: 'Failed to delete account: ' + error.message
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Account deletion error:', error);
        return NextResponse.json(
            { message: 'Internal server error: ' + error.message },
            { status: 500 }
        );
    }
}