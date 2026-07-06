import { connectMongo } from '@/utils/mongodb';
const Notification = require('@/models/Notification');
const Student = require('@/models/Student');
const Batch = require('@/models/Batch');

// Notification types
export type NotificationType =
  | 'class'
  | 'quiz'
  | 'assignment'
  | 'deadline'
  | 'announcement'
  | 'schedule_change'
  | 'daily_reminder'
  | 'upcoming_class';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface CreateNotificationParams {
  studentId?: string;
  trainerId?: string;
  batchId?: string;
  title: string;
  message: string;
  type: NotificationType;
  priority?: Priority;
  relatedId?: string;
  relatedType?: 'LiveClass' | 'LiveClassSession' | 'Quiz' | 'Assignment' | 'Batch';
  actionUrl?: string;
  expiresInHours?: number;
}

// Create a single notification
export async function createNotification(params: CreateNotificationParams) {
  await connectMongo();

  const { expiresInHours, ...notificationData } = params;

  let expiresAt;
  if (expiresInHours) {
    expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  }

  const notification = new Notification({
    ...notificationData,
    expiresAt
  });

  await notification.save();
  return notification;
}

// Create notification for all students in a batch
export async function notifyBatchStudents(
  batchId: string,
  title: string,
  message: string,
  type: NotificationType,
  params?: Partial<CreateNotificationParams>
) {
  await connectMongo();

  // Get all students in the batch
  const batch = await Batch.findById(batchId).lean();
  if (!batch) {
    console.log('Batch not found:', batchId);
    return;
  }

  const studentIds = batch.studentIds?.map((id: any) => id.toString()) || [];

  if (studentIds.length === 0) {
    console.log('No students in batch:', batchId);
    return;
  }

  const notifications = studentIds.map((studentId: string) => ({
    studentId,
    batchId,
    title,
    message,
    type,
    ...params
  }));

  await Notification.insertMany(notifications);
  console.log(`Created ${notifications.length} notifications for batch ${batchId}`);

  return notifications;
}

// Notify multiple specific students
export async function notifyStudents(
  studentIds: string[],
  title: string,
  message: string,
  type: NotificationType,
  params?: Partial<CreateNotificationParams>
) {
  await connectMongo();

  if (studentIds.length === 0) return [];

  const notifications = studentIds.map((studentId: string) => ({
    studentId,
    title,
    message,
    type,
    ...params
  }));

  const result = await Notification.insertMany(notifications);
  console.log(`Created ${result.length} notifications`);

  return result;
}

// Notify all students enrolled in multiple batches
export async function notifyBatches(
  batchIds: string[],
  title: string,
  message: string,
  type: NotificationType,
  params?: Partial<CreateNotificationParams>
) {
  await connectMongo();

  // Get unique student IDs from all batches
  const batches = await Batch.find({ _id: { $in: batchIds } }).lean();
  const studentSet = new Set<string>();

  batches.forEach((batch: any) => {
    batch.studentIds?.forEach((id: any) => {
      studentSet.add(id.toString());
    });
  });

  const studentIds = Array.from(studentSet);
  return notifyStudents(studentIds, title, message, type, params);
}

// Schedule a notification for future delivery
export async function scheduleNotification(
  title: string,
  message: string,
  type: NotificationType,
  scheduledFor: Date,
  params: CreateNotificationParams
) {
  await connectMongo();

  const notification = new Notification({
    ...params,
    title,
    message,
    type,
    scheduledFor
  });

  await notification.save();
  return notification;
}

// Cancel scheduled notifications
export async function cancelScheduledNotifications(relatedId: string, relatedType: string) {
  await connectMongo();

  const result = await Notification.deleteMany({
    relatedId,
    relatedType,
    scheduledFor: { $gt: new Date() }
  });

  return result;
}

// Get notification templates
export const NotificationTemplates = {
  upcomingClass: (className: string, minutesBefore: number) => ({
    title: 'Class Starting Soon',
    message: `${className} starts in ${minutesBefore} minutes`,
    type: 'upcoming_class' as NotificationType,
    priority: 'high' as Priority
  }),

  dailyReminder: (classCount: number) => ({
    title: 'Daily Class Reminder',
    message: `You have ${classCount} class${classCount > 1 ? 'es' : ''} today`,
    type: 'daily_reminder' as NotificationType,
    priority: 'medium' as Priority
  }),

  quizUploaded: (quizName: string) => ({
    title: 'New Quiz Available',
    message: `New quiz "${quizName}" has been uploaded`,
    type: 'quiz' as NotificationType,
    priority: 'high' as Priority
  }),

  assignmentUploaded: (assignmentName: string) => ({
    title: 'New Assignment',
    message: `New assignment "${assignmentName}" has been uploaded`,
    type: 'assignment' as NotificationType,
    priority: 'high' as Priority
  }),

  assignmentDeadline: (assignmentName: string, deadlineDate: Date) => {
    const hoursLeft = Math.round((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60));
    let message;
    if (hoursLeft <= 24) {
      message = `Assignment "${assignmentName}" submission closes in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`;
    } else {
      const daysLeft = Math.round(hoursLeft / 24);
      message = `Assignment "${assignmentName}" deadline: ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`;
    }

    return {
      title: 'Assignment Deadline Reminder',
      message,
      type: 'deadline' as NotificationType,
      priority: 'urgent' as Priority
    };
  },

  quizDeadline: (quizName: string, deadlineDate: Date) => {
    const hoursLeft = Math.round((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60));
    let message;
    if (hoursLeft <= 1) {
      message = `Quiz "${quizName}" closes in ${hoursLeft * 60} minutes!`;
    } else if (hoursLeft <= 24) {
      message = `Quiz "${quizName}" closes in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`;
    } else {
      const daysLeft = Math.round(hoursLeft / 24);
      message = `Quiz "${quizName}" deadline: ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`;
    }

    return {
      title: 'Quiz Deadline Reminder',
      message,
      type: 'deadline' as NotificationType,
      priority: 'urgent' as Priority
    };
  },

  classTimeChanged: (className: string, oldTime: string, newTime: string) => ({
    title: 'Class Schedule Changed',
    message: `${className} has been rescheduled from ${oldTime} to ${newTime}`,
    type: 'schedule_change' as NotificationType,
    priority: 'urgent' as Priority
  }),

  classCancelled: (className: string, newDate?: string) => ({
    title: 'Class Cancelled',
    message: newDate
      ? `${className} has been cancelled. Rescheduled to ${newDate}`
      : `${className} has been cancelled`,
    type: 'schedule_change' as NotificationType,
    priority: 'urgent' as Priority
  })
};