import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'studentId is required'
      });
    }

    // Sample notifications for testing
    const testNotifications = [
      {
        title: '🎓 React Class Started!',
        message: 'Your React Fundamentals class has started. Join now to not miss the introduction!',
        type: 'class_started',
        actionUrl: '/student/classes'
      },
      {
        title: '📝 Assignment Due Tomorrow',
        message: 'Your JavaScript assignment is due tomorrow at 5 PM. Make sure to submit on time.',
        type: 'assignment',
        actionUrl: '/student/assignments'
      },
      {
        title: '⏰ Class Reminder',
        message: 'Your Node.js class starts in 30 minutes. Prepare your development environment.',
        type: 'class_reminder',
        actionUrl: '/student/classes'
      },
      {
        title: '📢 Important Announcement',
        message: 'New learning materials have been uploaded for the Database Design module.',
        type: 'announcement',
        actionUrl: '/student/courses'
      },
      {
        title: '🏆 Quiz Completed',
        message: 'Great job! You scored 85% on the HTML/CSS quiz. Keep up the excellent work!',
        type: 'info',
        actionUrl: '/student/quizzes'
      }
    ];

    // Return the test notifications for the frontend to add
    return res.status(200).json({
      success: true,
      message: 'Test notifications prepared',
      notifications: testNotifications,
      studentId: studentId,
      count: testNotifications.length,
      instructions: 'Use the returned notifications array to add to the in-app bell'
    });

  } catch (error: any) {
    console.error('Seed test notifications error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to prepare test notifications',
      message: error.message
    });
  }
}