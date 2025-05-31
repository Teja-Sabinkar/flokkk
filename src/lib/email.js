import nodemailer from 'nodemailer';

/**
 * Send an email using Nodemailer
 */
export async function sendEmail({ to, subject, html }) {
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: process.env.EMAIL_SERVER_PORT,
    secure: process.env.EMAIL_SERVER_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  // Send email
  try {
    const info = await transporter.sendMail({
      from: `"flokkk" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });

    console.log(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Generate a verification email with a custom token
 */
export function generateVerificationEmail(user, token) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;

  return {
    to: user.email,
    subject: 'Verify your flokkk account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4A5568; text-align: center;">Welcome to flokkk!</h1>
        <p style="font-size: 16px; color: #4A5568;">Hi ${user.name},</p>
        <p style="font-size: 16px; color: #4A5568;">Thanks for signing up for flokkk. To complete your registration, please verify your email address.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4299E1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify My Email</a>
        </div>
        
        <p style="font-size: 14px; color: #718096;">If you didn't sign up for flokkk, you can safely ignore this email.</p>
        
        <p style="font-size: 14px; color: #718096;">This link will expire in 24 hours.</p>
        
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 20px 0;">
        
        <p style="font-size: 12px; color: #A0AEC0; text-align: center;">© ${new Date().getFullYear()} flokkk. All rights reserved.</p>
      </div>
    `,
  };
}