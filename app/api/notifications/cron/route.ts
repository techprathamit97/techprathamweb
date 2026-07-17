import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Quiz = require('@/models/Quiz');
const Assignment = require('@/models/Assignment');
const Batch = require('@/models/Batch');
const Notification = require('@/models/Notification');
const Student = require('@/models/Student');

// Cron job to send notifications
// Can be triggered via: /api/notifications/cron?secret=YOUR_SECRET

const CRON_SECRET = process.env.CRON_SECRET || 'techpratham-cron-secret';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();
    const now = new Date();

    console.log('=== Starting Notification Cron Job ===');
    console.log('Time:', now.toISOString());

    const results = {
      assignmentDeadline: 0,
      quizDeadline: 0
    };

    // Note: Live class notifications now handled via BigBlueButton
    // Only assignment and quiz deadline reminders remain

    // 1. Assignment Deadline Reminders
    results.assignmentDeadline = await sendAssignmentDeadlineReminders(now);

    // 2. Quiz Deadline Reminders
    results.quizDeadline = await sendQuizDeadlineReminders(now);

    console.log('=== Notification Cron Job Complete ===');
    console.log('Results:', results);

    return NextResponse.json({
      success: true,
      message: 'Cron job completed',
      results
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Send assignment deadline reminders
async function sendAssignmentDeadlineReminders(now: Date) {
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Find assignments due in next 24 hours (last day reminder)
  const assignments = await Assignment.find({
    deadline: {
      $gte: now,
      $lte: twentyFourHoursFromNow
    }
  })
    .populate('batchId', 'batchName studentIds')
    .lean();

  console.log('Found assignments with deadline:', assignments.length);

  let count = 0;

  for (const assignment of assignments) {
    const batch = assignment.batchId as any;
    const studentIds = batch?.studentIds?.map((id: any) => id.toString()) || [];

    if (studentIds.length === 0) continue;

    // Check if reminder already sent (within last 24 hours)
    const existingNotification = await Notification.findOne({
      relatedId: assignment._id,
      type: 'deadline',
      createdAt: { $gte: oneDayAgo }
    });

    if (existingNotification) continue;

    const deadlineDate = new Date(assignment.deadline);
    const hoursLeft = Math.round((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    const notifications = studentIds.map((studentId: string) => ({
      studentId,
      batchId: batch._id,
      title: 'Assignment Deadline Reminder',
      message: hoursLeft <= 1
        ? `"${assignment.title}" submission closes in ${hoursLeft * 60} minutes!`
        : `"${assignment.title}" deadline: ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''} remaining`,
      type: 'deadline',
      priority: 'urgent',
      relatedId: assignment._id,
      relatedType: 'Assignment',
      actionUrl: '/student/assignments'
    }));

    await Notification.insertMany(notifications);
    count += notifications.length;
  }

  return count;
}


async function sendQuizDeadlineReminders(now: Date) {
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Find quizzes ending in next hour (last hour reminder)
  const quizzes = await Quiz.find({
    deadline: {
      $gte: now,
      $lte: oneHourFromNow
    },
    isActive: true
  })
    .populate('batchId', 'batchName studentIds')
    .lean();

  console.log('Found quizzes with deadline:', quizzes.length);

  let count = 0;

  for (const quiz of quizzes) {
    const batch = quiz.batchId as any;
    const studentIds = batch?.studentIds?.map((id: any) => id.toString()) || [];

    if (studentIds.length === 0) continue;

    // Check if reminder already sent (within last 24 hours)
    const existingNotification = await Notification.findOne({
      relatedId: quiz._id,
      type: 'deadline',
      createdAt: { $gte: oneDayAgo }
    });

    if (existingNotification) continue;

    const deadlineDate = new Date(quiz.deadline);
    const minutesLeft = Math.round((deadlineDate.getTime() - now.getTime()) / (1000 * 60));

    const notifications = studentIds.map((studentId: string) => ({
      studentId,
      batchId: batch._id,
      title: 'Quiz Deadline Reminder',
      message: minutesLeft <= 60
        ? `"${quiz.title}" closes in ${minutesLeft} minutes!`
        : `"${quiz.title}" closes soon`,
      type: 'deadline',
      priority: 'urgent',
      relatedId: quiz._id,
      relatedType: 'Quiz',
      actionUrl: '/student/quizzes'
    }));

    await Notification.insertMany(notifications);
    count += notifications.length;
  }

  return count;
}