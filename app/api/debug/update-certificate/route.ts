import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import Certificate from '@/models/Certificate.js';

export async function PATCH(req: NextRequest) {
  try {
    await connectMongo();

    const data = await req.json();
    const { certificateId, startDate, endDate } = data;

    if (!certificateId) {
      return NextResponse.json(
        { error: 'Certificate ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);

    const certificate = await Certificate.findByIdAndUpdate(
      certificateId,
      { $set: updateData },
      { new: true }
    );

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(certificate);
  } catch (error: any) {
    console.error('Certificate update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update certificate' },
      { status: 500 }
    );
  }
}