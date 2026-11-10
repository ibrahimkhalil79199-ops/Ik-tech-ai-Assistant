// IK TECH AI service worker: shows notifications on the phone and opens the right place when one is tapped.
// Put this file in the "public" folder of the ik-tech-ai project (public/firebase-messaging-sw.js).

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Needed so the browser offers "Install app". It simply lets every request go to the network as usual.
self.addEventListener('fetch', () => {});

// A push message arrived from the server (works even when the app is closed).
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = { data: { title: 'IK TECH AI', body: event.data ? event.data.text() : '' } };
  }

  const info = payload.data || payload.notification || payload;
  const category = info.category || 'tips';

  event.waitUntil(
    self.registration.showNotification(info.title || 'IK TECH AI', {
      body: info.body || '',
      tag: category,
      data: {
        category: category,
        url: self.registration.scope + '?open=' + encodeURIComponent(category),
      },
    })
  );
});

// The person tapped the notification: open the app at the right place.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = data.url || self.registration.scope;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (client.url.indexOf(self.registration.scope) === 0) {
          await client.focus();
          client.postMessage({ type: 'open', category: data.category });
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});
