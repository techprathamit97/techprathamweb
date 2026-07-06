import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const Batch = require('@/models/Batch');
const bcrypt = require('bcryptjs');

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    
    const data = await req.json();
    
    // Validate required fields
    if (!data.name || !data.email || !data.phone || !data.password) {
      return NextResponse.json(
        { error: 'Name, email, phone, and password are required' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingStudent = await Student.findOne({ email: data.email });
    if (existingStudent) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }
    
    // Hash the provided password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // Generate studentId
    const studentCount = await Student.countDocuments({});
    const studentId = `STU${String(studentCount + 1).padStart(4, '0')}`;
    
    // Create student
    const newStudent = await Student.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      phone: data.phone,
      studentId: studentId,
      isActive: true
    });
    
    // Add to batch if batchId provided
    if (data.batchId) {
      try {
        const batch = await Batch.findById(data.batchId);
        if (batch) {
          // Add student to batch's studentIds array
          if (!batch.studentIds) batch.studentIds = [];
          batch.studentIds.push(newStudent._id);
          await batch.save();
          
          // Add batch to student's batches array
          if (!newStudent.batches) newStudent.batches = [];
          newStudent.batches.push(data.batchId);
          await newStudent.save();
        }
      } catch (err) {
        console.error('Error adding student to batch:', err);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Student enrolled successfully',
      student: {
        _id: newStudent._id,
        studentId: newStudent.studentId,
        name: newStudent.name,
        email: newStudent.email,
        phone: newStudent.phone,
        isActive: newStudent.isActive
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Failed to enroll student:', error);
    return NextResponse.json(
      { error: 'Failed to enroll student', message: error.message },
      { status: 500 }
    );
  }
}
