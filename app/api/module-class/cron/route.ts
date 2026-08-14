import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const ModuleClass = require('@/models/ModuleClass');
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
      remindersSent: 0,
      classesMarkedCompleted: 0,
      nextClassesCreated: 0
    };

    // 1. Update class statuses based on scheduled time
    results.statusUpdated = await updateClassStatuses(now);

    // 2. Mark classes as completed after end time
    results.classesMarkedCompleted = await markClassesCompleted(now);

    // 3. Auto-create next classes when current ones complete - DISABLED PER USER REQUEST
    // User prefers virtual classes based on batch timing instead of pre-created database classes
    console.log('⚠️ Auto-creation of next classes is DISABLED - using virtual classes based on batch timing');
    results.nextClassesCreated = 0;

    // 4. Send 5-minute reminder notifications (NEW: for timing-based classes)
    results.notificationsSent = await sendTimingBasedNotifications(now);

    // 5. Send 5-minute reminder notifications (OLD: for database classes - still works)
    results.remindersSent = await sendClassReminders(now);

    // 6. Run comprehensive cleanup of ended sessions
    try {
      console.log('🧹 Running session cleanup...');
      
      // Call the cleanup API endpoint
      const cleanupResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/cleanup-stale-classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (cleanupResponse.ok) {
        const cleanupResult = await cleanupResponse.json();
        console.log('✅ Session cleanup completed:', cleanupResult);
        results.classesMarkedCompleted += cleanupResult.cleanedUp || 0;
      } else {
        console.log('⚠️ Session cleanup failed:', cleanupResponse.status);
      }
    } catch (cleanupError) {
      console.error('❌ Session cleanup error:', cleanupError);
    }

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
async function updateClassStatuses(now: Date): Promise<number> {
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
async function markClassesCompleted(now: Date): Promise<number> {
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

// Auto-create next classes when current ones complete - DISABLED
// This function is kept for reference but is no longer called
// User prefers virtual classes based on batch timing instead
async function autoCreateNextClassesOLD_DISABLED(now: Date): Promise<number> {
  console.log('🔄 Auto-creating next classes for completed ones...');
  
  // Find completed classes that don't have next class created
  const recentlyCompleted = await ModuleClass.find({
    status: 'completed',
    nextClassCreated: { $ne: true }
  })
  .populate('batchId')
  .populate('courseId')
  .lean();

  console.log(`Found ${recentlyCompleted.length} completed classes that need next classes`);

  let count = 0;

  for (const completedClass of recentlyCompleted) {
    try {
      // Get batch timing information
      const batch = completedClass.batchId as any;
      if (!batch || !batch.timing) {
        console.log(`Skipping class ${completedClass._id} - no batch timing info`);
        console.log('Batch data:', JSON.stringify(batch, null, 2));
        continue;
      }

      // Parse the batch timing (e.g., "2:40 PM to 3:41 PM")
      const timingMatch = batch.timing.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!timingMatch) {
        console.log(`Skipping class ${completedClass._id} - couldn't parse timing: ${batch.timing}`);
        continue;
      }

      const [, hours, minutes, ampm] = timingMatch;
      let classHour = parseInt(hours);
      const classMinute = parseInt(minutes);
      
      // Convert to 24-hour format
      if (ampm.toUpperCase() === 'PM' && classHour !== 12) {
        classHour += 12;
      } else if (ampm.toUpperCase() === 'AM' && classHour === 12) {
        classHour = 0;
      }

      // Calculate next class date (tomorrow at same time)
      const nextClassDate = new Date(now);
      nextClassDate.setDate(nextClassDate.getDate() + 1); // Tomorrow
      nextClassDate.setHours(classHour, classMinute, 0, 0);

      // Skip weekends (Saturday = 6, Sunday = 0)
      while (nextClassDate.getDay() === 0 || nextClassDate.getDay() === 6) {
        nextClassDate.setDate(nextClassDate.getDate() + 1);
      }

      // Format date and time for database
      const scheduledDate = nextClassDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const scheduledTime = `${classHour.toString().padStart(2, '0')}:${classMinute.toString().padStart(2, '0')}`;

      // Check if a class already exists for this batch at this time
      const existingClass = await ModuleClass.findOne({
        batchId: completedClass.batchId,
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime
      });

      if (existingClass) {
        console.log(`Class already exists for ${batch.batchName} on ${scheduledDate} at ${scheduledTime}`);
        
        // Mark the completed class so we don't check it again
        await ModuleClass.findByIdAndUpdate(completedClass._id, {
          nextClassCreated: true
        });
        continue;
      }

      // Generate next module info
      const nextModuleIndex = (completedClass.moduleIndex || 0) + 1;
      const nextModuleTitle = `Class ${nextModuleIndex} - ${completedClass.courseTitle || batch.courseTitle || 'Course'}`;

      // Create the next class
      const nextClass = new ModuleClass({
        courseId: completedClass.courseId,
        batchId: completedClass.batchId,
        trainerId: completedClass.trainerId,
        moduleTitle: nextModuleTitle,
        moduleIndex: nextModuleIndex,
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime,
        duration: completedClass.duration || 60, // Default 60 minutes
        status: 'scheduled',
        createdAt: now,
        updatedAt: now,
        autoCreated: true // Mark as auto-created
      });

      await nextClass.save();

      // Mark the completed class so we don't create another next class
      await ModuleClass.findByIdAndUpdate(completedClass._id, {
        nextClassCreated: true
      });

      count++;
      console.log(`✅ Created next class for ${batch.batchName}: ${nextModuleTitle} on ${scheduledDate} at ${scheduledTime}`);

      // Create notification for students about new class
      const studentIds = batch.studentIds?.map((id: any) => id.toString()) || [];
      if (studentIds.length > 0) {
        const notifications = [];

        for (const studentId of studentIds) {
          notifications.push({
            studentId,
            batchId: batch._id.toString(),
            title: 'New Class Scheduled',
            message: `${nextModuleTitle} has been scheduled for ${nextClassDate.toLocaleDateString('en-IN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} at ${hours}:${minutes} ${ampm}`,
            type: 'class_scheduled',
            priority: 'normal',
            relatedId: nextClass._id,
            relatedType: 'ModuleClass',
            actionUrl: '/student/batch-management'
          });
        }

        await Notification.insertMany(notifications);
        console.log(`📢 Sent ${notifications.length} notifications about new class`);
      }

    } catch (error) {
      console.error(`Error creating next class for ${completedClass._id}:`, error);
    }
  }

  console.log(`🎯 Auto-created ${count} next classes`);
  return count;
}

// Send timing-based class notifications (5 minutes before class)
async function sendTimingBasedNotifications(now: Date): Promise<number> {
  try {
    console.log('📧 Checking for timing-based class notifications...');
    
    const notificationResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/class-notifications?secret=${CRON_SECRET}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (notificationResponse.ok) {
      const result = await notificationResponse.json();
      if (result.success) {
        console.log(`📬 Timing-based notifications sent: ${result.results?.emailsSent || 0} emails to ${result.results?.notificationsSent || 0} batches`);
        return result.results?.emailsSent || 0;
      } else {
        console.error('Failed to send timing-based notifications:', result.error);
        return 0;
      }
    } else {
      console.error('Notification API call failed:', notificationResponse.status);
      return 0;
    }
  } catch (error) {
    console.error('Error calling notification system:', error);
    return 0;
  }
}

// Send 5-minute reminder notifications for database classes (existing functionality)
async function sendClassReminders(now: Date): Promise<number> {
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