/* eslint-env serviceworker */
/**
 * Service worker for the EV Battery Calculator (PRD 4.1).
 *
 * Strategy: cache-first with network fallback.
 * - Navigation and static assets are served from the cache immediately so the
 *   app opens instantly and works with no connection at all.
 * - A background revalidation keeps the cache fresh, so a deployed update is
 *   picked up on the next visit without a version bump.
 * - Build assets under `/_astro/` are content-hashed, so they are treated as
 *   immutable and never revalidated.
 *
 * Paths are derived from this script's own location, which keeps the worker
 * correct under any `base` (project sites, custom domains, sub-paths).
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `ev-calculator-${CACHE_VERSION}`;

/** The directory this worker is served from, e.g. `https://host/ev-app/`. */
const APP_ROOT = new URL('./', self.location).href;

/**
 * Shell precached on install. The `index.html` entry covers the app itself;
 * hashed JS/CSS is picked up opportunistically by the fetch handler.
 */
const PRECACHE_URLS = [
  APP_ROOT,
  new URL('manifest.webmanifest', APP_ROOT).href,
  new URL('icons/icon-192.png', APP_ROOT).href,
  new URL('icons/icon-512.png', APP_ROOT).href,
  new URL('icons/icon-maskable-512.png', APP_ROOT).href,
  new URL('favicon.svg', APP_ROOT).href,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // `reload` bypasses the HTTP cache so a stale precache cannot be stored.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(new Request(url, { cache: 'reload' }));
            if (response.ok) await cache.put(url, response);
          } catch {
            // A single missing asset must not abort the whole installation.
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('ev-calculator-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Content-hashed build output: cache forever, never revalidate.
  if (url.pathname.includes('/_astro/')) {
    event.respondWith(cacheFirst(request, { revalidate: false }));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigate(request));
    return;
  }

  event.respondWith(cacheFirst(request, { revalidate: true }));
});

/**
 * Navigations resolve to the cached shell first, with the network filling the
 * gap on a cold install. Falling back to `index.html` means a deep link still
 * opens the app offline instead of showing the browser's offline page.
 */
async function handleNavigate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) {
    revalidate(cache, request);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const shell = await cache.match(APP_ROOT);
    if (shell) return shell;
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Offline</title><p>Open the app once while online to enable offline use.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
}

/** Cache-first with an optional background refresh of the cached entry. */
async function cacheFirst(request, { revalidate: shouldRevalidate }) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    if (shouldRevalidate) revalidate(cache, request);
    return cached;
  }

  try {
    const response = await fetch(request);
    // Opaque and error responses are not worth persisting.
    if (response.ok && response.type === 'basic') cache.put(request, response.clone());
    return response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

/** Fire-and-forget refresh; failures are expected offline and must stay silent. */
function revalidate(cache, request) {
  fetch(request)
    .then((response) => {
      if (response.ok && response.type === 'basic') cache.put(request, response);
    })
    .catch(() => {});
}
