import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function GET(request) {
  try {
    // Get token from query parameters
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=invalid-token`);
    }

    // Connect to database
    await dbConnect();

    // Find user with the token
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=expired-token`);
    }

    // Update user to verified
    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    // Redirect to login with success message
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?verified=true`);
    
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=server-error`);
  }
}