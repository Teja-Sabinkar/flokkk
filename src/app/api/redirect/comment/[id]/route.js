import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Comment from '@/models/Comment';

export async function GET(request, { params }) {
    try {
        const { id } = params;

        // Connect to database
        await dbConnect();

        // Find the comment and get its postId
        const comment = await Comment.findById(id);

        if (!comment) {
            // If comment not found, redirect to home
            return NextResponse.redirect(new URL('/home', request.url));
        }

        // Redirect to the discussion page with the post ID
        return NextResponse.redirect(new URL(`/discussion?id=${comment.postId}`, request.url));
    } catch (error) {
        console.error('Error in comment redirect:', error);
        // On error, redirect to home
        return NextResponse.redirect(new URL('/home', request.url));
    }
}