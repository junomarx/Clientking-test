// Service Worker für PWA
const CACHE_NAME = 'clientking-handyshop-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/assets/ClientKing_Logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Gib die Datei aus dem Cache zurück oder lade sie vom Netzwerk
        return response || fetch(event.request);
      }
    )
  );
});