import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const Batch = require('@/models/Batch');
const bcrypt = require('bcryptjs');

// GET - fetch a single student with all details (including plainPassword & batches)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;

    const student = await Student.findById(id).lean();
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Fetch all batches this student belongs to
    const batches = await Batch.find({ studentIds: (student as any)._id })
      .populate({ path: 'courseId', strictPopulate: false })
      .lean();

    return NextResponse.json({
      _id: (student as any)._id,
      studentId: (student as any).studentId,
      name: (student as any).name,
      email: (student as any).email,
      phone: (student as any).phone || '',
      isActive: (student as any).isActive,
      isRestricted: (student as any).isRestricted || false,
      plainPassword: (student as any).plainPassword || '',
      dateOfBirth: (student as any).dateOfBirth || null,
      address: (student as any).address || '',
      enrollmentDate: (student as any).enrollmentDate,
      createdAt: (student as any).createdAt,
      batches: batches.map((b: any) => ({
        batchId: b._id.toString(),
        batchName: b.batchName,
        courseId: b.courseId?._id?.toString() || '',
        courseName: b.courseId?.title || 'N/A',
      })),
    });
  } catch (error: any) {
    console.error('Failed to fetch student:', error);
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 });
  }
}

// PUT - update student details, password, and batch assignments
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;
    const data = await req.json();

    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // --- Basic fields ---
    if (data.name) student.name = data.name;
    if (data.phone !== undefined) student.phone = data.phone;
    if (data.address !== undefined) student.address = data.address;
    if (data.dateOfBirth !== undefined) student.dateOfBirth = data.dateOfBirth || null;
    if (data.isActive !== undefined) student.isActive = data.isActive;

    // Email change with uniqueness check
    if (data.email && data.email !== student.email) {
      const clash = await Student.findOne({ email: data.email, _id: { $ne: id } });
      if (clash) {
        return NextResponse.json({ error: 'Email already in use by another student' }, { status: 409 });
      }
      student.email = data.email;
    }

    // Password change (optional)
    const newPassword = data.password;
    if (typeof newPassword === 'string' && newPassword.trim().length > 0) {
      student.password = await bcrypt.hash(newPassword, 10);
      student.plainPassword = newPassword;
    }

    await student.save();

    // --- Batch assignment sync ---
    if (Array.isArray(data.batchIds)) {
      const currentBatches = await Batch.find({ studentIds: student._id }).lean();
      const currentBatchIds = currentBatches.map((b: any) => b._id.toString());
      const desiredIds: string[] = data.batchIds;

      const toAdd = desiredIds.filter((bid) => !currentBatchIds.includes(bid));
      for (const bid of toAdd) {
        await Batch.findByIdAndUpdate(bid, { $addToSet: { studentIds: student._id } });
      }

      const toRemove = currentBatchIds.filter((bid: string) => !desiredIds.includes(bid));
      for (const bid of toRemove) {
        await Batch.findByIdAndUpdate(bid, { $pull: { studentIds: student._id } });
      }

      // Keep the student's own batches array in sync too
      student.batches = desiredIds;
      await student.save();
    }

    const updatedBatches = await Batch.find({ studentIds: student._id })
      .populate({ path: 'courseId', strictPopulate: false })
      .lean();

    return NextResponse.json({
      success: true,
      student: {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        phone: student.phone,
        isActive: student.isActive,
        plainPassword: student.plainPassword || '',
        batches: updatedBatches.map((b: any) => ({
          batchId: b._id.toString(),
          batchName: b.batchName,
          courseName: b.courseId?.title || 'N/A',
        })),
      },
    });
  } catch (error: any) {
    console.error('Failed to update student:', error);
    return NextResponse.json({ error: 'Failed to update student', message: error.message }, { status: 500 });
  }
}
