import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Trainer = require('@/models/Trainer');
const Batch = require('@/models/Batch');
const Student = require('@/models/Student');

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
    
    // Get batches assigned to this trainer
    const batches = await Batch.find({ 
      trainerId: trainer._id 
    })
    .populate('courseId')
    .populate('studentIds')
    .lean();
    
    // Format batch data for dashboard
    const formattedBatches = batches.map(batch => ({
      _id: batch._id,
      batchId: batch._id.toString(),
      batchName: batch.batchName,
      course_title: batch.courseId?.title || 'N/A',
      schedule: {
        startDate: batch.startDate,
        endDate: batch.endDate,
        timing: batch.timing || 'Not set',
        days: batch.days || []
      },
      capacity: batch.capacity || 30,
      enrolled_students: (batch.studentIds || []).map((student: any) => student._id),
      status: batch.status || 'active',
      meetingLink: batch.meetingLink || ''
    }));
    
    // Get all students from the batches
    const allStudents = batches.reduce((acc: any[], batch) => {
      const batchStudents = (batch.studentIds || []).map((student: any) => ({
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        phone: student.phone,
        course_title: batch.courseId?.title || 'N/A',
        batchId: batch._id.toString(),
        progressPercentage: 0, // You can implement progress tracking later
        courseCompletion: false
      }));
      return [...acc, ...batchStudents];
    }, []);
    
    const dashboardData = {
      trainer: {
        trainerId: trainer.trainerId,
        name: trainer.name,
        email: trainer.email,
        phone: trainer.phone,
        experience: trainer.experience,
        expertise: trainer.expertise || [],
        bio: trainer.bio,
        rating: trainer.rating || 0,
        isActive: trainer.isActive
      },
      batches: formattedBatches,
      students: allStudents,
      stats: {
        totalBatches: formattedBatches.length,
        activeBatches: formattedBatches.filter(b => b.status === 'active').length,
        totalStudents: allStudents.length,
        completedStudents: allStudents.filter(s => s.courseCompletion).length
      }
    };
    
    return NextResponse.json({
      success: true,
      data: dashboardData
    });
    
  } catch (error: any) {
    console.error('Trainer dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', message: error.message },
      { status: 500 }
    );
  }
}