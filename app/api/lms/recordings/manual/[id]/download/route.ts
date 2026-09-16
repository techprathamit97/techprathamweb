import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { connectMongo } from '@/utils/mongodb';
const ManualRecording = require('@/models/ManualRecording');

/**
 * Presigns a GetObject URL for a manually-uploaded recording and redirects the
 * browser to it, forcing a file download. Uses the s3Key stored on the
 * ManualRecording doc, so it never needs s3:ListBucket — only GetObject.
 */

const S3_BUCKET = process.env.LMS_VIDEO_S3_BUCKET || '';
const S3_REGION = process.env.LMS_VIDEO_S3_REGION || 'ap-south-1';

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.LMS_VIDEO_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.LMS_VIDEO_S3_SECRET_ACCESS_KEY || '',
  },
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Recording id is required' }, { status: 400 });
    }

    if (!S3_BUCKET) {
      return NextResponse.json({ success: false, error: 'Recording storage is not configured' }, { status: 500 });
    }

    await connectMongo();
    const doc = await ManualRecording.findById(id).lean();
    if (!doc || !(doc as any).s3Key) {
      return NextResponse.json({ success: false, error: 'Recording not found' }, { status: 404 });
    }

    const s3Key = (doc as any).s3Key as string;
    const safeTitle = String((doc as any).title || 'recording').replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = (s3Key.match(/\.([a-zA-Z0-9]+)$/)?.[1] || 'mp4').toLowerCase();
    const filename = `${safeTitle}.${ext}`;

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
      ResponseCacheControl: 'private, no-store',
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });
    return NextResponse.redirect(signedUrl, 307);
  } catch (error: any) {
    console.error('Manual recording download error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate download URL', message: error?.message },
      { status: 500 }
    );
  }
}
