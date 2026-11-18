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

  // FCM may nest the content differently depending on message type, so look in
  // a few places before falling back to defaults.
  const notif = data.notification || data.webpush?.notification || {};
  const payloadData = data.data || {};
  const title = notif.title || data.title || 'TechPratham';
  const options = {
    body: notif.body || data.body || 'You have a new notification',
    icon: notif.icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: { ...payloadData, url: payloadData.url || notif.click_action || '/student/dashboard' },
    // Same tag => a newer notification replaces the previous one instead of
    // stacking duplicates (e.g. if foreground + background both fire).
    tag: payloadData.tag || payloadData.type || 'techpratham-notification',
    renotify: true,
    requireInteraction: true,
  };

  console.log('[FCM] Showing notification:', title, options);

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(() => console.log('[FCM] showNotification resolved OK'))
      .catch((err) => console.error('[FCM] showNotification FAILED:', err))
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM] Notification click:', event);
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/student/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it (and navigate if possible).
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client && targetUrl) {
            return client.focus().then((c) => c && c.navigate(targetUrl)).catch(() => client.focus());
          }
          return client.focus();
        }
      }
      // Otherwise open a new window at the target URL.
      return clients.openWindow(targetUrl);
    })
  );
});

console.log('[FCM] Service Worker loaded successfully');
