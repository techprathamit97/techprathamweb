import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
import ModuleClass from '@/models/ModuleClass';

// GET /api/debug-session-tokens?classId=xxx
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { classId } = req.query;
    
    if (!classId) {
      return res.status(400).json({ success: false, error: 'Missing classId' });
    }

    await connectMongo();

    const moduleClass = await ModuleClass.findById(classId);
    if (!moduleClass) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    return res.status(200).json({
      success: true,
      classId,
      bbbMeetingId: moduleClass.bbbMeetingId,
      status: moduleClass.status,
      isLive: moduleClass.isLive,
      studentSessionTokens: moduleClass.studentSessionTokens || [],
      joinedSessionTokens: moduleClass.joinedSessionTokens || [],
      debug: {
        studentTokenCount: (moduleClass.studentSessionTokens || []).length,
        joinedTokenCount: (moduleClass.joinedSessionTokens || []).length,
        hasDuplicateTokens: (moduleClass.joinedSessionTokens || []).length !== new Set(moduleClass.joinedSessionTokens || []).size
      }
    });

  } catch (err: any) {
    console.error('Debug session tokens error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}