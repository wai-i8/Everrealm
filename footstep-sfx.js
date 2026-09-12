(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EverrealmFootsteps = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const SOUND_KEY = "everrealm-sound";
  const VOLUME_KEY = "everrealm-bgm-volume-v1";
  const DEFAULT_INTERVAL = 0.30;
  const DEFAULT_FIRST_DELAY = 0.10;
  const DEFAULT_GAIN = 0.48;

  const FOOTSTEP_ASSETS = Object.freeze({
    stone: Object.freeze([
      "assets/audio/sfx/footsteps/stone/stone-01.ogg",
      "assets/audio/sfx/footsteps/stone/stone-02.ogg",
      "assets/audio/sfx/footsteps/stone/stone-03.ogg",
      "assets/audio/sfx/footsteps/stone/stone-04.ogg",
    ]),
    grass: Object.freeze([
      "assets/audio/sfx/footsteps/grass/grass-01.ogg",
      "assets/audio/sfx/footsteps/grass/grass-02.ogg",
      "assets/audio/sfx/footsteps/grass/grass-03.ogg",
      "assets/audio/sfx/footsteps/grass/grass-04.ogg",
    ]),
  });

  const SURFACE_BY_MAP = Object.freeze({
    world: "stone",
    field: "grass",
    guild: "stone",
    shop: "stone",
    clinic: "stone",
    "general-store": "stone",
    inn: "stone",
  });

  function clamp01(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(1, number));
  }

  function createFootstepController(options = {}) {
    const host = options.root || root;
    const random = typeof options.random === "function" ? options.random : Math.random;
    const createAudio = typeof options.createAudio === "function"
      ? options.createAudio
      : (src) => typeof host?.Audio === "function" ? new host.Audio(src) : null;
    const storage = options.storage || host?.localStorage || null;
    const interval = Math.max(0.12, Number(options.interval) || DEFAULT_INTERVAL);
    const firstDelay = Math.max(0, Number(options.firstDelay) || DEFAULT_FIRST_DELAY);
    const gain = clamp01(Number.isFinite(Number(options.gain)) ? Number(options.gain) : DEFAULT_GAIN);
    const assets = options.assets || FOOTSTEP_ASSETS;
    const surfaceByMap = options.surfaceByMap || SURFACE_BY_MAP;
    const pool = new Map();

    let currentMapId = "world";
    let currentSurface = surfaceByMap[currentMapId] || null;
    let moving = false;
    let timeToNext = firstDelay;
    let lastIndex = -1;
    let suspended = false;

    function read(key, fallback) {
      try {
        const value = storage?.getItem?.(key);
        return value == null ? fallback : value;
      } catch (_) {
        return fallback;
      }
    }

    function enabled() {
      if (suspended) return false;
      if (host?.document?.visibilityState && host.document.visibilityState !== "visible") return false;
      return read(SOUND_KEY, "on") !== "off" && volume() > 0;
    }

    function volume() {
      return clamp01(read(VOLUME_KEY, "0.70"));
    }

    function variants() {
      return currentSurface ? assets[currentSurface] || [] : [];
    }

    function audioTemplate(src) {
      if (pool.has(src)) return pool.get(src);
      const element = createAudio(src);
      if (!element) return null;
      try { element.preload = "auto"; } catch (_) {}
      try { element.load?.(); } catch (_) {}
      pool.set(src, element);
      return element;
    }

    function preload() {
      for (const list of Object.values(assets)) for (const src of list) audioTemplate(src);
    }

    function nextIndex(length) {
      if (length <= 1) return 0;
      let index = Math.max(0, Math.min(length - 1, Math.floor(random() * length)));
      if (index === lastIndex) index = (index + 1) % length;
      return index;
    }

    function play() {
      if (!enabled()) return false;
      const list = variants();
      if (!list.length) return false;
      const index = nextIndex(list.length);
      lastIndex = index;
      const template = audioTemplate(list[index]);
      if (!template) return false;
      const element = typeof template.cloneNode === "function" ? template.cloneNode(true) : createAudio(list[index]);
      if (!element) return false;
      element.volume = clamp01(volume() * gain);
      element.playbackRate = 0.97 + random() * 0.06;
      try { element.currentTime = 0; } catch (_) {}
      const promise = element.play?.();
      if (promise && typeof promise.catch === "function") promise.catch(() => {});
      return true;
    }

    function update({ moving: nextMoving = false, dt = 0 } = {}) {
      const seconds = Math.max(0, Number(dt) || 0);
      if (!nextMoving || !currentSurface) {
        moving = false;
        timeToNext = firstDelay;
        return false;
      }
      if (!moving) {
        moving = true;
        timeToNext = firstDelay;
      }
      timeToNext -= seconds;
      if (timeToNext > 0) return false;
      const played = play();
      timeToNext += interval;
      if (timeToNext <= 0) timeToNext = interval;
      return played;
    }

    function setMap(mapId) {
      currentMapId = typeof mapId === "string" ? mapId : "";
      currentSurface = surfaceByMap[currentMapId] || null;
      moving = false;
      timeToNext = firstDelay;
      lastIndex = -1;
      return snapshot();
    }

    function suspend() {
      suspended = true;
      moving = false;
      timeToNext = firstDelay;
    }

    function resume() { suspended = false; }

    function snapshot() {
      return { currentMapId, currentSurface, moving, suspended, interval, firstDelay, variantCount: variants().length };
    }

    return { preload, play, update, setMap, suspend, resume, snapshot };
  }

  function install(host = root, options = {}) {
    if (!host || host.__everrealmFootstepsInstalled) return host?.EverrealmFootstepsRuntime || null;
    const originalBgm = host.LanternBgm;
    const originalLocomotion = host.LanternLocomotion;
    if (!originalBgm?.createBgmManager || !originalLocomotion?.update || !originalLocomotion?.facingFromDelta) return null;

    const controller = createFootstepController({ root: host, ...(options.controller || {}) });
    const originalCreateBgmManager = originalBgm.createBgmManager;
    const wrappedBgm = Object.freeze({
      ...originalBgm,
      createBgmManager(managerOptions) {
        const manager = originalCreateBgmManager(managerOptions);
        return {
          ...manager,
          setMap(mapId) {
            controller.setMap(mapId);
            return manager.setMap(mapId);
          },
          suspend() {
            controller.suspend();
            return manager.suspend?.();
          },
          resume() {
            controller.resume();
            return manager.resume?.();
          },
        };
      },
    });

    const originalFacingFromDelta = originalLocomotion.facingFromDelta;
    const originalUpdate = originalLocomotion.update;
    let playerMoveMarker = false;
    let playerLocomotion = null;
    const wrappedLocomotion = Object.freeze({
      ...originalLocomotion,
      facingFromDelta(dx, dy, fallback) {
        playerMoveMarker = true;
        return originalFacingFromDelta(dx, dy, fallback);
      },
      update(previous, updateOptions = {}) {
        const isPlayer = playerMoveMarker || (playerLocomotion && previous === playerLocomotion);
        playerMoveMarker = false;
        const next = originalUpdate(previous, updateOptions);
        if (isPlayer) {
          playerLocomotion = next;
          controller.update({ moving: updateOptions.moving === true, dt: updateOptions.dt });
        }
        return next;
      },
    });

    host.LanternBgm = wrappedBgm;
    host.LanternLocomotion = wrappedLocomotion;
    host.__everrealmFootstepsInstalled = true;
    host.EverrealmFootstepsRuntime = controller;

    const warm = () => controller.preload();
    host.document?.addEventListener?.("pointerdown", warm, { once: true, capture: true, passive: true });
    host.addEventListener?.("keydown", warm, { once: true, capture: true });
    host.document?.addEventListener?.("visibilitychange", () => {
      if (host.document.visibilityState === "visible") controller.resume();
      else controller.suspend();
    });
    return controller;
  }

  if (typeof window !== "undefined" && root === window) install(root);

  return Object.freeze({
    FOOTSTEP_ASSETS,
    SURFACE_BY_MAP,
    createFootstepController,
    install,
  });
});
