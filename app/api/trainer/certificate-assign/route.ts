import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const Batch = require('@/models/Batch');
const Course = require('@/models/Course');
const Certificate = require('@/models/Certificate');

function generateCertificateNumber(): string {
  // Format: TP + 5 digits + 2 letters (e.g., TP1977BZ)
  const timestamp = Date.now().toString().slice(-5); // Last 5 digits
  const random = Math.random().toString(36).substring(2, 4).toUpperCase(); // 2 random letters
  return `TP${timestamp}${random}`;
}

function generateVerificationCode(): string {
  return `VP-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const data = await req.json();
    const { batchId, courseId, completionDate, issueDate, startDate } = data;

    if (!batchId || !courseId) {
      return NextResponse.json(
        { error: 'Batch ID and Course ID are required' },
        { status: 400 }
      );
    }

    // Get batch details
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    // Get course details
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Get all students in the batch
    const students = await Student.find({ _id: { $in: batch.studentIds } });

    if (students.length === 0) {
      return NextResponse.json(
        { error: 'No students found in this batch' },
        { status: 404 }
      );
    }

    // Create certificates for all students
    const certificates = [];
    const completionDateObj = completionDate ? new Date(completionDate) : new Date();
    const issueDateObj = issueDate ? new Date(issueDate) : new Date();
    const startDateObj = startDate ? new Date(startDate) : null;

    for (const student of students) {
      // Check if certificate already exists for this student and course
      const existingCert = await Certificate.findOne({
        studentId: student._id,
        courseId: courseId
      });

      if (existingCert) {
        // Keep existing certificate status as is (don't auto-approve)
        // Only update the dates if the certificate was already issued
        if (existingCert.status === 'issued') {
          existingCert.issueDate = issueDateObj;
          existingCert.completionDate = completionDateObj;
          existingCert.startDate = startDateObj;
          await existingCert.save();
        }
        // If pending, leave it as pending for admin approval
        certificates.push(existingCert);
      } else {
        // Create new certificate with PENDING status - requires admin approval
        const certificate = new Certificate({
          studentId: student._id,
          studentName: student.name,
          studentEmail: student.email,
          courseId: courseId,
          courseName: course.title,
          batchId: batchId,
          certificateNo: generateCertificateNumber(),
          certificateId: generateCertificateNumber(),
          grade: 'A',
          score: 100,
          status: 'pending', // Set to pending - admin must approve before student can see
          completionDate: completionDateObj,
          issueDate: null, // Will be set when approved
          startDate: startDateObj,
          verificationCode: generateVerificationCode()
        });

        await certificate.save();
        certificates.push(certificate);
      }
    }

    // Send notification to LMS Admin about pending certificates
    try {
      const Notification = require('@/models/Notification');

      // Create notification for admin
      const adminNotification = new Notification({
        adminId: 'lms-admin', // Fixed admin ID for LMS admin
        title: 'Certificates Pending Approval',
        message: `Trainer has assigned ${certificates.length} certificates for ${course.title} batch. Please review and approve.`,
        type: 'certificate_pending',
        priority: 'high',
        relatedId: batchId,
        relatedType: 'Batch',
        batchId: batchId,
        actionUrl: '/lms/batches'
      });
      await adminNotification.save();
      console.log('Admin notification created for certificate approval');
    } catch (notifError) {
      console.error('Failed to create admin notification:', notifError);
      // Don't fail the main request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: `Certificates assigned to ${certificates.length} students`,
      certificates: certificates
    });

  } catch (error: any) {
    console.error('Certificate assignment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign certificates' },
      { status: 500 }
    );
  }
}

// GET - Check if certificates are already assigned for a batch
export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');
    const courseId = searchParams.get('courseId');

    if (!batchId || !courseId) {
      return NextResponse.json(
        { error: 'Batch ID and Course ID are required' },
        { status: 400 }
      );
    }

    // Find all certificates for this batch and course (both pending and issued)
    const certificates = await Certificate.find({
      batchId: batchId,
      courseId: courseId
    }).lean();

    // Get batch to count students
    const batch = await Batch.findById(batchId);
    const totalStudents = batch?.studentIds?.length || 0;

    return NextResponse.json({
      totalStudents,
      assignedCertificates: certificates.length,
      certificates: certificates
    });

  } catch (error: any) {
    console.error('Certificate check error:', error);
    return NextResponse.json(
      { error: 'Failed to check certificates' },
      { status: 500 }
    );
  }
}