// sw.js — Service Worker for USCD DAV Class X SBS
const CACHE = 'davx-v6';  // bump this on every new deployment
const SHELL = ['./'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
    // No self.skipWaiting() here — we wait for SKIP_WAITING message
    // from index.html so the reload is coordinated
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Never intercept Firebase / Google API calls
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic')
  ) return;

  // HTML page — network first so users always get the latest version
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./')))
    );
    return;
  }

  // All other assets — cache first for speed
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./')))
  );
});

// Handle SKIP_WAITING message from index.html
// New SW activates immediately → triggers controllerchange → page reloads with new version
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notifications from server (future use)
self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : { title: 'DAV Class X', body: 'New update!' };
  e.waitUntil(
    self.registration.showNotification(d.title || 'DAV Class X', {
      body: d.body || '',
      icon: d.icon || 'icon-192.png',
      badge: 'icon-192.png',
      data: d.data || {},
      vibrate: [200, 100, 200]
    })
  );
});

// When user taps a notification — open/focus the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If app is already open somewhere, focus it
      for (const client of clientList) {
        if (client.url.includes('./') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
