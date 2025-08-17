// Service Worker für PWA
const CACHE_NAME = 'clientking-handyshop-v4';
const urlsToCache = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache).catch((error) => {
          console.warn('Service Worker: Some files could not be cached:', error);
          // Nicht den gesamten Install fehlschlagen lassen
          return Promise.resolve();
        });
      })
      .catch((error) => {
        console.error('Service Worker: Cache installation failed:', error);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip all API requests - never cache them
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // For navigation requests, always try network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/');
        })
    );
    return;
  }

  // For other requests, try network first to avoid browser storage permission prompts
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Don't cache if not a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Only cache static assets (CSS, JS, images) - no persistent storage for pages
        const url = new URL(event.request.url);
        if (event.request.method === 'GET' && 
            !event.request.url.includes('/api/') &&
            (url.pathname.endsWith('.css') || 
             url.pathname.endsWith('.js') || 
             url.pathname.endsWith('.png') || 
             url.pathname.endsWith('.svg') || 
             url.pathname.includes('/assets/'))) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            })
            .catch(() => {
              // Ignore cache errors to prevent storage permission prompts
            });
        }

        return response;
      })
      .catch(() => {
        // Fallback to cache only for static assets
        return caches.match(event.request);
      })
  );
});