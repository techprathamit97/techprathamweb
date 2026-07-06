import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Batch = require('@/models/Batch');

// PUT - Update batch course progress (applies to all students)
export async function PUT(request: NextRequest) {
  try {
    await connectMongo();

    const body = await request.json();
    const { batchId, courseProgress } = body;

    if (!batchId || courseProgress === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Batch ID and Course Progress are required'
      }, { status: 400 });
    }

    // Validate progress values (only allow 0, 10, 30, 50, 70, 100)
    const validProgressValues = [0, 10, 30, 50, 70, 100];
    if (!validProgressValues.includes(courseProgress)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid progress value. Only 0, 10, 30, 50, 70, and 100 are allowed.'
      }, { status: 400 });
    }

    const batch = await Batch.findByIdAndUpdate(
      batchId,
      { courseProgress, updatedAt: new Date() },
      { new: true }
    );

    if (!batch) {
      return NextResponse.json({
        success: false,
        error: 'Batch not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Course progress updated for all students',
      data: {
        batchId,
        courseProgress
      }
    });
  } catch (error: any) {
    console.error('Error updating batch progress:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET - Get batch course progress
export async function GET(request: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({
        success: false,
        error: 'Batch ID is required'
      }, { status: 400 });
    }

    const batch = await Batch.findById(batchId).lean();

    if (!batch) {
      return NextResponse.json({
        success: false,
        error: 'Batch not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        batchId: batch._id.toString(),
        courseProgress: batch.courseProgress || 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching batch progress:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}