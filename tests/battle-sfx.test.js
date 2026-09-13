const test = require("node:test");
const assert = require("node:assert/strict");
const BattleSfx = require("../game/battle-sfx.js");

function makeAudioLog() {
  const log = [];
  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.currentTime = 0;
      this.volume = 1;
      this.playbackRate = 1;
      this.preload = "";
    }
    pause() {}
    play() {
      log.push({ src: this.src, volume: this.volume, playbackRate: this.playbackRate });
      return Promise.resolve();
    }
  }
  return { FakeAudio, log };
}

function makeRoot() {
  const { FakeAudio, log } = makeAudioLog();
  const storage = new Map([
    ["everrealm-sfx-enabled-v1", "on"],
    ["everrealm-sfx-volume-v1", "0.5"],
  ]);
  const stage = { dataset: { battlePhase: "resolving_action" } };
  const root = {
    Audio: FakeAudio,
    localStorage: { getItem: (key) => storage.has(key) ? storage.get(key) : null },
    document: { visibilityState: "visible", getElementById: (id) => id === "gameStage" ? stage : null },
    setTimeout: (fn) => { fn(); return 1; },
    queueMicrotask: (fn) => fn(),
    LanternSkills: {
      getSkill: (id) => ({ id, classId: "fighter", effects: id === "buyou" ? [{ type: "evasion" }] : [{ type: "damage" }] }),
      orderActionsBySpeed: (actions) => actions,
    },
    LanternTactics: {
      rollHit: () => ({ hit: false }),
      applyDamage: (unit, amount) => ({ hpBefore: unit.hp, hpAfter: Math.max(0, unit.hp - amount), defeated: unit.hp > 0 && unit.hp - amount <= 0 }),
    },
    LanternArt: Object.freeze({
      drawCharacter: () => ({ ok: true }),
      drawEnemy: () => ({ ok: true }),
    }),
    LanternLocomotion: Object.freeze({
      sampleMovement: (_movement, _id, seconds) => ({ state: seconds < 1 ? "walk" : "idle", facing: "left", time: seconds }),
    }),
  };
  return { root, log, stage };
}

test("fighter damaging action uses punch sample and utility action uses utility sample", () => {
  const { root, log } = makeRoot();
  const runtime = BattleSfx.install(root);

  runtime.activeHeroSkill = { id: "kentotsu", classId: "fighter", effects: [{ type: "damage" }] };
  runtime.heroActionSoundPlayed = false;
  root.LanternArt.drawCharacter(null, { actor: "player", state: "attack" });
  assert.equal(log.at(-1).src, BattleSfx.ASSETS.fighterPunch);

  runtime.activeHeroSkill = { id: "buyou", classId: "fighter", effects: [{ type: "evasion" }] };
  runtime.heroActionSoundPlayed = false;
  root.LanternArt.drawCharacter(null, { actor: "player", state: "attack" });
  assert.equal(log.at(-1).src, BattleSfx.ASSETS.fighterUtility);
});

test("miss sample is universal and chick death is detected by unit type", () => {
  const { root, log } = makeRoot();
  BattleSfx.install(root);
  root.LanternTactics.rollHit({});
  assert.equal(log.at(-1).src, BattleSfx.ASSETS.miss);

  const chick = { id: "battle-chick-road-1", type: "chick", hp: 5, alive: true };
  root.LanternTactics.applyDamage(chick, 10);
  assert.equal(log.at(-1).src, BattleSfx.ASSETS.chickDeath);
});

test("chick walk sample only starts once per continuous walk", () => {
  const { root, log } = makeRoot();
  BattleSfx.install(root);
  root.LanternLocomotion.sampleMovement({}, "battle-chick-road-1", .1, "left");
  root.LanternLocomotion.sampleMovement({}, "battle-chick-road-1", .2, "left");
  assert.equal(log.filter((entry) => entry.src === BattleSfx.ASSETS.chickFootstep).length, 1);
  root.LanternLocomotion.sampleMovement({}, "battle-chick-road-1", 2, "left");
  root.LanternLocomotion.sampleMovement({}, "battle-chick-road-1", .1, "left");
  assert.equal(log.filter((entry) => entry.src === BattleSfx.ASSETS.chickFootstep).length, 2);
});
