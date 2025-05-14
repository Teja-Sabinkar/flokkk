import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function GET(request) {
  try {
    // Get token from query parameters
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      // Use absolute URL instead of relying on environment variable
      return NextResponse.redirect(new URL('/login?error=invalid-token', request.url));
    }

    // Connect to database
    try {
      await dbConnect();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.redirect(new URL('/login?error=database-connection', request.url));
    }

    // Find user with the token - use explicit date object for comparison
    const currentDate = new Date();
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: currentDate }
    });

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=expired-token', request.url));
    }

    // Update user to verified
    try {
      user.isEmailVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();
    } catch (saveError) {
      console.error('Error saving user:', saveError);
      return NextResponse.redirect(new URL('/login?error=verification-update', request.url));
    }

    // Redirect to login with success message
    return NextResponse.redirect(new URL('/login?verified=true', request.url));
    
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(new URL('/login?error=server-error', request.url));
  }
}