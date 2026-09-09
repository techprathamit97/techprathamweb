import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const Batch = require('@/models/Batch');
const bcrypt = require('bcryptjs');

/** Extract the numeric part of a studentId like STU0042 -> 42, else null. */
function parseStudentIdNumber(studentId: unknown): number | null {
  if (typeof studentId !== 'string') return null;
  const match = studentId.match(/^STU(\d+)$/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isNaN(n) ? null : n;
}

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

    // Derive the next studentId from the HIGHEST existing id, not the document
    // count. A count collides with an existing id the moment any student has been
    // deleted (e.g. STU0001-STU0005 with STU0003 removed => count 4 => regenerates
    // the already-taken STU0004/STU0005). studentId is a unique index, so that
    // collision surfaced as a 500 here. Retry on the rare concurrent-create race.
    const existing = await Student.find({}).select('studentId').lean();
    let highest = 0;
    for (const s of existing as any[]) {
      const n = parseStudentIdNumber(s.studentId);
      if (n !== null && n > highest) highest = n;
    }
    const nextNumber = highest + 1;

    let newStudent: any = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const studentId = `STU${String(nextNumber + attempt).padStart(4, '0')}`;
      try {
        newStudent = await Student.create({
          name: data.name,
          email: data.email,
          password: hashedPassword,
          plainPassword: data.password,
          phone: data.phone,
          studentId: studentId,
          isActive: true
        });
        break;
      } catch (createError: any) {
        lastError = createError;
        const isStudentIdClash =
          createError?.code === 11000 &&
          Object.keys(createError?.keyPattern || createError?.keyValue || {}).includes('studentId');
        if (!isStudentIdClash) throw createError;
        console.warn(`studentId ${studentId} already taken, retrying`);
      }
    }

    if (!newStudent) throw lastError || new Error('Could not allocate a studentId');
    
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
      studentId: newStudent.studentId,
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

    // Duplicate key (email or studentId) — report which field clashed
    if (error?.code === 11000) {
      const field = Object.keys(error?.keyPattern || error?.keyValue || {})[0] || 'field';
      return NextResponse.json(
        { error: `A student with this ${field} already exists` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to enroll student', message: error.message },
      { status: 500 }
    );
  }
}
