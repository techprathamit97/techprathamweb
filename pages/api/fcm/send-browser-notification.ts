import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const Batch = require('@/models/Batch');

// Fallback notification API that works without FCM
// This sends a response that the frontend can use to show browser notifications
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { 
      batchId, 
      title, 
      body, 
      classId, 
      meetingId,
      type = 'class_started',
      actionUrl = '/student/classes' 
    } = req.body;

    if (!batchId || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: batchId, title, body'
      });
    }

    await connectMongo();

    console.log(`📱 Browser Notification Request:`, {
      batchId, title, body, classId, type
    });

    // Get batch information
    const batch = await Batch.findById(batchId).populate('studentIds');
    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    console.log(`📋 Found batch: ${batch.batchName} with ${batch.studentIds?.length || 0} students`);

    // Get all students in the batch
    const studentIds = batch.studentIds?.map((student: any) => student._id) || [];
    const students: any[] = await Student.find({
      _id: { $in: studentIds }
    }).lean();

    console.log(`👥 Found ${students.length} students in batch`);

    if (students.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No students found in this batch',
        sentCount: 0,
        totalStudents: batch.studentIds?.length || 0,
        notificationType: 'browser_fallback'
      });
    }

    // Create notification data for frontend to display
    const notificationData = {
      title,
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'class-notification',
      requireInteraction: true,
      data: {
        type,
        classId,
        meetingId,
        url: actionUrl,
        timestamp: Date.now()
      }
    };

    // Return success with notification data
    // Frontend can use this to show browser notifications
    return res.status(200).json({
      success: true,
      message: 'Browser notification data prepared',
      sentCount: students.length, // Simulate sending to all students
      failedCount: 0,
      totalStudents: students.length,
      totalTokens: students.length, // Simulate having tokens
      notificationType: 'browser_fallback',
      notificationData,
      students: students.map((s: any) => ({
        id: s._id,
        name: s.name,
        email: s.email
      })),
      batchName: batch.batchName,
      instructions: {
        message: 'FCM not configured. Showing browser notification instead.',
        action: 'Check browser notifications or use the notification data to display in UI'
      }
    });

  } catch (error: any) {
    console.error('💥 Browser notification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to prepare browser notifications',
      message: error.message
    });
  }
}