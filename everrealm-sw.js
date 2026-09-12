"use strict";

importScripts("runtime-assets.js");

const APP_BASE = "/Everrealm/";
const CACHE_VERSION = "everrealm-pwa-v2-20260912-07";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const RUNTIME_SCRIPTS = self.EverrealmRuntimeAssets?.scripts || [];
const runtimePrecacheUrls = RUNTIME_SCRIPTS.map((src) => `${APP_BASE}${String(src).split("?")[0]}`);

const PRECACHE_URLS = [
  APP_BASE,
  `${APP_BASE}index.html`,
  `${APP_BASE}everrealm.webmanifest`,
  `${APP_BASE}styles.css`,
  `${APP_BASE}runtime-assets.js`,
  ...runtimePrecacheUrls,
  `${APP_BASE}assets/pwa/everrealm-icon-192-v2.png`,
  `${APP_BASE}assets/pwa/everrealm-icon-512-v2.png`,
  `${APP_BASE}assets/pwa/everrealm-maskable-192-v2.png`,
  `${APP_BASE}assets/pwa/everrealm-maskable-512-v2.png`,
  `${APP_BASE}assets/ui/mobile-menu/status-v3.png`,
  `${APP_BASE}assets/ui/mobile-menu/missions-v3.png`,
  `${APP_BASE}assets/ui/mobile-menu/inventory-v3.png`,
  `${APP_BASE}assets/ui/mobile-menu/skills-v3.png`,
  `${APP_BASE}assets/ui/mobile-menu/panel-v3.png`,
  `${APP_BASE}assets/ui/mobile-menu/system-v3.png`,
  `${APP_BASE}assets/items/weak-potion-v1.png`
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

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
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
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (navigation) {
      return (await caches.match(`${APP_BASE}index.html`)) || (await caches.match(APP_BASE)) || Response.error();
    }
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await caches.match(request, { ignoreSearch: true });
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

  const codeLike = ["script", "style", "worker", "manifest"].includes(request.destination)
    || /\.(?:js|css|json|webmanifest)$/i.test(url.pathname);

  event.respondWith(codeLike ? networkFirst(request) : staleWhileRevalidate(request));
});
