// api/upload/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    // Auth verification code...
    
    const formData = await request.formData();
    const file = formData.get('file');
    const directory = formData.get('directory') || 'posts';
    
    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }
    
    // Generate a unique image ID
    const imageId = uuidv4();
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Connect to MongoDB
    const { db } = await connectToDatabase();
    
    // Store the image in a dedicated collection
    await db.collection('images').insertOne({
      _id: imageId,
      filename: file.name,
      contentType: file.type,
      directory,
      data: buffer,
      createdAt: new Date()
    });
    
    // Return a URL that points to your image API
    const imageUrl = `/api/images/${imageId}`;
    
    return NextResponse.json({
      filepath: imageUrl, // Keep the same response structure for compatibility
      message: 'Image uploaded successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ message: 'Upload failed' }, { status: 500 });
  }
}