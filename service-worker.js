"use strict";

const CACHE_VERSION = "everrealm-pwa-20260910-01";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const PRECACHE_URLS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "favicon.ico",
  "assets/pwa/icon-180.png",
  "assets/pwa/icon-192.png",
  "assets/pwa/icon-512.png",
  "assets/pwa/icon-32.png",
  "assets/pwa/icon-16.png",
  "styles.css",
  "inventory-overhaul.css",
  "ui-system.css",
  "inventory-minimal.css",
  "assets/ui/ui-sidebar-toggle-v1.png",
  "assets/minimap-frame-v1.png",
  "assets/ui/ui-close-v2.png",
  "assets/ui/ui-info-v1.png",
  "rpg-core.js",
  "map/map-constants.js",
  "map/map-helpers.js",
  "map/monster-blueprints.js",
  "map/interior-helpers.js",
  "map/main-town-navigation.generated.js",
  "map/main-town-navigation.js",
  "map/flattened-navigation.js",
  "map/hospital-navigation.generated.js",
  "map/hospital-navigation.js",
  "map/weapon-navigation.generated.js",
  "map/weapon-navigation.js",
  "map/inn-navigation.generated.js",
  "map/inn-navigation.js",
  "map/item-navigation.generated.js",
  "map/item-navigation.js",
  "map/guild-navigation.generated.js",
  "map/guild-navigation.js",
  "maps/main-town.js",
  "maps/mountain-field.js",
  "maps/mine.js",
  "maps/interiors/guild.js",
  "maps/interiors/equipment-shop.js",
  "maps/interiors/clinic.js",
  "maps/interiors/general-store.js",
  "maps/interiors/inn.js",
  "map/map-transitions.js",
  "map/map-registry.js",
  "world.js",
  "expansion-core.js",
  "expansion-world.js",
  "guild-commission-core.js",
  "tactics-core.js",
  "fighter-skill-data.js",
  "skill-core.js",
  "audio-core.js",
  "main-town-bgm-loop.js",
  "save-system.js",
  "fighter-effects.js",
  "locomotion.js",
  "character-art.js",
  "game.js"
];

function scopedUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

async function putIfUsable(cache, request, response) {
  // Cache API rejects partial (206) responses. Safari/iOS commonly uses Range
  // requests for MP3 playback, so only persist complete 200 responses.
  if (response && response.status === 200 && response.type !== "opaque") {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.allSettled(PRECACHE_URLS.map(async (path) => {
      const request = new Request(scopedUrl(path), { cache: "reload" });
      const response = await fetch(request);
      await putIfUsable(cache, request, response);
    }));
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("everrealm-pwa-") && !keep.has(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function cachedFallback(request) {
  return (await caches.match(request, { ignoreSearch: true })) || null;
}

async function networkFirst(request, navigation = false) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    // Revalidate code/HTML/CSS even if the browser HTTP cache still considers
    // an old GitHub Pages response fresh. This is what prevents phone-only
    // stale builds without requiring a manual ?v= date bump on every deploy.
    const freshRequest = new Request(request, { cache: "no-cache" });
    const response = await fetch(freshRequest);
    await putIfUsable(cache, request, response);
    return response;
  } catch (error) {
    const cached = await cachedFallback(request);
    if (cached) return cached;
    if (navigation) {
      return (await caches.match(scopedUrl("index.html"))) || (await caches.match(scopedUrl("./"))) || Response.error();
    }
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cachedFallback(request);
  const update = fetch(new Request(request, { cache: "no-cache" }))
    .then((response) => putIfUsable(cache, request, response))
    .catch(() => null);
  return cached || (await update) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Let byte-range media requests go straight to the network. This avoids
  // handing Safari a full cached file when it explicitly requested a range.
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

  if (codeLike) {
    event.respondWith(networkFirst(request));
  } else {
    // Images/audio stay fast from the Cache API while being refreshed in the
    // background. Most Everrealm art is already filename-versioned (v1/v2...).
    event.respondWith(staleWhileRevalidate(request));
  }
});
