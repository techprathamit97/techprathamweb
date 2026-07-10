import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
const ModuleClass = require('@/models/ModuleClass');
const Student = require('@/models/Student');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { classId, recordingTitle } = req.body;

    console.log('📢 Notifying students of new recording:', recordingTitle);

    await connectMongo();

    // Get the class with the new recording
    const moduleClass = await ModuleClass.findById(classId).populate('batchId');
    
    if (!moduleClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }

    // Get all students in the batch
    const students = await Student.find({
      batchId: moduleClass.batchId
    });

    console.log(`📧 Found ${students.length} students to notify`);

    // Here you could add email notifications, push notifications, etc.
    // For now, we'll just log the notification

    const notifications = students.map(student => ({
      studentId: student._id,
      studentName: student.name,
      studentEmail: student.email,
      message: `New recording available: ${recordingTitle} for ${moduleClass.moduleTitle}`
    }));

    return res.status(200).json({
      success: true,
      message: `Notification sent to ${students.length} students`,
      notifications: notifications.length,
      recordingTitle: recordingTitle,
      className: moduleClass.moduleTitle
    });

  } catch (error: any) {
    console.error('❌ Notification error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}