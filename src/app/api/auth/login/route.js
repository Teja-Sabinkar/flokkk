import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  try {
    // Connect to database
    await dbConnect();
    
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user in database
    const user = await User.findOne({ email }).select('+password');
    
    // Check if user exists
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Include verification status in token payload
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        isVerified: user.isEmailVerified // Include verification status in token
      },
      process.env.NEXTAUTH_SECRET,
      { expiresIn: '7d' }
    );
    
    // Create appropriate message based on verification status
    const message = user.isEmailVerified 
      ? 'Login successful' 
      : 'Login successful with limited access. Please verify your email for full access.';
    
    // Create response with cookie
    const response = NextResponse.json(
      { 
        success: true, 
        message,
        token,
        accessLevel: user.isEmailVerified ? 'full' : 'limited',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
          needsVerification: !user.isEmailVerified
        }
      }, 
      { status: 200 }
    );
    
    // Set HTTP-only cookie
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: 'strict'
    });
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}