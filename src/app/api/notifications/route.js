// src/app/api/notifications/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import Notification from '@/models/Notification';
import UserSettings from '@/models/UserSettings'; 

export async function GET(request) {
  try {
    // Get URL parameters for pagination and filtering
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const type = url.searchParams.get('type'); // 'all', 'unread', 'comments', 'likes', 'posts', 'contributions'
    const search = url.searchParams.get('search') || '';

    console.log('GET /api/notifications', { page, limit, type, search });

    // Calculate pagination
    const skip = (page - 1) * limit;

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
      console.error('JWT verification error:', error);
      return NextResponse.json(
        { message: 'Invalid or expired token', error: error.message },
        { status: 401 }
      );
    }

    // Connect to database with enhanced error handling
    try {
      await dbConnect();
      console.log('Connected to MongoDB for notifications');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { 
          message: 'Database connection error', 
          error: dbError.message 
        },
        { status: 500 }
      );
    }
    
    // Get user settings
    let userSettings;
    try {
      userSettings = await UserSettings.findOne({ userId: decoded.id });
    } catch (settingsError) {
      console.error('Error fetching user settings:', settingsError);
      // Continue without settings rather than failing entirely
    }
    
    // Check notification settings
    const communityNotificationsEnabled = userSettings?.notificationSettings?.communityNotifications !== false;
    const postActivityEnabled = userSettings?.notificationSettings?.postComments !== false;
    const newFollowersEnabled = userSettings?.notificationSettings?.newFollowers !== false;
    
    // Get timestamps
    const communityDisabledAt = userSettings?.notificationSettings?.communityNotificationsDisabledAt;
    const communityReenabledAt = userSettings?.notificationSettings?.communityNotificationsReenabledAt;
    const postActivityDisabledAt = userSettings?.notificationSettings?.postActivityDisabledAt;
    const postActivityReenabledAt = userSettings?.notificationSettings?.postActivityReenabledAt;
    const newFollowersDisabledAt = userSettings?.notificationSettings?.newFollowersDisabledAt;
    const newFollowersReenabledAt = userSettings?.notificationSettings?.newFollowersReenabledAt;
    
    console.log('Community notifications enabled:', communityNotificationsEnabled);
    console.log('Post activity enabled:', postActivityEnabled);
    console.log('New followers enabled:', newFollowersEnabled);
    console.log('Community disabled at:', communityDisabledAt);
    console.log('Community re-enabled at:', communityReenabledAt);
    console.log('Post activity disabled at:', postActivityDisabledAt);
    console.log('Post activity re-enabled at:', postActivityReenabledAt);
    console.log('New followers disabled at:', newFollowersDisabledAt);
    console.log('New followers re-enabled at:', newFollowersReenabledAt);

    // Build base query
    const query = {
      userId: decoded.id // Filter by the current user
    };
    
    // Create a list of conditions for the main $and clause
    const andConditions = [];
    
    // Filter out community notifications if disabled
    if (communityDisabledAt) {
      // (existing community notifications filtering code)
    }
    
    // Filter out post activity notifications if activity setting is OFF or has been toggled
    if (!postActivityEnabled || postActivityDisabledAt) {
      // (existing post activity filtering code)
    }
    
    // Filter out new follower notifications if setting is OFF or has been toggled
    if (!newFollowersEnabled || newFollowersDisabledAt) {
      console.log('Applying new followers filtering logic');
      
      // New follower notification patterns to match
      const newFollowerPatterns = [
        /has started following you/i,
        /is now following you/i,
        /has begun to follow you/i,
        /started to follow you/i,
        /has followed you/i
      ];
      
      // Additionally, use the type field to identify follow notifications
      const typeCondition = { type: 'follow' };
      
      // Time filter condition for new follower notifications
      let newFollowerTimeFilter;
      
      if (newFollowersDisabledAt) {
        if (newFollowersReenabledAt) {
          // If setting was toggled OFF and then back ON
          newFollowerTimeFilter = {
            $or: [
              { createdAt: { $lt: newFollowersDisabledAt } },  // Before turning OFF
              { createdAt: { $gt: newFollowersReenabledAt } }  // After turning back ON
            ]
          };
          console.log('New followers filter: Using before-disabled OR after-reenabled filter');
        } else if (!newFollowersEnabled) {
          // If currently OFF
          newFollowerTimeFilter = { createdAt: { $lt: newFollowersDisabledAt } };
          console.log('New followers filter: Using before-disabled filter only');
        }
      } else if (!newFollowersEnabled) {
        // If setting is disabled but no timestamp (legacy data)
        // In this case, hide all new follower notifications
        newFollowerTimeFilter = { createdAt: { $lt: new Date(0) } }; // Filter out everything
        console.log('New followers filter: Setting is OFF but no timestamp, hiding all');
      }
      
      // Add to AND conditions if we have a time filter
      if (newFollowerTimeFilter) {
        andConditions.push({
          $or: [
            // Either it's NOT a new follower notification (based on content)
            {
              $and: [
                // Not a follow notification by type
                { $or: [{ type: { $ne: 'follow' } }, { type: null }] },
                // And not containing follower content patterns
                ...newFollowerPatterns.map(pattern => ({
                  content: { $not: pattern }
                }))
              ]
            },
            // OR it's a new follower notification that meets the time conditions
            {
              $and: [
                // It IS a new follower notification (either by type or content)
                { 
                  $or: [
                    // By type
                    { type: 'follow' },
                    // Or by content pattern
                    ...newFollowerPatterns.map(pattern => ({
                      content: { $regex: pattern }
                    }))
                  ]
                },
                // AND it meets the time filter
                newFollowerTimeFilter
              ]
            }
          ]
        });
      }
    }
    
    // Apply $and conditions if any exist
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // Apply type filter if provided
    if (type && type !== 'all') {
      const typeCondition = {};
      
      if (type === 'unread') {
        typeCondition.read = false;
      } else if (type === 'posts') {
        // Include both 'new_post' and 'follow' types in the posts tab
        // Note: We still need to respect the new followers setting for 'follow' type
        typeCondition.type = { $in: ['new_post', 'follow'] };
        
        // If we're filtering by posts and new followers is off, we need special handling
        if (!newFollowersEnabled && type === 'posts') {
          console.log('Special handling for posts tab with new followers off');
          // If new followers is off, then filter out follow notifications from posts tab
          // This is handled by the above filtering logic
        }
      } else if (type === 'comments') {
        typeCondition.type = 'reply';
      } else if (type === 'likes') {
        typeCondition.type = 'like';
      } else if (type === 'contributions') {
        typeCondition.type = 'contribution';
      } else {
        typeCondition.type = type;
      }
      
      // Add type condition to query
      if (query.$and) {
        query.$and.push(typeCondition);
      } else {
        Object.assign(query, typeCondition);
      }
    }

    // Apply search if provided
    if (search) {
      const searchCondition = {
        $or: [
          { content: { $regex: search, $options: 'i' } },
          { senderUsername: { $regex: search, $options: 'i' } }
        ]
      };
      
      // Add search condition to query
      if (query.$and) {
        query.$and.push(searchCondition);
      } else {
        query.$or = searchCondition.$or;
      }
    }

    console.log('Notification query:', JSON.stringify(query, null, 2));

    // Fetch notifications with pagination and error handling
    let notifications = [];
    try {
      notifications = await Notification.find(query)
        .sort({ createdAt: -1 }) // Most recent first
        .skip(skip)
        .limit(limit)
        .populate('sender', 'username name profilePicture')
        .lean(); // Use lean for better performance
      
      console.log(`Found ${notifications.length} notifications`);
      
      // Debug: Print out the first few notifications to see what's included
      if (notifications.length > 0) {
        console.log('Sample notifications:');
        notifications.slice(0, 3).forEach((notification, index) => {
          console.log(`[${index}] ${notification.content.substring(0, 100)}...`);
        });
      }
    } catch (queryError) {
      console.error('Error querying notifications:', queryError);
      return NextResponse.json(
        { 
          message: 'Error fetching notifications', 
          error: queryError.message,
          query: JSON.stringify(query)
        },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let total = 0;
    try {
      total = await Notification.countDocuments(query);
    } catch (countError) {
      console.error('Error counting notifications:', countError);
      // Continue with total=0 rather than failing completely
    }

    // Calculate counts based on the same filters
    // (Simplified here, but should follow the same logic as the main query)
    const countQuery = { userId: decoded.id };
    if (query.$and) {
      countQuery.$and = query.$and;
    }
    
    const unreadCountQuery = { ...countQuery, read: false };
    
    // Calculate counts for different notification types with error handling
    let counts = {
      all: 0,
      unread: 0,
      comments: 0,
      likes: 0,
      posts: 0,
      contributions: 0,
      commentsUnread: 0,
      likesUnread: 0,
      postsUnread: 0,
      contributionsUnread: 0
    };
    
    try {
      counts = {
        all: await Notification.countDocuments(countQuery),
        unread: await Notification.countDocuments(unreadCountQuery),
        comments: await Notification.countDocuments({ 
          ...countQuery,
          type: 'reply' 
        }),
        likes: await Notification.countDocuments({ 
          ...countQuery,
          type: 'like' 
        }),
        posts: await Notification.countDocuments({ 
          ...countQuery, 
          type: { $in: ['new_post', 'follow'] } 
        }),
        contributions: await Notification.countDocuments({ 
          ...countQuery,
          type: 'contribution' 
        }),
        // Update unread counts similarly
        commentsUnread: await Notification.countDocuments({ 
          ...unreadCountQuery,
          type: 'reply'
        }),
        likesUnread: await Notification.countDocuments({ 
          ...unreadCountQuery,
          type: 'like'
        }),
        postsUnread: await Notification.countDocuments({ 
          ...unreadCountQuery, 
          type: { $in: ['new_post', 'follow'] }
        }),
        contributionsUnread: await Notification.countDocuments({ 
          ...unreadCountQuery,
          type: 'contribution'
        })
      };
    } catch (countsError) {
      console.error('Error calculating notification counts:', countsError);
      // Continue with default counts rather than failing completely
    }

    console.log('Notification counts:', counts);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      counts
    }, { status: 200 });

  } catch (error) {
    console.error('Fetch notifications error:', error);
    // Return more detailed error information
    return NextResponse.json(
      { 
        message: 'Internal server error', 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}