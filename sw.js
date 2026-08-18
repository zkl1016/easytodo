const CACHE_NAME = 'my-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/favicon.png',
  '/index.html',
  '/style.css',
  '/script.js',
  '/icon 512.png',
  '/icon 192.png',
  '/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
