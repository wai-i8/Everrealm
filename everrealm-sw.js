"use strict";

const APP_BASE = "/Everrealm/";
const CACHE_VERSION = "everrealm-pwa-v2-20260912-02";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  APP_BASE,
  `${APP_BASE}index.html`,
  `${APP_BASE}everrealm.webmanifest`,
  `${APP_BASE}styles.css`,
  `${APP_BASE}inventory-overhaul.css`,
  `${APP_BASE}ui-system.css`,
  `${APP_BASE}inventory-minimal.css`,
  `${APP_BASE}responsive-ui-redesign.css`,
  `${APP_BASE}rpg-core.js`,
  `${APP_BASE}data/classes.js`,
  `${APP_BASE}data/items.js`,
  `${APP_BASE}data/equipment.js`,
  `${APP_BASE}data/quests.js`,
  `${APP_BASE}data/skills/monster.js`,
  `${APP_BASE}data/monsters.js`,
  `${APP_BASE}data/skills/warrior.js`,
  `${APP_BASE}data/skills/fighter.js`,
  `${APP_BASE}map/map-constants.js`,
  `${APP_BASE}map/map-helpers.js`,
  `${APP_BASE}map/monster-blueprints.js`,
  `${APP_BASE}map/interior-helpers.js`,
  `${APP_BASE}map/main-town-navigation.generated.js`,
  `${APP_BASE}map/main-town-navigation.js`,
  `${APP_BASE}map/flattened-navigation.js`,
  `${APP_BASE}map/hospital-navigation.generated.js`,
  `${APP_BASE}map/hospital-navigation.js`,
  `${APP_BASE}map/weapon-navigation.generated.js`,
  `${APP_BASE}map/weapon-navigation.js`,
  `${APP_BASE}map/inn-navigation.generated.js`,
  `${APP_BASE}map/inn-navigation.js`,
  `${APP_BASE}map/item-navigation.generated.js`,
  `${APP_BASE}map/item-navigation.js`,
  `${APP_BASE}map/guild-navigation.generated.js`,
  `${APP_BASE}map/guild-navigation.js`,
  `${APP_BASE}maps/main-town.js`,
  `${APP_BASE}maps/mountain-field.js`,
  `${APP_BASE}maps/mine.js`,
  `${APP_BASE}maps/interiors/guild.js`,
  `${APP_BASE}maps/interiors/equipment-shop.js`,
  `${APP_BASE}maps/interiors/clinic.js`,
  `${APP_BASE}maps/interiors/general-store.js`,
  `${APP_BASE}maps/interiors/inn.js`,
  `${APP_BASE}map/map-transitions.js`,
  `${APP_BASE}map/map-registry.js`,
  `${APP_BASE}world.js`,
  `${APP_BASE}expansion-core.js`,
  `${APP_BASE}expansion-world.js`,
  `${APP_BASE}guild-commission-core.js`,
  `${APP_BASE}tactics-core.js`,
  `${APP_BASE}skill-core.js`,
  `${APP_BASE}monster-ai.js`,
  `${APP_BASE}audio-core.js`,
  `${APP_BASE}main-town-bgm-loop.js`,
  `${APP_BASE}save-system.js`,
  `${APP_BASE}firebase-config.js`,
  `${APP_BASE}firebase-client.js`,
  `${APP_BASE}cloud-save.js`,
  `${APP_BASE}save-persistence.js`,
  `${APP_BASE}fighter-effects.js`,
  `${APP_BASE}locomotion.js`,
  `${APP_BASE}character-art.js`,
  `${APP_BASE}game.js`,
  `${APP_BASE}assets/pwa/everrealm-icon-192-v2.png`,
  `${APP_BASE}assets/pwa/everrealm-icon-512-v2.png`,
  `${APP_BASE}assets/pwa/everrealm-maskable-192-v2.png`,
  `${APP_BASE}assets/pwa/everrealm-maskable-512-v2.png`,
  `${APP_BASE}assets/ui/mobile-menu/status.png`,
  `${APP_BASE}assets/ui/mobile-menu/missions.png`,
  `${APP_BASE}assets/ui/mobile-menu/inventory.png`,
  `${APP_BASE}assets/ui/mobile-menu/skills.png`,
  `${APP_BASE}assets/ui/mobile-menu/panel.png`,
  `${APP_BASE}assets/ui/mobile-menu/status-v2.png`,
  `${APP_BASE}assets/ui/mobile-menu/inventory-v2.png`,
  `${APP_BASE}assets/ui/mobile-menu/panel-v2.png`,
  `${APP_BASE}assets/ui/mobile-menu/skills-v2.png`,
  `${APP_BASE}assets/ui/mobile-menu/missions-v2.png`,
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
