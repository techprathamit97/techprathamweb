import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import nodemailer from 'nodemailer';

// Gmail SMTP Configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || 'techprathamit@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'rgwnknbttxywgxip';
const SMTP_FROM = process.env.SMTP_FROM || 'techprathamit@gmail.com';

// Create transporter
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

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const { to, subject, message, batchId, html } = body;

    if (!to || !subject || !message) {
      return NextResponse.json(
        { success: false, error: 'to, subject, and message are required' },
        { status: 400 }
      );
    }

    // Handle multiple recipients (comma or semicolon separated)
    const recipients = to.split(/[,;]/).map((email: string) => email.trim()).filter(Boolean);

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid email addresses provided' },
        { status: 400 }
      );
    }

    // Send email to all recipients
    const results = [];

    for (const email of recipients) {
      try {
        const mailOptions = {
          from: `"TechPratham" <${SMTP_FROM}>`,
          to: email,
          subject: subject,
          html: html || `<p>${message.replace(/\n/g, '<br>')}</p>`
        };

        const info = await transporter.sendMail(mailOptions);
        results.push({
          email,
          success: true,
          messageId: info.messageId
        });

        console.log(`Email sent to ${email}:`, info.messageId);
      } catch (error: any) {
        console.error(`Failed to send email to ${email}:`, error);
        results.push({
          email,
          success: false,
          error: error.message
        });
      }
    }

    const successful = results.filter((r: any) => r.success).length;
    const failed = results.filter((r: any) => !r.success).length;

    if (failed > 0 && successful === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send all emails',
          results
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Email sent to ${successful} of ${recipients.length} recipients`,
      results
    });

  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET - Check email configuration status
export async function GET() {
  const configured = !!SMTP_USER && !!SMTP_PASS;

  return NextResponse.json({
    success: true,
    configured,
    service: 'Gmail SMTP',
    sender: configured ? SMTP_USER : 'Not configured'
  });
}