// src/app/api/notifications/[id]/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import Notification from '@/models/Notification';

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const { read } = await request.json();
    
    console.log(`PATCH /api/notifications/${id}`, { read });
    
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
    
    // Find and update the notification
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: decoded.id }, // Ensure notification belongs to user
      { $set: { read: read } },
      { new: true }
    );
    
    if (!notification) {
      console.log('Notification not found:', id);
      return NextResponse.json(
        { message: 'Notification not found' },
        { status: 404 }
      );
    }
    
    console.log('Notification updated:', notification._id);
    
    return NextResponse.json(notification, { status: 200 });
    
  } catch (error) {
    console.error('Update notification error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    console.log(`DELETE /api/notifications/${id}`);
    
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
    
    // Find and delete the notification
    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId: decoded.id // Ensure notification belongs to user
    });
    
    if (!notification) {
      console.log('Notification not found:', id);
      return NextResponse.json(
        { message: 'Notification not found' },
        { status: 404 }
      );
    }
    
    console.log('Notification deleted:', id);
    
    return NextResponse.json(
      { message: 'Notification deleted successfully' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}