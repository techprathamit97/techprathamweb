import { useEffect, useState } from 'react';
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase';

interface NotificationPayload {
  notification?: {
    title?: string;
    body?: string;
    icon?: string;
  };
  data?: {
    [key: string]: string;
  };
}

export const useFirebaseMessaging = (studentId?: string) => {
  const [token, setToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationPayload | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'registering' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if push messaging is supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    
    if (!supported) {
      setError('Push notifications are not supported in this browser');
      console.warn('🚫 Push notifications not supported');
    }
  }, []);

  useEffect(() => {
    const setupFCM = async () => {
      try {
        if (!isSupported || !studentId) {
          console.log('FCM setup skipped:', { isSupported, hasStudentId: !!studentId });
          return;
        }

        setRegistrationStatus('registering');
        setError(null);

        console.log('🔥 Setting up Firebase Cloud Messaging for student:', studentId);

        // Register service worker
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('✅ Service Worker registered:', registration.scope);
            
            // Wait for service worker to be ready
            await navigator.serviceWorker.ready;
            console.log('✅ Service Worker ready');
          } catch (swError) {
            console.error('❌ Service Worker registration failed:', swError);
            setError('Failed to register service worker for notifications');
            setRegistrationStatus('error');
            return;
          }
        }

        // Request notification permission and get token
        console.log('🔔 Requesting notification permission...');
        const fcmToken = await requestNotificationPermission();
        
        if (fcmToken) {
          setToken(fcmToken);
          console.log('🎉 FCM token obtained:', fcmToken.substring(0, 20) + '...');
          
          // Register token with backend
          try {
            console.log('📡 Registering FCM token with backend...');
            const response = await fetch('/api/fcm/register-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId: studentId,
                fcmToken: fcmToken,
                deviceInfo: `${navigator.userAgent.substring(0, 100)}...`
              })
            });

            const data = await response.json();
            if (data.success) {
              console.log('✅ FCM token registered with backend. Token count:', data.tokenCount);
              setRegistrationStatus('success');
            } else {
              console.error('❌ Failed to register FCM token with backend:', data.error);
              setError('Failed to register notification token with server');
              setRegistrationStatus('error');
            }
          } catch (backendError) {
            console.error('❌ Error registering FCM token with backend:', backendError);
            setError('Network error while registering notification token');
            setRegistrationStatus('error');
          }
        } else {
          console.warn('⚠️ Failed to get FCM token');
          setError('Could not obtain Firebase token - VAPID key may need configuration');
          setRegistrationStatus('error');
          
          // Still continue with other setup since notifications are not critical
        }

        // Listen for foreground messages
        console.log('👂 Setting up foreground message listener...');
        onMessageListener()
          .then((payload: any) => {
            console.log('📱 Received foreground notification:', payload);
            setNotification(payload);

            // Store notification directly in localStorage for the notification bell
            if (studentId && payload.notification) {
              const newNotification = {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 10),
                title: payload.notification.title || 'TechPratham LMS',
                message: payload.notification.body || '',
                type: payload.data?.type || 'info',
                timestamp: Date.now(),
                read: false,
                actionUrl: payload.data?.url || '/student/classes',
                classId: payload.data?.classId,
                meetingId: payload.data?.meetingId
              };

              // Get existing notifications from localStorage
              const storageKey = `notifications_${studentId}`;
              const existingNotifications = localStorage.getItem(storageKey);
              let notifications = [];

              if (existingNotifications) {
                try {
                  notifications = JSON.parse(existingNotifications);
                } catch (e) {
                  notifications = [];
                }
              }

              // Add new notification and save
              notifications = [newNotification, ...notifications].slice(0, 50);
              localStorage.setItem(storageKey, JSON.stringify(notifications));

              // Dispatch a custom event to notify the notification bell
              window.dispatchEvent(new CustomEvent('new-notification', { detail: newNotification }));

              console.log('✅ Added notification to localStorage for bell');
            }

            // Add to in-app notifications via global function (fallback)
            if ((window as any).addInAppNotification && payload.notification) {
              (window as any).addInAppNotification({
                title: payload.notification.title || 'TechPratham LMS',
                message: payload.notification.body || '',
                type: payload.data?.type || 'info',
                actionUrl: payload.data?.url || '/student/classes',
                classId: payload.data?.classId,
                meetingId: payload.data?.meetingId
              });
              console.log('✅ Added notification via global function');
            }
            
            // Show browser notification if permission is granted
            if (Notification.permission === 'granted' && payload.notification) {
              try {
                const notification = new Notification(
                  payload.notification?.title || 'TechPratham LMS',
                  {
                    body: payload.notification?.body || '',
                    icon: payload.notification?.icon || '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: 'class-notification',
                    requireInteraction: true,
                    data: payload.data
                  }
                );
                
                // Handle notification clicks
                notification.onclick = function() {
                  console.log('🖱️ Notification clicked');
                  if (payload.data?.url) {
                    window.open(payload.data.url, '_blank');
                  }
                  this.close();
                };
                
                // Auto-close after 10 seconds
                setTimeout(() => {
                  notification.close();
                }, 10000);
                
                console.log('🔔 Browser notification displayed');
              } catch (notifError) {
                console.error('❌ Error displaying browser notification:', notifError);
              }
            }
          })
          .catch(err => {
            console.error('❌ Failed to set up foreground message listener:', err);
            setError('Failed to set up notification listener');
          });

      } catch (error) {
        console.error('💥 Error setting up FCM:', error);
        setError('Failed to set up push notifications');
        setRegistrationStatus('error');
      }
    };

    setupFCM();
  }, [isSupported, studentId]);

  const clearNotification = () => {
    setNotification(null);
  };

  const clearError = () => {
    setError(null);
  };

  // Test notification function for debugging
  const sendTestNotification = async () => {
    if (!studentId) return;
    
    try {
      const response = await fetch('/api/test-notifications?testNotification=true&batchId=test', {
        method: 'GET'
      });
      const result = await response.json();
      console.log('🧪 Test notification result:', result);
      return result;
    } catch (error) {
      console.error('❌ Test notification failed:', error);
      throw error;
    }
  };

  return {
    token,
    notification,
    isSupported,
    registrationStatus,
    error,
    clearNotification,
    clearError,
    sendTestNotification
  };
};