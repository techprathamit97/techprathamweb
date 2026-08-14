import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
import ModuleClass from '@/models/ModuleClass';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectMongo();
    
    const { meetingId, reason } = req.body;
    
    if (!meetingId) {
      return res.status(400).json({ error: 'Meeting ID required' });
    }
    
    console.log(`🔚 SESSION ENDED: Meeting ${meetingId}, Reason: ${reason}`);
    
    // Find the class with this meeting ID and mark it as completed
    const updatedClass = await ModuleClass.findOneAndUpdate(
      { bbbMeetingId: meetingId },
      {
        status: 'completed',
        isLive: false,
        actualEndTime: new Date(),
        // Clear session tokens to prevent join issues
        $unset: { 
          joinedSessionTokens: 1,
          studentSessionTokens: 1 
        }
      },
      { new: true }
    );
    
    if (updatedClass) {
      console.log(`✅ SESSION END: Marked class "${updatedClass.moduleTitle}" as completed`);
      
      return res.status(200).json({
        success: true,
        message: 'Class marked as completed',
        classId: updatedClass._id,
        moduleTitle: updatedClass.moduleTitle
      });
    } else {
      console.log(`⚠️ SESSION END: No class found for meeting ${meetingId}`);
      
      return res.status(404).json({
        success: false,
        error: 'No class found for this meeting ID'
      });
    }
    
  } catch (error) {
    console.error('❌ SESSION END ERROR:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to process session end: ' + error.message
    });
  }
}