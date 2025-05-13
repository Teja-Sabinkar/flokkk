import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    // Authentication check
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
    
    // Find reporting user
    const reportingUser = await User.findById(decoded.id);
    if (!reportingUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get report data from request
    const reportData = await request.json();
    
    // Add reporter details
    reportData.reportedBy = {
      id: reportingUser._id,
      username: reportingUser.username,
      email: reportingUser.email
    };
    
    // Configure email transport
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT),
      secure: process.env.EMAIL_SERVER_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD
      }
    });
    
    // Create email content
    const emailHtml = `
      <h2>Content Report</h2>
      <p><strong>Reported At:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>Reported By:</strong> ${reportingUser.username} (${reportingUser.email})</p>
      
      <h3>Post Details:</h3>
      <p><strong>Post ID:</strong> ${reportData.postId}</p>
      <p><strong>Posted By:</strong> ${reportData.username} (ID: ${reportData.userId})</p>
      <p><strong>Title:</strong> ${reportData.title}</p>
      <p><strong>Content:</strong> ${reportData.content}</p>
      <p><strong>Hashtags:</strong> ${reportData.hashtags ? reportData.hashtags.join(', ') : 'None'}</p>
      <p><strong>Image URL:</strong> ${reportData.image || 'No image'}</p>
      
      <p><strong>Reason:</strong> ${reportData.reason}</p>
      
      <p>Please review this content according to our community guidelines.</p>
    `;
    
    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.REPORT_EMAIL_TO,
      subject: `Content Report: ${reportData.title.substring(0, 50)}...`,
      html: emailHtml
    });
    
    // You could also save report to database for tracking
    // const Report = mongoose.model('Report', reportSchema);
    // await Report.create(reportData);
    
    return NextResponse.json(
      { message: 'Report submitted successfully' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error processing report:', error);
    return NextResponse.json(
      { message: 'Failed to process report: ' + error.message },
      { status: 500 }
    );
  }
}