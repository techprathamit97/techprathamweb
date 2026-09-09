import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
const Student = require('@/models/Student');
const Batch = require('@/models/Batch');
const Course = require('@/models/Course');
const bcrypt = require('bcryptjs');

export async function GET() {
  try {
    await connectMongo();
    
    const students = await Student.find({})
      .sort({ createdAt: -1 })
      .lean();
    
    // Get batch info for each student
    const studentsWithDetails = await Promise.all(
      students.map(async (student: any) => {
        let batches = [];
        try {
          batches = await Batch.find({ studentIds: student._id })
            .populate({ path: 'courseId', strictPopulate: false })
            .lean();
        } catch (err) {
          console.error('Error fetching batches:', err);
        }
        
        return {
          _id: student._id,
          studentId: student.studentId || student._id.toString(),
          name: student.name,
          email: student.email,
          phone: student.phone,
          isActive: student.isActive,
          isRestricted: student.isRestricted || false,
          enrollmentDate: student.enrollmentDate,
          batches: batches.map((b: any) => ({
            batchId: b._id.toString(),
            batchName: b.batchName,
            courseName: b.courseId?.title || 'N/A',
            coursePrice: b.courseId?.price || 0
          })),
          createdAt: student.createdAt
        };
      })
    );
    
    return NextResponse.json(studentsWithDetails);
  } catch (error) {
    console.error('Failed to fetch students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    
    const data = await req.json();
    
    if (!data.name || !data.email || !data.password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
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
    
    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Derive next studentId from the highest existing id (not the doc count,
    // which collides once any student has been deleted). Retry on race.
    const existing = await Student.find({}).select('studentId').lean();
    let highest = 0;
    for (const s of existing as any[]) {
      const m = typeof s.studentId === 'string' ? s.studentId.match(/^STU(\d+)$/) : null;
      if (m) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n) && n > highest) highest = n;
      }
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
          dateOfBirth: data.dateOfBirth,
          address: data.address,
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
      const batch = await Batch.findById(data.batchId);
      if (batch) {
        if (!batch.studentIds) batch.studentIds = [];
        batch.studentIds.push(newStudent._id);
        await batch.save();
      }
    }
    
    return NextResponse.json({
      _id: newStudent._id,
      studentId: newStudent.studentId,
      name: newStudent.name,
      email: newStudent.email,
      phone: newStudent.phone,
      isActive: newStudent.isActive
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create student:', error);
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    );
  }
}
