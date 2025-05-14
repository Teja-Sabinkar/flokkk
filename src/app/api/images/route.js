import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request) {
    try {
        // Verify authentication
        const headersList = headers();
        const authHeader = headersList.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { message: 'Unauthorized - No token provided' },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];

        try {
            jwt.verify(token, process.env.NEXTAUTH_SECRET);
        } catch (error) {
            console.error('Token verification error:', error);
            return NextResponse.json(
                { message: 'Unauthorized - Invalid token' },
                { status: 401 }
            );
        }

        // Get the image file from the form data
        const formData = await request.formData();
        const file = formData.get('file');
        const directory = formData.get('directory') || 'posts';

        if (!file) {
            return NextResponse.json(
                { message: 'No file provided' },
                { status: 400 }
            );
        }

        // Generate a unique ID for the image
        const imageId = uuidv4();

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Connect to MongoDB
        const { db } = await connectToDatabase();

        // Store the image in a dedicated images collection
        await db.collection('images').insertOne({
            _id: imageId,
            filename: file.name,
            contentType: file.type,
            directory,
            data: buffer,
            createdAt: new Date()
        });

        // Return a URL that points to this image's retrieval endpoint
        const imageUrl = `/api/images/${imageId}`;

        return NextResponse.json({
            filepath: imageUrl,
            message: 'Image uploaded successfully'
        }, { status: 201 });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { message: 'Upload failed: ' + error.message },
            { status: 500 }
        );
    }
}