import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Payment = require('@/models/Payment');
const Student = require('@/models/Student');
const Batch = require('@/models/Batch');

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const trainerId = searchParams.get('trainerId');

    // Get all payments
    const allPayments = await Payment.find({ isDeleted: false }).sort({ paymentDate: -1 });

    // Calculate totals
    const totalRevenue = allPayments.reduce((sum: number, p: any) => sum + p.paidAmount, 0);
    const totalPending = allPayments
      .filter((p: any) => p.paymentStatus !== 'completed')
      .reduce((sum: number, p: any) => sum + p.dueAmount, 0);
    const totalExpected = allPayments.reduce((sum: number, p: any) => sum + p.totalFees, 0);

    // Payment status breakdown
    const pendingPayments = allPayments.filter((p: any) => p.paymentStatus === 'pending');
    const completedPayments = allPayments.filter((p: any) => p.paymentStatus === 'completed');
    const partialPayments = allPayments.filter((p: any) => p.paymentStatus === 'partial');

    // Recent payments
    const recentPayments = allPayments.slice(0, 10);

    // Monthly revenue (last 6 months)
    const monthlyRevenue: Record<string, number> = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    allPayments.forEach((payment: any) => {
      if (new Date(payment.paymentDate) >= sixMonthsAgo) {
        const monthKey = new Date(payment.paymentDate).toISOString().slice(0, 7);
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + payment.paidAmount;
      }
    });

    // Get batch-wise revenue
    const batchRevenue: Record<string, any> = {};
    allPayments.forEach((payment: any) => {
      const batchIdStr = payment.batchId.toString();
      if (!batchRevenue[batchIdStr]) {
        batchRevenue[batchIdStr] = {
          batchId: batchIdStr,
          totalCollected: 0,
          totalExpected: 0,
          studentCount: 0
        };
      }
      batchRevenue[batchIdStr].totalCollected += payment.paidAmount;
      batchRevenue[batchIdStr].totalExpected += payment.totalFees;
    });

    // Get students with pending payments
    const studentDues: Record<string, any> = {};
    allPayments
      .filter((p: any) => p.paymentStatus !== 'completed')
      .forEach((payment: any) => {
        const studentIdStr = payment.studentId.toString();
        if (!studentDues[studentIdStr]) {
          studentDues[studentIdStr] = {
            studentId: studentIdStr,
            studentName: payment.studentName,
            studentEmail: payment.studentEmail,
            totalDue: 0,
            pendingPayments: []
          };
        }
        studentDues[studentIdStr].totalDue += payment.dueAmount;
        studentDues[studentIdStr].pendingPayments.push({
          invoiceNumber: payment.invoiceNumber,
          amount: payment.dueAmount,
          courseName: payment.courseName
        });
      });

    // If trainerId provided, filter data for trainer's batches
    let trainerPayments = allPayments;
    let trainerBatchIds: string[] = [];

    if (trainerId) {
      const batches = await Batch.find({ trainerId }).lean();
      trainerBatchIds = batches.map((b: any) => b._id.toString());
      trainerPayments = allPayments.filter((p: any) =>
        trainerBatchIds.includes(p.batchId.toString())
      );
    }

    const trainerTotalRevenue = trainerPayments.reduce((sum: number, p: any) => sum + p.paidAmount, 0);
    const trainerTotalPending = trainerPayments
      .filter((p: any) => p.paymentStatus !== 'completed')
      .reduce((sum: number, p: any) => sum + p.dueAmount, 0);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue: trainerId ? trainerTotalRevenue : totalRevenue,
          totalPending: trainerId ? trainerTotalPending : totalPending,
          totalExpected: trainerId ? trainerPayments.reduce((sum: number, p: any) => sum + p.totalFees, 0) : totalExpected,
          pendingCount: pendingPayments.length,
          completedCount: completedPayments.length,
          partialCount: partialPayments.length,
          totalPayments: allPayments.length
        },
        monthlyRevenue,
        recentPayments: trainerId
          ? trainerPayments.slice(0, 10)
          : recentPayments,
        studentDues: Object.values(studentDues).slice(0, 20),
        batchRevenue: Object.values(batchRevenue).slice(0, 20)
      }
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', message: error.message },
      { status: 500 }
    );
  }
}