import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');

// PUT - Restrict/Unrestrict student dashboard access
export async function PUT(req: NextRequest) {
  try {
    await connectMongo();

    const data = await req.json();
    const { studentId, action } = data;

    if (!studentId || !action) {
      return NextResponse.json(
        { error: 'Student ID and action are required' },
        { status: 400 }
      );
    }

    let updateData: any = {};

    switch (action) {
      case 'restrict':
        updateData = { isRestricted: true };
        break;
      case 'unrestrict':
        updateData = { isRestricted: false };
        break;
      case 'deactivate':
        updateData = { isActive: false };
        break;
      case 'activate':
        updateData = { isActive: true };
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const student = await Student.findByIdAndUpdate(
      studentId,
      { $set: updateData },
      { new: true }
    );

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Student ${action} successful`,
      student: {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        isActive: student.isActive,
        isRestricted: student.isRestricted
      }
    });
  } catch (error: any) {
    console.error('Student management error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to manage student' },
      { status: 500 }
    );
  }
}

// DELETE - Delete student account
export async function DELETE(req: NextRequest) {
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

    const student = await Student.findByIdAndDelete(studentId);

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Student ${student.name} (${student.studentId}) has been deleted`
    });
  } catch (error: any) {
    console.error('Student deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete student' },
      { status: 500 }
    );
  }
}