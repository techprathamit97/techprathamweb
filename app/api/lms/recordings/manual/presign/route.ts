import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

/**
 * Issues a presigned S3 PUT URL so the browser can upload a large class video
 * (200MB+) DIRECTLY to S3, bypassing the Next.js/EC2 server entirely. This
 * avoids nginx body-size limits and Node memory pressure.
 *
 * The video is stored in the same bucket used for BBB recordings, under:
 *   manual-recordings/<batchId>/<uuid>.<ext>
 *
 * Response: { success, uploadUrl, s3Key }
 * The browser PUTs the file to uploadUrl, then calls the metadata API to
 * persist a ManualRecording document referencing s3Key.
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

export async function POST(req: NextRequest) {
  try {
    if (
      !S3_BUCKET ||
      !process.env.LMS_VIDEO_S3_ACCESS_KEY_ID ||
      !process.env.LMS_VIDEO_S3_SECRET_ACCESS_KEY
    ) {
      return NextResponse.json(
        { success: false, error: 'Recording storage is not configured' },
        { status: 500 }
      );
    }

    const { batchId, fileName, contentType } = await req.json();

    if (!batchId || !fileName) {
      return NextResponse.json(
        { success: false, error: 'batchId and fileName are required' },
        { status: 400 }
      );
    }

    // batchId must be a Mongo ObjectId so it can't be used to write to an
    // arbitrary S3 prefix.
    if (!/^[a-f0-9]{24}$/i.test(String(batchId))) {
      return NextResponse.json(
        { success: false, error: 'Invalid batchId' },
        { status: 400 }
      );
    }

    // Only allow video uploads.
    const type = contentType || 'video/mp4';
    if (!type.startsWith('video/')) {
      return NextResponse.json(
        { success: false, error: 'Only video files are allowed' },
        { status: 400 }
      );
    }

    // Derive a safe extension from the original name.
    const extMatch = String(fileName).match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'mp4';
    const s3Key = `manual-recordings/${batchId}/${randomUUID()}.${ext}`;

    // Do NOT sign ContentType. Signing it means the browser must send the exact
    // same Content-Type header or S3 returns 403 SignatureDoesNotMatch. Leaving
    // it unsigned removes that failure mode entirely, isolating any remaining
    // 403 to an IAM (s3:PutObject) or bucket CORS problem.
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
    });

    // 1 hour to complete the upload of a large file.
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ success: true, uploadUrl, s3Key, contentType: type });
  } catch (error: any) {
    console.error('Presign error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create upload URL', message: error?.message },
      { status: 500 }
    );
  }
}
