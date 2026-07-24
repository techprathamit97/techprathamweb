import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
import ModuleClass from '@/models/ModuleClass';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ success: false, error: 'Debug endpoint only available in development' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { classId } = req.query;
  if (!classId) return res.status(400).json({ success: false, error: 'Missing classId' });

  try {
    await connectMongo();
    const moduleClass = await ModuleClass.findById(String(classId));
    if (!moduleClass) return res.status(404).json({ success: false, error: 'Class not found' });

    return res.status(200).json({
      success: true,
      joinedSessionTokens: moduleClass.joinedSessionTokens || [],
      studentSessionTokens: moduleClass.studentSessionTokens || [],
      bbbMeetingId: moduleClass.bbbMeetingId || null
    });
  } catch (err: any) {
    console.error('Debug endpoint error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
