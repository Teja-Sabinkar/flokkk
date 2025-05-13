import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { put, del } from '@vercel/blob';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function GET(request) {
  // This route redirects to /api/auth/me for consistency
  return Response.redirect(new URL('/api/auth/me', request.url));
}

export async function PATCH(request) {
  try {
    // Get auth token from header
    const headersList = headers();
    const authHeader = headersList.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { message: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }
    
    // Connect to database
    await dbConnect();
    
    // Find user by id from token
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if the request is multipart/form-data or application/json
    const contentType = headersList.get('content-type') || '';
    
    let profileData = {};
    let profilePicture = null;
    let profileBanner = null;
    
    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data (with files)
      const formData = await request.formData();
      
      // Get text fields
      profileData = JSON.parse(formData.get('profileData') || '{}');
      
      // Get file fields
      profilePicture = formData.get('profilePicture');
      profileBanner = formData.get('profileBanner');
      
      // Process profile picture
      if (profilePicture && profilePicture instanceof File) {
        // Delete old profile picture from Vercel Blob if it exists and is not the default
        if (user.profilePicture && 
            user.profilePicture !== '/profile-placeholder.jpg' &&
            user.profilePicture.includes('blob.vercel-storage.com')) {
          try {
            await del(user.profilePicture);
          } catch (error) {
            console.error('Failed to delete old profile picture:', error);
          }
        }
        
        // Upload new profile picture to Vercel Blob
        const filename = `avatars/${decoded.id}-${Date.now()}-${profilePicture.name}`;
        const blob = await put(filename, profilePicture, {
          access: 'public',
        });
        profileData.profilePicture = blob.url;
      }
      
      // Process profile banner
      if (profileBanner && profileBanner instanceof File) {
        // Delete old banner from Vercel Blob if it exists
        if (user.profileBanner && user.profileBanner.includes('blob.vercel-storage.com')) {
          try {
            await del(user.profileBanner);
          } catch (error) {
            console.error('Failed to delete old banner:', error);
          }
        }
        
        // Upload new banner to Vercel Blob
        const filename = `banners/${decoded.id}-${Date.now()}-${profileBanner.name}`;
        const blob = await put(filename, profileBanner, {
          access: 'public',
        });
        profileData.profileBanner = blob.url;
      }
    } else {
      // Handle regular JSON data (no files)
      profileData = await request.json();
    }
    
    // Handle contact info update if provided
    if (profileData.contactInfo !== undefined) {
      // Validate contact info length
      if (profileData.contactInfo.length > 20) {
        return NextResponse.json(
          { message: 'Contact info cannot be more than 20 characters' },
          { status: 400 }
        );
      }
    }
    
    // Validate socialLinks if provided
    if (profileData.socialLinks) {
      // Ensure each social link has a platform and URL
      const validLinks = profileData.socialLinks.filter(
        link => link.platform && link.url
      );
      profileData.socialLinks = validLinks;
    }
    
    // Update user profile with the provided data
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: profileData },
      { new: true, runValidators: true }
    );
    
    // Return updated user profile data
    return NextResponse.json({
      id: updatedUser._id,
      username: updatedUser.username || updatedUser.name.toLowerCase().replace(/\s+/g, '_'),
      name: updatedUser.name,
      usertag: updatedUser.usertag,
      bio: updatedUser.bio || '',
      location: updatedUser.location || '',
      website: updatedUser.website || '',
      contactInfo: updatedUser.contactInfo || '',  // Include contactInfo in response
      profilePicture: updatedUser.profilePicture || '/profile-placeholder.jpg',
      profileBanner: updatedUser.profileBanner || '',
      socialLinks: updatedUser.socialLinks || [],
      subscribers: updatedUser.subscribers || 0,
      discussions: updatedUser.discussions || 0,
      joinDate: updatedUser.joinDate
    }, { status: 200 });
    
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { message: 'Failed to update profile: ' + error.message },
      { status: 500 }
    );
  }
}