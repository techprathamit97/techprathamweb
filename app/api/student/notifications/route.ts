import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Notification = require('@/models/Notification');

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Get notifications for this student
    const notifications = await Notification.find({ studentId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Transform to match the format expected by the notification bell
    const transformedNotifications = notifications.map((notif: any) => ({
      id: notif._id.toString(),
      title: notif.title,
      message: notif.message,
      type: notif.type || 'info',
      timestamp: new Date(notif.createdAt).getTime(),
      read: notif.read || false,
      actionUrl: notif.actionUrl || '/student/notifications',
      relatedId: notif.relatedId,
      relatedType: notif.relatedType
    }));

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      studentId,
      read: false
    });

    return NextResponse.json({
      success: true,
      notifications: transformedNotifications,
      unreadCount
    });

  } catch (error: any) {
    console.error('Get student notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', message: error.message },
      { status: 500 }
    );
  }
}

// Mark notifications as read
export async function PUT(req: NextRequest) {
  try {
    await connectMongo();

    const { studentId, notificationIds, markAllRead } = await req.json();

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    if (markAllRead) {
      // Mark all as read
      await Notification.updateMany(
        { studentId, read: false },
        { $set: { read: true } }
      );
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      await Notification.updateMany(
        { _id: { $in: notificationIds }, studentId },
        { $set: { read: true } }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read'
    });

  } catch (error: any) {
    console.error('Mark notifications read error:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read', message: error.message },
      { status: 500 }
    );
  }
}
