import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.BUCKET_NAME || '';

export async function POST(req: NextRequest) {
  try {
    if (!BUCKET_NAME) {
      return NextResponse.json(
        { error: 'S3 bucket not configured' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const key = `assignments/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // Generate the URL
    const url = `https://${BUCKET_NAME}.s3.${process.env.REGION || 'us-east-1'}.amazonaws.com/${key}`;

    return NextResponse.json({
      success: true,
      url: url,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
  } catch (error: any) {
    console.error('S3 upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', message: error.message },
      { status: 500 }
    );
  }
}