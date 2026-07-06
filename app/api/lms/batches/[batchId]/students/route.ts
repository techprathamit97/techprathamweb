import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Batch = require('@/models/Batch');

// Add students to batch
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    await connectMongo();
    const { batchId } = await params;
    const { studentIds } = await req.json();
    
    if (!studentIds || !Array.isArray(studentIds)) {
      return NextResponse.json(
        { error: 'Student IDs array is required' },
        { status: 400 }
      );
    }
    
    const batch = await Batch.findById(batchId);
    
    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }
    
    // Add new student IDs to the batch, avoiding duplicates
    const existingStudents = batch.studentIds || [];
    const newStudents = studentIds.filter((id: string) => !existingStudents.includes(id));
    
    if (newStudents.length === 0) {
      return NextResponse.json(
        { message: 'All students are already in this batch' },
        { status: 200 }
      );
    }
    
    batch.studentIds = [...existingStudents, ...newStudents];
    await batch.save();
    
    // Also update each student's batches array
    const Student = require('@/models/Student');
    await Promise.all(
      newStudents.map(async (studentId: string) => {
        await Student.findByIdAndUpdate(
          studentId,
          { $addToSet: { batches: batchId } }
        );
      })
    );
    
    return NextResponse.json({
      message: `${newStudents.length} student(s) added to batch`,
      batch
    });
  } catch (error) {
    console.error('Failed to add students to batch:', error);
    return NextResponse.json(
      { error: 'Failed to add students to batch' },
      { status: 500 }
    );
  }
}

// Remove students from batch
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    await connectMongo();
    const { batchId } = await params;
    const { studentIds } = await req.json();
    
    if (!studentIds || !Array.isArray(studentIds)) {
      return NextResponse.json(
        { error: 'Student IDs array is required' },
        { status: 400 }
      );
    }
    
    const batch = await Batch.findById(batchId);
    
    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }
    
    // Remove student IDs from the batch
    batch.studentIds = batch.studentIds.filter((id: string) => !studentIds.includes(id));
    await batch.save();
    
    // Also remove batch from each student's batches array
    const Student = require('@/models/Student');
    await Promise.all(
      studentIds.map(async (studentId: string) => {
        await Student.findByIdAndUpdate(
          studentId,
          { $pull: { batches: batchId } }
        );
      })
    );
    
    return NextResponse.json({
      message: `${studentIds.length} student(s) removed from batch`,
      batch
    });
  } catch (error) {
    console.error('Failed to remove students from batch:', error);
    return NextResponse.json(
      { error: 'Failed to remove students from batch' },
      { status: 500 }
    );
  }
}
