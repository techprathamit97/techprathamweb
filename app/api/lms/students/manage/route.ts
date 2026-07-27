import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');

// GET - Check student restriction status
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

    const student = await Student.findById(studentId);

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      isRestricted: student.isRestricted || false,
      isActive: student.isActive || false,
      studentId: student._id
    });
  } catch (error: any) {
    console.error('Check restriction error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check restriction status' },
      { status: 500 }
    );
  }
}

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
        updateData = {
          isRestricted: true,
          restrictReason: data.reason || '',
          restrictedAt: new Date()
        };
        break;
      case 'unrestrict':
        updateData = {
          isRestricted: false,
          restrictReason: '',
          restrictedAt: null
        };
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