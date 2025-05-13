// src/app/api/settings/account/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function PATCH(request) {
  try {
    // Get auth token from header
    const headersList = headers();
    const authHeader = headersList.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Connect to database
    await dbConnect();
    
    // Find user by id from token (include password field)
    const user = await User.findById(decoded.id).select('+password');
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Parse request body
    const updateData = await request.json();
    
    // Prepare update object
    const updates = {};
    
    // Handle name change
    if (updateData.name) {
      updates.name = updateData.name;
    }
    
    // Handle username change
    if (updateData.username) {
      // Check if username is already taken
      const existingUser = await User.findOne({ 
        username: updateData.username.toLowerCase(),
        _id: { $ne: user._id } // Exclude current user
      });
      
      if (existingUser) {
        return NextResponse.json(
          { message: 'Username is already taken' },
          { status: 400 }
        );
      }
      
      updates.username = updateData.username.toLowerCase();
    }
    
    // Handle email change
    if (updateData.email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ 
        email: updateData.email.toLowerCase(),
        _id: { $ne: user._id } // Exclude current user
      });
      
      if (existingUser) {
        return NextResponse.json(
          { message: 'Email is already in use' },
          { status: 400 }
        );
      }
      
      updates.email = updateData.email.toLowerCase();
      updates.isEmailVerified = false; // Require verification for new email
      
      // TODO: Send verification email
    }
    
    // Handle contact info update
    if (updateData.contactInfo !== undefined) {
      console.log('Updating contactInfo to:', updateData.contactInfo);
      // Validate contact info length
      if (updateData.contactInfo.length > 20) {
        return NextResponse.json(
          { message: 'Contact info cannot be more than 20 characters' },
          { status: 400 }
        );
      }
      
      updates.contactInfo = updateData.contactInfo;
    }
    
    // Handle password change
    if (updateData.currentPassword && updateData.newPassword) {
      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        updateData.currentPassword,
        user.password
      );
      
      if (!isPasswordValid) {
        return NextResponse.json(
          { message: 'Current password is incorrect' },
          { status: 400 }
        );
      }
      
      // Validate new password
      if (updateData.newPassword.length < 8) {
        return NextResponse.json(
          { message: 'Password must be at least 8 characters long' },
          { status: 400 }
        );
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(updateData.newPassword, 10);
      updates.password = hashedPassword;
    }
    
    // Only update if there are changes
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'No update data provided' },
        { status: 400 }
      );
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    return NextResponse.json({
      message: 'Account settings updated successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        name: updatedUser.name,
        email: updatedUser.email,
        contactInfo: updatedUser.contactInfo || '',
        isEmailVerified: updatedUser.isEmailVerified
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Update account settings error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}