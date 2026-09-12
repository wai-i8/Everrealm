(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternBgm = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const BGM_TRACKS = Object.freeze({
    mainTown: Object.freeze({ key: "mainTown", src: "assets/audio/bgm/maintown.mp3", label: "主城夜燈" }),
    mountainField: Object.freeze({ key: "mountainField", src: "assets/audio/bgm/mountainousareas.mp3", label: "山地霧路" }),
    building: Object.freeze({ key: "building", src: "assets/audio/bgm/building.mp3", label: "室內時光" }),
  });
  const BGM_ZONE_BY_MAP = Object.freeze({
    world: "mainTown",
    guild: "building",
    shop: "building",
    clinic: "building",
    "general-store": "building",
    inn: "building",
    field: "mountainField",
    dungeon: "mountainField",
  });

  function createBgmManager(options = {}) {
    const createAudio = typeof options.createAudio === "function"
      ? options.createAudio
      : (source) => new Audio(source);
    let enabled = options.enabled !== false;
    let volume = Math.max(0, Math.min(1, Number.isFinite(Number(options.volume)) ? Number(options.volume) : .7));
    let currentKey = null;
    let audio = null;
    let suspended = false;

    function track() { return currentKey ? BGM_TRACKS[currentKey] || null : null; }

    function stopAudio({ release = false } = {}) {
      if (!audio) return;
      audio.pause?.();
      try { audio.currentTime = 0; } catch (_) {}
      audio.muted = true;
      if (release) audio = null;
    }

    function ensureAudio() {
      const current = track();
      if (!current || !enabled) return null;
      if (!audio) audio = createAudio(current.src);
      if (audio.src !== current.src && !String(audio.src || "").endsWith(current.src)) {
        audio.src = current.src;
      }
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = volume;
      return audio;
    }

    function play() {
      if (suspended) return;
      const element = ensureAudio();
      if (!element) return;
      element.muted = false;
      const promise = element.play?.();
      if (promise && typeof promise.catch === "function") promise.catch(() => {});
    }

    function suspend() {
      suspended = true;
      if (audio) audio.pause?.();
      return snapshot();
    }

    function resume() {
      suspended = false;
      if (enabled && currentKey) play();
      return snapshot();
    }

    function setMap(mapId) {
      const nextKey = BGM_ZONE_BY_MAP[mapId] || null;
      if (nextKey === currentKey) {
        if (enabled && nextKey) play();
        return snapshot();
      }
      stopAudio({ release: !nextKey });
      currentKey = nextKey;
      if (enabled && nextKey) play();
      return snapshot();
    }

    function setEnabled(value) {
      enabled = Boolean(value);
      if (!enabled) {
        stopAudio();
      } else if (currentKey) {
        play();
      }
      return snapshot();
    }

    function setVolume(value) {
      volume = Math.max(0, Math.min(1, Number(value) || 0));
      if (audio) audio.volume = volume;
      return snapshot();
    }

    function snapshot() {
      const current = track();
      return {
        enabled,
        volume,
        key: currentKey,
        source: current?.src || null,
        label: current?.label || null,
        currentTime: Number(audio?.currentTime) || 0,
        paused: audio ? audio.paused !== false : true,
        muted: audio ? audio.muted !== false : true,
        loop: audio ? audio.loop === true : false,
        suspended,
        activeInstances: audio && currentKey && enabled && !suspended && audio.paused === false && audio.muted !== true ? 1 : 0,
      };
    }

    return { setMap, setEnabled, setVolume, suspend, resume, snapshot };
  }

  return { BGM_TRACKS, BGM_ZONE_BY_MAP, createBgmManager };
});
