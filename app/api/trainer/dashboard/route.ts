import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Trainer = require('@/models/Trainer');
const Batch = require('@/models/Batch');
const Student = require('@/models/Student');
const Course = require('@/models/Course');

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
    
    console.log('Trainer dashboard API called with trainerId:', trainerId);
    
    // Find trainer ONLY in the Trainer collection (not User collection)
    let trainer = null;
    
    // Try 1: Find by MongoDB _id in Trainer collection
    if (trainerId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Looking for trainer by MongoDB _id in Trainer collection:', trainerId);
      trainer = await Trainer.findById(trainerId).lean();
    }
    
    // Try 2: Find by trainerId field in Trainer collection
    if (!trainer) {
      console.log('Looking for trainer by trainerId field in Trainer collection:', trainerId);
      trainer = await Trainer.findOne({ trainerId: trainerId }).lean();
    }
    
    // Try 3: Find by email in Trainer collection
    if (!trainer && trainerId.includes('@')) {
      console.log('Looking for trainer by email in Trainer collection:', trainerId);
      trainer = await Trainer.findOne({ email: trainerId }).lean();
    }
    
    if (!trainer) {
      console.log('Trainer not found in Trainer collection');
      
      // Debug: Show what trainers exist in Trainer collection
      const allTrainers = await Trainer.find({}).select('_id trainerId name email').limit(10).lean();
      console.log('Available trainers in Trainer collection:', allTrainers);
      
      return NextResponse.json(
        { 
          error: 'Trainer not found',
          
        },
        { status: 404 }
      );
    }
    
    console.log('Found trainer in Trainer collection:', {
      _id: trainer._id,
      trainerId: trainer.trainerId,
      name: trainer.name,
      email: trainer.email
    });
    
    // Get batches assigned to this trainer using the MongoDB _id
    const batches = await Batch.find({ 
      trainerId: trainer._id 
    })
    .populate('courseId')
    .populate('studentIds')
    .lean();
    
    console.log(`Found ${batches.length} batches for trainer ${trainer.name}`);
    
    // Format batch data for dashboard
    const formattedBatches = batches.map((batch: any) => ({
      _id: batch._id,
      batchId: batch._id.toString(),
      batchName: batch.batchName,
      course_title: batch.courseId?.title || 'N/A',
      courseId: batch.courseId?._id || batch.courseId,
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
    
    console.log('Formatted batches:', formattedBatches.length);
    
    // Get all students from the batches
    const allStudents = batches.reduce((acc: any[], batch: any) => {
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
        _id: trainer._id.toString(),
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
        activeBatches: formattedBatches.filter((b: any) => b.status === 'active').length,
        totalStudents: allStudents.length,
        completedStudents: allStudents.filter((s: any) => s.courseCompletion).length
      }
    };
    
    console.log('Returning dashboard data with', dashboardData.batches.length, 'batches');
    
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