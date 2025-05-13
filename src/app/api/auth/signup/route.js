import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendEmail, generateVerificationEmail } from '@/lib/email';

export async function POST(request) {
  try {
    // Connect to database
    await dbConnect();
    
    const { name, email, password } = await request.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Email already in use' },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Set token expiration (24 hours)
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);

    // Create new user with verification token
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isEmailVerified: false,
      verificationToken,
      verificationTokenExpires,
    });

    // Send verification email
    try {
      const emailData = generateVerificationEmail(user, verificationToken);
      await sendEmail(emailData);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Continue with user creation even if email fails
      // In production, you might want to handle this differently
    }

    // Don't return the password or verification token
    user.password = undefined;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;

    return NextResponse.json(
      { 
        success: true, 
        message: 'Registration successful! Please check your email to verify your account.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
        }
      }, 
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}