'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  read: boolean;
  relatedId?: string;
  actionUrl?: string;
  createdAt: string;
}

interface UseNotificationsOptions {
  userId: string;
  userType: 'student' | 'trainer';
  enabled?: boolean;
}

export function useNotifications({ userId, userType, enabled = true }: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    if (!enabled || !userId) return;

    const newSocket = io('/notifications', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to notifications socket');
      setIsConnected(true);

      // Join user room
      newSocket.emit('join', { userId, userType });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from notifications socket');
      setIsConnected(false);
    });

    newSocket.on('notification', (notification: Notification) => {
      console.log('Received notification:', notification);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico'
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave', { userId, userType });
      newSocket.disconnect();
    };
  }, [userId, userType, enabled]);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(
        `/api/notifications?userId=${userId}&userType=${userType}&limit=20`
      );
      const data = await response.json();

      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [userId, userType]);

  // Load initial data - fetch regardless of socket connection
  useEffect(() => {
    if (enabled && userId) {
      fetchNotifications();
    }
  }, [enabled, userId, fetchNotifications]);

  // Mark as read
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      });

      const data = await response.json();
      if (data.success) {
        setNotifications(prev =>
          prev.map(n => notificationIds.includes(n.id) ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true, userId, userType })
      });

      const data = await response.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [userId, userType]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(
        `/api/notifications?id=${notificationId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      if (data.success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
    requestNotificationPermission
  };
}