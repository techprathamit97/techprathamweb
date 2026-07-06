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
    
    // Get all students from trainer's batches
    const allStudents = [];
    const studentsByBatch = [];
    
    for (const batch of batches) {
      const batchStudents = (batch.studentIds || []).map((student: any) => ({
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        phone: student.phone,
        course_title: batch.courseId?.title || 'N/A',
        course_desc: batch.courseId?.description || '',
        category: batch.courseId?.category || 'General',
        level: batch.courseId?.level || 'Beginner',
        duration: batch.courseId?.duration || '3 months',
        progressPercentage: Math.floor(Math.random() * 100), // Random for demo
        courseCompletion: Math.random() > 0.7, // Random completion status
        enrolledDate: student.enrollmentDate || student.createdAt,
        lastAccessedAt: null,
        batches: [{
          batchId: batch._id.toString(),
          course_title: batch.courseId?.title || 'N/A',
          status: batch.status || 'active',
          schedule: {
            startDate: batch.startDate,
            endDate: batch.endDate,
            timing: batch.timing
          },
          meetingLink: batch.meetingLink || ''
        }],
        invoices: [], // You can implement invoice logic later
        totalAmount: 50000,
        paidAmount: Math.floor(Math.random() * 50000),
        pendingAmount: 0,
        paymentStatus: Math.random() > 0.3 ? 'paid' : 'pending',
        quizScores: [],
        verifyPayment: true,
        feeType: 'full'
      }));
      
      allStudents.push(...batchStudents);
      
      studentsByBatch.push({
        batchId: batch._id.toString(),
        course_title: batch.courseId?.title || 'N/A',
        status: batch.status || 'active',
        schedule: {
          startDate: batch.startDate,
          endDate: batch.endDate,
          timing: batch.timing
        },
        capacity: batch.capacity || 30,
        students: batchStudents
      });
    }
    
    // Calculate stats
    const completedStudents = allStudents.filter(s => s.courseCompletion).length;
    const totalRevenue = allStudents.reduce((sum, s) => sum + s.totalAmount, 0);
    const collectedRevenue = allStudents.reduce((sum, s) => sum + s.paidAmount, 0);
    
    const studentsData = {
      trainer: {
        trainerId: trainer.trainerId,
        name: trainer.name,
        email: trainer.email,
        phone: trainer.phone,
        experience: trainer.experience,
        rating: trainer.rating || 4.5
      },
      students: allStudents,
      batches: batches.map(batch => ({
        batchId: batch._id.toString(),
        course_title: batch.courseId?.title || 'N/A',
        status: batch.status || 'active'
      })),
      studentsByBatch: studentsByBatch,
      stats: {
        totalStudents: allStudents.length,
        completedStudents: completedStudents,
        inProgressStudents: allStudents.length - completedStudents,
        totalRevenue: totalRevenue,
        collectedRevenue: collectedRevenue,
        pendingRevenue: totalRevenue - collectedRevenue,
        totalBatches: batches.length
      }
    };
    
    return NextResponse.json({
      success: true,
      data: studentsData
    });
    
  } catch (error: any) {
    console.error('Trainer students API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students data', message: error.message },
      { status: 500 }
    );
  }
}