import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
const ModuleClass = require('@/models/ModuleClass');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectMongo();

    // Get recent classes
    const classes = await ModuleClass.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const classDebugInfo = classes.map(cls => ({
      _id: cls._id,
      moduleTitle: cls.moduleTitle,
      status: cls.status,
      isLive: cls.isLive,
      canJoin: cls.canJoin,
      scheduledDate: cls.scheduledDate,
      scheduledTime: cls.scheduledTime,
      bbbMeetingId: cls.bbbMeetingId ? 'SET' : 'NOT SET',
      bbbJoinUrl: cls.bbbJoinUrl ? 'SET' : 'NOT SET',
      bbbModeratorJoinUrl: cls.bbbModeratorJoinUrl ? 'SET' : 'NOT SET',
      createdAt: cls.createdAt
    }));

    return res.status(200).json({
      success: true,
      totalClasses: classes.length,
      classes: classDebugInfo,
      joinButtonConditions: {
        student: '(status === scheduled || isLive || canJoin)',
        trainer_joinPage: 'Always shows (no conditions)',
        trainer_coursePage: '(status === scheduled || status === live || isLive) && status !== completed'
      }
    });

  } catch (error: any) {
    console.error('Debug classes error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}