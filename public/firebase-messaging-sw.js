// Firebase Messaging Service Worker - Minimal Version
// This service worker handles push notifications from Firebase Cloud Messaging

const CACHE_NAME = 'techpratham-fcm-v1';

// Handle install event
self.addEventListener('install', (event) => {
  console.log('[FCM] Service Worker installing.');
  self.skipWaiting();
});

// Handle activate event
self.addEventListener('activate', (event) => {
  console.log('[FCM] Service Worker activated.');
  event.waitUntil(clients.claim());
});

// Handle background message event
self.addEventListener('push', (event) => {
  console.log('[FCM] Push event received:', event);

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { notification: { body: event.data.text() } };
    }
  }

  const title = data.notification?.title || 'TechPratham';
  const options = {
    body: data.notification?.body || 'You have a new notification',
    icon: '/og.jpg',
    badge: '/og.jpg',
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM] Notification click:', event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('student') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/student/dashboard');
    })
  );
});

console.log('[FCM] Service Worker loaded successfully');
