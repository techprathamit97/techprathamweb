import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const Batch = require('@/models/Batch');

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Find student
    const mongoose = require('mongoose');
    const isValidObjectId = mongoose.Types.ObjectId.isValid(studentId);

    let student;
    if (isValidObjectId) {
      student = await Student.findById(studentId).lean();
    } else {
      student = await Student.findOne({ studentId: studentId }).lean();
    }

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Get batches where this student is enrolled
    const batches = await Batch.find({
      studentIds: student._id
    })
    .populate('courseId')
    .populate('trainerId')
    .lean();

    // Format batch data with trainer info
    const formattedBatches = batches.map((batch: any) => ({
      _id: batch._id,
      batchId: batch._id.toString(),
      batchName: batch.batchName,
      batchCode: batch.batchCode || '',
      courseId: batch.courseId?._id,
      courseTitle: batch.courseId?.title || 'N/A',
      courseDescription: batch.courseId?.description || '',
      courseDetails: {
        category: batch.courseId?.category || 'Programming',
        level: batch.courseId?.level || 'Intermediate',
        duration: batch.courseId?.duration || '3 months'
      },
      schedule: {
        startDate: batch.startDate,
        endDate: batch.endDate,
        timing: batch.timing,
        days: batch.days || []
      },
      startDate: batch.startDate,
      endDate: batch.endDate,
      timing: batch.timing,
      days: batch.days || [],
      capacity: batch.capacity || 30,
      enrolledStudents: batch.studentIds?.length || 0,
      status: batch.status || 'active',
      meetingLink: batch.meetingLink || '',
      studentProgress: {
        progressPercentage: 0,
        courseCompletion: false,
        lastAccessedAt: null,
        quizScores: []
      },
      paymentInfo: {
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        paymentStatus: 'pending'
      },
      trainer: batch.trainerId ? {
        _id: batch.trainerId._id,
        trainerId: batch.trainerId.trainerId || '',
        name: batch.trainerId.name || 'Not Assigned',
        email: batch.trainerId.email || '',
        phone: batch.trainerId.phone || '',
        profile: batch.trainerId.profile || '',
        experience: batch.trainerId.experience || '',
        rating: batch.trainerId.rating || 0,
        bio: batch.trainerId.bio || '',
        expertise: batch.trainerId.expertise || []
      } : null
    }));

    // Get unique trainers and courses
    const uniqueTrainers = new Map();
    const uniqueCourses = new Map();

    formattedBatches.forEach((batch: any) => {
      if (batch.trainer) {
        uniqueTrainers.set(batch.trainer._id.toString(), batch.trainer);
      }
      if (batch.courseId) {
        uniqueCourses.set(batch.courseId.toString(), batch.courseTitle);
      }
    });

    const summary = {
      totalBatches: formattedBatches.length,
      totalTrainers: uniqueTrainers.size,
      totalCourses: uniqueCourses.size
    };

    const trainers = Array.from(uniqueTrainers.values());

    return NextResponse.json({
      success: true,
      data: {
        student: {
          _id: student._id,
          studentId: student.studentId,
          name: student.name,
          email: student.email
        },
        batches: formattedBatches,
        summary,
        trainers,
        courseNames: Array.from(uniqueCourses.values())
      }
    });

  } catch (error: any) {
    console.error('Student batches API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batches', message: error.message },
      { status: 500 }
    );
  }
}