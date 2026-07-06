import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
const ModuleClass = require('@/models/ModuleClass');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== MEETING ENDED WEBHOOK ===');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);

    const { meetingId, event } = req.body;

    if (event === 'meeting-ended' && meetingId) {
      console.log(`Meeting ended: ${meetingId}`);

      await connectMongo();

      // Find the class associated with this meeting
      const moduleClass = await ModuleClass.findOne({
        $or: [
          { bbbMeetingId: meetingId },
          { bbbMeetingId: { $regex: meetingId } },
          { _id: meetingId.replace('class-', '') }
        ]
      });

      if (moduleClass) {
        console.log(`Found class: ${moduleClass.moduleTitle}`);

        // Mark class as completed
        moduleClass.status = 'completed';
        moduleClass.isLive = false;
        moduleClass.actualEndTime = new Date();
        await moduleClass.save();

        // Trigger recording processing after a short delay
        setTimeout(async () => {
          try {
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