const test = require("node:test");
const assert = require("node:assert/strict");
const Footsteps = require("../footstep-sfx.js");

test("stone maps and field map use their intended surfaces", () => {
  assert.equal(Footsteps.SURFACE_BY_MAP.world, "stone");
  assert.equal(Footsteps.SURFACE_BY_MAP.inn, "stone");
  assert.equal(Footsteps.SURFACE_BY_MAP.field, "grass");
  assert.equal(Footsteps.FOOTSTEP_ASSETS.stone.length, 4);
  assert.equal(Footsteps.FOOTSTEP_ASSETS.grass.length, 4);
});

test("controller waits for movement cadence and avoids immediate repeats", async () => {
  const plays = [];
  const storage = new Map([["everrealm-sound", "on"], ["everrealm-bgm-volume-v1", "0.70"]]);
  const root = { document: { visibilityState: "visible" } };
  const createAudio = (src) => ({
    src,
    preload: "none",
    volume: 0,
    playbackRate: 1,
    load() {},
    cloneNode() {
      return {
        src,
        volume: 0,
        playbackRate: 1,
        currentTime: 0,
        play() { plays.push({ src, volume: this.volume, playbackRate: this.playbackRate }); return Promise.resolve(); },
      };
    },
  });
  const randomValues = [0.01, 0.5, 0.01, 0.6, 0.01, 0.4];
  let randomIndex = 0;
  const controller = Footsteps.createFootstepController({
    root,
    createAudio,
    random: () => randomValues[randomIndex++ % randomValues.length],
    storage: { getItem: (key) => storage.get(key) ?? null },
  });
  controller.setMap("world");
  controller.update({ moving: true, dt: 0.05 });
  assert.equal(plays.length, 0);
  controller.update({ moving: true, dt: 0.06 });
  assert.equal(plays.length, 1);
  controller.update({ moving: true, dt: 0.30 });
  assert.equal(plays.length, 2);
  assert.notEqual(plays[0].src, plays[1].src);
  assert.ok(plays[0].volume > 0 && plays[0].volume < 0.7);
});

test("field uses grass audio and mute/zero volume still suppress playback", () => {
  const plays = [];
  const prefs = new Map([["everrealm-sound", "off"], ["everrealm-bgm-volume-v1", "0.70"]]);
  const controller = Footsteps.createFootstepController({
    root: { document: { visibilityState: "visible" } },
    storage: { getItem: (key) => prefs.get(key) ?? null },
    firstDelay: 0,
    createAudio: (src) => ({ src, load() {}, cloneNode: () => ({ src, volume: 0, playbackRate: 1, play() { plays.push(src); return Promise.resolve(); } }) }),
  });
  controller.setMap("field");
  controller.update({ moving: true, dt: 0.2 });
  assert.equal(plays.length, 0);

  prefs.set("everrealm-sound", "on");
  prefs.set("everrealm-bgm-volume-v1", "0");
  controller.update({ moving: false, dt: 0.1 });
  controller.update({ moving: true, dt: 0.2 });
  assert.equal(plays.length, 0);

  prefs.set("everrealm-bgm-volume-v1", "0.7");
  controller.update({ moving: false, dt: 0.1 });
  controller.update({ moving: true, dt: 0.2 });
  assert.equal(plays.length, 1);
  assert.match(plays[0], /\/grass\/grass-\d\d\.ogg$/);
});

test("install hooks player locomotion and follows BGM map changes without touching game.js", () => {
  const plays = [];
  const root = {
    document: { visibilityState: "visible", addEventListener() {} },
    addEventListener() {},
    localStorage: { getItem(key) { return key === "everrealm-sound" ? "on" : "0.7"; } },
    LanternBgm: {
      createBgmManager() {
        return { setMap(mapId) { return mapId; }, suspend() {}, resume() {} };
      },
    },
    LanternLocomotion: {
      facingFromDelta() { return "right"; },
      update(previous, options) { return { token: (previous?.token || 0) + 1, ...options }; },
    },
  };
  const controller = Footsteps.install(root, {
    controller: {
      firstDelay: 0,
      interval: 0.3,
      random: () => 0,
      createAudio(src) {
        return {
          src,
          load() {},
          cloneNode() {
            return { src, volume: 0, playbackRate: 1, currentTime: 0, play() { plays.push(src); return Promise.resolve(); } };
          },
        };
      },
    },
  });
  const bgm = root.LanternBgm.createBgmManager();

  bgm.setMap("world");
  let locomotion = { token: 0 };
  root.LanternLocomotion.facingFromDelta(1, 0, "down");
  locomotion = root.LanternLocomotion.update(locomotion, { moving: true, facing: "right", dt: 0.2 });
  assert.match(plays[0], /\/stone\/stone-\d\d\.ogg$/);

  locomotion = root.LanternLocomotion.update(locomotion, { moving: false, facing: "right", dt: 0.1 });
  bgm.setMap("field");
  root.LanternLocomotion.facingFromDelta(1, 0, "right");
  root.LanternLocomotion.update(locomotion, { moving: true, facing: "right", dt: 1 });
  assert.match(plays[1], /\/grass\/grass-\d\d\.ogg$/);
  assert.equal(controller.snapshot().currentMapId, "field");
  assert.equal(controller.snapshot().currentSurface, "grass");
});
