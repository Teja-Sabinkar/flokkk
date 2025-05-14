import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Find the image by ID
    const image = await db.collection('images').findOne({ _id: id });
    
    if (!image) {
      return NextResponse.json(
        { message: 'Image not found' },
        { status: 404 }
      );
    }
    
    // Set appropriate content type
    const contentType = image.contentType || 'image/jpeg';
    
    // Return the image binary data with proper content type
    return new Response(image.data.buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable' // Cache for 1 year
      }
    });
  } catch (error) {
    console.error('Image retrieval error:', error);
    return NextResponse.json(
      { message: 'Failed to retrieve image: ' + error.message },
      { status: 500 }
    );
  }
}