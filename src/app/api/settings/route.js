// src/app/api/settings/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import UserSettings from '@/models/UserSettings';

export async function GET(request) {
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
    
    // Find or create user settings
    let userSettings = await UserSettings.findOne({ userId: user._id });
    
    // If no settings exist yet, create default settings
    if (!userSettings) {
      userSettings = await UserSettings.create({
        userId: user._id,
        // Default settings will be applied from the schema
      });
    }
    
    return NextResponse.json({
      settings: userSettings,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Fetch settings error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}


export async function PATCH(request) {
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
    
    // Update specific settings sections
    if (updateData.privacySettings) {
      userSettings.privacySettings = {
        ...userSettings.privacySettings,
        ...updateData.privacySettings
      };
    }
    
    if (updateData.contentSettings) {
      userSettings.contentSettings = {
        ...userSettings.contentSettings,
        ...updateData.contentSettings
      };
    }
    
    if (updateData.notificationSettings) {
      userSettings.notificationSettings = {
        ...userSettings.notificationSettings,
        ...updateData.notificationSettings
      };
    }
    
    if (updateData.displaySettings) {
      userSettings.displaySettings = {
        ...userSettings.displaySettings,
        ...updateData.displaySettings
      };
    }
    
    // Save updated settings
    await userSettings.save();
    
    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: userSettings
    }, { status: 200 });
    
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}