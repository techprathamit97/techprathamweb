import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Payment = require('@/models/Payment');
const Student = require('@/models/Student');
const Batch = require('@/models/Batch');

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const {
      studentId,
      batchId,
      totalFees,
      paidAmount,
      paymentSource,
      transactionId,
      transactionDetails,
      paymentScreenshot,
      remarks,
      paymentDate
    } = body;

    if (!studentId || !batchId || !totalFees || !paidAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get student and batch details
    const student = await Student.findById(studentId);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const batch = await Batch.findById(batchId)
      .populate('courseId')
      .populate('trainerId');
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Calculate previous payments
    const previousPayments = await Payment.find({
      studentId,
      batchId,
      isDeleted: false
    }).sort({ installmentNumber: -1 });

    const previousPaidAmount = previousPayments.reduce(
      (sum: number, p: any) => sum + p.paidAmount,
      0
    );

    const installmentNumber = previousPayments.length + 1;

    // Generate invoice number
    const invoiceNumber = await Payment.generateInvoiceNumber();

    // Create payment record
    const payment = new Payment({
      invoiceNumber,
      studentId,
      studentName: student.name,
      studentEmail: student.email,
      batchId,
      courseId: batch.courseId?._id,
      courseName: batch.courseId?.title || 'Unknown Course',
      trainerId: batch.trainerId?._id,
      totalFees,
      paidAmount,
      previousPaidAmount,
      paymentDate: paymentDate || new Date(),
      paymentSource: paymentSource || 'bank_transfer',
      transactionId,
      transactionDetails,
      paymentScreenshot,
      remarks,
      installmentNumber,
      invoiceGeneratedBy: body.generatedBy || 'Admin'
    });

    await payment.save();

    return NextResponse.json({
      success: true,
      message: 'Payment created successfully',
      data: payment
    });
  } catch (error: any) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment', message: error.message },
      { status: 500 }
    );
  }
}