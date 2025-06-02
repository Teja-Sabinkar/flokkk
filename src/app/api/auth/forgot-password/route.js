import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { sendEmail } from '@/lib/email';

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

    // Find user by email
    const user = await User.findOne({ email });
    
    // If user exists, generate and save reset token
    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Set token expiration (10 minutes)
      const resetPasswordExpire = Date.now() + 10 * 60 * 1000;
      
      // Hash token before saving to database for security
      const resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      
      // Save to database
      user.resetPasswordToken = resetPasswordToken;
      user.resetPasswordExpire = resetPasswordExpire;
      await user.save();
      
      // Create reset URL
      const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;
      
      // Send email with reset link
      try {
        await sendEmail({
          to: user.email,
          subject: 'Password Reset Request',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #4A5568; text-align: center;">Reset Your Password</h1>
              <p style="font-size: 16px; color: #4A5568;">Hi ${user.name},</p>
              <p style="font-size: 16px; color: #4A5568;">We received a request to reset your password for your floocc account. Click the button below to reset it. This link will expire in 10 minutes.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #4299E1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
              </div>
              
              <p style="font-size: 14px; color: #718096;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
              
              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;">
              
              <p style="font-size: 12px; color: #A0AEC0; text-align: center;">© ${new Date().getFullYear()} floocc. All rights reserved.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Error sending reset email:', emailError);
        // Continue with response even if email fails
        // In production, you might want to handle this differently
      }
    }

    // For security reasons, always return success even if the email doesn't exist
    return NextResponse.json(
      { 
        success: true, 
        message: 'If an account with that email exists, a password reset link has been sent' 
      }, 
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}