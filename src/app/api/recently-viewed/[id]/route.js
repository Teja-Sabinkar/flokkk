// src/app/api/recently-viewed/[id]/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import RecentlyViewed from '@/models/RecentlyViewed';

export async function DELETE(request, { params }) {
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
    
    // Get post ID from path params
    const { id } = params;
    
    // Delete the specific recently viewed item
    const result = await RecentlyViewed.findOneAndDelete({ 
      userId: decoded.id,
      postId: id
    });
    
    if (!result) {
      return NextResponse.json(
        { message: 'Item not found in history' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { message: 'Item removed from history' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Remove history item error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}