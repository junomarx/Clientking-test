// Service Worker für PWA - MINIMAL VERSION
const CACHE_NAME = 'clientking-handyshop-v5';

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing minimal version...');
  // Kein Caching beim Install - verhindert Storage-Permission-Popups
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating minimal version...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Lösche alle alten Caches
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Service Worker: Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // KEIN CACHING - nur direkte Weiterleitung
  // Verhindert alle Storage-Permission-Popups
  return;
});