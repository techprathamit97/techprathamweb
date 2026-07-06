import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const bcrypt = require('bcryptjs');

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    
    const { studentId, password } = await req.json();
    
    console.log('=== PASSWORD VERIFICATION DEBUG ===');
    console.log('StudentId:', studentId);
    console.log('Password:', password);
    
    const student = await Student.findOne({ studentId: studentId });
    
    if (!student) {
      return NextResponse.json({
        success: false,
        error: 'Student not found',
        availableStudents: await Student.find({}, { studentId: 1, name: 1 }).limit(5)
      });
    }
    
    console.log('Student found:', student.name);
    console.log('Stored hash:', student.password);
    
    // Test with bcryptjs
    const bcryptjsResult = await bcrypt.compare(password, student.password);
    console.log('bcryptjs result:', bcryptjsResult);
    
    // Test with bcrypt (alternative)
    let bcryptResult = null;
    try {
      const bcryptAlt = require('bcrypt');
      bcryptResult = await bcryptAlt.compare(password, student.password);
      console.log('bcrypt result:', bcryptResult);
    } catch (e: any) {
      console.log('bcrypt not available:', e.message);
    }
    
    // Manual hash check for debugging
    const testHash = await bcrypt.hash(password, 10);
    console.log('New hash for same password:', testHash);
    
    return NextResponse.json({
      success: true,
      student: {
        studentId: student.studentId,
        name: student.name,
        email: student.email
      },
      passwordTests: {
        bcryptjs: bcryptjsResult,
        bcrypt: bcryptResult,
        storedHash: student.password,
        newHashSample: testHash
      }
    });
    
  } catch (error: any) {
    console.error('Password verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed', message: error.message },
      { status: 500 }
    );
  }
}