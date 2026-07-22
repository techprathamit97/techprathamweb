import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import { sendPushNotification } from '@/lib/pushNotifications';
const Notification = require('@/models/Notification');

// GET /api/notifications - Get notifications for user
export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userType = searchParams.get('userType'); // 'student' or 'trainer'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    if (!userId || !userType) {
      return NextResponse.json(
        { success: false, error: 'userId and userType are required' },
        { status: 400 }
      );
    }

    // Build query based on user type - handle both ObjectId and string ID
    const mongoose = require('mongoose');
    const Student = require('@/models/Student');
    const Trainer = require('@/models/Trainer');
    const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);

    let query;
    if (userType === 'student') {
      if (isValidObjectId) {
        query = { studentId: userId };
      } else {
        // Look up student by string ID to get the MongoDB ObjectId
        const student = await Student.findOne({ studentId: userId }).select('_id').lean();
        if (student) {
          query = { studentId: student._id.toString() };
        } else {
          query = { studentId: userId }; // Fallback - won't match much
        }
      }
    } else if (userType === 'admin') {
      // Admin notifications
      query = { adminId: userId };
    } else {
      if (isValidObjectId) {
        query = { trainerId: userId };
      } else {
        // Look up trainer by string ID
        const trainer = await Trainer.findOne({ trainerId: userId }).select('_id').lean();
        if (trainer) {
          query = { trainerId: trainer._id.toString() };
        } else {
          query = { trainerId: userId };
        }
      }
    }

    if (unreadOnly) {
      (query as any).read = false;
    }

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, read: false })
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create notification(s)
export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const {
      notifications, // Array of notifications or single notification
      studentId,
      trainerId,
      adminId,
      title,
      message,
      type,
      priority,
      relatedId,
      relatedType,
      batchId,
      actionUrl,
      expiresInHours
    } = body;

    // Handle bulk notifications
    if (notifications && Array.isArray(notifications)) {
      const createdNotifications = await Notification.insertMany(notifications);

      // Emit socket event for each notification
      for (const notification of createdNotifications) {
        await emitNotification(notification);
        await trySendPush(notification);
      }

      return NextResponse.json({
        success: true,
        message: `${createdNotifications.length} notifications created`,
        data: createdNotifications
      });
    }

    // Single notification
    if (!title || !message || !type) {
      return NextResponse.json(
        { success: false, error: 'title, message, and type are required' },
        { status: 400 }
      );
    }

    // Calculate expiration
    let expiresAt;
    if (expiresInHours) {
      expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    }

    const notification = new Notification({
      studentId,
      trainerId,
      adminId,
      title,
      message,
      type,
      priority: priority || 'medium',
      relatedId,
      relatedType,
      batchId,
      actionUrl,
      expiresAt
    });

    await notification.save();

    // Emit real-time notification
    await emitNotification(notification);
    await trySendPush(notification);

    return NextResponse.json({
      success: true,
      message: 'Notification created',
      data: notification
    });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/notifications - Mark as read
export async function PUT(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const { notificationIds, markAllRead, userId, userType } = body;

    if (markAllRead && userId && userType) {
      // Mark all as read for user
      const query = userType === 'student'
        ? { studentId: userId, read: false }
        : { trainerId: userId, read: false };

      await Notification.updateMany(query, { $set: { read: true } });

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      });
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { success: false, error: 'notificationIds array is required' },
        { status: 400 }
      );
    }

    await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { $set: { read: true } }
    );

    return NextResponse.json({
      success: true,
      message: `${notificationIds.length} notifications marked as read`
    });
  } catch (error: any) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Delete notifications
export async function DELETE(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get('id');
    const deleteAllRead = searchParams.get('deleteAllRead') === 'true';
    const userId = searchParams.get('userId');
    const userType = searchParams.get('userType');

    if (notificationId) {
      await Notification.findByIdAndDelete(notificationId);
      return NextResponse.json({
        success: true,
        message: 'Notification deleted'
      });
    }

    if (deleteAllRead && userId && userType) {
      const query = userType === 'student'
        ? { studentId: userId, read: true }
        : { trainerId: userId, read: true };

      const result = await Notification.deleteMany(query);

      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} read notifications deleted`
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid delete parameters' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to emit real-time notification via Socket.IO
async function emitNotification(notification: any) {
  try {
    // Socket.IO functionality removed - BigBlueButton integration does not use custom WebSockets
    console.log('Socket.IO not available, skipping real-time emit');
  } catch (error) {
    console.error('Error emitting notification:', error);
  }
}

async function trySendPush(notification: any) {
  if (notification.studentId) {
    await sendPushNotification(notification.studentId.toString(), 'student', {
      title: notification.title,
      message: notification.message,
      url: notification.actionUrl || '/student/notifications'
    });
  } else if (notification.trainerId) {
    await sendPushNotification(notification.trainerId.toString(), 'trainer', {
      title: notification.title,
      message: notification.message,
      url: notification.actionUrl || '/trainer'
    });
  } else if (notification.adminId) {
    await sendPushNotification(notification.adminId.toString(), 'admin', {
      title: notification.title,
      message: notification.message,
      url: notification.actionUrl || '/lms/batches'
    });
  }
}