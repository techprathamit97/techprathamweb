import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
const ModuleClass = require('@/models/ModuleClass');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { classId, meetingId } = req.body;

    if (!classId) {
      return res.status(400).json({
        success: false,
        error: 'classId is required'
      });
    }

    console.log('=== TRIGGER RECORDING ON EXIT ===');
    console.log('Class ID:', classId);
    console.log('Meeting ID:', meetingId);

    await connectMongo();

    // Get class details
    const moduleClass = await ModuleClass.findById(classId);
    if (!moduleClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }

    console.log('Found class:', moduleClass.moduleTitle);
    console.log('Current status:', moduleClass.status);

    // Only process if class is still live
    if (moduleClass.status === 'completed') {
      console.log('Class already completed, skipping');
      return res.status(200).json({
        success: true,
        message: 'Class already completed'
      });
    }

    // Update class status to completed
    moduleClass.status = 'completed';
    moduleClass.isLive = false;
    moduleClass.actualEndTime = new Date();
    await moduleClass.save();

    console.log('Class marked as completed');

    // Trigger recording processing
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const searchMeetingId = meetingId || `class-${classId}`;

    console.log('Triggering recording processing for:', searchMeetingId);

    // Wait a bit for BBB to finish processing the recording
    setTimeout(async () => {
      try {
        const response = await fetch(`${baseUrl}/api/process-bbb-recordings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId: classId,
            meetingId: searchMeetingId
          })
        });

        const data = await response.json();
        console.log('Recording processing result:', data);

        if (data.success) {
          console.log(`Processed ${data.totalProcessed} recordings`);
        }
      } catch (error) {
        console.error('Error processing recordings:', error);
      }
    }, 15000); // Wait 15 seconds for BBB to process

    return res.status(200).json({
      success: true,
      message: 'Recording processing triggered'
    });

  } catch (error: any) {
    console.error('Error triggering recording:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}