import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import crypto from 'crypto';
import { sendEmail, generateVerificationEmail } from '@/lib/email';

export async function POST(request) {
  try {
    // Connect to database
    await dbConnect();
    
    const { email } = await request.json();

    // Validate input
    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user in database
    const user = await User.findOne({ email });
    
    // If user doesn't exist or is already verified, don't reveal this information
    if (!user || user.isEmailVerified) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'If your email exists in our system and is not verified, we have sent a verification link.' 
        },
        { status: 200 }
      );
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Set token expiration (24 hours)
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);

    // Update user with new token
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();

    // Send verification email
    try {
      const emailData = generateVerificationEmail(user, verificationToken);
      await sendEmail(emailData);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      return NextResponse.json(
        { message: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Verification email sent. Please check your inbox.'
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}