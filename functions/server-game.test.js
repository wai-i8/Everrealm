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
      dungeonClears: 0,
      defeatedDungeonBosses: [],
      skills: Skills.createSkillState({ classId: "fighter" }),
      checkpoint: { mapId: "world", x: 100, y: 100 },
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
  const valid = ServerGame.mapCommand(save, { action: "transition", targetMapId: "field" });
  assert.equal(valid.ok, true);
  assert.equal(valid.state.expansion.currentMapId, "field");
  const invalid = ServerGame.mapCommand(save, { action: "transition", targetMapId: "mountain-south" });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.reason, "invalid-transition");
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
