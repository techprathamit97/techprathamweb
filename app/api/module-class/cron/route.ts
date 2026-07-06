import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const ModuleClass = require('@/models/ModuleClass');
const Batch = require('@/models/Batch');
const Notification = require('@/models/Notification');

const CRON_SECRET = process.env.CRON_SECRET || 'techpratham-cron-secret';

// Cron job to update class statuses and send notifications
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    if (secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();
    const now = new Date();

    console.log('=== Starting ModuleClass Cron Job ===');
    console.log('Time:', now.toISOString());

    const results = {
      statusUpdated: 0,
      notificationsSent: 0,
      classesMarkedCompleted: 0
    };

    // 1. Update class statuses based on scheduled time
    results.statusUpdated = await updateClassStatuses(now);

    // 2. Mark classes as completed after end time
    results.classesMarkedCompleted = await markClassesCompleted(now);

    // 3. Send 5-minute reminder notifications
    results.notificationsSent = await sendClassReminders(now);

    console.log('=== ModuleClass Cron Job Complete ===');
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

// Update class statuses (scheduled -> live)
async function updateClassStatuses(now: Date) {
  const scheduledClasses = await ModuleClass.find({
    status: 'scheduled'
  }).lean();

  let count = 0;

  for (const cls of scheduledClasses) {
    const startTime = getScheduledDateTime(cls);
    const endTime = new Date(startTime.getTime() + (cls.duration || 60) * 60000);

    // If class has started (within duration), mark as live
    if (now >= startTime && now <= endTime) {
      await ModuleClass.findByIdAndUpdate(cls._id, {
        status: 'live',
        updatedAt: now
      });
      count++;
      console.log(`Class ${cls._id} is now live`);
    }
  }

  return count;
}

// Mark classes as completed after end time
async function markClassesCompleted(now: Date) {
  // Find classes where status is still 'scheduled' or 'live' but end time has passed
  const classes = await ModuleClass.find({
    status: { $in: ['scheduled', 'live'] }
  }).lean();

  let count = 0;

  for (const cls of classes) {
    const startTime = getScheduledDateTime(cls);
    const endTime = new Date(startTime.getTime() + (cls.duration || 60) * 60000);

    if (now > endTime) {
      await ModuleClass.findByIdAndUpdate(cls._id, {
        status: 'completed',
        updatedAt: now
      });
      count++;
      console.log(`Class ${cls._id} marked as completed`);
    }
  }

  return count;
}

// Send 5-minute reminder notifications
async function sendClassReminders(now: Date) {
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  const sixMinutesFromNow = new Date(now.getTime() + 6 * 60 * 1000);

  // Find classes starting in 5-6 minutes that haven't had reminder sent
  const upcomingClasses = await ModuleClass.find({
    status: 'scheduled',
    reminderSent: false,
    scheduledDate: {
      $gte: new Date(fiveMinutesFromNow.setHours(0, 0, 0, 0)),
      $lte: new Date(fiveMinutesFromNow.setHours(23, 59, 59, 999))
    }
  })
    .populate('batchId', 'batchName studentIds')
    .lean();

  let count = 0;

  for (const cls of upcomingClasses) {
    const startTime = getScheduledDateTime(cls);
    const batch = cls.batchId as any;

    // Check if class starts in 5-6 minutes
    if (startTime >= fiveMinutesFromNow && startTime <= sixMinutesFromNow) {
      const studentIds = batch?.studentIds?.map((id: any) => id.toString()) || [];

      // Check if notification already sent recently
      const existingNotification = await Notification.findOne({
        relatedId: cls._id,
        type: 'upcoming_class',
        createdAt: { $gte: new Date(now.getTime() - 10 * 60 * 1000) }
      });

      if (existingNotification) {
        // Mark reminder as sent to avoid repeated checks
        await ModuleClass.findByIdAndUpdate(cls._id, { reminderSent: true });
        continue;
      }

      const notifications = [];

      // Notify all students
      for (const studentId of studentIds) {
        notifications.push({
          studentId,
          batchId: batch?._id?.toString(),
          title: 'Class Starting Soon',
          message: `"${cls.moduleTitle}" starts in 5 minutes! Join now.`,
          type: 'upcoming_class',
          priority: 'high',
          relatedId: cls._id,
          relatedType: 'ModuleClass',
          actionUrl: '/student/courses'
        });
      }

      // Notify trainer
      if (cls.trainerId) {
        notifications.push({
          trainerId: cls.trainerId.toString(),
          title: 'Class Starting Soon',
          message: `"${cls.moduleTitle}" starts in 5 minutes!`,
          type: 'upcoming_class',
          priority: 'high',
          relatedId: cls._id,
          relatedType: 'ModuleClass',
          actionUrl: '/trainer/course-modules'
        });
      }

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        await ModuleClass.findByIdAndUpdate(cls._id, { reminderSent: true });
        count += notifications.length;
        console.log(`Sent ${notifications.length} notifications for class ${cls._id}`);
      }
    }
  }

  return count;
}

// Helper to get scheduled datetime from module class
function getScheduledDateTime(cls: any): Date {
  const scheduledDate = new Date(cls.scheduledDate);
  const [hours, minutes] = (cls.scheduledTime || '00:00').split(':');
  scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return scheduledDate;
}

// GET endpoint to get computed class info (for real-time status)
export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');

    if (!classId) {
      return NextResponse.json(
        { success: false, error: 'classId is required' },
        { status: 400 }
      );
    }

    const cls = await ModuleClass.findById(classId).lean();

    if (!cls) {
      return NextResponse.json(
        { success: false, error: 'Class not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const startTime = getScheduledDateTime(cls);
    const endTime = new Date(startTime.getTime() + (cls.duration || 60) * 60000);

    const canJoin = cls.status === 'scheduled' &&
      now >= new Date(startTime.getTime() - 5 * 60000) &&
      now <= endTime;

    const isLive = cls.status === 'live' ||
      (startTime && endTime && now >= startTime && now <= endTime);

    const isCompleted = cls.status === 'completed' ||
      (endTime && now > endTime);

    return NextResponse.json({
      success: true,
      data: {
        _id: cls._id.toString(),
        status: cls.status,
        canJoin,
        isLive,
        isCompleted,
        recordingUrl: cls.recordingUrl,
        meetingLink: cls.meetingLink,
        scheduledDate: cls.scheduledDate,
        scheduledTime: cls.scheduledTime,
        duration: cls.duration
      }
    });
  } catch (error: any) {
    console.error('Error fetching class status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}