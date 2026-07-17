import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Payment = require('@/models/Payment');

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Get all payments for student
    const payments = await Payment.find({
      studentId,
      isDeleted: false
    })
      .sort({ paymentDate: -1, installmentNumber: 1 })
      .lean();

    // Calculate totals
    const totalPaid = payments.reduce((sum: number, p: any) => sum + p.paidAmount, 0);
    const totalFees = payments.length > 0 ? payments[0].totalFees : 0;
    const totalDue = totalFees - totalPaid;

    // Get batch-wise breakdown
    const batchPayments: Record<string, any> = {};
    payments.forEach((payment: any) => {
      const batchIdStr = payment.batchId.toString();
      if (!batchPayments[batchIdStr]) {
        batchPayments[batchIdStr] = {
          batchId: batchIdStr,
          courseName: payment.courseName,
          totalFees: payment.totalFees,
          paidAmount: 0,
          dueAmount: 0,
          payments: []
        };
      }
      batchPayments[batchIdStr].paidAmount += payment.paidAmount;
      batchPayments[batchIdStr].dueAmount = batchPayments[batchIdStr].totalFees - batchPayments[batchIdStr].paidAmount;
      batchPayments[batchIdStr].payments.push(payment);
    });

    // Get latest invoice for each batch
    const latestInvoices = Object.values(batchPayments).map((batch: any) => {
      const lastPayment = batch.payments[batch.payments.length - 1];
      return {
        batchId: batch.batchId,
        courseName: batch.courseName,
        totalFees: batch.totalFees,
        paidAmount: batch.paidAmount,
        dueAmount: batch.dueAmount,
        paymentStatus: batch.dueAmount > 0 ? 'partial' : 'completed',
        latestInvoice: lastPayment?.invoiceNumber,
        installmentCount: batch.payments.length,
        lastPaymentDate: lastPayment?.paymentDate
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        payments,
        summary: {
          totalPaid,
          totalFees,
          totalDue,
          paymentCount: payments.length
        },
        batchPayments: latestInvoices
      }
    });
  } catch (error: any) {
    console.error('Student payment error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments', message: error.message },
      { status: 500 }
    );
  }
}