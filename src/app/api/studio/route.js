import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Post from '@/models/Post';
import CommunityPost from '@/models/CommunityPost';

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
    
    // Format posts for response
    const formattedPosts = posts.map(post => ({
      ...post,
      contentType: 'discussion',
      metrics: {
        views: post.views || 0,
        comments: post.comments || 0,
        contributions: (post.communityLinks?.length || 0) + (post.creatorLinks?.length || 0)
      }
    }));
    
    return NextResponse.json({
      posts: formattedPosts,
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