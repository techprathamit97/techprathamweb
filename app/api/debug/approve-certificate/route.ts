import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import Certificate from '@/models/Certificate.js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Note: This endpoint is intentionally open for batch managers/trainers to approve certificates
// In production, you would add proper role-based access control here

export async function PATCH(req: NextRequest) {
  try {
    // Optional: Uncomment below to require authentication
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    await connectMongo();

    const data = await req.json();
    const { certificateId, action } = data;

    if (!certificateId) {
      return NextResponse.json(
        { error: 'Certificate ID is required' },
        { status: 400 }
      );
    }

    let updateData: any = {};

    switch (action) {
      case 'approve':
        updateData = { status: 'issued', issueDate: new Date() };
        break;
      case 'revoke':
        updateData = { status: 'revoked' };
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

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

    // Send notification to student when certificate is approved
    if (action === 'approve') {
      try {
        const Notification = require('@/models/Notification');

        const studentNotification = new Notification({
          studentId: certificate.studentId,
          title: '🎉 Certificate Approved!',
          message: `Your certificate for ${certificate.courseName} has been approved! You can now view and download it from your dashboard.`,
          type: 'certificate_approved',
          priority: 'high',
          relatedId: certificate._id,
          relatedType: 'Certificate',
          batchId: certificate.batchId,
          actionUrl: '/student/certificates'
        });
        await studentNotification.save();
        console.log('Student notification created for certificate approval:', certificate.studentName);
      } catch (notifError) {
        console.error('Failed to create student notification:', notifError);
        // Don't fail the main request if notification fails
      }
    }

    // Send notification to student when certificate is revoked
    if (action === 'revoke') {
      try {
        const Notification = require('@/models/Notification');

        const studentNotification = new Notification({
          studentId: certificate.studentId,
          title: '⚠️ Certificate Revoked',
          message: `Your certificate for ${certificate.courseName} has been revoked. Please contact support for more information.`,
          type: 'certificate_rejected',
          priority: 'high',
          relatedId: certificate._id,
          relatedType: 'Certificate',
          batchId: certificate.batchId,
          actionUrl: '/student/certificates'
        });
        await studentNotification.save();
      } catch (notifError) {
        console.error('Failed to create student notification:', notifError);
      }
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