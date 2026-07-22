'use client';

import { useEffect, useState } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

interface NotificationBellProps {
  userId: string;
  userType: 'student' | 'trainer' | 'admin';
}

const NotificationBell = ({ userId, userType }: NotificationBellProps) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported' | 'unknown'>('unknown');
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter((item) => !item.read).length;

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}&userType=${userType}&limit=5`);
      const data = await response.json();
      if (data?.success) {
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (typeof window === 'undefined') {
      return;
    }

    if ('Notification' in window) {
      setPermission(Notification.permission);
    } else {
      setPermission('unsupported');
    }
  }, [userId, userType]);

  const enablePushNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported');
      return;
    }

    try {
      setLoading(true);

      const registration = await navigator.serviceWorker.register('/sw.js');
      const permissionResult = await Notification.requestPermission();
      if (permissionResult !== 'granted') {
        setPermission(permissionResult);
        return;
      }

      const publicKeyResponse = await fetch('/api/notifications/push/public-key');
      const publicKeyData = await publicKeyResponse.json();
      const publicKey = publicKeyData?.publicKey;

      if (!publicKey) {
        throw new Error('Push public key was not provided by the server');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await fetch('/api/notifications/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userType,
          subscription
        })
      });

      setPermission('granted');
      await fetchNotifications();
    } catch (error) {
      console.error('Unable to enable push notifications', error);
      setPermission('denied');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-full bg-gray-800 p-2 text-gray-300 transition hover:bg-gray-700 hover:text-white"
        aria-label="Notifications"
      >
        {permission === 'granted' ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-gray-700 bg-[#111827] p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {permission !== 'granted' && (
              <button
                type="button"
                onClick={enablePushNotifications}
                className="text-xs font-medium text-orange-400 hover:text-orange-300"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable alerts'}
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((item) => (
                <div key={item._id} className="rounded-md border border-gray-800 bg-gray-900/80 p-2">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-gray-400">{item.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default NotificationBell;
