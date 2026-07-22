self.addEventListener('push', (event) => {
  let payload = { title: 'TechPratham', message: 'You have a new update', url: '/' };

  try {
    payload = event.data?.json() || payload;
  } catch (error) {
    console.error('Failed to parse push payload', error);
  }

  const options = {
    body: payload.message,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: payload.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
