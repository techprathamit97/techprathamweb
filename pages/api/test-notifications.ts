import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
const Batch = require('@/models/Batch');
const Student = require('@/models/Student');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    await connectMongo();

    // Get test parameters
    const { batchId, testNotification } = req.query;

    // If testNotification is requested
    if (testNotification === 'true') {
      if (!batchId) {
        return res.status(400).json({
          success: false,
          error: 'batchId is required for test notification'
        });
      }

      // Send test notification
      const notificationResponse = await fetch(`${req.headers.host?.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/fcm/send-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: batchId,
          title: '🧪 Test Notification',
          body: 'This is a test notification from TechPratham LMS to verify push notifications are working!',
          classId: 'test-class',
          type: 'test',
          actionUrl: '/student/classes'
        })
      });

      const result = await notificationResponse.json();
      
      return res.status(200).json({
        success: true,
        message: 'Test notification sent',
        notificationResult: result
      });
    }

    // Get notification system status
    const batches = await Batch.find({}).populate('studentIds').limit(5);
    
    const notificationStats = await Promise.all(
      batches.map(async (batch: { _id: string; batchName: string; studentIds?: Array<{ _id: string }> }) => {
        const studentIds = batch.studentIds?.map((s: { _id: string }) => s._id) || [];
        const studentsWithTokens = await Student.find({
          _id: { $in: studentIds },
          'fcmTokens.isActive': true
        }).countDocuments();

        const totalTokens = await Student.aggregate([
          { $match: { _id: { $in: studentIds }, 'fcmTokens.isActive': true } },
          { $unwind: '$fcmTokens' },
          { $match: { 'fcmTokens.isActive': true } },
          { $count: 'totalTokens' }
        ]);

        return {
          batchId: batch._id,
          batchName: batch.batchName,
          totalStudents: studentIds.length,
          studentsWithTokens,
          totalActiveTokens: totalTokens[0]?.totalTokens || 0
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Firebase Push Notification System Status',
      firebaseConfig: {
        projectId: 'techpratham-lms',
        configured: process.env.FIREBASE_CLIENT_EMAIL ? !process.env.FIREBASE_CLIENT_EMAIL.includes('placeholder') : false,
        vapidKey: 'BK8oVkCJYpR2E-Kg7G3X2QvHd6TvYNNlfgauVZZ1yddRorTGvNNOQa4qEk0gZFu8ikPBhLcixAJi4zjENmGOyFk'
      },
      batches: notificationStats,
      testInstructions: {
        message: 'To test notifications, add ?testNotification=true&batchId=<BATCH_ID> to this URL',
        example: `/api/test-notifications?testNotification=true&batchId=${notificationStats[0]?.batchId || 'BATCH_ID'}`
      }
    });

  } catch (error: any) {
    console.error('Test notifications error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get notification status',
      message: error.message
    });
  }
}