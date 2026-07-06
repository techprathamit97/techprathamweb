import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const Batch = require('@/models/Batch');
const Course = require('@/models/Course');
const Trainer = require('@/models/Trainer');

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    
    // Fetch all students
    const students = await Student.find({})
      .sort({ createdAt: -1 })
      .lean();
    
    // Get batch and course info for each student
    const studentsWithDetails = await Promise.all(
      students.map(async (student: any) => {
        let batches = [];
        try {
          batches = await Batch.find({ studentIds: student._id })
            .populate({ path: 'courseId', strictPopulate: false })
            .populate({ path: 'trainerId', strictPopulate: false })
            .lean();
        } catch (err) {
          console.error('Error fetching batches for student:', student._id, err);
        }
        
        const batch = batches[0];
        const course = batch?.courseId;
        
        return {
          _id: student._id,
          invoiceNumber: `INV-${student._id.toString().slice(-6)}`,
          receiptNo: `REC-${student._id.toString().slice(-6)}`,
          customerDetails: {
            studentId: student.studentId || student._id.toString(),
            name: student.name || 'N/A',
            email: student.email || '',
            phone: student.phone || ''
          },
          courseDetails: {
            title: course?.title || 'Not Enrolled',
            link: course?.slug || '',
            category: course?.category || 'General',
            duration: course?.duration || 'N/A',
            level: 'Intermediate'
          },
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          feeType: 'Full Payment',
          status: student.isActive ? 'paid' : 'pending',
          paymentMode: 'Online',
          isApproved: true,
          certificateApproved: false,
          invoiceDate: student.createdAt,
          createdAt: student.createdAt,
          dueDate: null,
          paidDate: student.createdAt,
          isManual: true
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      invoices: studentsWithDetails
    });
  } catch (error: any) {
    console.error('Failed to fetch students:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch students', message: error.message },
      { status: 500 }
    );
  }
}
