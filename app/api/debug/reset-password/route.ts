import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const bcrypt = require('bcryptjs');

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    
    const { studentId, newPassword } = await req.json();
    
    if (!studentId || !newPassword) {
      return NextResponse.json(
        { error: 'Student ID and new password are required' },
        { status: 400 }
      );
    }
    
    const student = await Student.findOne({ studentId: studentId });
    
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the student's password
    await Student.findByIdAndUpdate(student._id, { password: hashedPassword });
    
    console.log(`Password reset for student ${studentId} to: ${newPassword}`);
    
    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      student: {
        studentId: student.studentId,
        name: student.name,
        newPassword: newPassword
      }
    });
    
  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Password reset failed', message: error.message },
      { status: 500 }
    );
  }
}