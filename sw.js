// ═══════════════════════════════════════════
// sw.js — Service Worker for Class X SBS PWA
// Cache strategy: Cache-first for assets,
//                 Network-first for navigation
// ═══════════════════════════════════════════

const CACHE_NAME = 'classx-sbs-v1';

// Assets to pre-cache on install (the shell)
const PRECACHE_URLS = [
  './index.html',
  './manifest.json'
  // Add any local CSS / JS / image files here if you split them out later
];

// ── Install: pre-cache the app shell ────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting(); // activate immediately
});

// ── Activate: remove old caches ─────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim(); // take control of all open tabs
});

// ── Fetch: smart caching strategy ───────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests (e.g. Google Fonts CDN — let browser handle)
  if (request.method !== 'GET') return;

  // Google Fonts / external CDN → network with cache fallback (stale-while-revalidate)
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        fetch(request)
          .then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => caches.match(request))
      )
    );
    return;
  }

  // Same-origin navigation (HTML pages) → Network-first, fall back to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Everything else (local assets) → Cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
        return response;
      });
    })
  );
});