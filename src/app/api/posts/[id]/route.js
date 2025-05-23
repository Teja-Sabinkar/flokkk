import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import dbConnect from '@/lib/mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Post from '@/models/Post';
import PostEngagement from '@/models/PostEngagement';
import { put, del } from '@vercel/blob';

// Helper function to generate history data for any engagement type
function generateEngagementHistory(engagements, engagementField) {
  const today = new Date();
  const dailyCounts = {};
  
  // Initialize the last 7 days with 0 counts
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyCounts[dateStr] = 0;
  }
  
  // Count engagements by day
  engagements.forEach(engagement => {
    if (engagement[engagementField]) {
      const engagementDate = new Date(engagement[engagementField]);
      const dateStr = engagementDate.toISOString().split('T')[0];
      
      if (dailyCounts[dateStr] !== undefined) {
        dailyCounts[dateStr]++;
      }
    }
  });
  
  // Convert to array format
  return Object.keys(dailyCounts).map(date => ({
    date,
    views: dailyCounts[date] // Keep 'views' for chart compatibility
  }));
}

// GET endpoint to retrieve a single post by ID
export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    // Check post ID format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'Invalid post ID format' },
        { status: 400 }
      );
    }
    
    // Verify authentication
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
    
    // Find user by id from token
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find post by ID
    const post = await Post.findById(id).lean();
    
    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Check if user has permission to view this post
    if (post.userId.toString() !== user._id.toString() && post.status !== 'published') {
      return NextResponse.json(
        { message: 'You do not have permission to view this post' },
        { status: 403 }
      );
    }
    
    // Get additional metrics for the post
    const { db } = await connectToDatabase();
    
    // Get comment count
    const commentsCount = await db.collection('comments').countDocuments({
      postId: new ObjectId(id)
    });
    
    // Get all engagement counts from PostEngagement collection
    const [appearedCount, saveCount, shareCount, viewedCount, penetrateCount] = await Promise.all([
      PostEngagement.countDocuments({ 
        postId: new ObjectId(id), 
        hasAppeared: true 
      }),
      PostEngagement.countDocuments({ 
        postId: new ObjectId(id), 
        hasSaved: true 
      }),
      PostEngagement.countDocuments({ 
        postId: new ObjectId(id), 
        hasShared: true 
      }),
      PostEngagement.countDocuments({ 
        postId: new ObjectId(id), 
        hasViewed: true 
      }),
      PostEngagement.countDocuments({ 
        postId: new ObjectId(id), 
        hasPenetrated: true 
      })
    ]);
    
    console.log(`📊 Post ${id} engagement counts:`, {
      appeared: appearedCount,
      viewed: viewedCount,
      penetrated: penetrateCount,
      saved: saveCount,
      shared: shareCount
    });
    
    // NEW: Generate all three history types from real engagement data
    let appearedHistory = [];
    let viewedHistory = [];
    let penetrationHistory = [];
    
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Get all engagements for this post in the last 7 days
      const recentEngagements = await PostEngagement.find({
        postId: new ObjectId(id),
        $or: [
          { 
            hasAppeared: true,
            lastAppearedAt: { $gte: sevenDaysAgo }
          },
          { 
            hasViewed: true,
            lastViewedAt: { $gte: sevenDaysAgo }
          },
          { 
            hasPenetrated: true,
            lastPenetratedAt: { $gte: sevenDaysAgo }
          }
        ]
      }).select('lastAppearedAt lastViewedAt lastPenetratedAt hasAppeared hasViewed hasPenetrated').lean();
      
      console.log(`📈 Found ${recentEngagements.length} recent engagements for post ${id}`);
      
      // Generate appeared history
      const appearedEngagements = recentEngagements.filter(e => e.hasAppeared);
      appearedHistory = generateEngagementHistory(appearedEngagements, 'lastAppearedAt');
      
      // Generate viewed history
      const viewedEngagements = recentEngagements.filter(e => e.hasViewed);
      viewedHistory = generateEngagementHistory(viewedEngagements, 'lastViewedAt');
      
      // Generate penetration history
      const penetratedEngagements = recentEngagements.filter(e => e.hasPenetrated);
      penetrationHistory = generateEngagementHistory(penetratedEngagements, 'lastPenetratedAt');
      
      console.log(`📊 Generated histories - Appeared: ${appearedHistory.length}, Viewed: ${viewedHistory.length}, Penetration: ${penetrationHistory.length}`);
      
    } catch (engagementError) {
      console.error('Error fetching engagement history:', engagementError);
      
      // Fallback: create empty 7-day histories with all zeros
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        appearedHistory.push({ date: dateStr, views: 0 });
        viewedHistory.push({ date: dateStr, views: 0 });
        penetrationHistory.push({ date: dateStr, views: 0 });
      }
    }
    
    // Format post with all engagement metrics and histories
    const formattedPost = {
      ...post,
      metrics: {
        appeared: appearedCount,
        uniqueViewers: Math.round(appearedCount * 0.8), // Estimate unique viewers from appeared
        viewed: viewedCount,
        penetrate: penetrateCount,
        comments: commentsCount || 0,
        contributions: (post.communityLinks?.length || 0) + (post.creatorLinks?.length || 0),
        saves: saveCount,
        shares: shareCount
      },
      // NEW: Include all three history types
      appearedHistory: appearedHistory,
      viewedHistory: viewedHistory,
      penetrationHistory: penetrationHistory,
      // DEPRECATED: Keep for backward compatibility
      viewsHistory: appearedHistory
    };
    
    console.log(`📈 Post ${id} formatted with all histories:`, {
      appearedHistory: formattedPost.appearedHistory.length,
      viewedHistory: formattedPost.viewedHistory.length,
      penetrationHistory: formattedPost.penetrationHistory.length
    });
    
    return NextResponse.json(formattedPost, { status: 200 });
    
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update a post
export async function PATCH(request, { params }) {
  try {
    // Await params before using
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    // Check post ID format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'Invalid post ID format' },
        { status: 400 }
      );
    }
    
    // Get request body
    const requestData = await request.json();
    
    // Verify authentication
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
    const { db } = await connectToDatabase();
    
    // Find user by id from token
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find post by ID
    const post = await Post.findById(id);
    
    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Check if user has permission to edit this post
    if (post.userId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { message: 'You do not have permission to edit this post' },
        { status: 403 }
      );
    }
    
    // Handle image upload if included
    let imageUrl = post.image; // Default to existing image
    
    if (requestData.newThumbnail && requestData.newThumbnail.startsWith('data:')) {
      // This is a base64 image data, need to convert to file and upload
      try {
        // Parse base64 data
        const matches = requestData.newThumbnail.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (matches && matches.length === 3) {
          const type = matches[1];
          const data = matches[2];
          const buffer = Buffer.from(data, 'base64');
          
          // Create a unique filename
          const filename = `posts/${post._id.toString()}-${Date.now()}.${type.split('/')[1] || 'jpg'}`;
          
          // Upload to Vercel Blob Storage
          const blob = await put(filename, buffer, {
            contentType: type,
            access: 'public',
          });
          
          // Update the image URL
          imageUrl = blob.url;
          
          // Delete old image if exists and is not a placeholder
          if (post.image && post.image.includes('blob.vercel-storage.com')) {
            try {
              await del(post.image);
            } catch (deleteError) {
              console.error('Failed to delete old image:', deleteError);
            }
          }
        }
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        // Continue without updating the image
      }
    } else if (requestData.newThumbnail) {
      // This is a URL, just use it directly
      imageUrl = requestData.newThumbnail;
    } else if (requestData.removeThumbnail) {
      // Remove the thumbnail
      if (post.image && post.image.includes('blob.vercel-storage.com')) {
        try {
          await del(post.image);
        } catch (deleteError) {
          console.error('Failed to delete image:', deleteError);
        }
      }
      imageUrl = null;
    }
    
    // Process tags if provided
    let tags = post.hashtags || [];
    if (requestData.tags !== undefined) {
      if (typeof requestData.tags === 'string') {
        tags = requestData.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
      } else if (Array.isArray(requestData.tags)) {
        tags = requestData.tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
      }
    }
    
    // NEW: Ensure YouTube channel hashtag is preserved
    if (post.youtubeChannelHashtag && !tags.includes(post.youtubeChannelHashtag)) {
      // If the protected hashtag was somehow removed from tags, add it back
      tags.push(post.youtubeChannelHashtag);
      console.log(`Preserved YouTube channel hashtag: ${post.youtubeChannelHashtag}`);
    }
    
    // Process links if provided
    let creatorLinks = post.creatorLinks || [];
    if (requestData.links !== undefined && Array.isArray(requestData.links)) {
      creatorLinks = requestData.links.map(link => ({
        title: link.title || '',
        url: link.url || '',
        description: link.description || '',
        type: link.type || 'resource',
        votes: link.votes || 0
      }));
    }
    
    // Update post fields
    const updateFields = {
      title: requestData.title !== undefined ? requestData.title : post.title,
      content: requestData.content !== undefined ? requestData.content : post.content,
      status: requestData.status !== undefined ? requestData.status : post.status,
      image: imageUrl,
      hashtags: tags,
      creatorLinks: creatorLinks,
      updatedAt: new Date(),
      // NEW: Preserve YouTube channel hashtag - don't allow it to be changed
      youtubeChannelHashtag: post.youtubeChannelHashtag || null
    };
    
    console.log('Update fields:', updateFields);
    console.log('Preserving YouTube channel hashtag:', post.youtubeChannelHashtag);
    
    // Perform update
    await Post.findByIdAndUpdate(id, { $set: updateFields });
    
    // Get the updated post
    const updatedPost = await Post.findById(id).lean();
    
    // Get comment count for metrics
    const commentsCount = await db.collection('comments').countDocuments({
      postId: new ObjectId(id)
    });
    
    // Get all engagement counts from PostEngagement collection including appeared
    const [appearedCount, saveCount, shareCount, viewedCount, penetrateCount] = await Promise.all([
      PostEngagement.countDocuments({ 
        postId: new ObjectId(id), 
        hasAppeared: true 
      }),
      PostEngagement.countDocuments({ 
        postId: new ObjectId(id), 
        hasSaved: true 
      }),
      PostEngagement.countDocuments({ 
        postId: new ObjectId(id), 
        hasShared: true 
      }),
      PostEngagement.countDocuments({ 
        postId: new ObjectId(id), 
        hasViewed: true 
      }),
      PostEngagement.countDocuments({ 
        postId: new ObjectId(id), 
        hasPenetrated: true 
      })
    ]);
    
    console.log(`📊 Updated post ${id} engagement counts:`, {
      appeared: appearedCount,
      viewed: viewedCount,
      penetrated: penetrateCount,
      saved: saveCount,
      shared: shareCount
    });
    
    // NEW: Generate all three history types from real engagement data (same as GET endpoint)
    let appearedHistory = [];
    let viewedHistory = [];
    let penetrationHistory = [];
    
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Get all engagements for this post in the last 7 days
      const recentEngagements = await PostEngagement.find({
        postId: new ObjectId(id),
        $or: [
          { 
            hasAppeared: true,
            lastAppearedAt: { $gte: sevenDaysAgo }
          },
          { 
            hasViewed: true,
            lastViewedAt: { $gte: sevenDaysAgo }
          },
          { 
            hasPenetrated: true,
            lastPenetratedAt: { $gte: sevenDaysAgo }
          }
        ]
      }).select('lastAppearedAt lastViewedAt lastPenetratedAt hasAppeared hasViewed hasPenetrated').lean();
      
      console.log(`📈 Found ${recentEngagements.length} recent engagements for updated post ${id}`);
      
      // Generate appeared history
      const appearedEngagements = recentEngagements.filter(e => e.hasAppeared);
      appearedHistory = generateEngagementHistory(appearedEngagements, 'lastAppearedAt');
      
      // Generate viewed history
      const viewedEngagements = recentEngagements.filter(e => e.hasViewed);
      viewedHistory = generateEngagementHistory(viewedEngagements, 'lastViewedAt');
      
      // Generate penetration history
      const penetratedEngagements = recentEngagements.filter(e => e.hasPenetrated);
      penetrationHistory = generateEngagementHistory(penetratedEngagements, 'lastPenetratedAt');
      
      console.log(`📊 Generated histories for updated post - Appeared: ${appearedHistory.length}, Viewed: ${viewedHistory.length}, Penetration: ${penetrationHistory.length}`);
      
    } catch (engagementError) {
      console.error('Error fetching engagement history for updated post:', engagementError);
      
      // Fallback: create empty 7-day histories with all zeros
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        appearedHistory.push({ date: dateStr, views: 0 });
        viewedHistory.push({ date: dateStr, views: 0 });
        penetrationHistory.push({ date: dateStr, views: 0 });
      }
    }
    
    // Format post with appeared-based engagement metrics and all histories
    const formattedPost = {
      ...updatedPost,
      metrics: {
        appeared: appearedCount, // Replace views with appeared count
        uniqueViewers: Math.round(appearedCount * 0.8), // Estimate unique viewers from appeared
        viewed: viewedCount, // Real viewed count from engagement tracking (video plays)
        penetrate: penetrateCount, // Real penetrate count from engagement tracking (discussion opens)
        comments: commentsCount || 0,
        contributions: (updatedPost.communityLinks?.length || 0) + (updatedPost.creatorLinks?.length || 0),
        saves: saveCount, // Real save count from engagement tracking
        shares: shareCount // Real share count from engagement tracking
      },
      // NEW: Include all three history types
      appearedHistory: appearedHistory,
      viewedHistory: viewedHistory,
      penetrationHistory: penetrationHistory,
      // DEPRECATED: Keep for backward compatibility
      viewsHistory: appearedHistory
    };
    
    console.log(`📈 Updated post ${id} formatted with all histories:`, {
      appearedHistory: formattedPost.appearedHistory.length,
      viewedHistory: formattedPost.viewedHistory.length,
      penetrationHistory: formattedPost.penetrationHistory.length
    });
    
    return NextResponse.json({
      message: 'Post updated successfully',
      post: formattedPost
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a post
export async function DELETE(request, { params }) {
  try {
    // NEW: Await params before using
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    // Check post ID format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'Invalid post ID format' },
        { status: 400 }
      );
    }
    
    // Verify authentication
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
    const { db } = await connectToDatabase();
    
    // Find user by id from token
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Find post by ID
    const post = await Post.findById(id);
    
    if (!post) {
      return NextResponse.json(
        { message: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Check if user has permission to delete this post
    if (post.userId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { message: 'You do not have permission to delete this post' },
        { status: 403 }
      );
    }
    
    // Delete image if exists and is not a placeholder
    if (post.image && post.image.includes('blob.vercel-storage.com')) {
      try {
        await del(post.image);
      } catch (deleteError) {
        console.error('Failed to delete image:', deleteError);
      }
    }
    
    // Delete comments associated with the post
    await db.collection('comments').deleteMany({
      postId: new ObjectId(id)
    });
    
    // NEW: Delete all engagement records associated with the post (including appeared tracking)
    const deletedEngagements = await PostEngagement.deleteMany({
      postId: new ObjectId(id)
    });
    
    console.log(`🗑️ Deleted ${deletedEngagements.deletedCount} engagement records for post ${id}`);
    
    // Delete the post
    await Post.findByIdAndDelete(id);
    
    return NextResponse.json({
      message: 'Post deleted successfully'
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}