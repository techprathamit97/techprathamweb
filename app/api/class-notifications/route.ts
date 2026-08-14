import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Batch = require('@/models/Batch');
const Student = require('@/models/Student');
const Trainer = require('@/models/Trainer');

const CRON_SECRET = process.env.CRON_SECRET || 'techpratham-cron-secret';
const NOTIFICATION_SECRET = process.env.NOTIFICATION_SECRET || 'techpratham-notification-secret';

// Sent notifications cache to avoid duplicates (in production, use Redis or database)
const sentNotificationsCache = new Map<string, number>();
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

// Clean up old cache entries
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, timestamp] of sentNotificationsCache.entries()) {
    if (now - timestamp > CACHE_EXPIRY) {
      sentNotificationsCache.delete(key);
    }
  }
};

// Helper to send email notification
const sendClassNotificationEmail = async (
  recipients: string[],
  batchName: string,
  courseTitle: string,
  classTime: string,
  userType: 'student' | 'trainer'
) => {
  if (recipients.length === 0) return { success: false, message: 'No recipients' };

  const subject = `🔔 Class Starting in 5 Minutes - ${courseTitle}`;
  
  const message = userType === 'trainer' 
    ? `Dear Trainer,

Your class for batch "${batchName}" is starting in 5 minutes!

📚 Course: ${courseTitle}
👥 Batch: ${batchName}
🕐 Class Time: ${classTime}

Please join the class now to start the session.

You can access your batch management from the trainer dashboard.

Best regards,
TechPratham Team`
    : `Dear Student,

Your class is starting in 5 minutes!

📚 Course: ${courseTitle}
👥 Batch: ${batchName}
🕐 Class Time: ${classTime}

Please be ready to join the class when your trainer starts the session.

You can access your classes from the student dashboard.

Best regards,
TechPratham Team`;

  try {
    const emailResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipients.join(','),
        subject,
        message
      })
    });

    const emailResult = await emailResponse.json();
    return emailResult;
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: getErrorMessage(error) };
  }
};

// Helper to parse batch timing and check if it's 5 minutes before class
const checkClassNotificationTime = (timing: string, currentTime: Date) => {
  // Parse batch timing (e.g., "11:45 AM to 12:45 PM")
  const timingMatch = timing.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!timingMatch) return null;

  const [, hours, minutes, ampm] = timingMatch;
  let classHour = parseInt(hours);
  const classMinute = parseInt(minutes);
  
  // Convert to 24-hour format
  if (ampm.toUpperCase() === 'PM' && classHour !== 12) {
    classHour += 12;
  } else if (ampm.toUpperCase() === 'AM' && classHour === 12) {
    classHour = 0;
  }

  // Create class time for today in IST
  const todayClassTime = new Date(currentTime);
  todayClassTime.setHours(classHour, classMinute, 0, 0);
  
  // Calculate 5 minutes before class time
  const fiveMinutesBefore = new Date(todayClassTime.getTime() - 5 * 60 * 1000);
  
  // Check if current time is within 1 minute of the 5-minute mark
  // This gives us a 1-minute window to catch the notification time
  const timeDiff = Math.abs(currentTime.getTime() - fiveMinutesBefore.getTime());
  const isNotificationTime = timeDiff <= 60 * 1000; // Within 1 minute
  
  return {
    isNotificationTime,
    classTime: todayClassTime,
    notificationTime: fiveMinutesBefore,
    timeDiff,
    formattedClassTime: todayClassTime.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  };
};

// POST - Send class notifications (called by cron job every minute)
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    // Security check
    if (secret !== CRON_SECRET && secret !== NOTIFICATION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();
    
    // Use IST timezone
    const now = new Date();
    const istNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    
    console.log('=== Class Notification Check ===');
    console.log('Current IST time:', istNow.toLocaleString("en-IN", {timeZone: "Asia/Kolkata"}));
    
    // Skip weekends
    const dayOfWeek = istNow.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('Weekend detected - skipping notifications');
      return NextResponse.json({
        success: true,
        message: 'Weekend - no notifications sent',
        results: { notificationsSent: 0 }
      });
    }

    // Clean up old cache entries
    cleanupCache();

    // Get all active batches with timing information
    const batches = await Batch.find({
      timing: { $exists: true, $nin: [null, ''] }
    })
    .populate('trainerId', 'name email')
    .populate('studentIds', 'name email')
    .lean();

    console.log(`Found ${batches.length} batches with timing information`);

    const results: {
      batchesChecked: number;
      notificationsSent: number;
      emailsSent: number;
      errors: string[];
    } = {
      batchesChecked: batches.length,
      notificationsSent: 0,
      emailsSent: 0,
      errors: []
    };

    for (const batch of batches) {
      try {
        console.log(`\nChecking batch: ${batch.batchName} - Timing: ${batch.timing}`);

        const timingCheck = checkClassNotificationTime(batch.timing, istNow);
        if (!timingCheck) {
          console.log('  Could not parse timing format');
          continue;
        }

        console.log(`  Class time: ${timingCheck.formattedClassTime}`);
        console.log(`  Notification time: ${timingCheck.notificationTime.toLocaleTimeString('en-IN', {timeZone: 'Asia/Kolkata'})}`);
        console.log(`  Time diff: ${Math.round(timingCheck.timeDiff / 1000)} seconds`);
        console.log(`  Is notification time: ${timingCheck.isNotificationTime}`);

        if (!timingCheck.isNotificationTime) {
          console.log('  Not notification time - skipping');
          continue;
        }

        // Create unique cache key for this batch and date
        const dateKey = istNow.toISOString().split('T')[0]; // YYYY-MM-DD
        const cacheKey = `${batch._id}-${dateKey}`;
        
        // Check if we already sent notification for this batch today
        if (sentNotificationsCache.has(cacheKey)) {
          console.log('  Notification already sent today - skipping');
          continue;
        }

        console.log('  📧 SENDING NOTIFICATIONS!');

        // Get trainer email
        const trainer = batch.trainerId;
        const trainerEmails = trainer && trainer.email ? [trainer.email] : [];

        // Get student emails
        const students = batch.studentIds || [];
        const studentEmails = students
          .filter((student: any) => student && student.email)
          .map((student: any) => student.email);

        console.log(`  Trainer emails: ${trainerEmails.length}`);
        console.log(`  Student emails: ${studentEmails.length}`);

        let emailsSentForBatch = 0;

        // Send notification to trainer
        if (trainerEmails.length > 0) {
          const trainerResult = await sendClassNotificationEmail(
            trainerEmails,
            batch.batchName,
            batch.courseTitle || batch.batchName,
            timingCheck.formattedClassTime,
            'trainer'
          );
          
          if (trainerResult.success) {
            console.log(`  ✅ Trainer notification sent to: ${trainerEmails.join(', ')}`);
            emailsSentForBatch += trainerEmails.length;
          } else {
            console.error(`  ❌ Failed to send trainer notification:`, trainerResult.error);
            results.errors.push(`Trainer notification failed for batch ${batch.batchName}: ${trainerResult.error}`);
          }
        }

        // Send notification to students
        if (studentEmails.length > 0) {
          const studentResult = await sendClassNotificationEmail(
            studentEmails,
            batch.batchName,
            batch.courseTitle || batch.batchName,
            timingCheck.formattedClassTime,
            'student'
          );
          
          if (studentResult.success) {
            console.log(`  ✅ Student notifications sent to ${studentEmails.length} students`);
            emailsSentForBatch += studentEmails.length;
          } else {
            console.error(`  ❌ Failed to send student notifications:`, studentResult.error);
            results.errors.push(`Student notifications failed for batch ${batch.batchName}: ${studentResult.error}`);
          }
        }

        if (emailsSentForBatch > 0) {
          // Mark as sent in cache
          sentNotificationsCache.set(cacheKey, istNow.getTime());
          results.notificationsSent++;
          results.emailsSent += emailsSentForBatch;
          
          console.log(`  📬 Total emails sent for batch: ${emailsSentForBatch}`);
        }

      } catch (batchError) {
        console.error(`Error processing batch ${batch.batchName}:`, batchError);
        results.errors.push(`Error processing batch ${batch.batchName}: ${getErrorMessage(batchError)}`);
      }
    }

    console.log('\n=== Notification Summary ===');
    console.log(`Batches checked: ${results.batchesChecked}`);
    console.log(`Notifications sent: ${results.notificationsSent}`);
    console.log(`Total emails sent: ${results.emailsSent}`);
    console.log(`Errors: ${results.errors.length}`);

    return NextResponse.json({
      success: true,
      message: `Class notification check completed`,
      results,
      timestamp: istNow.toISOString()
    });

  } catch (error) {
    console.error('Class notification error:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

// GET - Check notification status and next scheduled times
export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    
    const now = new Date();
    const istNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));

    // Get all batches with timing
    const batches = await Batch.find({
      timing: { $exists: true, $nin: [null, ''] }
    })
    .select('batchName timing courseTitle')
    .lean();

    const nextNotifications: Array<{
      batchName: string;
      courseTitle: string;
      timing: string;
      classTime: string;
      notificationTime: string;
      isNotificationTime: boolean;
      timeDiffMinutes: number;
    }> = [];

    for (const batch of batches) {
      const timingCheck = checkClassNotificationTime(batch.timing, istNow);
      if (timingCheck) {
        nextNotifications.push({
          batchName: batch.batchName,
          courseTitle: batch.courseTitle || batch.batchName,
          timing: batch.timing,
          classTime: timingCheck.formattedClassTime,
          notificationTime: timingCheck.notificationTime.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          isNotificationTime: timingCheck.isNotificationTime,
          timeDiffMinutes: Math.round(timingCheck.timeDiff / 60000)
        });
      }
    }

    return NextResponse.json({
      success: true,
      currentTime: istNow.toLocaleString("en-IN", {timeZone: "Asia/Kolkata"}),
      batchesWithTiming: batches.length,
      nextNotifications,
      cacheSize: sentNotificationsCache.size
    });

  } catch (error) {
    console.error('Error checking notification status:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}