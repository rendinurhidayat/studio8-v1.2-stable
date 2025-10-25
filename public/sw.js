// This is the service worker file.
// It runs in the background and listens for push events.

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }
  
  const data = event.data.json();
  const title = data.title || 'Studio 8';
  const options = {
    body: data.body,
    icon: '/images/icon-192.png', // Add an icon for your app
    badge: '/images/badge-72.png', // Add a badge for notifications
    data: {
        url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window for the app is already open, focus it.
      for (const client of clientList) {
        if (client.url === self.origin + '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window.
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Optional: Add icons to your public folder
// - /public/images/icon-192.png (192x192 px)
// - /public/images/badge-72.png (72x72 px, monochrome works best)
