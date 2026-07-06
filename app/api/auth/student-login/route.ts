import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const bcrypt = require('bcryptjs');

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    
    const { studentId, password } = await req.json();
    
    console.log('=== STUDENT LOGIN DEBUG ===');
    console.log('Login attempt with identifier:', studentId);
    console.log('Password provided:', password ? 'Yes' : 'No');
    
    if (!studentId || !password) {
      console.log('Missing credentials');
      return NextResponse.json(
        { error: 'Email/Student ID and password are required' },
        { status: 400 }
      );
    }
    
    // Find student by email OR studentId
    const student = await Student.findOne({
      $or: [
        { email: studentId.trim() },
        { studentId: studentId.trim() }
      ]
    });
    
    console.log('Student found:', student ? 'Yes' : 'No');
    
    if (!student) {
      // Let's also check what students exist
      const allStudents = await Student.find({}, { studentId: 1, name: 1, email: 1 }).limit(10);
      console.log('Available students:', allStudents.map((s: any) => ({
        studentId: s.studentId,
        name: s.name,
        email: s.email
      })));
      
      return NextResponse.json(
        { error: 'Invalid Email/Student ID or password' },
        { status: 401 }
      );
    }
    
    console.log('Found student details:', {
      _id: student._id,
      studentId: student.studentId,
      name: student.name,
      email: student.email,
      isActive: student.isActive,
      hasPassword: !!student.password
    });
    
    // Check if student is active
    if (!student.isActive) {
      console.log('Student account is inactive');
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact admin.' },
        { status: 401 }
      );
    }
    
    // Verify password
    console.log('Comparing password...');
    const isPasswordValid = await bcrypt.compare(password, student.password);
    console.log('Password comparison result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Password validation failed');
      return NextResponse.json(
        { error: 'Invalid Email/Student ID or password' },
        { status: 401 }
      );
    }
    
    console.log('Login successful for student:', student.email);
    
    // Return student data (excluding password)
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      student: {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        phone: student.phone,
        enrollmentDate: student.enrollmentDate,
        isActive: student.isActive,
        batches: student.batches || []
      }
    });
    
  } catch (error: any) {
    console.error('Student login error:', error);
    return NextResponse.json(
      { error: 'Login failed', message: error.message },
      { status: 500 }
    );
  }
}