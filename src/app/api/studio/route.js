import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import dbConnect from '@/lib/mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Post from '@/models/Post';
import CommunityPost from '@/models/CommunityPost';
import PostEngagement from '@/models/PostEngagement';

export async function GET(request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const type = searchParams.get('type') || 'all'; // 'all', 'discussions', 'posts'
    const status = searchParams.get('status') || 'all'; // 'all', 'published', 'draft'
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // 'createdAt', 'title', 'views'
    const sortOrder = searchParams.get('sortOrder') || 'desc'; // 'asc', 'desc'
    
    // Log query parameters for debugging
    console.log('Studio API query parameters:', { page, limit, type, status, sortBy, sortOrder });
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
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
    
    // Base query - always filter by user ID
    const baseQuery = { userId: user._id };
    
    // Add status filter if specified (not 'all')
    if (status !== 'all') {
      baseQuery.status = status;
      console.log(`Filtering posts by status: ${status}`);
    }
    
    // Set up sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Get posts based on filter
    console.log('Final query:', JSON.stringify(baseQuery, null, 2));
    
    // Execute query
    const posts = await Post.find(baseQuery)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count for pagination
    const totalCount = await Post.countDocuments(baseQuery);
    
    console.log(`Found ${posts.length} posts matching criteria`);
    
    // NEW: Enhanced metrics calculation using PostEngagement model
    const postsWithEngagement = await Promise.all(
      posts.map(async (post) => {
        try {
          // Get comment count
          const commentsCount = await db.collection('comments').countDocuments({
            postId: new ObjectId(post._id)
          });
          
          // Get all engagement counts from PostEngagement collection
          const [appearedCount, saveCount, shareCount, viewedCount, penetrateCount] = await Promise.all([
            PostEngagement.countDocuments({ 
              postId: new ObjectId(post._id), 
              hasAppeared: true 
            }),
            PostEngagement.countDocuments({ 
              postId: new ObjectId(post._id), 
              hasSaved: true 
            }),
            PostEngagement.countDocuments({ 
              postId: new ObjectId(post._id), 
              hasShared: true 
            }),
            PostEngagement.countDocuments({ 
              postId: new ObjectId(post._id), 
              hasViewed: true 
            }),
            PostEngagement.countDocuments({ 
              postId: new ObjectId(post._id), 
              hasPenetrated: true 
            })
          ]);
          
          // Calculate contributions from links
          const contributions = (post.communityLinks?.length || 0) + (post.creatorLinks?.length || 0);
          
          console.log(`📊 Post "${post.title}" engagement:`, {
            appeared: appearedCount,
            viewed: viewedCount,
            penetrated: penetrateCount,
            comments: commentsCount,
            contributions: contributions,
            saves: saveCount,
            shares: shareCount
          });
          
          return {
            ...post,
            contentType: 'discussion',
            // NEW: Enhanced metrics using engagement tracking
            metrics: {
              appeared: appearedCount, // Use appeared instead of views
              viewed: viewedCount,     // Real video plays
              penetrated: penetrateCount, // Discussion opens
              comments: commentsCount,    // Real comment count
              contributions: contributions, // Link contributions
              saves: saveCount,          // Real saves
              shares: shareCount,        // Real shares
              // Legacy support - map appeared to views for backward compatibility
              views: appearedCount
            }
          };
        } catch (engagementError) {
          console.error(`Error calculating engagement for post ${post._id}:`, engagementError);
          
          // Fallback to basic metrics
          return {
            ...post,
            contentType: 'discussion',
            metrics: {
              appeared: 0,
              viewed: 0,
              penetrated: 0,
              comments: 0,
              contributions: (post.communityLinks?.length || 0) + (post.creatorLinks?.length || 0),
              saves: 0,
              shares: 0,
              views: 0 // Legacy support
            }
          };
        }
      })
    );
    
    return NextResponse.json({
      posts: postsWithEngagement,
      pagination: {
        page,
        limit,
        totalPosts: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Studio API error:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}