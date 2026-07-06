import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
const Student = require("@/models/Student");

export async function GET() {
  try {
    await connectMongo();
    
    const students = await Student.find({}).limit(5).lean();
    
    return NextResponse.json({
      success: true,
      count: students.length,
      students: students.map((student: any) => ({
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        hasPassword: !!student.password,
        passwordLength: student.password ? student.password.length : 0,
        isActive: student.isActive,
        enrollmentDate: student.enrollmentDate
      }))
    });
  } catch (error: any) {
    console.error('Debug students error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students', message: error.message },
      { status: 500 }
    );
  }
}