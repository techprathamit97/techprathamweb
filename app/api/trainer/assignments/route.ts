import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Trainer = require('@/models/Trainer');
const Assignment = require('@/models/Assignment');
const Batch = require('@/models/Batch');
import { notifyBatchStudents, NotificationTemplates } from '@/lib/notificationService';

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    
    const { searchParams } = new URL(req.url);
    const trainerId = searchParams.get('trainerId');
    
    if (!trainerId) {
      return NextResponse.json(
        { error: 'Trainer ID is required' },
        { status: 400 }
      );
    }
    
    // Find trainer by trainerId
    const trainer = await Trainer.findOne({ trainerId: trainerId }).lean();
    
    if (!trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }
    
    // Get trainer's batches
    const batches = await Batch.find({ trainerId: trainer._id })
      .populate('courseId')
      .lean();
    
    // Get assignments for trainer's batches
    const assignments = await Assignment.find({
      batchId: { $in: batches.map((b: any) => b._id) }
    })
    .populate('batchId')
    .populate('trainerId')
    .lean();

    // Get all submissions for these assignments
    const Submission = require('@/models/Submission');
    const assignmentIds = assignments.map((a: any) => a._id);
    const submissions = await Submission.find({
      refId: { $in: assignmentIds },
      type: 'assignment'
    }).populate('studentId').lean();

    // Create a map of submissions by assignment ID
    const submissionsByAssignment = new Map();
    submissions.forEach((sub: any) => {
      const assignmentId = sub.refId.toString();
      if (!submissionsByAssignment.has(assignmentId)) {
        submissionsByAssignment.set(assignmentId, []);
      }
      submissionsByAssignment.get(assignmentId).push(sub);
    });

    const assignmentsData = {
      trainer: {
        trainerId: trainer.trainerId,
        name: trainer.name,
        email: trainer.email
      },
      assignments: assignments.map((assignment: any) => {
        const assignmentSubmissions = submissionsByAssignment.get(assignment._id.toString()) || [];
        return {
          _id: assignment._id,
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.dueDate,
          maxMarks: assignment.maxMarks || 100,
          batchId: assignment.batchId._id,
          batchName: assignment.batchId.batchName,
          courseTitle: assignment.batchId.courseId?.title || 'N/A',
          status: assignment.dueDate && new Date(assignment.dueDate) > new Date() ? 'active' : 'expired',
          attachments: assignment.attachments || [],
          totalSubmissions: assignmentSubmissions.length,
          pendingSubmissions: (assignment.batchId.studentIds?.length || 0) - assignmentSubmissions.length,
          submissions: assignmentSubmissions.map((sub: any) => ({
            studentId: sub.studentId?.studentId,
            studentName: sub.studentId?.name,
            submittedAt: sub.submittedAt,
            marks: sub.score,
            feedback: sub.feedback,
            status: sub.status,
            fileUrl: sub.fileUrl,
            fileName: sub.fileName
          })),
          createdAt: assignment.createdAt
        };
      }),
      batches: batches.map((batch: any) => ({
        _id: batch._id,
        batchName: batch.batchName,
        courseTitle: batch.courseId?.title || 'N/A',
        studentCount: batch.studentIds?.length || 0
      })),
      stats: {
        totalAssignments: assignments.length,
        activeAssignments: assignments.filter((a: any) => new Date(a.dueDate) > new Date()).length,
        expiredAssignments: assignments.filter((a: any) => new Date(a.dueDate) <= new Date()).length,
        totalSubmissions: assignments.reduce((sum: number, a: any) => sum + (a.submissions?.length || 0), 0),
        pendingSubmissions: assignments.reduce((sum: number, a: any) => {
          const batchStudents = batches.find((b: any) => b._id.toString() === a.batchId.toString())?.studentIds?.length || 0;
          return sum + (batchStudents - (a.submissions?.length || 0));
        }, 0)
      }
    };
    
    return NextResponse.json({
      success: true,
      data: assignmentsData
    });
    
  } catch (error: any) {
    console.error('Trainer assignments API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments data', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const { trainerId, title, description, dueDate, maxMarks, batchId, attachments } = await req.json();

    if (!trainerId || !title || !description || !dueDate || !batchId) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Find trainer
    const trainer = await Trainer.findOne({ trainerId: trainerId });
    if (!trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }

    // Verify batch belongs to trainer
    const batch = await Batch.findOne({ _id: batchId, trainerId: trainer._id });
    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found or not assigned to trainer' },
        { status: 404 }
      );
    }

    // Get course ID from batch
    const courseId = batch.courseId;

    // Create assignment
    const assignment = new Assignment({
      title,
      description,
      dueDate: new Date(dueDate),
      maxMarks: maxMarks || 100,
      batchId: batchId,
      trainerId: trainer._id,
      courseId: courseId,
      attachments: attachments || []
    });

    await assignment.save();

    // Send notification to students in the batch
    const template = NotificationTemplates.assignmentUploaded(assignment.title);
    try {
      await notifyBatchStudents(
        batchId,
        template.title,
        template.message,
        template.type,
        {
          relatedId: assignment._id,
          relatedType: 'Assignment',
          actionUrl: '/student/assignments',
          priority: template.priority
        }
      );
    } catch (notifError) {
      console.error('Error sending assignment notification:', notifError);
    }

    return NextResponse.json({
      success: true,
      message: 'Assignment created successfully',
      assignment: {
        _id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        maxMarks: assignment.maxMarks,
        batchId: assignment.batchId,
        attachments: assignment.attachments
      }
    });

  } catch (error: any) {
    console.error('Create assignment error:', error);
    return NextResponse.json(
      { error: 'Failed to create assignment', message: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update assignment (e.g., add attachments)
export async function PUT(req: NextRequest) {
  try {
    await connectMongo();

    const { assignmentId, attachments, trainerId } = await req.json();

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    // Find trainer
    const trainer = await Trainer.findOne({ trainerId: trainerId });
    if (!trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }

    // Find and update assignment
    const assignment = await Assignment.findOneAndUpdate(
      { _id: assignmentId, trainerId: trainer._id },
      { $set: { attachments: attachments || [] } },
      { new: true }
    );

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Assignment updated successfully',
      assignment: assignment
    });

  } catch (error: any) {
    console.error('Update assignment error:', error);
    return NextResponse.json(
      { error: 'Failed to update assignment', message: error.message },
      { status: 500 }
    );
  }
}