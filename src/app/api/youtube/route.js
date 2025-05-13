// src/app/api/youtube/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    
    // Validate videoId
    if (!videoId) {
      return NextResponse.json(
        { message: 'Video ID is required' },
        { status: 400 }
      );
    }
    
    // Your YouTube API key from environment variables
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      console.error('YouTube API key is missing in environment variables');
      return NextResponse.json(
        { message: 'YouTube API key is not configured' },
        { status: 500 }
      );
    }
    
    console.log(`Fetching data for video ID: ${videoId}`);
    
    // Make a request to the YouTube Data API
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,statistics`;
    console.log(`Making request to: ${apiUrl.replace(apiKey, 'API_KEY_HIDDEN')}`);
    
    const response = await fetch(apiUrl);
    
    // Log response status for debugging
    console.log(`YouTube API response status: ${response.status}`);
    
    const data = await response.json();
    
    // Log response data structure (safely)
    console.log('YouTube API response structure:', {
      hasItems: !!data.items,
      itemCount: data.items?.length || 0,
      error: data.error
    });
    
    if (!response.ok) {
      console.error('YouTube API error:', data.error || 'Unknown error');
      return NextResponse.json(
        { message: `YouTube API error: ${data.error?.message || response.statusText}` },
        { status: response.status }
      );
    }
    
    // Check if video exists
    if (!data.items || data.items.length === 0) {
      console.log('Video not found or is private');
      return NextResponse.json(
        { message: 'Video not found or is private' },
        { status: 404 }
      );
    }
    
    // Extract relevant information
    const videoData = data.items[0];
    const snippet = videoData.snippet;
    
    if (!snippet) {
      console.error('Unexpected API response - missing snippet:', videoData);
      return NextResponse.json(
        { message: 'Invalid video data received from YouTube' },
        { status: 500 }
      );
    }
    
    // Format the response
    const formattedResponse = {
      title: snippet.title,
      description: snippet.description,
      thumbnails: {
        default: snippet.thumbnails?.default?.url,
        medium: snippet.thumbnails?.medium?.url,
        high: snippet.thumbnails?.high?.url,
        standard: snippet.thumbnails?.standard?.url,
        maxres: snippet.thumbnails?.maxres?.url
      },
      publishedAt: snippet.publishedAt,
      channelTitle: snippet.channelTitle,
      statistics: videoData.statistics || {}
    };
    
    console.log('Successfully formatted video data');
    return NextResponse.json(formattedResponse, { status: 200 });
  } catch (error) {
    console.error('YouTube API route error:', error);
    return NextResponse.json(
      { message: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}