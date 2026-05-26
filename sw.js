// ─────────────────────────────────────────────────────────────────────────────
// sw.js — Service Worker for USCD DAV Public School Class X SBS
// DEPLOY THIS FILE in the same folder as index.html on GitHub Pages.
// Repo root (same level as index.html) → /sw.js
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'davx-v4';
const SHELL = ['./'];   // cache the main page on install

// ── Install: pre-cache the shell ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: serve from cache, fall back to network ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request)
      .then(r => r || fetch(e.request)
        .catch(() => new Response('', { status: 503 }))
      )
  );
});

// ── Push: show a native notification (requires a push server / VAPID setup) ──
self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : { title: 'DAV Class X', body: 'New update!' };
  e.waitUntil(
    self.registration.showNotification(d.title || 'DAV Class X', {
      body:    d.body    || '',
      icon:    d.icon    || '',
      badge:   d.badge   || '',
      vibrate: [200, 100, 200],
      data:    d.data    || {}
    })
  );
});

// ── Notification click: focus existing tab or open new one ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => {
        for (const c of list) {
          if ('focus' in c) return c.focus();
        }
        return clients.openWindow('./');
      })
  );
});