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
    
    // Get user settings
    const userSettings = await UserSettings.findOne({ userId: decoded.id });
    
    // Check notification settings
    const postActivityEnabled = userSettings?.notificationSettings?.postComments !== false;
    const newFollowersEnabled = userSettings?.notificationSettings?.newFollowers !== false;
    
    // Get timestamps
    const postActivityDisabledAt = userSettings?.notificationSettings?.postActivityDisabledAt;
    const postActivityReenabledAt = userSettings?.notificationSettings?.postActivityReenabledAt;
    const newFollowersDisabledAt = userSettings?.notificationSettings?.newFollowersDisabledAt;
    const newFollowersReenabledAt = userSettings?.notificationSettings?.newFollowersReenabledAt;
    
    console.log('Post activity enabled:', postActivityEnabled);
    console.log('New followers enabled:', newFollowersEnabled);
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
    
    // Filter out post activity notifications if activity setting is OFF or has been toggled
    if (!postActivityEnabled || postActivityDisabledAt) {
      console.log('Applying post activity filtering logic');
      
      // When Activity on Post is OFF, hide all notifications except follow notifications
      // This includes posts, comments, votes, contributions, etc.
      
      // Define all types that should be excluded when post activity is off
      const excludedTypes = ['new_post', 'reply', 'like', 'contribution'];
      
      // Time filter condition for post activity notifications
      let postActivityTimeFilter;
      
      if (postActivityDisabledAt) {
        if (postActivityReenabledAt) {
          // If setting was toggled OFF and then back ON
          postActivityTimeFilter = {
            $or: [
              { createdAt: { $lt: postActivityDisabledAt } },  // Before turning OFF
              { createdAt: { $gt: postActivityReenabledAt } }  // After turning back ON
            ]
          };
          console.log('Post activity filter: Using before-disabled OR after-reenabled filter');
        } else if (!postActivityEnabled) {
          // If currently OFF
          postActivityTimeFilter = { createdAt: { $lt: postActivityDisabledAt } };
          console.log('Post activity filter: Using before-disabled filter only');
        }
      } else if (!postActivityEnabled) {
        // If setting is disabled but no timestamp (legacy data)
        // In this case, hide all post activity notifications
        postActivityTimeFilter = { createdAt: { $lt: new Date(0) } }; // Filter out everything
        console.log('Post activity filter: Setting is OFF but no timestamp, hiding all');
      }
      
      // Add to AND conditions if we have a time filter
      if (postActivityTimeFilter) {
        andConditions.push({
          $or: [
            // Either it's a follower notification (we allow these)
            { type: 'follow' },
            // OR it's a post activity notification that meets the time conditions
            {
              $and: [
                // It IS a post activity notification by type
                { type: { $in: excludedTypes } },
                // AND it meets the time filter
                postActivityTimeFilter
              ]
            }
          ]
        });
      }
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
        typeCondition.type = { $in: ['new_post', 'follow'] };
        
        // If we're filtering by posts and either new followers or post activity is off, 
        // handle with special logic
        if ((!newFollowersEnabled || !postActivityEnabled) && type === 'posts') {
          console.log('Special handling for posts tab with notification settings off');
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

    // Fetch notifications with pagination
    const notifications = await Notification.find(query)
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

    // Get total count for pagination
    const total = await Notification.countDocuments(query);

    // Calculate counts based on the same filters
    const countQuery = { userId: decoded.id };
    if (query.$and) {
      countQuery.$and = query.$and;
    }
    
    const unreadCountQuery = { ...countQuery, read: false };
    
    // Calculate counts for different notification types
    const counts = {
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
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}