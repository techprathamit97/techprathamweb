import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
const ModuleClass = require('@/models/ModuleClass');
const Batch = require('@/models/Batch');
const Student = require('@/models/Student');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectMongo();

    const now = new Date();
    let updatedClasses = 0;
    let remindersSet = 0;

    // Get all scheduled classes
    const scheduledClasses = await ModuleClass.find({ 
      status: 'scheduled',
      scheduledDate: {
        $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Classes from yesterday onwards
        $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Classes up to 7 days ahead
      }
    }).populate('batchId').populate('trainerId');

    for (const classItem of scheduledClasses) {
      const [hours, minutes] = classItem.scheduledTime.split(':');
      const classDateTime = new Date(classItem.scheduledDate);
      classDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const classEndTime = new Date(classDateTime.getTime() + classItem.duration * 60 * 1000);
      const reminderTime = new Date(classDateTime.getTime() - 30 * 60 * 1000); // 30 minutes before

      // Check if class should be marked as live
      if (now >= classDateTime && now <= classEndTime && classItem.status === 'scheduled') {
        await ModuleClass.findByIdAndUpdate(classItem._id, {
          status: 'live',
          isLive: true,
          canJoin: true
        });
        updatedClasses++;
        console.log(`Class ${classItem.moduleTitle} is now live`);
      }
      
      // Check if class should be marked as completed (auto-complete after class end time + 1 hour buffer)
      else if (now > new Date(classEndTime.getTime() + 60 * 60 * 1000) && classItem.status === 'live') {
        await ModuleClass.findByIdAndUpdate(classItem._id, {
          status: 'completed',
          isLive: false,
          canJoin: false,
          isCompleted: true,
          actualEndTime: classEndTime
        });
        updatedClasses++;
        console.log(`Class ${classItem.moduleTitle} marked as completed`);
      }

      // Send reminder 30 minutes before class (only if not already sent)
      else if (now >= reminderTime && now < classDateTime && !classItem.reminderSent) {
        try {
          const batch = await Batch.findById(classItem.batchId);
          if (batch && batch.studentIds && batch.studentIds.length > 0) {
            const students = await Student.find({ _id: { $in: batch.studentIds } }).lean();
            const studentEmails = students
              .map((s: any) => s.email)
              .filter((email: unknown): email is string => typeof email === 'string' && email.length > 0);
            
            if (studentEmails.length > 0) {
              const emailSubject = `🔔 Class Reminder: ${classItem.moduleTitle} starts in 30 minutes`;
              const emailMessage = `Dear Students,

This is a reminder that your class "${classItem.moduleTitle}" will start in 30 minutes.

Class Details:
- Subject: ${classItem.moduleTitle}
- Time: ${classItem.scheduledTime}
- Duration: ${classItem.duration} minutes
- Batch: ${batch.batchName}

Please be ready to join the class. The join link will be available 15 minutes before the class starts.

Best regards,
TechPratham Team`;

              // Send email using existing API
              const emailResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: studentEmails.join(', '),
                  subject: emailSubject,
                  message: emailMessage
                })
              });

              if (emailResponse.ok) {
                // Mark reminder as sent
                await ModuleClass.findByIdAndUpdate(classItem._id, {
                  reminderSent: true,
                  $push: {
                    notificationsSent: {
                      type: 'reminder',
                      sentAt: new Date(),
                      recipients: studentEmails
                    }
                  }
                });
                remindersSet++;
                console.log(`Reminder sent for class ${classItem.moduleTitle} to ${studentEmails.length} students`);
              }
            }
          }
        } catch (reminderError) {
          console.error(`Error sending reminder for class ${classItem._id}:`, reminderError);
        }
      }
    }

    // Also update canJoin flags for classes starting in 15 minutes
    const joinableClasses = await ModuleClass.find({
      status: 'scheduled',
      canJoin: false,
      scheduledDate: {
        $gte: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
        $lte: new Date(now.getTime() + 15 * 60 * 1000)  // 15 minutes from now
      }
    });

    for (const classItem of joinableClasses) {
      const [hours, minutes] = classItem.scheduledTime.split(':');
      const classDateTime = new Date(classItem.scheduledDate);
      classDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const joinWindow = new Date(classDateTime.getTime() - 15 * 60 * 1000); // 15 minutes before
      
      if (now >= joinWindow) {
        await ModuleClass.findByIdAndUpdate(classItem._id, {
          canJoin: true
        });
        console.log(`Class ${classItem.moduleTitle} is now joinable`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Updated ${updatedClasses} classes and sent ${remindersSet} reminders`,
      updatedClasses,
      remindersSet,
      timestamp: now.toISOString()
    });

  } catch (error: any) {
    console.error('Error updating class statuses:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}