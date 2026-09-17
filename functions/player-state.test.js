"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canonicalInitialSave,
  clientOwnedPatch,
  mergeClientOwnedState,
} = require("./player-state.js");

test("new saves always start with canonical protected progression", () => {
  const save = canonicalInitialSave({
    player: { name: "Wai", x: 123, y: 456, hp: 99999, coins: 99999, level: 45 },
    expansion: { classId: "fighter", inventory: { weak_potion: 999 } },
  });
  assert.equal(save.player.name, "Wai");
  assert.equal(save.player.x, 123);
  assert.equal(save.player.y, 456);
  assert.equal(save.player.level, 1);
  assert.equal(save.player.xp, 0);
  assert.equal(save.player.coins, 12);
  assert.equal(save.player.potions, 2);
  assert.deepEqual(save.expansion.inventory, {});
  assert.equal(save.expansion.currentMapId, "world");
  assert.equal(save.expansion.classId, "fighter");
});

test("normal client save can only move, advance play time, and consume weak-potion distance", () => {
  const current = canonicalInitialSave({ player: { x: 10, y: 20 }, expansion: { classId: "fighter" } });
  current.player.coins = 500;
  current.player.hp = 300;
  current.playTime = 100;
  current.expansion.weakPotion = { stepsRemaining: 100, distanceRemainder: 2 };
  const patch = clientOwnedPatch(current, {
    player: { x: 88, y: 99, coins: 99999, hp: 99999 },
    playTime: 120,
    expansion: {
      currentMapId: "dungeon",
      inventory: { weak_potion: 999 },
      weakPotion: { stepsRemaining: 90, distanceRemainder: 3 },
    },
  });
  const next = mergeClientOwnedState(current, patch);
  assert.equal(next.player.x, 88);
  assert.equal(next.player.y, 99);
  assert.equal(next.playTime, 120);
  assert.equal(next.expansion.weakPotion.stepsRemaining, 90);
  assert.equal(next.player.coins, 500);
  assert.equal(next.player.hp, 300);
  assert.equal(next.expansion.currentMapId, "world");
  assert.deepEqual(next.expansion.inventory, {});
});

test("client save cannot increase weak potion steps or rewind play time", () => {
  const current = canonicalInitialSave({ player: { x: 10, y: 20 }, expansion: { classId: "warrior" } });
  current.playTime = 1000;
  current.expansion.weakPotion = { stepsRemaining: 20, distanceRemainder: 1 };
  const patch = clientOwnedPatch(current, {
    playTime: 1,
    expansion: { weakPotion: { stepsRemaining: 500, distanceRemainder: 5 } },
  });
  assert.equal(patch.playTime, 1000);
  assert.equal(patch["expansion.weakPotion.stepsRemaining"], 20);
});
