import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
const Batch = require("@/models/Batch");
const Course = require("@/models/Course");
const Trainer = require("@/models/Trainer");
const Student = require("@/models/Student");

export async function GET() {
  try {
    await connectMongo();
    
    const batches = await Batch.find({})
      .populate('courseId')
      .populate('trainerId')
      .sort({ createdAt: -1 })
      .lean();
    
    // Get student count for each batch
    const batchesWithDetails = batches.map((batch: any) => ({
      _id: batch._id,
      batchId: batch._id.toString(),
      batchName: batch.batchName,
      batchCode: batch.batchCode,
      courseId: batch.courseId?._id?.toString() || batch.courseId || '',
      course_title: batch.courseId?.title || 'N/A',
      trainerId: batch.trainerId?._id?.toString() || '',
      trainerName: batch.trainerId?.name || 'Not Assigned',
      trainer: batch.trainerId ? {
        name: batch.trainerId.name || 'Not Assigned',
        email: batch.trainerId.email || '',
        profile: batch.trainerId.profile || '',
        experience: batch.trainerId.experience || 'N/A',
        rating: batch.trainerId.rating || 0
      } : {
        name: 'Not Assigned',
        email: '',
        profile: '',
        experience: 'N/A',
        rating: 0
      },
      studentIds: batch.studentIds || [],
      studentCount: (batch.studentIds || []).length,
      startDate: batch.startDate,
      endDate: batch.endDate,
      timing: batch.timing || '',
      capacity: batch.capacity || 30,
      status: batch.status || 'active',
      meetingLink: batch.meetingLink || '',
      description: batch.description || '',
      createdAt: batch.createdAt
    }));
    
    return NextResponse.json(batchesWithDetails);
  } catch (error) {
    console.error('Failed to fetch batches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batches' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    
    const data = await req.json();
    
    if (!data.batchName || !data.courseId) {
      return NextResponse.json(
        { error: 'Batch name and course are required' },
        { status: 400 }
      );
    }
    
    const newBatch = await Batch.create({
      batchName: data.batchName,
      batchCode: data.batchCode || `BATCH-${Date.now()}`,
      courseId: data.courseId,
      trainerId: data.trainerId,
      studentIds: data.studentIds || [],
      startDate: data.startDate,
      endDate: data.endDate,
      timing: data.timing,
      capacity: data.capacity || 30,
      meetingLink: data.meetingLink,
      description: data.description,
      status: 'active'
    });
    
    return NextResponse.json(newBatch, { status: 201 });
  } catch (error) {
    console.error('Failed to create batch:', error);
    return NextResponse.json(
      { error: 'Failed to create batch' },
      { status: 500 }
    );
  }
}
