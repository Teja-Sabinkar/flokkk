import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// POST endpoint to track a view (completely new implementation)
export async function POST(request) {
  try {
    console.log('[HISTORY TRACKER] Track view API called');
    
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
    
    // Parse request body
    const { postId } = await request.json();
    
    if (!postId) {
      return NextResponse.json(
        { message: 'Post ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`[HISTORY TRACKER] Recording view - User: ${userId} Post: ${postId}`);
    
    // Connect to database
    const { db } = await connectToDatabase();
    
    // Check if post exists
    let post = null;
    try {
      post = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
      if (!post) {
        return NextResponse.json(
          { message: 'Post not found' },
          { status: 404 }
        );
      }
    } catch (e) {
      console.error('[HISTORY TRACKER] Error finding post:', e);
      return NextResponse.json(
        { message: 'Invalid post ID format' },
        { status: 400 }
      );
    }
    
    // Create view item with metadata
    const viewItem = {
      postId: postId,
      viewedAt: new Date(),
      postTitle: post.title || 'Untitled',
      postImage: post.image || null,
      postAuthor: post.username || 'anonymous'
    };
    
    try {
      // Check if user history document exists
      const userHistory = await db.collection('user_history').findOne({ userId: userId });
      
      if (!userHistory) {
        // Create new history document for user
        await db.collection('user_history').insertOne({
          userId: userId,
          recentlyViewed: [viewItem],
          lastUpdated: new Date()
        });
        console.log(`[HISTORY TRACKER] Created new history for user ${userId}`);
      } else {
        // Update existing history
        // First remove the post if it already exists
        const filteredViews = userHistory.recentlyViewed.filter(
          item => item.postId !== postId
        );
        
        // Add new view at the beginning of the array
        filteredViews.unshift(viewItem);
        
        // Limit to 50 most recent
        const updatedViews = filteredViews.slice(0, 50);
        
        // Update the document
        await db.collection('user_history').updateOne(
          { userId: userId },
          { 
            $set: { 
              recentlyViewed: updatedViews,
              lastUpdated: new Date()
            } 
          }
        );
        console.log(`[HISTORY TRACKER] Updated history for user ${userId}`);
      }
      
      return NextResponse.json(
        { message: 'View recorded successfully' },
        { status: 200 }
      );
    } catch (dbError) {
      console.error('[HISTORY TRACKER] Database error:', dbError);
      return NextResponse.json(
        { message: 'Error saving view: ' + dbError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[HISTORY TRACKER] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}