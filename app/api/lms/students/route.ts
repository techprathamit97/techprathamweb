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
      dateOfBirth: data.dateOfBirth,
      address: data.address,
      isActive: true
    });
    
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
