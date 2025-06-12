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
    
    const { name, username, email, password } = await request.json();

    // Validate input
    if (!username || !email || !password) {
      return NextResponse.json(
        { message: 'Username, email, and password are required' },
        { status: 400 }
      );
    }
    
    // Use username as name if not provided
    const displayName = name || username;
    
    // Check if username is valid (letters, numbers, underscores only)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { message: 'Username can only contain letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Check if username contains "flokkk" in any variation (case-insensitive)
    // Exception: Allow specific email to use "flokkk" in username
    const allowedEmailForFlokkk = 'teja.sabinkar2304@gmail.com';
    if (username.toLowerCase().includes('flokkk') && email !== allowedEmailForFlokkk) {
      return NextResponse.json(
        { message: 'This username is not available. Please choose a different username.' },
        { status: 400 }
      );
    }

    // Check if user with this email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return NextResponse.json(
        { message: 'Email already in use' },
        { status: 409 }
      );
    }
    
    // Check if user with this username already exists
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return NextResponse.json(
        { message: 'Username already taken. Please choose a different username.' },
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
      name: displayName,
      username: username.toLowerCase(), // Store username in lowercase
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
          username: user.username,
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