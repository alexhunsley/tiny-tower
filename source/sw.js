// sw.js
const CACHE_NAME = "bells-cache-v1";
const SAMPLE_URL = "https://commons.wikimedia.org/wiki/Special:FilePath/Gong%20or%20bell%20vibrant%20(short).ogg";

const APP_SHELL = [
  "./",
  "./bells.html",
  "./sw.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    // Try to pre-cache the audio (ok if it fails; it will be fetched on demand)
    try { await cache.add(SAMPLE_URL); } catch (err) { /* ignore */ }
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const { request } = e;

  // Cache-first for our app shell and the bell sample; network-first for others
  const isShell = APP_SHELL.some(u => new URL(u, self.location.origin).href === request.url) ||
                  request.url === SAMPLE_URL;

  if (isShell) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, { ignoreVary: true, ignoreSearch: true });
      if (cached) return cached;
      const fresh = await fetch(request);
      cache.put(request, fresh.clone());
      return fresh;
    })());
  } else {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        return fresh;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        return cached || Response.error();
      }
    })());
  }
});
