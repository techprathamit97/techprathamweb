import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Payment = require('@/models/Payment');

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const batchId = searchParams.get('batchId');

    if (!studentId || !batchId) {
      return NextResponse.json(
        { error: 'Student ID and Batch ID are required' },
        { status: 400 }
      );
    }

    // Get all payments for this student-batch combination
    const payments = await Payment.find({
      studentId,
      batchId,
      isDeleted: false
    })
      .sort({ installmentNumber: -1 })
      .lean();

    if (payments.length === 0) {
      return NextResponse.json(
        { error: 'No existing payments found. Please create initial payment.' },
        { status: 404 }
      );
    }

    // Get latest payment details
    const latestPayment = payments[0];
    const totalFees = latestPayment.totalFees;
    const totalPaid = payments.reduce((sum: number, p: any) => sum + p.paidAmount, 0);
    const dueAmount = totalFees - totalPaid;

    if (dueAmount <= 0) {
      return NextResponse.json({
        success: true,
        data: {
          isComplete: true,
          message: 'All payments completed',
          totalFees,
          totalPaid,
          dueAmount: 0
        }
      });
    }

    // Get installment details
    const installmentDetails = payments.map((p: any) => ({
      installmentNumber: p.installmentNumber,
      invoiceNumber: p.invoiceNumber,
      paidAmount: p.paidAmount,
      paymentDate: p.paymentDate,
      paymentStatus: p.paymentStatus
    }));

    return NextResponse.json({
      success: true,
      data: {
        isComplete: false,
        studentId,
        batchId,
        courseName: latestPayment.courseName,
        totalFees,
        totalPaid,
        dueAmount,
        installmentNumber: payments.length + 1,
        previousInstallments: installmentDetails
      }
    });
  } catch (error: any) {
    console.error('Pay due error:', error);
    return NextResponse.json(
      { error: 'Failed to get due details', message: error.message },
      { status: 500 }
    );
  }
}