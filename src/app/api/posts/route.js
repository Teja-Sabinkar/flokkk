import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import Follow from '@/models/Follow';
import { createNotification } from '@/lib/notifications';
import { trackPostCreated } from '@/lib/analytics';

export async function POST(request) {
  try {
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
      console.error('Token verification error:', error);
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Get the raw data from the request
    const rawData = await request.json();
    console.log('POST request to /api/posts');
    console.log('Received raw data:', JSON.stringify(rawData, null, 2));
    console.log('Creator links in request:', JSON.stringify(rawData.creatorLinks, null, 2));
    console.log('Video URL received:', rawData.videoUrl);
    
    // Connect to MongoDB using the direct client
    const { db } = await connectToDatabase();
    
    // Connect via mongoose as well for User model
    await dbConnect();
    
    // Find user by id from token
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Initialize creatorLinks with better validation
    let creatorLinks = [];
    if (rawData.creatorLinks && Array.isArray(rawData.creatorLinks)) {
      creatorLinks = rawData.creatorLinks.map(link => {
        console.log('Processing link:', link);
        // Extra validation to ensure URL exists and is properly formatted
        let url = link.url;
        if (!url) {
          console.warn('Link missing URL, using placeholder');
          url = '#';
        } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
          console.log('Adding https:// prefix to URL:', url);
          url = `https://${url}`;
        }
        
        return {
          title: link.title?.trim() || 'Untitled Link',
          url: url,
          description: link.description?.trim() || ''
        };
      });
      console.log('Final processed creator links:', JSON.stringify(creatorLinks, null, 2));
    } else {
      console.log('No creator links provided in the request');
    }
    
    // Validate videoUrl if present
    let validatedVideoUrl = null;
    if (rawData.videoUrl) {
      try {
        // Extract YouTube video ID to validate the URL
        let videoId = null;
        const url = rawData.videoUrl;
        
        if (url.includes('youtube.com/watch')) {
          const parsedUrl = new URL(url);
          videoId = parsedUrl.searchParams.get('v');
        } else if (url.includes('youtu.be/')) {
          const parts = url.split('/');
          videoId = parts[parts.length - 1].split('?')[0];
        } else if (url.includes('youtube.com/embed/')) {
          const parts = url.split('/embed/');
          videoId = parts[parts.length - 1].split('?')[0];
        }
        
        if (videoId) {
          // Valid YouTube URL, standardize it
          validatedVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
          console.log('Validated YouTube URL:', validatedVideoUrl);
        } else {
          // Not a YouTube URL, but still a URL - keep as is
          validatedVideoUrl = rawData.videoUrl;
          console.log('Non-YouTube video URL:', validatedVideoUrl);
        }
      } catch (error) {
        console.warn('Invalid video URL provided:', error);
        // Still keep the original URL as we don't want to lose data
        validatedVideoUrl = rawData.videoUrl;
      }
    }
    
    // Prepare post data with all fields including creatorLinks
    const postData = {
      userId: user._id,
      username: user.username || user.name.toLowerCase().replace(/\s+/g, '_'),
      title: rawData.title,
      content: rawData.content || '',
      image: rawData.image || null,
      videoUrl: validatedVideoUrl, // Use the validated URL instead of raw value
      hashtags: rawData.hashtags || [],
      discussions: 0,
      shares: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Explicitly add creator links
      creatorLinks: creatorLinks
    };
    
    console.log('Final post data to save:', JSON.stringify(postData, null, 2));
    
    // Insert directly using MongoDB driver
    const result = await db.collection('posts').insertOne(postData);
    
    if (!result.insertedId) {
      throw new Error('Failed to insert post');
    }
    
    console.log('Post created with ID:', result.insertedId);
    
    // Track post creation event
    trackPostCreated(rawData.videoUrl ? 'video' : 'standard');
    
    // Verify creator links were saved
    const savedPost = await db.collection('posts').findOne(
      { _id: result.insertedId },
      { projection: { creatorLinks: 1, videoUrl: 1 } }
    );
    console.log('Verified saved creator links:', JSON.stringify(savedPost.creatorLinks, null, 2));
    console.log('Verified saved video URL:', savedPost.videoUrl);
    
    // Increment user's discussion count
    await User.findByIdAndUpdate(user._id, { $inc: { discussions: 1 } });
    
    // Notify followers of the new post
    try {
      console.log('Finding followers to notify about new post...');
      // Find all followers of the post creator
      const follows = await Follow.find({ following: user._id });
      
      console.log(`Found ${follows.length} followers for user ${user._id}`);
      
      // Create notifications for each follower
      if (follows && follows.length > 0) {
        for (const follow of follows) {
          console.log(`Creating notification for follower: ${follow.follower}`);
          
          try {
            await createNotification({
              userId: follow.follower,
              type: 'new_post',
              content: `${user.username || user.name} posted a new discussion: "${rawData.title}"`,
              sender: user._id,
              senderUsername: user.username || user.name,
              relatedId: result.insertedId,
              onModel: 'Post',
              thumbnail: rawData.image || null
            });
          } catch (notifyError) {
            console.error(`Error creating notification for follower ${follow.follower}:`, notifyError);
          }
        }
        
        console.log('All follower notifications created');
      } else {
        console.log('No followers to notify');
      }
    } catch (notifyError) {
      // Log the error but don't fail the request
      console.error('Error notifying followers:', notifyError);
    }
    
    // Return the created post
    return NextResponse.json({
      _id: result.insertedId,
      ...postData
    }, { status: 201 });
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}