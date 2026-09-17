"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const ServerGame = require("./server-game.js");
const Skills = require("./shared/skill-core.js");
const Guild = require("./shared/guild-commission-core.js");

function baseSave(overrides = {}) {
  const save = {
    player: { hp: 300, level: 1, xp: 0, coins: 1000, potions: 2, weaponLevel: 1, upgrades: {} },
    openedChests: [],
    expansion: {
      currentMapId: "world",
      classId: "fighter",
      inventory: { weak_potion: 1 },
      ownedEquipment: [],
      equipped: {},
      guildCommission: Guild.emptyState(),
      guildMarks: 0,
      guildRenown: 0,
      monsterKills: {},
      skills: Skills.createSkillState({ classId: "fighter" }),
    },
  };
  return {
    ...save,
    ...overrides,
    player: { ...save.player, ...(overrides.player || {}) },
    expansion: { ...save.expansion, ...(overrides.expansion || {}) },
  };
}

function mergeAuthoritative(save, state) {
  return {
    ...save,
    player: { ...save.player, ...(state.player || {}) },
    expansion: { ...save.expansion, ...(state.expansion || {}) },
    openedChests: Array.isArray(state.openedChests) ? [...state.openedChests] : save.openedChests,
  };
}

test("economy purchase is rejected outside the authored shop map", () => {
  const result = ServerGame.economyCommand(baseSave(), { action: "buy-store-item", itemId: "healing_potion" });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "wrong-map");
});

test("economy purchase deducts canonical price and grants one potion", () => {
  const save = baseSave({ expansion: { currentMapId: "general-store" } });
  const result = ServerGame.economyCommand(save, { action: "buy-store-item", itemId: "healing_potion" });
  assert.equal(result.ok, true);
  assert.equal(result.price, 30);
  assert.equal(result.state.player.coins, 970);
  assert.equal(result.state.player.potions, 3);
});

test("guild commission accept/report path is server-validated by map and state", () => {
  const commissionId = Guild.DEFAULT_COMMISSIONS[0].id;
  const wrongMap = ServerGame.questCommand(baseSave(), { action: "accept", commissionId });
  assert.equal(wrongMap.ok, false);
  assert.equal(wrongMap.reason, "wrong-map");

  const guildSave = baseSave({ expansion: { currentMapId: "guild" } });
  const accepted = ServerGame.questCommand(guildSave, { action: "accept", commissionId });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.state.expansion.guildCommission.status, "active");
});

test("map transitions only allow authored adjacent maps", () => {
  const save = baseSave({ expansion: { currentMapId: "world" } });
  const valid = ServerGame.mapCommand(save, { action: "transition", targetMapId: "field" }, { nowMs: 123456 });
  assert.equal(valid.ok, true);
  assert.equal(valid.state.expansion.currentMapId, "field");
  const invalid = ServerGame.mapCommand(save, { action: "transition", targetMapId: "mountain-south" }, { nowMs: 123456 });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.reason, "invalid-transition");
});

test("legacy dungeon map ids migrate to the mountain-southeast route", () => {
  const save = baseSave({
    player: { x: 150, y: 1000 },
    expansion: {
      currentMapId: "dungeon",
      positionAuthority: { version: 1, mapId: "dungeon", x: 150, y: 1000, validatedAtMs: 120000, anomalyCount: 0, lastAnomalyAtMs: 0 },
    },
  });
  const result = ServerGame.mapCommand(save, { action: "transition", targetMapId: "mountain-south" }, { nowMs: 123456 });
  assert.equal(result.ok, true);
  assert.equal(result.state.expansion.currentMapId, "mountain-south");
  assert.equal(result.state.expansion.classId, "fighter");
});

test("Step 9B accepts a transition when the trusted anchor is at the authored exit", () => {
  const save = baseSave({
    player: { x: 6200, y: 2100 },
    expansion: {
      currentMapId: "world",
      positionAuthority: { version: 1, mapId: "world", x: 6200, y: 2100, validatedAtMs: 120000, anomalyCount: 0, lastAnomalyAtMs: 0 },
    },
  });
  const result = ServerGame.mapCommand(save, { action: "transition", targetMapId: "field" }, { nowMs: 123456 });
  assert.equal(result.ok, true);
  assert.equal(result.positionValidated, true);
  assert.deepEqual(result.arrival, { x: 721, y: 2650 });
  assert.equal(result.state.player.x, 721);
  assert.equal(result.state.player.y, 2650);
  assert.equal(result.state.expansion.positionAuthority.mapId, "field");
  assert.equal(result.state.expansion.positionAuthority.x, 721);
  assert.equal(result.state.expansion.positionAuthority.y, 2650);
  assert.equal(result.state.expansion.positionAuthority.validatedAtMs, 123456);
});

test("Step 9B rejects a valid map link when the trusted anchor is nowhere near its exit", () => {
  const save = baseSave({
    player: { x: 6200, y: 2100 },
    expansion: {
      currentMapId: "world",
      positionAuthority: { version: 1, mapId: "world", x: 3663, y: 1746, validatedAtMs: 120000, anomalyCount: 0, lastAnomalyAtMs: 0 },
    },
  });
  const result = ServerGame.mapCommand(save, { action: "transition", targetMapId: "field" }, { nowMs: 123456 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid-transition-position");
  assert.equal(result.from, "world");
  assert.equal(result.to, "field");
});

test("Step 9B uses the trusted anchor rather than spoofable player x/y", () => {
  const save = baseSave({
    player: { x: 6200, y: 2100 },
    expansion: {
      currentMapId: "world",
      positionAuthority: { version: 1, mapId: "world", x: 1000, y: 1000, validatedAtMs: 120000, anomalyCount: 1, lastAnomalyAtMs: 119000 },
    },
  });
  const result = ServerGame.mapCommand(save, { action: "transition", targetMapId: "field" }, { nowMs: 123456 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid-transition-position");
});



test("Step 9B town respawn resets the canonical map and trusted position anchor", () => {
  const save = baseSave({
    player: { x: 4500, y: 1489, hp: 0 },
    expansion: {
      currentMapId: "mountain-south",
      positionAuthority: { version: 1, mapId: "mountain-south", x: 4500, y: 1489, validatedAtMs: 120000, anomalyCount: 2, lastAnomalyAtMs: 119000 },
    },
  });
  const respawn = ServerGame.respawnTownStatePatch(save, { nowMs: 123456 });
  assert.equal(respawn.mapId, "world");
  assert.deepEqual({ x: respawn.x, y: respawn.y }, { x: 3663, y: 1746 });
  assert.equal(respawn.positionAuthority.version, 1);
  assert.equal(respawn.positionAuthority.mapId, "world");
  assert.equal(respawn.positionAuthority.x, 3663);
  assert.equal(respawn.positionAuthority.y, 1746);
  assert.equal(respawn.positionAuthority.validatedAtMs, 123456);
  assert.equal(respawn.positionAuthority.anomalyCount, 2);
  assert.equal(respawn.positionAuthority.lastAnomalyAtMs, 119000);
});



test("Step 9C accepts a shop command only after a plausible move to the merchant", () => {
  const save = baseSave({
    player: { x: 618, y: 1062 },
    expansion: {
      currentMapId: "general-store",
      positionAuthority: { version: 1, mapId: "general-store", x: 618, y: 1062, validatedAtMs: 120000, anomalyCount: 0, lastAnomalyAtMs: 0 },
    },
  });
  const result = ServerGame.economyCommand(save, {
    action: "buy-store-item",
    itemId: "healing_potion",
    position: { mapId: "general-store", x: 622, y: 500 },
  }, { nowMs: 123000 });
  assert.equal(result.ok, true);
  assert.equal(result.state.expansion.positionAuthority.x, 622);
  assert.equal(result.state.expansion.positionAuthority.y, 500);
  assert.equal(result.state.player.potions, 3);
});

test("Step 9C rejects remote shop use even when the claimed point itself is movement-plausible", () => {
  const save = baseSave({
    player: { x: 618, y: 1062 },
    expansion: {
      currentMapId: "general-store",
      positionAuthority: { version: 1, mapId: "general-store", x: 618, y: 1062, validatedAtMs: 120000, anomalyCount: 0, lastAnomalyAtMs: 0 },
    },
  });
  const result = ServerGame.economyCommand(save, {
    action: "buy-store-item",
    itemId: "healing_potion",
    position: { mapId: "general-store", x: 618, y: 1062 },
  }, { nowMs: 121000 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "interaction-too-far");
});

test("Step 9C rejects an impossible same-map teleport before gameplay proximity is checked", () => {
  const save = baseSave({
    player: { x: 618, y: 1062 },
    expansion: {
      currentMapId: "general-store",
      positionAuthority: { version: 1, mapId: "general-store", x: 618, y: 1062, validatedAtMs: 120000, anomalyCount: 0, lastAnomalyAtMs: 0 },
    },
  });
  const result = ServerGame.economyCommand(save, {
    action: "buy-store-item",
    itemId: "healing_potion",
    position: { mapId: "general-store", x: 5000, y: 5000 },
  }, { nowMs: 120100 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid-position");
});

test("Step 9C guild mutations require the player to be near the commission desk or board", () => {
  const commissionId = Guild.DEFAULT_COMMISSIONS[0].id;
  const save = baseSave({
    player: { x: 1666, y: 1576 },
    expansion: {
      currentMapId: "guild",
      positionAuthority: { version: 1, mapId: "guild", x: 1666, y: 1576, validatedAtMs: 120000, anomalyCount: 0, lastAnomalyAtMs: 0 },
    },
  });
  const accepted = ServerGame.questCommand(save, {
    action: "accept",
    commissionId,
    position: { mapId: "guild", x: 1666, y: 700 },
  }, { nowMs: 123000 });
  assert.equal(accepted.ok, true);

  const tooFar = ServerGame.questCommand(save, {
    action: "accept",
    commissionId,
    position: { mapId: "guild", x: 1666, y: 1576 },
  }, { nowMs: 123000 });
  assert.equal(tooFar.ok, false);
  assert.equal(tooFar.reason, "interaction-too-far");
});

test("Step 9C validates authored wish-pool and clinic service proximity", () => {
  const fieldSave = baseSave({
    player: { x: 721, y: 2650 },
    expansion: {
      currentMapId: "field",
      positionAuthority: { version: 1, mapId: "field", x: 721, y: 2650, validatedAtMs: 120000, anomalyCount: 0, lastAnomalyAtMs: 0 },
    },
  });
  const wish = ServerGame.validateGameplayInteraction(fieldSave, {
    position: { mapId: "field", x: 1770, y: 950 },
  }, "mountain-wish-pool", { nowMs: 133000 });
  assert.equal(wish.ok, true);

  const clinicSave = baseSave({
    player: { x: 627, y: 1050 },
    expansion: {
      currentMapId: "clinic",
      positionAuthority: { version: 1, mapId: "clinic", x: 627, y: 1050, validatedAtMs: 120000, anomalyCount: 0, lastAnomalyAtMs: 0 },
    },
  });
  const clinic = ServerGame.validateGameplayInteraction(clinicSave, {
    position: { mapId: "clinic", x: 628, y: 760 },
  }, "clinic-heal", { nowMs: 121000 });
  assert.equal(clinic.ok, true);
});

test("Step 9C battle start rejects an impossible exploration position claim", () => {
  const save = baseSave({
    player: { x: 721, y: 2650 },
    expansion: {
      currentMapId: "field",
      positionAuthority: { version: 1, mapId: "field", x: 721, y: 2650, validatedAtMs: 120000, anomalyCount: 0, lastAnomalyAtMs: 0 },
    },
  });
  const result = ServerGame.battleCommand(save, {
    action: "start",
    monsterType: "chick",
    level: 1,
    encounterId: "step9c-teleport",
    position: { mapId: "field", x: 6000, y: 6000 },
  }, { nowMs: 120100 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid-position");
});

test("battle start is idempotent for the same encounter and exposes orphan battle id for recovery", () => {
  let save = baseSave({ expansion: { currentMapId: "field" } });
  const first = ServerGame.battleCommand(save, { action: "start", monsterType: "chick", level: 1, encounterId: "encounter-a" });
  assert.equal(first.ok, true);
  save = mergeAuthoritative(save, first.state);

  const same = ServerGame.battleCommand(save, { action: "start", monsterType: "chick", level: 1, encounterId: "encounter-a" });
  assert.equal(same.ok, true);
  assert.equal(same.reused, true);
  assert.equal(same.battle.id, first.battle.id);

  const different = ServerGame.battleCommand(save, { action: "start", monsterType: "chick", level: 1, encounterId: "encounter-b" });
  assert.equal(different.ok, false);
  assert.equal(different.reason, "battle-active");
  assert.equal(different.battle.id, first.battle.id);
});

test("battle rewards cannot settle until server-tracked enemies are defeated", () => {
  let save = baseSave({ expansion: { currentMapId: "field" } });
  const started = ServerGame.battleCommand(save, { action: "start", monsterType: "chick", level: 1, encounterId: "test-chick" });
  assert.equal(started.ok, true);
  save = mergeAuthoritative(save, started.state);
  const battleId = started.battle.id;

  const premature = ServerGame.battleCommand(save, { action: "settle", battleId, outcome: "victory" });
  assert.equal(premature.ok, false);
  assert.equal(premature.reason, "battle-not-won");

  let round = 1;
  let snapshot = started.battle;
  while (snapshot.enemies.some((enemy) => enemy.alive) && round < 100) {
    const acted = ServerGame.battleCommand(save, {
      action: "act",
      battleId,
      round,
      heroAction: "skill",
      skillId: "straight_punch",
      targetIndexes: [0],
      heroHp: 300,
    });
    assert.equal(acted.ok, true);
    save = mergeAuthoritative(save, acted.state);
    snapshot = acted.battle;
    round = snapshot.round;
  }
  assert.equal(snapshot.enemies.some((enemy) => enemy.alive), false);

  const settled = ServerGame.battleCommand(save, { action: "settle", battleId, outcome: "victory" });
  assert.equal(settled.ok, true);
  assert.equal(settled.outcome, "victory");
  assert.ok(settled.earnedXp > 0);
  assert.ok(settled.coins >= 0);
  assert.equal(settled.state.expansion.serverBattle, null);
});

test("skill manual mutation is executed through the server economy command", () => {
  const skill = Skills.getSkillsByClass("fighter").find((candidate) => candidate.id !== "straight_punch" && candidate.prerequisites.length === 0);
  assert.ok(skill);
  const save = baseSave();
  save.expansion.skills.manualCounts = { [skill.id]: 1 };
  const result = ServerGame.economyCommand(save, { action: "learn-skill-manual", skillId: skill.id });
  assert.equal(result.ok, true);
  assert.ok(result.state.expansion.skills.unlockedSkillIds.includes(skill.id));
  assert.equal(result.state.expansion.skills.manualCounts[skill.id] || 0, 0);
});
