import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { sendEmail } from '@/lib/email';
import { saveFile } from '@/lib/fileUpload';

export async function POST(request) {
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

        // Find user by id from token
        const user = await User.findById(decoded.id);

        if (!user) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        // Handle form data
        const formData = await request.formData();

        // Extract form fields
        const title = formData.get('title');
        const description = formData.get('description');
        const allowEmail = formData.get('allowEmail') === 'true';

        // Validate required fields
        if (!title || !description) {
            return NextResponse.json(
                { message: 'Title and description are required' },
                { status: 400 }
            );
        }

        // Handle file attachment if present
        let attachmentPath = null;
        const attachmentFile = formData.get('file');

        if (attachmentFile && attachmentFile.size > 0) {
            attachmentPath = await saveFile(attachmentFile, 'feedback');
        }

        // Prepare email content
        const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
        <h1 style="color: #3b82f6; margin-bottom: 20px;">New Feedback Submission</h1>
        
        <div style="margin-bottom: 20px;">
          <h3 style="margin-bottom: 8px;">User Information:</h3>
          <p><strong>Name:</strong> ${user.name}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Username:</strong> ${user.username || 'Not set'}</p>
          <p><strong>User ID:</strong> ${user._id}</p>
          <p><strong>Registered since:</strong> ${user.joinDate}</p>
          <p><strong>Allow email contact:</strong> ${allowEmail ? 'Yes' : 'No'}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="margin-bottom: 8px;">Feedback:</h3>
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>Description:</strong></p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; white-space: pre-wrap;">${description}</div>
        </div>
        
        ${attachmentPath ? `
        <div style="margin-bottom: 20px;">
          <h3 style="margin-bottom: 8px;">Attachment:</h3>
          <p>A file was attached to this feedback. You can find it at: ${process.env.NEXTAUTH_URL}${attachmentPath}</p>
        </div>
        ` : ''}
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e1e1e1; padding-top: 20px;">
          This is an automated message from the Turtle2.0 feedback system. 
          ${allowEmail ? 'The user has indicated they are open to being contacted via email for follow-up.' : 'The user has opted out of being contacted via email for follow-up.'}
        </p>
      </div>
    `;

        // Send email
        await sendEmail({
            to: process.env.FEEDBACK_EMAIL || process.env.EMAIL_FROM, // Use dedicated feedback email if available
            subject: `Feedback: ${title}`,
            html: emailHtml
        });

        // Optional: Save feedback to database for tracking
        // const Feedback = mongoose.model('Feedback', feedbackSchema);
        // await Feedback.create({
        //   userId: user._id,
        //   title,
        //   description,
        //   allowEmail,
        //   attachmentPath,
        //   submittedAt: new Date()
        // });

        return NextResponse.json(
            { message: 'Feedback submitted successfully' },
            { status: 200 }
        );

    } catch (error) {
        console.error('Feedback submission error:', error);
        return NextResponse.json(
            { message: 'Failed to submit feedback: ' + error.message },
            { status: 500 }
        );
    }
}