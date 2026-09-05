import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const Batch = require('@/models/Batch');
const bcrypt = require('bcryptjs');

/** Extracts the numeric portion of a studentId (e.g. STU0042 → 42), or null. */
function parseStudentIdNumber(studentId: unknown): number | null {
  if (typeof studentId !== 'string') return null;
  const match = studentId.match(/^STU(\d+)$/);
  if (!match) return null;
  const parsed = parseInt(match[1], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Returns the next safe studentId by scanning the highest existing one. */
async function allocateNextStudentId(): Promise<{ nextNumber: number }> {
  const existing = await Student.find({}).select('studentId').lean();
  let highest = 0;
  for (const s of existing as any[]) {
    const n = parseStudentIdNumber(s.studentId);
    if (n !== null && n > highest) highest = n;
  }
  return { nextNumber: highest + 1 };
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
    // Store plaintext password alongside the hash so admins can view it
    const plainPassword = data.password;

    // Derive the next studentId from the highest existing one rather than from
    // countDocuments(). A count-based approach collides whenever any student has
    // been deleted (count falls behind the highest ID → duplicate key → 500).
    const { nextNumber } = await allocateNextStudentId();

    let newStudent: any = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const studentId = `STU${String(nextNumber + attempt).padStart(4, '0')}`;
      try {
        newStudent = await Student.create({
          name: data.name,
          email: data.email,
          password: hashedPassword,
          plainPassword,
          phone: data.phone,
          studentId,
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
          if (!batch.studentIds) batch.studentIds = [];
          batch.studentIds.push(newStudent._id);
          await batch.save();
          
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
