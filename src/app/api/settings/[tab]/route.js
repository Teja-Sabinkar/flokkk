// src/app/api/settings/[tab]/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import UserSettings from '@/models/UserSettings';

export async function GET(request, { params }) {
  try {
    // Get tab name from route params
    const { tab } = params;

    // Validate tab name
    const validTabs = ['privacy', 'content', 'notification', 'display', 'account'];
    if (!validTabs.includes(tab)) {
      return NextResponse.json(
        { message: 'Invalid settings tab' },
        { status: 400 }
      );
    }

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

    // Find or create user settings
    let userSettings = await UserSettings.findOne({ userId: user._id });

    // If no settings exist yet, create default settings
    if (!userSettings) {
      userSettings = await UserSettings.create({
        userId: user._id,
        // Default settings will be applied from the schema
      });
    }

    // Return specific settings section based on tab
    let responseData = {};

    if (tab === 'privacy') {
      responseData = {
        privacySettings: userSettings.privacySettings
      };
    } else if (tab === 'content') {
      responseData = {
        contentSettings: userSettings.contentSettings
      };
    } else if (tab === 'notification') {
      responseData = {
        notificationSettings: userSettings.notificationSettings
      };
    } else if (tab === 'display') {
      responseData = {
        displaySettings: userSettings.displaySettings
      };
    } else if (tab === 'account') {
      responseData = {
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          isEmailVerified: user.isEmailVerified
        }
      };
    }

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('Fetch settings tab error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    // Get tab name from route params
    const { tab } = params;

    // Validate tab name
    const validTabs = ['privacy', 'content', 'notification', 'display'];
    if (!validTabs.includes(tab)) {
      return NextResponse.json(
        { message: 'Invalid settings tab' },
        { status: 400 }
      );
    }

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

    // Parse request body
    const updateData = await request.json();

    // Validate update data
    if (!updateData || Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: 'No update data provided' },
        { status: 400 }
      );
    }

    // Find user settings
    let userSettings = await UserSettings.findOne({ userId: user._id });

    // If no settings exist yet, create default settings
    if (!userSettings) {
      userSettings = new UserSettings({
        userId: user._id,
        // Default settings will be applied from the schema
      });
    }

    // Update specific settings section based on tab
    if (tab === 'privacy' && updateData.privacySettings) {
      userSettings.privacySettings = {
        ...userSettings.privacySettings,
        ...updateData.privacySettings
      };
    } else if (tab === 'content' && updateData.contentSettings) {
      userSettings.contentSettings = {
        ...userSettings.contentSettings,
        ...updateData.contentSettings
      };
    } else if (tab === 'notification' && updateData.notificationSettings) {
      // Special handling for post activity notifications timestamps
      if ('postComments' in updateData.notificationSettings) {
        const isEnabling = updateData.notificationSettings.postComments === true;
        const isDisabling = updateData.notificationSettings.postComments === false;

        // Log the action for debugging
        console.log(`Post activity notifications: ${isEnabling ? 'enabling' : isDisabling ? 'disabling' : 'unchanged'}`);

        if (isDisabling) {
          // When turning OFF, set the disabled timestamp
          updateData.notificationSettings.postActivityDisabledAt = new Date();
          // Clear the re-enabled timestamp
          updateData.notificationSettings.postActivityReenabledAt = null;

          console.log('Setting postActivityDisabledAt:', updateData.notificationSettings.postActivityDisabledAt);
        } else if (isEnabling) {
          // When turning ON, set the re-enabled timestamp
          updateData.notificationSettings.postActivityReenabledAt = new Date();
          // Keep the disabled timestamp for filtering

          console.log('Setting postActivityReenabledAt:', updateData.notificationSettings.postActivityReenabledAt);
        }
      }

      // Special handling for new followers notifications timestamps
      if ('newFollowers' in updateData.notificationSettings) {
        const isEnabling = updateData.notificationSettings.newFollowers === true;
        const isDisabling = updateData.notificationSettings.newFollowers === false;

        // Log the action for debugging
        console.log(`New followers notifications: ${isEnabling ? 'enabling' : isDisabling ? 'disabling' : 'unchanged'}`);

        if (isDisabling) {
          // When turning OFF, set the disabled timestamp
          updateData.notificationSettings.newFollowersDisabledAt = new Date();
          // Clear the re-enabled timestamp
          updateData.notificationSettings.newFollowersReenabledAt = null;

          console.log('Setting newFollowersDisabledAt:', updateData.notificationSettings.newFollowersDisabledAt);
        } else if (isEnabling) {
          // When turning ON, set the re-enabled timestamp
          updateData.notificationSettings.newFollowersReenabledAt = new Date();
          // Keep the disabled timestamp for filtering

          console.log('Setting newFollowersReenabledAt:', updateData.notificationSettings.newFollowersReenabledAt);
        }
      }

      // Apply all notification settings updates
      userSettings.notificationSettings = {
        ...userSettings.notificationSettings,
        ...updateData.notificationSettings
      };
    } else if (tab === 'display' && updateData.displaySettings) {
      userSettings.displaySettings = {
        ...userSettings.displaySettings,
        ...updateData.displaySettings
      };
    } else {
      return NextResponse.json(
        { message: 'Invalid update data for selected tab' },
        { status: 400 }
      );
    }

    // Save updated settings
    await userSettings.save();

    // Return updated section
    const responseData = {};
    responseData[tab + 'Settings'] = userSettings[tab + 'Settings'];

    return NextResponse.json({
      message: 'Settings updated successfully',
      ...responseData
    }, { status: 200 });

  } catch (error) {
    console.error('Update settings tab error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}