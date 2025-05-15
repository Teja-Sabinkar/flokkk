// src/app/api/search/route.js
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import HiddenPost from '@/models/HiddenPost'; // Import HiddenPost model

export async function GET(request) {
  try {
    const url = new URL(request.url);
    let query = url.searchParams.get('q') || '';
    // Get type parameter (profile, post, or all)
    let type = url.searchParams.get('type') || 'all';

    console.log('Search query:', query, 'Type:', type);

    // Special case: if searching for "profile", automatically set type to profile
    if (query.toLowerCase() === 'profile') {
      type = 'profile';
    }

    if (!query || query.trim() === '') {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Connect to the database
    const { db } = await connectToDatabase();

    // Get current user with improved token handling
    let currentUserId = null;
    let currentUsername = null;

    // Get authentication token with better extraction
    const authHeader = request.headers.get('authorization');
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Try to get from cookie
      const cookies = request.headers.get('cookie');
      if (cookies) {
        const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('token='));
        if (tokenCookie) {
          token = tokenCookie.split('=')[1];
        }
      }
    }

    // If we have a token, try to get user info
    if (token) {
      try {
        // Try JWT verification first
        try {
          const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
          if (decoded && decoded.id) {
            currentUserId = decoded.id;
            // Try to get user from DB to get username
            const tokenUser = await db.collection('users').findOne({ _id: new ObjectId(decoded.id) });
            if (tokenUser) {
              currentUsername = tokenUser.username;
            }
          }
        } catch (jwtError) {
          console.log('JWT verification failed, trying token lookup');

          // If JWT fails, try direct lookup
          const user = await db.collection('users').findOne({
            $or: [
              { 'tokens.token': token },
              { token: token }
            ]
          });

          if (user) {
            currentUserId = user._id;
            currentUsername = user.username;
          }
        }
      } catch (e) {
        console.log('Auth verification error:', e);
      }
    }

    // Log current user identification for debugging
    console.log('Current user identified as:', { currentUserId, currentUsername });

    let results = [];

    // Search for profiles if type is 'profile' or 'all'
    if (type === 'profile' || type === 'all') {
      // Get user IDs that have opted out of search visibility
      const userSettings = await db.collection('usersettings').find(
        { 'privacySettings.showInSearch': false }
      ).toArray();

      const hiddenUserIds = userSettings.map(setting => {
        if (!setting.userId) return null;
        return typeof setting.userId === 'string' ?
          new ObjectId(setting.userId) : setting.userId;
      }).filter(id => id !== null);

      console.log(`Found ${hiddenUserIds.length} users who opted out of search visibility`);

      // Build the profile search query
      const profileQuery = {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { username: { $regex: query, $options: 'i' } },
          { bio: { $regex: query, $options: 'i' } }
        ]
      };

      // Initialize $and array if needed
      profileQuery.$and = [];

      // Add filter to exclude users who opted out of search visibility
      if (hiddenUserIds.length > 0) {
        profileQuery.$and.push({ _id: { $nin: hiddenUserIds } });
      }

      // Add filter to exclude current user with multiple checks
      if (currentUserId) {
        try {
          const idToCompare = typeof currentUserId === 'string' ?
            new ObjectId(currentUserId) : currentUserId;

          profileQuery.$and.push({
            $and: [
              { _id: { $ne: idToCompare } },
              { _id: { $ne: currentUserId.toString() } }
            ]
          });
        } catch (e) {
          // If ObjectId conversion fails, just use string comparison
          profileQuery.$and.push({ _id: { $ne: currentUserId.toString() } });
        }
      }

      if (currentUsername) {
        profileQuery.$and.push({ username: { $ne: currentUsername } });
      }

      // Remove $and if it's empty
      if (profileQuery.$and.length === 0) {
        delete profileQuery.$and;
      }

      const profileResults = await db.collection('users').find(profileQuery).limit(10).toArray();

      console.log(`Found ${profileResults.length} matching profiles`);

      // Get follower counts for each profile
      const profilesWithStats = await Promise.all(profileResults.map(async (profile) => {
        // Count followers
        const followers = await db.collection('follows').countDocuments({
          following: profile._id
        });

        // Count discussions
        const discussionCount = await db.collection('posts').countDocuments({
          userId: profile._id
        });

        // Get the last 8 digits of the ID for the username display
        const profileId = profile._id.toString();
        const lastEightDigits = profileId.slice(-8);

        return {
          _id: profileId,
          name: profile.name || 'User',
          username: profile.username || '',
          usertag: profile.username ? `@${profile.username}` : `@${lastEightDigits}`,
          // Map profilePicture to what the UI component expects
          profilePicture: profile.profilePicture || null,
          avatar: profile.profilePicture || null, // Include both for backward compatibility
          bio: profile.bio || '',
          followers,
          discussionCount,
          type: 'profile'
        };
      }));

      results = [...results, ...profilesWithStats];
    }

    // Search for posts if type is 'post' or 'all'
    if (type === 'post' || type === 'all') {
      // Build the base query for posts
      let postsQuery = {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { content: { $regex: query, $options: 'i' } },
          { hashtags: { $regex: query, $options: 'i' } }
        ]
      };

      // If user is authenticated, filter out hidden posts
      if (currentUserId) {
        try {
          // Get hidden posts for the current user
          const hiddenPosts = await db.collection('hiddenposts').find({
            userId: new ObjectId(currentUserId)
          }).toArray();

          // Extract post IDs and convert to ObjectId if needed
          const hiddenPostIds = hiddenPosts.map(hp =>
            typeof hp.postId === 'string' ? new ObjectId(hp.postId) : hp.postId
          );

          console.log(`Found ${hiddenPostIds.length} hidden posts for user ${currentUserId}`);

          // Add the filter to exclude hidden posts
          if (hiddenPostIds.length > 0) {
            if (!postsQuery.$and) postsQuery.$and = [];
            postsQuery.$and.push({ _id: { $nin: hiddenPostIds } });
          }
        } catch (error) {
          console.error('Error filtering hidden posts:', error);
          // Continue with unfiltered results if there's an error
        }
      }

      const postsResults = await db.collection('posts').find(postsQuery).limit(10).toArray();

      console.log(`Found ${postsResults.length} matching posts`);

      // Get user profile pictures for all posts
      const userIds = [...new Set(postsResults.map(post => post.userId))];
      const users = await db.collection('users').find({
        _id: { $in: userIds.map(id => new ObjectId(id)) }
      }).toArray();

      // Create a map of userId to profilePicture
      const userProfilePictures = {};
      users.forEach(user => {
        userProfilePictures[user._id.toString()] = user.profilePicture || null;
      });

      // Map posts to the right format with profile pictures
      const mappedPosts = postsResults.map(post => ({
        _id: post._id.toString(),
        title: post.title || 'Untitled Post',
        content: post.content ? post.content.substring(0, 100) : '',
        image: post.image,
        username: post.username,
        userId: post.userId ? post.userId.toString() : null,
        profilePicture: userProfilePictures[post.userId?.toString()] || null,
        type: 'post',
        discussions: post.discussions,
        createdAt: post.createdAt
      }));

      results = [...results, ...mappedPosts];
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to perform search',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}