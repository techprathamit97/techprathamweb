import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Trainer = require('@/models/Trainer');
const Batch = require('@/models/Batch');

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    
    const { searchParams } = new URL(req.url);
    const trainerId = searchParams.get('trainerId');
    
    if (!trainerId) {
      return NextResponse.json(
        { error: 'Trainer ID is required' },
        { status: 400 }
      );
    }
    
    // Find trainer by trainerId
    const trainer = await Trainer.findOne({ trainerId: trainerId }).lean();
    
    if (!trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }
    
    // Get trainer's batches
    const batches = await Batch.find({ trainerId: trainer._id })
      .populate('courseId')
      .populate('studentIds')
      .lean();
    
    const classTimingData = {
      trainer: {
        trainerId: trainer.trainerId,
        name: trainer.name,
        email: trainer.email
      },
      batches: batches.map((batch: any) => ({
        _id: batch._id,
        batchName: batch.batchName,
        courseTitle: batch.courseId?.title || 'N/A',
        currentTiming: batch.timing || 'Not set',
        startDate: batch.startDate,
        endDate: batch.endDate,
        days: batch.days || [],
        status: batch.status || 'active',
        studentCount: batch.studentIds?.length || 0,
        meetingLink: batch.meetingLink || ''
      }))
    };
    
    return NextResponse.json({
      success: true,
      data: classTimingData
    });
    
  } catch (error: any) {
    console.error('Class timing API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class timing data', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectMongo();
    
    const { trainerId, batchId, timing, days, startDate, endDate } = await req.json();
    
    if (!trainerId || !batchId || !timing) {
      return NextResponse.json(
        { error: 'Trainer ID, Batch ID, and timing are required' },
        { status: 400 }
      );
    }
    
    // Find trainer
    const trainer = await Trainer.findOne({ trainerId: trainerId });
    if (!trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }
    
    // Find and update batch
    const batch = await Batch.findOne({ _id: batchId, trainerId: trainer._id });
    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found or not assigned to trainer' },
        { status: 404 }
      );
    }
    
    // Update batch timing
    batch.timing = timing;
    if (days) batch.days = days;
    if (startDate) batch.startDate = new Date(startDate);
    if (endDate) batch.endDate = new Date(endDate);
    batch.updatedAt = new Date();
    
    await batch.save();
    
    return NextResponse.json({
      success: true,
      message: 'Class timing updated successfully',
      batch: {
        _id: batch._id,
        batchName: batch.batchName,
        timing: batch.timing,
        days: batch.days,
        startDate: batch.startDate,
        endDate: batch.endDate
      }
    });
    
  } catch (error: any) {
    console.error('Update class timing error:', error);
    return NextResponse.json(
      { error: 'Failed to update class timing', message: error.message },
      { status: 500 }
    );
  }
}