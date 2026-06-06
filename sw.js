// sw.js — Service Worker for USCD DAV Class X SBS
const CACHE = 'davx-v2';
const SHELL = ['/Class-X-SBS/'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
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
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : { title: 'DAV Class X', body: 'New update!' };
  e.waitUntil(
    self.registration.showNotification(d.title || 'DAV Class X', {
      body: d.body || '',
      icon: d.icon || '',
      badge: d.badge || '',
      data: d.data || {},
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/Class-X-SBS/'));
});