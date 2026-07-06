import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');

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

    // Find student by studentId (string) or _id (ObjectId)
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

    // Populate batches with course and trainer data
    const Batch = require('@/models/Batch');
    const Course = require('@/models/Course');
    const Trainer = require('@/models/Trainer');

    const populatedBatches = await Batch.find({
      _id: { $in: student.batches }
    })
    .populate('courseId')
    .populate('trainerId')
    .lean();

    // Transform batches into courses format
    const courses = populatedBatches.map(batch => {
      const course = batch.courseId || {};
      const trainer = batch.trainerId || {};

      return {
        title: course.title || 'Unknown Course',
        category: course.category || '',
        level: course.level || '',
        duration: course.duration || '',
        progress: 0,
        completed: false,
        batchId: batch._id.toString(),
        trainer: trainer.name || 'Not Assigned',
        trainerEmail: trainer.email || '',
        trainerPhone: trainer.phone || '',
        trainerExperience: trainer.experience || '',
        trainerRating: trainer.rating || 0,
        enrolledDate: batch.startDate || student.enrollmentDate,
        hasTrainer: !!trainer._id,
        schedule: batch.timing ? {
          timing: batch.timing,
          days: [],
          startDate: batch.startDate,
          endDate: batch.endDate
        } : null,
        meetingLink: batch.meetingLink || null,
        invoiceNumber: '',
        totalAmount: course.price || 0,
        paidAmount: 0,
        pendingAmount: course.price || 0,
        paymentStatus: 'pending'
      };
    });

    // Get unique trainers from batches
    const trainers = populatedBatches
      .filter(batch => batch.trainerId)
      .map(batch => {
        const trainer = batch.trainerId || {};
        const course = batch.courseId || {};
        return {
          name: trainer.name || '',
          email: trainer.email || '',
          phone: trainer.phone || '',
          profile: trainer.profile || '',
          experience: trainer.experience || '',
          rating: trainer.rating || 0,
          course: course.title || '',
          batchId: batch._id.toString(),
          courseCategory: course.category || '',
          courseLevel: course.level || '',
          courseDuration: course.duration || ''
        };
      });

    // Calculate stats
    const stats = {
      totalCourses: courses.length,
      completedCourses: courses.filter(c => c.completed).length,
      inProgressCourses: courses.filter(c => !c.completed).length,
      avgProgress: courses.length > 0
        ? Math.round(courses.reduce((acc, c) => acc + c.progress, 0) / courses.length)
        : 0,
      totalPaid: courses.reduce((acc, c) => acc + c.paidAmount, 0),
      totalAmount: courses.reduce((acc, c) => acc + c.totalAmount, 0),
      pendingAmount: courses.reduce((acc, c) => acc + c.pendingAmount, 0),
      totalBatches: courses.length,
      activeBatches: courses.filter(c => !c.completed).length,
      upcomingClasses: 0,
      totalAssignments: 0,
      pendingAssignments: 0,
      completedAssignments: 0,
      totalQuizzes: 0,
      passedQuizzes: 0,
      avgQuizScore: 0,
      certificates: 0
    };

    return NextResponse.json({
      success: true,
      data: {
        studentInfo: {
          studentId: student.studentId,
          name: student.name,
          email: student.email,
          phone: student.phone,
          joinedDate: student.enrollmentDate || new Date().toISOString()
        },
        stats,
        courses,
        trainers,
        batches: populatedBatches.map(b => ({
          batchId: b._id.toString(),
          batchName: b.batchName,
          courseTitle: b.courseId?.title || '',
          status: b.status || 'active',
          enrolledStudents: b.studentIds?.length || 0,
          capacity: b.capacity || 30,
          meetingLink: b.meetingLink || '',
          schedule: {
            timing: b.timing || '',
            days: [],
            startDate: b.startDate,
            endDate: b.endDate
          }
        })),
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        phone: student.phone,
        enrollmentDate: student.enrollmentDate,
        isActive: student.isActive,
        profile: student.profile || '',
        bio: student.bio || '',
        avatar: student.avatar || ''
      }
    });

  } catch (error: any) {
    console.error('Student profile API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const { studentId, name, phone, profile, bio } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    const mongoose = require('mongoose');
    const isValidObjectId = mongoose.Types.ObjectId.isValid(studentId);

    let student;
    if (isValidObjectId) {
      student = await Student.findByIdAndUpdate(
        studentId,
        { $set: { name, phone, profile, bio } },
        { new: true }
      );
    } else {
      student = await Student.findOneAndUpdate(
        { studentId: studentId },
        { $set: { name, phone, profile, bio } },
        { new: true }
      );
    }

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        phone: student.phone,
        profile: student.profile,
        bio: student.bio
      }
    });

  } catch (error: any) {
    console.error('Student profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', message: error.message },
      { status: 500 }
    );
  }
}