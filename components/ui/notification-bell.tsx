import React, { useState, useEffect } from 'react';
import { Bell, X, Circle, Clock, Users, Video } from 'lucide-react';
import { Badge } from './badge';
import { Button } from './button';
import { Card, CardContent } from './card';

interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'class_started' | 'class_reminder' | 'assignment' | 'announcement' | 'info';
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  classId?: string;
  meetingId?: string;
}

interface NotificationBellProps {
  studentId?: string;
  onNotificationClick?: (notification: InAppNotification) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ 
  studentId, 
  onNotificationClick 
}) => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    // Try to get studentId from props, or fallback to localStorage
    let id = studentId;

    if (!id) {
      try {
        const studentData = localStorage.getItem('student');
        if (studentData) {
          const student = JSON.parse(studentData);
          id = student.studentId || student._id;
        }
      } catch (e) {
        console.error('Error getting studentId:', e);
      }
    }

    if (!id) return;

    try {
      // Try to fetch from API first
      const response = await fetch(`/api/student/notifications?studentId=${id}&limit=50`);
      const data = await response.json();

      if (response.ok && data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);

        // Also save to localStorage as backup
        localStorage.setItem(`notifications_${id}`, JSON.stringify(data.notifications));
        return;
      }
    } catch (error) {
      console.log('API not available, falling back to localStorage');
    }

    // Fallback to localStorage
    const savedNotifications = localStorage.getItem(`notifications_${id}`);
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed);
        updateUnreadCount(parsed);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }
  };

  useEffect(() => {
    // Load initially
    fetchNotifications();

    // Listen for custom event from FCM when new notifications arrive
    const handleNewNotification = (event: Event) => {
      console.log('🔔 New notification event received in bell:', event);
      fetchNotifications();
    };

    window.addEventListener('new-notification', handleNewNotification);

    // Also poll for changes every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);

    return () => {
      window.removeEventListener('new-notification', handleNewNotification);
      clearInterval(interval);
    };
  }, [studentId]);

  const updateUnreadCount = (notificationList: InAppNotification[]) => {
    const unread = notificationList.filter(n => !n.read).length;
    setUnreadCount(unread);
  };

  const saveNotifications = (notificationList: InAppNotification[]) => {
    setNotifications(notificationList);
    updateUnreadCount(notificationList);
    if (studentId) {
      localStorage.setItem(`notifications_${studentId}`, JSON.stringify(notificationList));
    }
  };

  // Function to add new notification (called from outside)
  const addNotification = (notification: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: InAppNotification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36),
      timestamp: Date.now(),
      read: false
    };

    const updatedNotifications = [newNotification, ...notifications].slice(0, 50); // Keep max 50 notifications
    saveNotifications(updatedNotifications);

    // Show a brief highlight animation
    setIsOpen(false);
    setTimeout(() => {
      const bellElement = document.querySelector('.notification-bell');
      if (bellElement) {
        bellElement.classList.add('animate-bounce');
        setTimeout(() => {
          bellElement.classList.remove('animate-bounce');
        }, 1000);
      }
    }, 100);
  };

  // Expose addNotification function globally for FCM integration
  useEffect(() => {
    if (studentId) {
      (window as any).addInAppNotification = addNotification;
    }
    return () => {
      if ((window as any).addInAppNotification) {
        delete (window as any).addInAppNotification;
      }
    };
  }, [notifications, studentId]);

  const markAsRead = (notificationId: string) => {
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const deleteNotification = (notificationId: string) => {
    const updated = notifications.filter(n => n.id !== notificationId);
    saveNotifications(updated);
  };

  const clearAllNotifications = () => {
    saveNotifications([]);
  };

  const handleNotificationClick = (notification: InAppNotification) => {
    markAsRead(notification.id);
    
    if (onNotificationClick) {
      onNotificationClick(notification);
    } else if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'class_started':
        return <Video className="h-4 w-4 text-green-500" />;
      case 'class_reminder':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'assignment':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'announcement':
        return <Bell className="h-4 w-4 text-orange-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const handleBellClick = () => {
    if (!isOpen) {
      // Refresh notifications when opening the panel
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <Button
        variant="ghost"
        size="sm"
        className="notification-bell relative p-2"
        onClick={handleBellClick}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[90vw] z-50">
          <Card className="shadow-lg border">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <CardContent className="p-0 max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium">No notifications yet</p>
                  <p className="text-sm">You'll receive updates about classes and assignments here</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-gray-400 hover:text-gray-600 p-1 h-auto"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className={`text-sm mt-1 ${!notification.read ? 'text-gray-800' : 'text-gray-600'}`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatTimestamp(notification.timestamp)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="mt-2">
                            <Circle className="h-2 w-2 fill-blue-500 text-blue-500" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            
            {notifications.length > 0 && (
              <div className="p-3 border-t bg-gray-50 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllNotifications}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Clear all notifications
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;