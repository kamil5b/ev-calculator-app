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
 * Install precaches the shell *and* everything it references: the island entry
 * points live in `component-url`/`renderer-url` attributes rather than script
 * tags, and those chunks import each other, so the shell alone is not enough.
 * Without the crawl, a first visit followed by going offline served HTML whose
 * scripts were never cached — a dead, non-hydrating page.
 *
 * Paths are derived from this script's own location, which keeps the worker
 * correct under any `base` (project sites, custom domains, sub-paths).
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `ev-calculator-${CACHE_VERSION}`;

/** The directory this worker is served from, e.g. `https://host/ev-app/`. */
const APP_ROOT = new URL('./', self.location).href;

/**
 * Shell precached on install. The `index.html` entry covers the app itself;
 * the assets it references are discovered by {@link precacheShell}.
 */
const PRECACHE_URLS = [
  new URL('manifest.webmanifest', APP_ROOT).href,
  new URL('icons/icon-192.png', APP_ROOT).href,
  new URL('icons/icon-512.png', APP_ROOT).href,
  new URL('icons/icon-maskable-512.png', APP_ROOT).href,
  new URL('favicon.svg', APP_ROOT).href,
];

/** Extensions worth caching; filters attribute values that are not assets. */
const ASSET_PATTERN = /\.(?:js|mjs|css|svg|png|webmanifest)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(PRECACHE_URLS.map((url) => putQuiet(cache, url)));
      await precacheShell(cache);
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

/** Fetches `url` and caches it; failures never abort the install. */
async function putQuiet(cache, url) {
  try {
    const response = await fetch(new Request(url, { cache: 'reload' }));
    if (response.ok) await cache.put(url, response);
  } catch {
    // A single missing asset must not abort the whole installation.
  }
}

/**
 * Precaches the app shell and its full asset graph.
 *
 * The shell is fetched directly (a first visit's navigation predates this
 * worker, so the fetch handler never saw it), then every same-origin asset it
 * references is cached, followed by each JS module's own imports.
 */
async function precacheShell(cache) {
  try {
    const response = await fetch(new Request(APP_ROOT, { cache: 'reload' }));
    if (!response.ok) return;
    await cache.put(APP_ROOT, response.clone());

    const html = await response.text();
    const seen = new Set();
    await Promise.all(
      [...collectShellAssets(html)].map((url) => precacheAsset(cache, url, seen)),
    );
  } catch {
    // Offline support degrades to "works from the second visit on"; never
    // abort the installation over it.
  }
}

/**
 * Asset URLs referenced by the shell.
 *
 * Covers `<link href>`, `<script src>` and Astro's island attributes
 * (`component-url`, `renderer-url`), which are the entry points the hydrator
 * imports at runtime.
 */
function collectShellAssets(html) {
  const assets = new Set();
  const attributePattern = /[\w-]+=(?:"([^"]+)"|'([^']+)')/g;

  for (const match of html.matchAll(attributePattern)) {
    const value = match[1] ?? match[2];
    const url = toAssetUrl(value, APP_ROOT);
    if (url !== null) assets.add(url);
  }

  return assets;
}

/** Fetches an asset, caches it, and recursively caches the modules it imports. */
async function precacheAsset(cache, url, seen) {
  if (seen.has(url)) return;
  seen.add(url);

  let response;
  try {
    response = await fetch(new Request(url, { cache: 'reload' }));
  } catch {
    return;
  }
  if (!response.ok) return;

  await cache.put(url, response.clone());

  if (!/\.(?:js|mjs)$/.test(url)) return;

  const source = await response.text();
  const imports = [...extractImportSpecifiers(source)]
    .map((specifier) => toAssetUrl(specifier, url))
    .filter((resolved) => resolved !== null);

  await Promise.all(imports.map((resolved) => precacheAsset(cache, resolved, seen)));
}

/**
 * Import specifiers in a minified ESM bundle: `from"./chunk.js"`,
 * `import"./chunk.js"` and `` await import(`./chunk.js`) `` (Vite emits
 * backticked dynamic imports).
 *
 * A false positive only costs one failed fetch, so the pattern stays loose.
 */
function extractImportSpecifiers(source) {
  const specifiers = new Set();
  const pattern = /(?:from\s*|import\s*\(\s*|import\s*)(["'`])([^"'`\s]+)\1/g;

  for (const match of source.matchAll(pattern)) {
    specifiers.add(match[2]);
  }

  return specifiers;
}

/**
 * Resolves `value` against `baseUrl` and returns it when it is a cacheable
 * same-origin asset; `null` for hashes, data URIs, other origins and
 * non-asset paths.
 */
function toAssetUrl(value, baseUrl) {
  if (value === '' || value.startsWith('#') || value.startsWith('data:')) return null;

  let url;
  try {
    url = new URL(value, baseUrl);
  } catch {
    return null;
  }

  if (url.origin !== self.location.origin) return null;
  if (!ASSET_PATTERN.test(url.pathname)) return null;
  return url.href;
}

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
