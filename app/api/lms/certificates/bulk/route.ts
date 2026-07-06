import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import Certificate from '@/models/Certificate.js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Bulk assign certificates to students in a batch
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();

    const data = await req.json();
    const { studentIds, courseName, courseCategory, batchId, trainerName, template, customMessage } = data;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'Student IDs array is required' },
        { status: 400 }
      );
    }

    if (!courseName || !batchId) {
      return NextResponse.json(
        { error: 'Course name and batch ID are required' },
        { status: 400 }
      );
    }

    const results = {
      created: [] as any[],
      skipped: [] as any[],
      errors: [] as any[]
    };

    // Process each student
    for (const studentData of studentIds) {
      try {
        const studentId = studentData._id || studentData;
        const studentName = studentData.name;
        const studentEmail = studentData.email;

        // Check if certificate already exists
        const existingCertificate = await Certificate.findOne({
          studentEmail,
          courseName
        });

        if (existingCertificate) {
          results.skipped.push({
            studentId,
            studentName,
            reason: 'Certificate already exists'
          });
          continue;
        }

        // Generate certificate number
        const certCount = await Certificate.countDocuments();
        // Format: TP + 5 digits + 2 letters (e.g., TP1977BZ)
        const timestamp = Date.now().toString().slice(-5);
        const random = Math.random().toString(36).substring(2, 4).toUpperCase();
        const certificateNo = `TP${timestamp}${random}`;

        // Generate verification code
        const verificationCode = `VP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        // Create certificate with pending status
        // Use individual dates from student data if provided
        const certificate = new Certificate({
          studentId,
          studentName,
          studentEmail,
          courseName,
          courseCategory,
          batchId,
          certificateNo,
          certificateId: certificateNo,
          grade: 'A',
          score: 85,
          status: 'pending', // Set to pending as per user requirement
          completionDate: new Date(),
          issueDate: null,
          startDate: studentData.startDate ? new Date(studentData.startDate) : null,
          endDate: studentData.endDate ? new Date(studentData.endDate) : null,
          verificationCode,
          templateUrl: template || 'standard',
          customMessage: customMessage || ''
        });

        await certificate.save();

        results.created.push({
          studentId,
          studentName,
          certificateId: certificate._id
        });
      } catch (error: any) {
        results.errors.push({
          studentId: studentData._id || studentData,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      message: `Created ${results.created.length} certificates, skipped ${results.skipped.length}`,
      results
    }, { status: 201 });
  } catch (error: any) {
    console.error('Bulk certificate creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create bulk certificates' },
      { status: 500 }
    );
  }
}

// Approve multiple pending certificates at once
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();

    const data = await req.json();
    const { certificateIds, action } = data;

    if (!certificateIds || !Array.isArray(certificateIds) || certificateIds.length === 0) {
      return NextResponse.json(
        { error: 'Certificate IDs array is required' },
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
      case 'update_dates':
        if (data.startDate) updateData.startDate = new Date(data.startDate);
        if (data.endDate) updateData.endDate = new Date(data.endDate);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const result = await Certificate.updateMany(
      { _id: { $in: certificateIds } },
      { $set: updateData }
    );

    // Send notifications to students for bulk approve
    if (action === 'approve') {
      try {
        const Notification = require('@/models/Notification');

        // Get the certificates that were updated
        const updatedCertificates = await Certificate.find({
          _id: { $in: certificateIds }
        }).lean();

        // Send notification to each student
        for (const cert of updatedCertificates) {
          const studentNotification = new Notification({
            studentId: cert.studentId,
            title: '🎉 Certificate Approved!',
            message: `Your certificate for ${cert.courseName} has been approved! You can now view and download it from your dashboard.`,
            type: 'certificate_approved',
            priority: 'high',
            relatedId: cert._id,
            relatedType: 'Certificate',
            batchId: cert.batchId,
            actionUrl: '/student/certificates'
          });
          await studentNotification.save();
        }
        console.log(`Created ${updatedCertificates.length} student notifications for certificate approval`);
      } catch (notifError) {
        console.error('Failed to create student notifications:', notifError);
      }
    }

    // Send notifications to students for bulk revoke
    if (action === 'revoke') {
      try {
        const Notification = require('@/models/Notification');

        const updatedCertificates = await Certificate.find({
          _id: { $in: certificateIds }
        }).lean();

        for (const cert of updatedCertificates) {
          const studentNotification = new Notification({
            studentId: cert.studentId,
            title: '⚠️ Certificate Revoked',
            message: `Your certificate for ${cert.courseName} has been revoked. Please contact support for more information.`,
            type: 'certificate_rejected',
            priority: 'high',
            relatedId: cert._id,
            relatedType: 'Certificate',
            batchId: cert.batchId,
            actionUrl: '/student/certificates'
          });
          await studentNotification.save();
        }
      } catch (notifError) {
        console.error('Failed to create student notifications:', notifError);
      }
    }

    return NextResponse.json({
      message: `${result.modifiedCount} certificates ${action}d successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error: any) {
    console.error('Bulk certificate update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update certificates' },
      { status: 500 }
    );
  }
}