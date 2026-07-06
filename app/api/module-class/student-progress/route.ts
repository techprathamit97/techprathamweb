import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const ModuleClass = require('@/models/ModuleClass');

// PUT - Update student progress for a module class
export async function PUT(request: NextRequest) {
  try {
    await connectMongo();

    const body = await request.json();
    const { classId, studentId, progress, trainerName } = body;

    if (!classId || !studentId || progress === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Class ID, Student ID, and Progress are required'
      }, { status: 400 });
    }

    // Validate progress values (only allow 0, 10, 30, 70, 100)
    const validProgressValues = [0, 10, 30, 70, 100];
    if (!validProgressValues.includes(progress)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid progress value. Only 0, 10, 30, 70, and 100 are allowed.'
      }, { status: 400 });
    }

    const moduleClass = await ModuleClass.findById(classId);

    if (!moduleClass) {
      return NextResponse.json({
        success: false,
        error: 'Class not found'
      }, { status: 404 });
    }

    // Find existing progress entry for this student
    const existingProgressIndex = moduleClass.studentProgress.findIndex(
      (sp: any) => sp.studentId.toString() === studentId
    );

    if (existingProgressIndex >= 0) {
      // Update existing progress
      moduleClass.studentProgress[existingProgressIndex].progress = progress;
      moduleClass.studentProgress[existingProgressIndex].updatedAt = new Date();
      moduleClass.studentProgress[existingProgressIndex].updatedBy = trainerName || 'Trainer';
    } else {
      // Add new progress entry
      moduleClass.studentProgress.push({
        studentId,
        progress,
        updatedAt: new Date(),
        updatedBy: trainerName || 'Trainer'
      });
    }

    await moduleClass.save();

    return NextResponse.json({
      success: true,
      message: 'Student progress updated successfully',
      data: {
        studentId,
        progress,
        updatedAt: new Date()
      }
    });
  } catch (error: any) {
    console.error('Error updating student progress:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET - Fetch student progress for a module class
export async function GET(request: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const studentId = searchParams.get('studentId');

    if (!classId) {
      return NextResponse.json({
        success: false,
        error: 'Class ID is required'
      }, { status: 400 });
    }

    const moduleClass = await ModuleClass.findById(classId).lean();

    if (!moduleClass) {
      return NextResponse.json({
        success: false,
        error: 'Class not found'
      }, { status: 404 });
    }

    // If studentId is provided, return only that student's progress
    if (studentId) {
      const studentProgress = moduleClass.studentProgress?.find(
        (sp: any) => sp.studentId.toString() === studentId
      );

      return NextResponse.json({
        success: true,
        data: studentProgress || null
      });
    }

    // Otherwise, return all student progress
    return NextResponse.json({
      success: true,
      data: moduleClass.studentProgress || []
    });
  } catch (error: any) {
    console.error('Error fetching student progress:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}