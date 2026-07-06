import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Payment = require('@/models/Payment');
const Batch = require('@/models/Batch');

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const trainerId = searchParams.get('trainerId');
    const studentId = searchParams.get('studentId');

    if (!trainerId) {
      return NextResponse.json(
        { error: 'Trainer ID is required' },
        { status: 400 }
      );
    }

    // Get trainer's batches
    const batches = await Batch.find({ trainerId }).lean();
    const batchIds = batches.map(b => b._id.toString());

    // Build query for trainer's students' payments
    const query: any = {
      batchId: { $in: batches.map(b => b._id) },
      isDeleted: false
    };

    if (studentId) {
      query.studentId = studentId;
    }

    const payments = await Payment.find(query)
      .sort({ paymentDate: -1 })
      .lean();

    // Get unique students with payment status
    const studentPaymentStatus: Record<string, any> = {};

    payments.forEach((payment: any) => {
      const studentIdStr = payment.studentId.toString();
      if (!studentPaymentStatus[studentIdStr]) {
        studentPaymentStatus[studentIdStr] = {
          studentId: studentIdStr,
          studentName: payment.studentName,
          studentEmail: payment.studentEmail,
          courseName: payment.courseName,
          totalFees: payment.totalFees,
          totalPaid: 0,
          paymentStatus: 'pending',
          lastPaymentDate: null
        };
      }
      studentPaymentStatus[studentIdStr].totalPaid += payment.paidAmount;
      if (!studentPaymentStatus[studentIdStr].lastPaymentDate ||
          new Date(payment.paymentDate) > new Date(studentPaymentStatus[studentIdStr].lastPaymentDate)) {
        studentPaymentStatus[studentIdStr].lastPaymentDate = payment.paymentDate;
      }
    });

    // Calculate payment status for each student
    Object.values(studentPaymentStatus).forEach((student: any) => {
      if (student.totalPaid >= student.totalFees) {
        student.paymentStatus = 'completed';
        student.dueAmount = 0;
      } else {
        student.paymentStatus = 'pending';
        student.dueAmount = student.totalFees - student.totalPaid;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        payments: payments.slice(0, 50), // Limit for performance
        studentStatus: Object.values(studentPaymentStatus)
      }
    });
  } catch (error: any) {
    console.error('Trainer payment error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments', message: error.message },
      { status: 500 }
    );
  }
}