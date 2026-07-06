import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Payment = require('@/models/Payment');

export async function PUT(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const { paymentId, status, verifiedBy, remarks } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Update payment status
    payment.paymentStatus = status || payment.paymentStatus;
    payment.verifiedBy = verifiedBy || 'Accountant';
    payment.verifiedAt = new Date();
    if (remarks) payment.remarks = remarks;

    await payment.save();

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      data: payment
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment', message: error.message },
      { status: 500 }
    );
  }
}