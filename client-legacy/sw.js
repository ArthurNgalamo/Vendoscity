/* Vendoscity service worker (minimal) */

const CACHE = 'vendoscity-static-v20260401-net5';

// Keep the precache small to avoid stale UI when the app changes often.
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/style/style.css',
  '/script/config.js',
  '/script/script.js',
  '/script/component-loader.js',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/maskable-192.png',
  '/assets/icons/maskable-512.png',
  '/assets/icons/apple-touch-icon.png',
  '/assets/images/logo/vendoscity-logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))));
      await self.clients.claim();
    })()
  );
});

function isCacheableStaticPath(pathname) {
  const p = String(pathname || '');
  if (!p || p === '/') return true;
  if (p.startsWith('/api/') || p === '/api') return false;
  if (p.startsWith('/p/') || p === '/p') return false;

  if (p.startsWith('/assets/')) return true;
  if (p.startsWith('/style/')) return true;
  if (p.startsWith('/script/')) return true;
  if (p.startsWith('/pages/')) return true;

  // Common static files
  if (p === '/favicon.ico' || p === '/favicon.png') return true;
  if (p === '/manifest.json' || p === '/manifest.webmanifest') return true;
  if (p.endsWith('.html')) return true;
  if (p.endsWith('.css') || p.endsWith('.js')) return true;
  if (p.endsWith('.png') || p.endsWith('.jpg') || p.endsWith('.jpeg') || p.endsWith('.webp') || p.endsWith('.gif') || p.endsWith('.svg') || p.endsWith('.ico')) return true;

  // Avoid caching unknown routes (can include user-specific content or backend responses).
  return false;
}

function isNetworkFirstAsset(pathname) {
  const p = String(pathname || '');
  // JS/CSS changes often and stale caching blocks hotfixes in production (especially with PWA installs).
  if (p.startsWith('/script/')) return true;
  if (p.startsWith('/style/')) return true;
  if (p === '/manifest.json' || p === '/manifest.webmanifest') return true;
  return false;
}

// Network-first for HTML navigations, cache-first for static assets.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Only handle same-origin requests. Never cache cross-origin responses.
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;
  if (!isCacheableStaticPath(url.pathname)) return;

  const accept = req.headers.get('accept') || '';
  const isHtml = accept.includes('text/html');

  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  if (isNetworkFirstAsset(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      });
    })
  );
});
