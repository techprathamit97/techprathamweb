import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const Trainer = require('@/models/Trainer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Email configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || process.env.SMTP_USER;

// Validate SMTP configuration
if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error('SMTP configuration is missing:', {
    host: SMTP_HOST,
    user: SMTP_USER,
    pass: SMTP_PASS ? '****' : 'missing',
    from: SMTP_FROM
  });
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify SMTP connection on startup
transporter.verify((error: any, success: any) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to take our messages');
  }
});

// Generate reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// POST - Request password reset
export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const { email, type } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const userEmail = email.trim().toLowerCase();

    // Check in Student collection
    let user = await Student.findOne({ email: userEmail });
    let userType = 'student';

    // If not found in Student, check Trainer
    if (!user) {
      user = await Trainer.findOne({ email: userEmail });
      userType = 'trainer';
    }

    // If not found in either
    if (!user) {
      // Return success anyway to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save token to user document
    if (userType === 'student') {
      await Student.findByIdAndUpdate(user._id, {
        resetToken: resetToken,
        resetTokenExpiry: resetTokenExpiry
      });
    } else {
      await Trainer.findByIdAndUpdate(user._id, {
        resetToken: resetToken,
        resetTokenExpiry: resetTokenExpiry
      });
    }

    // Send reset email
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&type=${userType}&email=${encodeURIComponent(userEmail)}`;

    // Log SMTP config for debugging (without password)
    console.log('SMTP Config:', {
      host: SMTP_HOST,
      port: SMTP_PORT,
      user: SMTP_USER,
      from: SMTP_FROM,
      url: resetUrl
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: white; margin: 0;">TechPratham</h1>
        </div>

        <div style="padding: 30px; background: #f9f9f9; border-radius: 10px; margin-top: 20px;">
          <h2 style="color: #333;">Password Reset Request</h2>

          <p style="color: #666; line-height: 1.6;">
            Hello ${user.name},
          </p>

          <p style="color: #666; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>

          <p style="color: #999; font-size: 12px;">
            This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
          </p>

          <p style="color: #999; font-size: 12px;">
            Or copy and paste this link in your browser:<br>
            <a href="${resetUrl}" style="color: #667eea;">${resetUrl}</a>
          </p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} TechPratham. All rights reserved.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: SMTP_FROM,
      to: userEmail,
      subject: 'TechPratham - Password Reset Request',
      html: htmlContent
    }).then(() => {
      console.log('Password reset email sent successfully to:', userEmail);
    }).catch((mailError: any) => {
      console.error('Failed to send email:', mailError);
      throw mailError;
    });

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });

  } catch (error: any) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', message: error.message },
      { status: 500 }
    );
  }
}

// GET - Check email configuration status
export async function GET() {
  const configured = !!SMTP_USER && !!SMTP_PASS && !!SMTP_HOST;

  return NextResponse.json({
    success: true,
    configured,
    service: 'Gmail SMTP',
    host: SMTP_HOST || 'Not configured',
    port: SMTP_PORT,
    sender: configured ? SMTP_USER : 'Not configured'
  });
}
