import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
import ModuleClass from '@/models/ModuleClass';

// POST { classId, trainerAction: 'end_session' }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { classId, trainerAction } = req.body;
    
    if (!classId || trainerAction !== 'end_session') {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing classId or invalid trainerAction' 
      });
    }

    await connectMongo();

    const moduleClass = await ModuleClass.findById(classId);
    if (!moduleClass) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    // Clear all session data when trainer ends the session
    const updateResult = await ModuleClass.findByIdAndUpdate(
      classId, 
      {
        $set: {
          status: 'completed',
          isLive: false,
          actualEndTime: new Date(),
          // Clear session tokens to allow fresh joins for future classes
          joinedSessionTokens: [],
          studentSessionTokens: []
        }
      },
      { new: true }
    );

    console.log('Session ended by trainer for class:', classId);
    console.log('Cleared all session tokens and marked class as completed');

    return res.status(200).json({ 
      success: true, 
      message: 'Class session ended successfully',
      classStatus: 'completed',
      clearedTokens: true
    });

  } catch (err: any) {
    console.error('End session error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}