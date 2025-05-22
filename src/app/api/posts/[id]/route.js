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

// Helper function to generate sample view history data
function generateSampleViewHistory(totalAppeared = 100) {
  const today = new Date();
  const viewsHistory = [];
  
  // Create a distribution of appearances that looks realistic
  // 70% of appearances over last 3 days, 30% over preceding 4 days
  const recentAppearedPortion = Math.floor(totalAppeared * 0.7);
  const olderAppearedPortion = totalAppeared - recentAppearedPortion;
  
  // Generate a somewhat random but realistic distribution
  const dailyWeights = [
    0.1, // 6 days ago
    0.15, // 5 days ago
    0.2, // 4 days ago
    0.25, // 3 days ago
    0.5, // 2 days ago
    0.8, // yesterday
    1.0, // today
  ];
  
  // Normalize weights to sum to 1.0
  const weightSum = dailyWeights.reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = dailyWeights.map(weight => weight / weightSum);
  
  // Calculate appearances for each day
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Calculate appearances for this day (with some randomness)
    let dayAppeared = Math.max(1, Math.round(totalAppeared * normalizedWeights[6-i] * (0.8 + 0.4 * Math.random())));
    
    // Make sure the total doesn't exceed the original number
    if (viewsHistory.reduce((sum, day) => sum + day.views, 0) + dayAppeared > totalAppeared) {
      dayAppeared = Math.max(1, totalAppeared - viewsHistory.reduce((sum, day) => sum + day.views, 0));
    }
    
    viewsHistory.push({
      date: date.toISOString().split('T')[0],
      views: dayAppeared // Keep 'views' for backward compatibility with charts
    });
  }
  
  return viewsHistory;
}

// GET endpoint to retrieve a single post by ID
export async function GET(request, { params }) {
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
    // Users can view their own posts, or any published posts
    if (post.userId.toString() !== user._id.toString() && post.status !== 'published') {
      return NextResponse.json(
        { message: 'You do not have permission to view this post' },
        { status: 403 }
      );
    }
    
    // Get additional metrics for the post if needed
    const { db } = await connectToDatabase();
    
    // Get comment count
    const commentsCount = await db.collection('comments').countDocuments({
      postId: new ObjectId(id)
    });
    
    // NEW: Get all engagement counts from PostEngagement collection including appeared
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
    
    // Generate view history data based on appeared count
    let viewsHistory = post.viewsHistory || [];
    
    // If no view history exists, generate sample data for the last 7 days
    if (!viewsHistory || viewsHistory.length === 0) {
      // Look for appeared logs in the PostEngagement collection
      try {
        const recentEngagements = await PostEngagement.find({
          postId: new ObjectId(id),
          hasAppeared: true,
          lastAppearedAt: { 
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }).select('lastAppearedAt').lean();
        
        if (recentEngagements && recentEngagements.length > 0) {
          // Process engagements to get daily counts
          const dailyCounts = {};
          const now = new Date();
          
          // Initialize the last 7 days with 0 appearances
          for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dailyCounts[dateStr] = 0;
          }
          
          // Count appearances by day
          recentEngagements.forEach(engagement => {
            if (engagement.lastAppearedAt) {
              const engagementDate = new Date(engagement.lastAppearedAt);
              const dateStr = engagementDate.toISOString().split('T')[0];
              
              if (dailyCounts[dateStr] !== undefined) {
                dailyCounts[dateStr]++;
              }
            }
          });
          
          // Convert to array format
          viewsHistory = Object.keys(dailyCounts).map(date => ({
            date,
            views: dailyCounts[date] // Keep 'views' for chart compatibility
          }));
        } else {
          // If no actual appearance logs, generate sample data based on total appeared
          viewsHistory = generateSampleViewHistory(appearedCount);
        }
      } catch (engagementError) {
        console.warn('Error fetching engagement logs, using sample data:', engagementError);
        viewsHistory = generateSampleViewHistory(appearedCount);
      }
    }
    
    // NEW: Format post with appeared-based engagement metrics
    const formattedPost = {
      ...post,
      metrics: {
        appeared: appearedCount, // NEW: Replace views with appeared count
        uniqueViewers: Math.round(appearedCount * 0.8), // Estimate unique viewers from appeared
        viewed: viewedCount, // Real viewed count from engagement tracking (video plays)
        penetrate: penetrateCount, // Real penetrate count from engagement tracking (discussion opens)
        comments: commentsCount || 0,
        contributions: (post.communityLinks?.length || 0) + (post.creatorLinks?.length || 0),
        saves: saveCount, // Real save count from engagement tracking
        shares: shareCount // Real share count from engagement tracking
      },
      viewsHistory: viewsHistory
    };
    
    console.log(`📈 Post ${id} formatted metrics:`, formattedPost.metrics);
    
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
      updatedAt: new Date()
    };
    
    // Perform update
    await Post.findByIdAndUpdate(id, { $set: updateFields });
    
    // Get the updated post
    const updatedPost = await Post.findById(id).lean();
    
    // Get comment count for metrics
    const commentsCount = await db.collection('comments').countDocuments({
      postId: new ObjectId(id)
    });
    
    // NEW: Get all engagement counts from PostEngagement collection including appeared
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
    
    // Generate view history data for the updated post based on appeared
    let viewsHistory = updatedPost.viewsHistory || [];
    
    // If no view history exists, generate sample data
    if (!viewsHistory || viewsHistory.length === 0) {
      viewsHistory = generateSampleViewHistory(appearedCount);
    }
    
    // NEW: Format post with appeared-based engagement metrics
    const formattedPost = {
      ...updatedPost,
      metrics: {
        appeared: appearedCount, // NEW: Replace views with appeared count
        uniqueViewers: Math.round(appearedCount * 0.8), // Estimate unique viewers from appeared
        viewed: viewedCount, // Real viewed count from engagement tracking (video plays)
        penetrate: penetrateCount, // Real penetrate count from engagement tracking (discussion opens)
        comments: commentsCount || 0,
        contributions: (updatedPost.communityLinks?.length || 0) + (updatedPost.creatorLinks?.length || 0),
        saves: saveCount, // Real save count from engagement tracking
        shares: shareCount // Real share count from engagement tracking
      },
      viewsHistory: viewsHistory
    };
    
    console.log(`📈 Updated post ${id} formatted metrics:`, formattedPost.metrics);
    
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