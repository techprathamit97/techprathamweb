import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const Assignment = require('@/models/Assignment');
const Submission = require('@/models/Submission');
const Batch = require('@/models/Batch');

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

    // Find student
    const student = await Student.findOne({ studentId: studentId }).lean();

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Get batches where this student is enrolled
    const batches = await Batch.find({
      studentIds: student._id
    }).lean();

    const batchIds = batches.map((b: any) => b._id);

    if (batchIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          assignments: [],
          stats: {
            total: 0,
            pending: 0,
            submitted: 0,
            graded: 0
          }
        }
      });
    }

    // Get assignments for student's batches
    const assignments = await Assignment.find({
      batchId: { $in: batchIds }
    })
    .populate('batchId')
    .populate('trainerId')
    .lean();

    // Get student's submissions
    const submissions = await Submission.find({
      studentId: student._id,
      type: 'assignment'
    }).lean();

    // Create a map of assignment submissions
    const submissionMap = new Map();
    submissions.forEach((sub: any) => {
      submissionMap.set(sub.refId.toString(), sub);
    });

    // Format assignments
    const formattedAssignments = assignments.map((assignment: any) => {
      const submission = submissionMap.get(assignment._id.toString());
      const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();

      return {
        _id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        maxMarks: assignment.maxMarks || 100,
        attachments: assignment.attachments || [],
        batchId: assignment.batchId._id,
        batchName: assignment.batchId.batchName,
        courseTitle: assignment.batchId.courseId?.title || 'N/A',
        trainerName: assignment.trainerId?.name || 'N/A',
        status: submission ? submission.status : (isOverdue ? 'overdue' : 'available'),
        submission: submission ? {
          _id: submission._id,
          fileUrl: submission.fileUrl,
          fileName: submission.fileName,
          submittedAt: submission.submittedAt,
          score: submission.score,
          maxMarks: submission.maxMarks,
          feedback: submission.feedback,
          status: submission.status
        } : null,
        createdAt: assignment.createdAt
      };
    });

    // Calculate stats
    const totalAssignments = formattedAssignments.length;
    const pendingAssignments = formattedAssignments.filter((a: any) => a.status === 'available').length;
    const submittedAssignments = formattedAssignments.filter((a: any) => a.status === 'submitted').length;
    const gradedAssignments = formattedAssignments.filter((a: any) => a.status === 'graded').length;

    return NextResponse.json({
      success: true,
      data: {
        assignments: formattedAssignments,
        stats: {
          total: totalAssignments,
          pending: pendingAssignments,
          submitted: submittedAssignments,
          graded: gradedAssignments
        }
      }
    });

  } catch (error: any) {
    console.error('Student assignments API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments', message: error.message },
      { status: 500 }
    );
  }
}

// Submit assignment
export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const { studentId, assignmentId, fileUrl, fileName } = await req.json();

    if (!studentId || !assignmentId || !fileUrl) {
      return NextResponse.json(
        { error: 'Student ID, assignment ID, and file URL are required' },
        { status: 400 }
      );
    }

    // Find student
    const student = await Student.findOne({ studentId: studentId });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Check if assignment exists
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if student is in the batch
    const batch = await Batch.findOne({
      _id: assignment.batchId,
      studentIds: student._id
    });

    if (!batch) {
      return NextResponse.json(
        { error: 'You are not enrolled in this batch' },
        { status: 403 }
      );
    }

    // Check if already submitted
    const existingSubmission = await Submission.findOne({
      studentId: student._id,
      refId: assignment._id,
      type: 'assignment'
    });

    if (existingSubmission) {
      // Update existing submission
      existingSubmission.fileUrl = fileUrl;
      existingSubmission.fileName = fileName || 'assignment';
      existingSubmission.status = 'submitted';
      existingSubmission.submittedAt = new Date();
      await existingSubmission.save();

      return NextResponse.json({
        success: true,
        message: 'Assignment resubmitted successfully',
        submission: existingSubmission
      });
    }

    // Create new submission
    const submission = new Submission({
      type: 'assignment',
      studentId: student._id,
      refId: assignment._id,
      fileUrl: fileUrl,
      fileName: fileName || 'assignment',
      status: 'submitted',
      maxMarks: assignment.maxMarks || 100,
      submittedAt: new Date()
    });

    await submission.save();

    return NextResponse.json({
      success: true,
      message: 'Assignment submitted successfully',
      submission: submission
    }, { status: 201 });

  } catch (error: any) {
    console.error('Submit assignment error:', error);
    return NextResponse.json(
      { error: 'Failed to submit assignment', message: error.message },
      { status: 500 }
    );
  }
}