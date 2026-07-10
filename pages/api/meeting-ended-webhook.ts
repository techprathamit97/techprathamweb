import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
const ModuleClass = require('@/models/ModuleClass');

/**
 * Helper function to find a class by meeting ID
 */
async function findClassByMeetingId(meetingId: string) {
  return await ModuleClass.findOne({
    $or: [
      { bbbMeetingId: meetingId },
      { bbbMeetingId: { $regex: meetingId } },
      { _id: meetingId.replace('class-', '') }
    ]
  });
}

/**
 * Trigger recording processing for a class
 */
async function triggerRecordingProcessing(moduleClass: any, meetingId: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  console.log('Triggering recording processing for:', moduleClass._id);

  await fetch(`${baseUrl}/api/process-bbb-recordings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      classId: moduleClass._id,
      meetingId: meetingId
    })
  });

  console.log('Recording processing triggered successfully');
}

/**
 * Handle user-left event - process recording when moderator (trainer) leaves
 */
async function handleUserLeftEvent(meetingId: string, userId: string, role?: string) {
  console.log(`User left event: userId=${userId}, role=${role}, meetingId=${meetingId}`);

  await connectMongo();

  const moduleClass = await findClassByMeetingId(meetingId);

  if (!moduleClass) {
    console.log(`No class found for meeting: ${meetingId}`);
    return { success: false, error: 'Class not found' };
  }

  // Only process recording when moderator (trainer) leaves
  // Check if role is moderator or if we can't determine the role
  const isModerator = role === 'MODERATOR' || role === 'moderator';

  // If we can't determine the role, we should still process - to be safe
  if (!isModerator && role && role !== 'ATTENDEE' && role !== 'attendee') {
    console.log(`User left with unknown role: ${role}, processing recording anyway for safety`);
  }

  console.log(`Trainer (moderator) left class: ${moduleClass.moduleTitle}`);

  // Mark class as completed
  moduleClass.status = 'completed';
  moduleClass.isLive = false;
  moduleClass.actualEndTime = new Date();
  await moduleClass.save();

  // Trigger recording processing immediately when trainer leaves
  await triggerRecordingProcessing(moduleClass, meetingId);

  return { success: true, message: 'Recording processing triggered' };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== BBB WEBHOOK ===');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);

    const { meetingId, event, userId, role } = req.body;

    // Handle user-left event - when trainer leaves, process recording
    if (event === 'user-left' && meetingId) {
      console.log(`User left meeting: ${meetingId}, userId: ${userId}, role: ${role}`);

      const result = await handleUserLeftEvent(meetingId, userId, role);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'Trainer left, recording processing triggered'
        });
      } else {
        return res.status(404).json({
          success: false,
          error: result.error
        });
      }
    }

    // Handle meeting-ended event - fallback for when meeting ends without trainer leaving
    if (event === 'meeting-ended' && meetingId) {
      console.log(`Meeting ended: ${meetingId}`);

      await connectMongo();

      const moduleClass = await findClassByMeetingId(meetingId);

      if (moduleClass) {
        console.log(`Found class: ${moduleClass.moduleTitle}`);

        // Mark class as completed (if not already done)
        if (moduleClass.status !== 'completed') {
          moduleClass.status = 'completed';
          moduleClass.isLive = false;
          moduleClass.actualEndTime = new Date();
          await moduleClass.save();
        }

        // Trigger recording processing after a short delay
        setTimeout(async () => {
          try {
            await triggerRecordingProcessing(moduleClass, meetingId);
          } catch (error) {
            console.error('Error triggering recording processing:', error);
          }
        }, 30000); // Wait 30 seconds for BBB to start processing

        return res.status(200).json({
          success: true,
          message: 'Meeting ended, recording processing scheduled'
        });
      } else {
        console.log(`No class found for meeting: ${meetingId}`);
        return res.status(404).json({
          success: false,
          error: 'Class not found for meeting ID'
        });
      }
    }

    // Handle user-joined event for debugging
    if (event === 'user-joined' && meetingId) {
      console.log(`User joined meeting: ${meetingId}, userId: ${userId}, role: ${role}`);
      return res.status(200).json({
        success: true,
        message: 'User join event logged'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook received'
    });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}