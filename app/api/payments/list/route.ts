import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Payment = require('@/models/Payment');

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const batchId = searchParams.get('batchId');
    const trainerId = searchParams.get('trainerId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: any = { isDeleted: false };

    if (studentId) query.studentId = studentId;
    if (batchId) query.batchId = batchId;
    if (trainerId) query.trainerId = trainerId;
    if (status) query.paymentStatus = status;

    const skip = (page - 1) * limit;

    const payments = await Payment.find(query)
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Payment.countDocuments(query);

    // Get summary stats
    const allPayments = await Payment.find({ isDeleted: false });
    const totalRevenue = allPayments.reduce((sum: number, p: any) => sum + p.paidAmount, 0);
    const totalPending = allPayments
      .filter((p: any) => p.paymentStatus === 'partial' || p.paymentStatus === 'pending')
      .reduce((sum: number, p: any) => sum + p.dueAmount, 0);
    const completedPayments = allPayments.filter((p: any) => p.paymentStatus === 'completed').length;

    return NextResponse.json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalRevenue,
          totalPending,
          completedPayments,
          totalPayments: allPayments.length
        }
      }
    });
  } catch (error: any) {
    console.error('Payment list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments', message: error.message },
      { status: 500 }
    );
  }
}