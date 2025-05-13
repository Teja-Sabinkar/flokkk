// src/app/api/notifications/read-all/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import Notification from '@/models/Notification';

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
    
    // Parse request body to get filter options
    let filter = { userId: decoded.id, read: false };
    let body = {};

    try {
      body = await request.json();
    } catch (e) {
      // If no body or invalid JSON, use default filter
      console.log('No body or invalid JSON in read-all request');
    }
    
    if (body && body.type) {
      // If type is specified, only mark as read notifications of that type
      if (body.type === 'posts' || body.type === 'new_post') {
        filter.type = 'new_post';
      } else if (body.type === 'comments' || body.type === 'reply') {
        filter.type = 'reply';
      } else if (body.type === 'likes' || body.type === 'like') {
        filter.type = 'like';
      } else if (body.type === 'contributions' || body.type === 'contribution') {
        filter.type = 'contribution';
      }
    }
    
    console.log('Mark all read filter:', JSON.stringify(filter, null, 2));
    
    // Mark all user's notifications as read
    const result = await Notification.updateMany(
      filter,
      { $set: { read: true } }
    );
    
    console.log(`Marked ${result.modifiedCount} notifications as read`);
    
    return NextResponse.json({
      message: 'Notifications marked as read',
      count: result.modifiedCount
    }, { status: 200 });
    
  } catch (error) {
    console.error('Mark all read error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}