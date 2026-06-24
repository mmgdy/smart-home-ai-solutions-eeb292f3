/* Baytzaki — Firebase Cloud Messaging service worker.
 * Reads Firebase config from URL query params at registration time so we
 * can keep config server-side. Receives background pushes and shows them.
 *
 * Compatible with: iOS 16.4+ Safari, Android Chrome, desktop Chrome/Edge/Firefox.
 */
/* global importScripts, firebase */
importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js');

const params = new URL(self.location).searchParams;
const cfg = (() => {
  const raw = params.get('cfg');
  if (!raw) return null;
  try { return JSON.parse(atob(decodeURIComponent(raw))); } catch { return null; }
})();

if (cfg && cfg.apiKey) {
  firebase.initializeApp(cfg);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const n = payload.notification || {};
    const data = payload.data || {};
    const title = n.title || data.title || 'Baytzaki';
    const options = {
      body: n.body || data.body || '',
      icon: n.icon || data.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      image: data.image || undefined,
      data: { url: data.url || n.click_action || '/' },
      tag: data.tag || 'baytzaki',
      requireInteraction: false,
      // iOS Safari requires these for rich notifications
      ...(self.Notification && self.Notification.maxActions ? { actions: [] } : {}),
    };
    self.registration.showNotification(title, options);
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) { client.navigate(url); return client.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
