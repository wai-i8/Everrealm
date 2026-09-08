const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const AudioCore = require("../audio-core.js");

const root = path.resolve(__dirname, "..");

test("BGM assets exist and map zones use the supplied tracks", () => {
  for (const track of Object.values(AudioCore.BGM_TRACKS)) {
    const filename = path.join(root, track.src.replaceAll("/", path.sep));
    assert.equal(fs.existsSync(filename), true, `${track.src} should exist`);
    assert.ok(fs.statSync(filename).size > 1_000_000, `${track.src} should contain audio data`);
  }
  assert.equal(AudioCore.BGM_ZONE_BY_MAP.world, "mainTown");
  assert.equal(AudioCore.BGM_ZONE_BY_MAP.guild, "mainTown");
  assert.equal(AudioCore.BGM_ZONE_BY_MAP.field, "mountainField");
  assert.equal(AudioCore.BGM_ZONE_BY_MAP.dungeon, "mountainField");
});

test("BGM manager loops, preserves same-zone playback, and keeps one active instance", async () => {
  const elements = [];
  const createAudio = (src) => {
    const element = {
      src,
      currentTime: 0,
      paused: true,
      muted: true,
      loop: false,
      play() {
        this.paused = false;
        return Promise.resolve();
      },
      pause() { this.paused = true; },
    };
    elements.push(element);
    return element;
  };
  const manager = AudioCore.createBgmManager({ createAudio });
  manager.setMap("world");
  const first = elements[0];
  first.currentTime = 17.5;
  const sameZone = manager.setMap("guild");
  assert.equal(elements.length, 1);
  assert.equal(sameZone.key, "mainTown");
  assert.equal(sameZone.currentTime, 17.5);
  assert.equal(sameZone.loop, true);
  assert.equal(sameZone.activeInstances, 1);

  manager.setMap("field");
  assert.equal(elements.length, 1);
  assert.equal(first.src, AudioCore.BGM_TRACKS.mountainField.src);
  assert.equal(first.currentTime, 0);
  assert.equal(manager.setEnabled(false).activeInstances, 0);
  assert.equal(first.paused, true);
  const resumed = manager.setEnabled(true);
  assert.equal(resumed.activeInstances, 1);
  assert.equal(elements.length, 1);
});
