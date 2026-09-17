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
    player: { name: "Wai", gender: "female", x: 123, y: 456, hp: 99999, coins: 99999, level: 45 },
    expansion: { classId: "fighter", inventory: { weak_potion: 999 } },
  });
  assert.equal(save.player.name, "Wai");
  assert.equal(save.player.gender, "female");
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

test("normal client save can only change cosmetic gender, move, advance play time, and consume weak-potion distance", () => {
  const current = canonicalInitialSave({ player: { x: 10, y: 20 }, expansion: { classId: "fighter" } });
  current.player.coins = 500;
  current.player.hp = 300;
  current.playTime = 100;
  current.expansion.weakPotion = { stepsRemaining: 100, distanceRemainder: 2 };
  const patch = clientOwnedPatch(current, {
    player: { gender: "female", x: 88, y: 99, coins: 99999, hp: 99999 },
    playTime: 120,
    expansion: {
      currentMapId: "mountain-southeast",
      inventory: { weak_potion: 999 },
      weakPotion: { stepsRemaining: 90, distanceRemainder: 3 },
    },
  });
  const next = mergeClientOwnedState(current, patch);
  assert.equal(next.player.gender, "female");
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
  const current = canonicalInitialSave({ player: { x: 10, y: 20 }, expansion: { classId: "fighter" } });
  current.playTime = 1000;
  current.expansion.weakPotion = { stepsRemaining: 20, distanceRemainder: 1 };
  const patch = clientOwnedPatch(current, {
    playTime: 1,
    expansion: { weakPotion: { stepsRemaining: 500, distanceRemainder: 5 } },
  });
  assert.equal(patch.playTime, 1000);
  assert.equal(patch["expansion.weakPotion.stepsRemaining"], 20);
});


test("legacy Warrior and dungeon save ids are migrated to current Fighter and mountain map ids", () => {
  const current = canonicalInitialSave(
    { player: { x: 100, y: 200 }, expansion: { classId: "fighter" } },
    { nowMs: 100000 },
  );
  current.expansion.classId = "warrior";
  current.expansion.currentMapId = "dungeon";
  current.expansion.positionAuthority = {
    version: 1,
    mapId: "dungeon",
    x: 100,
    y: 200,
    validatedAtMs: 100000,
    anomalyCount: 0,
    lastAnomalyAtMs: 0,
  };
  const patch = clientOwnedPatch(current, { player: { x: 110, y: 205 } }, { nowMs: 100100 });
  const next = mergeClientOwnedState(current, patch);
  assert.equal(next.expansion.classId, "fighter");
  assert.equal(next.expansion.currentMapId, "mountain-southeast");
  assert.equal(next.expansion.positionAuthority.mapId, "mountain-southeast");
  assert.equal(next.expansion.positionAuthority.x, 110);
  assert.equal(next.expansion.positionAuthority.y, 205);
});

test("Step 9A creates a server-owned position authority anchor without changing saved movement", () => {
  const current = canonicalInitialSave(
    { player: { x: 100, y: 200 }, expansion: { classId: "fighter" } },
    { nowMs: 100000 },
  );
  const patch = clientOwnedPatch(current, { player: { x: 250, y: 200 } }, { nowMs: 101000 });
  const next = mergeClientOwnedState(current, patch);

  assert.equal(next.player.x, 250);
  assert.equal(next.player.y, 200);
  assert.equal(next.expansion.positionAuthority.mapId, "world");
  assert.equal(next.expansion.positionAuthority.x, 250);
  assert.equal(next.expansion.positionAuthority.y, 200);
  assert.equal(next.expansion.positionAuthority.validatedAtMs, 101000);
  assert.equal(next.expansion.positionAuthority.anomalyCount, 0);
});

test("Step 9A records an impossible same-map jump but remains observation-only", () => {
  const current = canonicalInitialSave(
    { player: { x: 100, y: 200 }, expansion: { classId: "fighter" } },
    { nowMs: 100000 },
  );
  const patch = clientOwnedPatch(current, { player: { x: 5000, y: 5000 } }, { nowMs: 100100 });
  const next = mergeClientOwnedState(current, patch);

  // Step 9A deliberately preserves current client movement/save behaviour.
  assert.equal(next.player.x, 5000);
  assert.equal(next.player.y, 5000);
  // The trusted anchor does not follow the impossible jump.
  assert.equal(next.expansion.positionAuthority.x, 100);
  assert.equal(next.expansion.positionAuthority.y, 200);
  assert.equal(next.expansion.positionAuthority.validatedAtMs, 100000);
  assert.equal(next.expansion.positionAuthority.anomalyCount, 1);
  assert.equal(next.expansion.positionAuthority.lastAnomalyAtMs, 100100);
});

test("Step 9A bootstraps a fresh anchor after an authoritative map change", () => {
  const current = canonicalInitialSave(
    { player: { x: 100, y: 200 }, expansion: { classId: "fighter" } },
    { nowMs: 100000 },
  );
  current.expansion.currentMapId = "guild";

  const patch = clientOwnedPatch(current, { player: { x: 30, y: 40 } }, { nowMs: 101000 });
  const next = mergeClientOwnedState(current, patch);

  assert.equal(next.expansion.positionAuthority.mapId, "guild");
  assert.equal(next.expansion.positionAuthority.x, 30);
  assert.equal(next.expansion.positionAuthority.y, 40);
  assert.equal(next.expansion.positionAuthority.validatedAtMs, 101000);
  assert.equal(next.expansion.positionAuthority.anomalyCount, 0);
});
