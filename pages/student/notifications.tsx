'use client';

import React, { useState, useEffect } from 'react';
import StudentLayout from '@/src/student/common/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Check, Trash2, Video, FileText, AlertCircle, Calendar, Clock, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  read: boolean;
  relatedId?: string;
  actionUrl?: string;
  createdAt: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'class':
    case 'upcoming_class':
      return <Video className="h-5 w-5 text-blue-500" />;
    case 'quiz':
      return <FileText className="h-5 w-5 text-purple-500" />;
    case 'assignment':
      return <FileText className="h-5 w-5 text-green-500" />;
    case 'deadline':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case 'schedule_change':
    case 'class_rescheduled':
      return <Calendar className="h-5 w-5 text-orange-500" />;
    case 'class_cancelled':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case 'trainer_leave':
      return <Calendar className="h-5 w-5 text-yellow-500" />;
    case 'daily_reminder':
      return <Clock className="h-5 w-5 text-gray-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return <Badge className="bg-red-500">Urgent</Badge>;
    case 'high':
      return <Badge className="bg-orange-500">High</Badge>;
    case 'medium':
      return <Badge className="bg-blue-500">Medium</Badge>;
    default:
      return <Badge className="bg-gray-500">Low</Badge>;
  }
};

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const studentData = localStorage.getItem('student');
      if (!studentData) return;

      const parsed = JSON.parse(studentData);
      const response = await fetch(
        `/api/notifications?userId=${parsed.studentId}&userType=student&limit=50`
      );
      const data = await response.json();

      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      });

      const data = await response.json();
      if (data.success) {
        setNotifications(prev =>
          prev.map(n => notificationIds.includes(n._id) ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const studentData = localStorage.getItem('student');
      if (!studentData) return;

      const parsed = JSON.parse(studentData);

      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true, userId: parsed.studentId, userType: 'student' })
      });

      const data = await response.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.read;
    return n.type === activeTab;
  });

  return (
    <StudentLayout>
      <div className="p-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-indigo-600" />
                Notifications
                {unreadCount > 0 && (
                  <Badge className="bg-red-500">{unreadCount} unread</Badge>
                )}
              </CardTitle>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark all as read
                </Button>
              )}
            </div>
          </CardHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="border-b px-4 pt-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="class">Classes</TabsTrigger>
              <TabsTrigger value="quiz">Quizzes</TabsTrigger>
              <TabsTrigger value="assignment">Assignments</TabsTrigger>
              <TabsTrigger value="deadline">Deadlines</TabsTrigger>
            </TabsList>

            <CardContent className="p-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No notifications</h3>
                  <p className="text-gray-500 mt-2">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`p-4 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${
                        notification.read
                          ? 'bg-white border-gray-200'
                          : notification.priority === 'urgent'
                          ? 'bg-red-50 border-red-300'
                          : 'bg-blue-50 border-blue-300'
                      }`}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead([notification._id]);
                        }
                        if (notification.actionUrl) {
                          window.location.href = notification.actionUrl;
                        }
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-medium text-gray-900">
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              {getPriorityBadge(notification.priority)}
                              {!notification.read && (
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {formatDate(notification.createdAt)}
                            </span>
                            <div className="flex items-center gap-2">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead([notification._id]);
                                  }}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Mark read
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification._id);
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </StudentLayout>
  );
}