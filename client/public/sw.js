/* Passive service worker for PWA installation requirements.
   Does NOT cache HTML/Next.js pages to prevent stale routing bugs. */

const CACHE_NAME = 'vendoscity-pwa-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle all network requests by default.
  // This satisfies the PWA install criteria without any risk of stale pages.
  return;
});
