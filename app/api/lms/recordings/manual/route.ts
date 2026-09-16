import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
const ManualRecording = require('@/models/ManualRecording');
const Batch = require('@/models/Batch');

const S3_BUCKET = process.env.LMS_VIDEO_S3_BUCKET || '';
const S3_REGION = process.env.LMS_VIDEO_S3_REGION || 'ap-south-1';

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.LMS_VIDEO_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.LMS_VIDEO_S3_SECRET_ACCESS_KEY || '',
  },
});

// GET /api/lms/recordings/manual?batchId=... — list manual recordings for a batch
export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    const batchId = req.nextUrl.searchParams.get('batchId');

    const query = batchId ? { batchId } : {};
    const recordings = await ManualRecording.find(query)
      .sort({ classDate: -1 })
      .lean();

    return NextResponse.json({ success: true, recordings });
  } catch (error: any) {
    console.error('List manual recordings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch manual recordings' },
      { status: 500 }
    );
  }
}

// POST /api/lms/recordings/manual — save metadata after a successful S3 upload
export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const data = await req.json();

    const { batchId, title, s3Key, classDate } = data;
    if (!batchId || !title || !s3Key || !classDate) {
      return NextResponse.json(
        { success: false, error: 'batchId, title, s3Key and classDate are required' },
        { status: 400 }
      );
    }

    if (!/^[a-f0-9]{24}$/i.test(String(batchId))) {
      return NextResponse.json({ success: false, error: 'Invalid batchId' }, { status: 400 });
    }

    // Guard against a forged s3Key that points outside this feature's prefix.
    if (!String(s3Key).startsWith(`manual-recordings/${batchId}/`)) {
      return NextResponse.json({ success: false, error: 'Invalid s3Key' }, { status: 400 });
    }

    const parsedDate = new Date(classDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid classDate' }, { status: 400 });
    }

    // Resolve courseId from the batch for convenience, and confirm it exists.
    const batch = await Batch.findById(batchId).select('courseId').lean();
    if (!batch) {
      return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
    }

    const doc = await ManualRecording.create({
      batchId,
      courseId: (batch as any)?.courseId,
      title: String(title).trim(),
      description: data.description || '',
      platform: data.platform || 'other',
      s3Key,
      fileSize: data.fileSize || 0,
      durationSec: data.durationSec || 0,
      classDate: parsedDate,
      uploadedBy: data.uploadedBy || '',
      isPublished: data.isPublished !== false,
    });

    return NextResponse.json({ success: true, recording: doc }, { status: 201 });
  } catch (error: any) {
    console.error('Create manual recording error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save recording', message: error?.message },
      { status: 500 }
    );
  }
}

// DELETE /api/lms/recordings/manual?id=... — remove metadata + the S3 object
export async function DELETE(req: NextRequest) {
  try {
    await connectMongo();
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const doc = await ManualRecording.findById(id);
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Recording not found' }, { status: 404 });
    }

    // Best-effort delete of the S3 object.
    if (doc.s3Key && S3_BUCKET) {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: doc.s3Key }));
      } catch (e) {
        console.warn('Failed to delete S3 object (continuing):', doc.s3Key);
      }
    }

    await ManualRecording.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Recording deleted' });
  } catch (error: any) {
    console.error('Delete manual recording error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete recording' },
      { status: 500 }
    );
  }
}
