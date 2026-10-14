// RupeeWise Service Worker
const CACHE_NAME = 'rupeewise-v2';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn('Could not cache asset:', asset, e);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy to keep real-time ledger and Supabase data completely fresh
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip Supabase API and Realtime websocket requests
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/rest/v1')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse.ok &&
          (url.pathname.startsWith('/icons/') ||
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.svg') ||
            url.pathname.endsWith('.ico'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
