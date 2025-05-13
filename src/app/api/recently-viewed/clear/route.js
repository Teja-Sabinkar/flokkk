import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';

export async function DELETE(request) {
  try {
    console.log('[RECENTLY VIEWED] Clear history API called');
    
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
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
      userId = decoded.id;
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    console.log(`[RECENTLY VIEWED] Clearing history for user: ${userId}`);
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Update the user_history document with an empty array
    const result = await db.collection('user_history').updateOne(
      { userId: userId },
      { $set: { recentlyViewed: [], lastUpdated: new Date() } }
    );
    
    console.log(`[RECENTLY VIEWED] Clear result:`, {
      matched: result.matchedCount,
      modified: result.modifiedCount
    });
    
    return NextResponse.json({
      message: 'History cleared successfully',
      cleared: result.modifiedCount > 0
    }, { status: 200 });
    
  } catch (error) {
    console.error('[RECENTLY VIEWED] Clear history error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}