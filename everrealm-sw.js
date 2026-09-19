"use strict";

const APP_BASE = "/Everrealm/";
const CACHE_VERSION = "everrealm-pwa-v2-20260919-pvpfix-01";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Keep installation intentionally small. Runtime code and game media are
// cached on demand after login instead of blocking service-worker install.
const PRECACHE_URLS = [
  APP_BASE,
  `${APP_BASE}index.html`,
  `${APP_BASE}everrealm.webmanifest`,
  `${APP_BASE}styles.css`,
  `${APP_BASE}runtime-assets.js`,
  `${APP_BASE}firebase-config.js`,
  `${APP_BASE}firebase-client.js`,
  `${APP_BASE}bootstrap.js`,
  `${APP_BASE}assets/ui/title/everrealm-logo-main-v1.png`,
  `${APP_BASE}assets/ui/ui-close-v2.png`,
  `${APP_BASE}assets/pwa/everrealm-icon-192-v2.png`,
  `${APP_BASE}assets/pwa/everrealm-icon-512-v2.png`,
];

function isEverrealmUrl(url) {
  return url.origin === self.location.origin && url.pathname.startsWith(APP_BASE);
}

async function putIfUsable(cache, request, response) {
  if (response && response.status === 200 && response.type !== "opaque") {
    await cache.put(request, response.clone());
  }
  return response;
}

async function warmUrls(urls = []) {
  const cache = await caches.open(RUNTIME_CACHE);
  const queue = urls
    .map((value) => {
      try { return new URL(String(value || ""), self.location.origin); } catch (_) { return null; }
    })
    .filter((url) => url && isEverrealmUrl(url));
  let cursor = 0;
  const worker = async () => {
    while (cursor < queue.length) {
      const url = queue[cursor++];
      const request = new Request(url.href, { cache: "no-cache" });
      const existing = await cache.match(request);
      if (existing) continue;
      try {
        const response = await fetch(request);
        await putIfUsable(cache, request, response);
      } catch (_) {}
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker));
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === "WARM_ASSETS") {
    event.waitUntil(warmUrls(Array.isArray(event.data.urls) ? event.data.urls : []));
  }
});

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.allSettled(PRECACHE_URLS.map(async (url) => {
      const request = new Request(url, { cache: "reload" });
      const response = await fetch(request);
      await putIfUsable(cache, request, response);
    }));
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith("everrealm-pwa-") && ![SHELL_CACHE, RUNTIME_CACHE].includes(key))
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request, navigation = false) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(new Request(request, { cache: "no-store" }));
    await putIfUsable(cache, request, response);
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (navigation) {
      return (await caches.match(`${APP_BASE}index.html`)) || (await caches.match(APP_BASE)) || Response.error();
    }
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = (await cache.match(request)) || (await caches.match(request));
  const update = fetch(new Request(request, { cache: "no-cache" }))
    .then((response) => putIfUsable(cache, request, response))
    .catch(() => null);
  return cached || (await update) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!isEverrealmUrl(url)) return;

  if (request.headers.has("range")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, true));
    return;
  }

  // Versioned code requests are safe to serve immediately from their exact
  // cache key while refreshing in the background. A changed ?v= value creates
  // a new cache entry, so old code is never matched accidentally.
  event.respondWith(staleWhileRevalidate(request));
});
