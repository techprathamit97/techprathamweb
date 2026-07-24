import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { studentId, fcmToken, deviceInfo } = req.body;

    if (!studentId || !fcmToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, fcmToken'
      });
    }

    await connectMongo();

    // Check if studentId is a valid MongoDB ObjectId (24 char hex string)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(studentId);

    // Build query - only search by _id if it's a valid ObjectId
    const query = isValidObjectId
      ? { $or: [{ studentId: studentId }, { _id: studentId }] }
      : { studentId: studentId };

    // Find the student
    const student = await Student.findOne(query);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Check if token already exists
    const existingTokenIndex = student.fcmTokens.findIndex(
      (tokenObj: any) => tokenObj.token === fcmToken
    );

    if (existingTokenIndex !== -1) {
      // Update existing token
      student.fcmTokens[existingTokenIndex].lastUsed = new Date();
      student.fcmTokens[existingTokenIndex].isActive = true;
      student.fcmTokens[existingTokenIndex].deviceInfo = deviceInfo || 'Unknown Device';
    } else {
      // Add new token
      student.fcmTokens.push({
        token: fcmToken,
        deviceInfo: deviceInfo || 'Unknown Device',
        lastUsed: new Date(),
        isActive: true
      });
    }

    // Clean up old/inactive tokens (keep only last 5 active tokens per user)
    student.fcmTokens = student.fcmTokens
      .filter((tokenObj: any) => tokenObj.isActive)
      .sort((a: any, b: any) => b.lastUsed.getTime() - a.lastUsed.getTime())
      .slice(0, 5);

    await student.save();

    console.log(`FCM token registered for student ${studentId}:`, fcmToken.substring(0, 20) + '...');

    return res.status(200).json({
      success: true,
      message: 'FCM token registered successfully',
      tokenCount: student.fcmTokens.length
    });

  } catch (error: any) {
    console.error('FCM token registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register FCM token',
      message: error.message
    });
  }
}