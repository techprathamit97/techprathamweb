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
    
    const meetingLinkData = {
      trainer: {
        trainerId: trainer.trainerId,
        name: trainer.name,
        email: trainer.email
      },
      batches: batches.map(batch => ({
        _id: batch._id,
        batchName: batch.batchName,
        courseTitle: batch.courseId?.title || 'N/A',
        meetingLink: batch.meetingLink || '',
        timing: batch.timing || 'Not set',
        days: batch.days || [],
        status: batch.status || 'active',
        studentCount: batch.studentIds?.length || 0,
        startDate: batch.startDate,
        endDate: batch.endDate
      }))
    };
    
    return NextResponse.json({
      success: true,
      data: meetingLinkData
    });
    
  } catch (error: any) {
    console.error('Meeting link API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting link data', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectMongo();
    
    const { trainerId, batchId, meetingLink } = await req.json();
    
    if (!trainerId || !batchId || !meetingLink) {
      return NextResponse.json(
        { error: 'Trainer ID, Batch ID, and meeting link are required' },
        { status: 400 }
      );
    }
    
    // Validate meeting link format
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(meetingLink)) {
      return NextResponse.json(
        { error: 'Please provide a valid meeting link (must start with http:// or https://)' },
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
    
    // Update meeting link
    batch.meetingLink = meetingLink;
    batch.updatedAt = new Date();
    
    await batch.save();
    
    return NextResponse.json({
      success: true,
      message: 'Meeting link updated successfully',
      batch: {
        _id: batch._id,
        batchName: batch.batchName,
        meetingLink: batch.meetingLink
      }
    });
    
  } catch (error: any) {
    console.error('Update meeting link error:', error);
    return NextResponse.json(
      { error: 'Failed to update meeting link', message: error.message },
      { status: 500 }
    );
  }
}