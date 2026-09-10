import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Generates a short-lived presigned S3 URL for a BBB recording and redirects
 * the browser to it, so the video is downloaded directly from S3 rather than
 * streamed through the LMS server.
 *
 * Flow:
 *   Browser
 *      ↓
 *   LMS /api/lms/recordings/<id>/download
 *      ↓ 307 redirect
 *   Presigned S3 URL
 *      ↓
 *   Private S3 (recording.mp4)
 *
 * S3 object layout (written by the BBB worker after converting video-0.m4v):
 *   bbb-recordings/<recordId>/recording.mp4
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
      return NextResponse.json(
        { success: false, error: 'Recording ID is required' },
        { status: 400 }
      );
    }

    if (
      !S3_BUCKET ||
      !process.env.LMS_VIDEO_S3_ACCESS_KEY_ID ||
      !process.env.LMS_VIDEO_S3_SECRET_ACCESS_KEY
    ) {
      console.error('LMS video S3 configuration is missing');
      return NextResponse.json(
        { success: false, error: 'Recording storage is not configured' },
        { status: 500 }
      );
    }

    const key = `bbb-recordings/${id}/recording.mp4`;
    const filename = `recording-${id}.mp4`;

    console.log('⬇️ Recording download requested:', id);
    console.log('☁️ S3 object:', `s3://${S3_BUCKET}/${key}`);

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      // Preserve the browser download behavior from the old endpoint.
      ResponseContentType: 'video/mp4',
      ResponseContentDisposition: `attachment; filename="${filename}"`,
      ResponseCacheControl: 'private, no-store',
    });

    // Presigned URL valid for 10 minutes.
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });

    console.log('✅ Generated S3 presigned URL for recording:', id);

    // Browser follows this redirect and downloads directly from S3.
    return NextResponse.redirect(signedUrl, 307);
  } catch (error: any) {
    console.error('Recording S3 download error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate recording download URL',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
