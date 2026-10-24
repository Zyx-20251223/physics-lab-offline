/* Physics Lab offline service worker.
   VERSION is replaced by build_pwa.mjs on every build. */
const VERSION = '6bd3f9371a';
const CACHE = 'physics-lab-' + VERSION;
const CORE = [
  './',
  './index.html',
  './app.js',
  './sites.json',
  './manifest.json',
  './precache-manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const response = await fetch('./precache-manifest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('precache manifest ' + response.status);
    const manifest = await response.json();
    const files = [...new Set([...CORE, ...(manifest.files || [])])];
    const cache = await caches.open(CACHE);
    await cache.addAll(files);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(request);
    } catch (error) {
      if (request.mode === 'navigate') {
        const fallback = await cache.match('./index.html');
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
