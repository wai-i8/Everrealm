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

test("authoritative state payload preserves the server revision", () => {
  const save = baseSave({ stateRevision: 27, expansion: { currentMapId: "guild" } });
  const result = ServerGame.questCommand(save, { action: "accept", commissionId: Guild.DEFAULT_COMMISSIONS[0].id });
  assert.equal(result.ok, true);
  assert.equal(result.state.stateRevision, 27);
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

test("guild commission mutations are authoritative by guild map and quest state, not fragile room proximity", () => {
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
    position: { mapId: "guild", x: 5000, y: 5000 },
  }, { nowMs: 123000 });
  assert.equal(accepted.ok, true);

  const wrongMap = ServerGame.questCommand(baseSave(), { action: "accept", commissionId });
  assert.equal(wrongMap.ok, false);
  assert.equal(wrongMap.reason, "wrong-map");
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
  const position = { mapId: "field", x: 1856, y: 2336 };
  let save = baseSave({ player: { x: position.x, y: position.y }, expansion: { currentMapId: "field" } });
  const first = ServerGame.battleCommand(save, { action: "start", monsterType: "chick", level: 1, encounterId: "encounter-a", position });
  assert.equal(first.ok, true);
  save = mergeAuthoritative(save, first.state);

  const same = ServerGame.battleCommand(save, { action: "start", monsterType: "chick", level: 1, encounterId: "encounter-a", position });
  assert.equal(same.ok, true);
  assert.equal(same.reused, true);
  assert.equal(same.battle.id, first.battle.id);

  const different = ServerGame.battleCommand(save, { action: "start", monsterType: "chick", level: 1, encounterId: "encounter-b", position });
  assert.equal(different.ok, false);
  assert.equal(different.reason, "battle-active");
  assert.equal(different.battle.id, first.battle.id);
});

test("battle rewards cannot settle until server-tracked enemies are defeated", () => {
  const position = { mapId: "field", x: 1856, y: 2336 };
  let save = baseSave({ player: { x: position.x, y: position.y }, expansion: { currentMapId: "field" } });
  const started = ServerGame.battleCommand(save, { action: "start", monsterType: "chick", level: 1, encounterId: "test-chick", position });
  assert.equal(started.ok, true);
  save = mergeAuthoritative(save, started.state);
  const battleId = started.battle.id;

  const premature = ServerGame.battleCommand(save, { action: "settle", battleId, outcome: "victory" });
  assert.equal(premature.ok, false);
  assert.equal(premature.reason, "battle-not-won");

  // Put the server-owned test enemy one legal punch away from defeat. The act
  // still has to pass the tactical position/range checks before victory can be
  // settled; client-reported HP/target indexes are no longer trusted.
  save.expansion.serverBattle.enemies[0].hp = 5;
  save.expansion.serverBattle.enemies[0].cell = { x: 2, y: 1 };
  save.expansion.serverBattle.enemies[0].facing = "left";
  save.expansion.serverBattle.heroCell = { x: 1, y: 1 };
  save.expansion.serverBattle.heroFacing = "right";

  const acted = ServerGame.battleCommand(save, {
    action: "act",
    battleId,
    round: 1,
    tacticalVersion: 1,
    moveCommands: [],
    heroAction: "skill",
    skillId: "straight_punch",
    targetCell: { x: 2, y: 1 },
    heroHp: 999999,
  });
  assert.equal(acted.ok, true);
  assert.equal(acted.battle.enemies[0].alive, false);
  assert.notEqual(acted.battle.heroHp, 999999);
  save = mergeAuthoritative(save, acted.state);

  const settled = ServerGame.battleCommand(save, { action: "settle", battleId, outcome: "victory" });
  assert.equal(settled.ok, true);
  assert.equal(settled.outcome, "victory");
  assert.ok(settled.earnedXp > 0);
  assert.ok(settled.coins >= 0);
  assert.equal(settled.state.expansion.serverBattle, null);
});

test("tactical battle rejects forged teleports and out-of-range attacks", () => {
  const position = { mapId: "field", x: 1856, y: 2336 };
  let save = baseSave({ player: { x: position.x, y: position.y, hp: 300 }, expansion: { currentMapId: "field" } });
  const started = ServerGame.battleCommand(save, { action: "start", monsterType: "chick", level: 1, encounterId: "anti-cheat", position });
  assert.equal(started.ok, true);
  save = mergeAuthoritative(save, started.state);

  const teleport = ServerGame.battleCommand(save, {
    action: "act",
    battleId: started.battle.id,
    round: 1,
    tacticalVersion: 1,
    moveCommands: [{ type: "move", to: { x: 7, y: 1 } }],
    heroAction: "wait",
  });
  assert.equal(teleport.ok, false);
  assert.equal(teleport.reason, "invalid-movement-path");

  const forgedRange = ServerGame.battleCommand(save, {
    action: "act",
    battleId: started.battle.id,
    round: 1,
    tacticalVersion: 1,
    moveCommands: [],
    heroAction: "skill",
    skillId: "straight_punch",
    targetCell: { x: 7, y: 2 },
  });
  assert.equal(forgedRange.ok, false);
  assert.equal(forgedRange.reason, "skill-out-of-range");
});

test("server battle snapshot persists authoritative cells and facing for reconnect", () => {
  const position = { mapId: "field", x: 1856, y: 2336 };
  let save = baseSave({ player: { x: position.x, y: position.y, hp: 300 }, expansion: { currentMapId: "field" } });
  const started = ServerGame.battleCommand(save, { action: "start", monsterType: "chick", level: 1, encounterId: "resume-tactical", position });
  assert.equal(started.ok, true);
  save = mergeAuthoritative(save, started.state);

  const acted = ServerGame.battleCommand(save, {
    action: "act",
    battleId: started.battle.id,
    round: 1,
    tacticalVersion: 1,
    moveCommands: [{ type: "move", to: { x: 2, y: 1 } }, { type: "face", facing: "down" }],
    heroAction: "wait",
    heroHp: 999999,
  });
  assert.equal(acted.ok, true);
  assert.deepEqual(acted.battle.heroCell, { x: 2, y: 1 });
  assert.equal(acted.battle.heroFacing, "down");
  assert.ok(acted.battle.enemies[0].cell);
  assert.ok(["up", "right", "down", "left"].includes(acted.battle.enemies[0].facing));
  assert.notEqual(acted.battle.heroHp, 999999);
  save = mergeAuthoritative(save, acted.state);

  const reused = ServerGame.battleCommand(save, { action: "start", monsterType: "chick", level: 1, encounterId: "resume-tactical", position });
  assert.equal(reused.ok, true);
  assert.equal(reused.reused, true);
  assert.deepEqual(reused.battle.heroCell, acted.battle.heroCell);
  assert.equal(reused.battle.heroFacing, acted.battle.heroFacing);
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

test("2-star wish commission accepts anywhere inside the authoritative guild map", () => {
  const save = baseSave({
    player: { x: 1666, y: 1576 },
    expansion: {
      currentMapId: "guild",
      positionAuthority: {
        version: 1,
        mapId: "guild",
        x: 1666,
        y: 1576,
        validatedAtMs: 99000,
        anomalyCount: 0,
        lastAnomalyAtMs: 0,
      },
    },
  });
  const result = ServerGame.questCommand(save, {
    action: "accept",
    commissionId: "guild_wish_pool_2star",
    position: { mapId: "guild", x: 180, y: 220 },
  }, { nowMs: 100000 });
  assert.equal(result.ok, true);
  assert.equal(result.commission.id, "guild_wish_pool_2star");
  assert.equal(result.state.expansion.guildCommission.status, "active");
});

test("field random encounters use the authored encounter mask instead of per-monster habitat", () => {
  const cases = [
    { position: { x: 1856, y: 2336 }, monsterType: "chick", level: 1, zone: "Lv1–2" },
    { position: { x: 1856, y: 480 }, monsterType: "fox", level: 5, zone: "Lv2–5" },
    { position: { x: 1312, y: 704 }, monsterType: "raccoon", level: 10, zone: "Lv6–10" },
    { position: { x: 3296, y: 0 }, monsterType: "frog", level: 15, zone: "Lv11–15" },
  ];

  for (const entry of cases) {
    const save = baseSave({
      player: { x: entry.position.x, y: entry.position.y },
      expansion: { currentMapId: "field" },
    });
    const result = ServerGame.battleCommand(save, {
      action: "start",
      monsterType: entry.monsterType,
      level: entry.level,
      encounterId: `field-${entry.monsterType}-regression`,
      position: { mapId: "field", ...entry.position },
    }, { nowMs: Date.now() });
    assert.equal(result.ok, true, `${entry.monsterType} should be valid in ${entry.zone}`);
    assert.equal(result.battle?.monsterType, entry.monsterType);
    assert.equal(result.encounterZone, entry.zone);
  }
});


test("dead players cannot start a new battle and are never hydrated back to full HP", () => {
  const save = baseSave({
    player: { hp: 0, x: 3296, y: 0 },
    expansion: { currentMapId: "field" },
  });
  const result = ServerGame.battleCommand(save, {
    action: "start",
    monsterType: "frog",
    level: 15,
    encounterId: "dead-player-field-encounter",
    position: { mapId: "field", x: 3296, y: 0 },
  }, { nowMs: Date.now() });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "player-dead");
  assert.equal(save.player.hp, 0);
  assert.equal(save.expansion.serverBattle, undefined);
});

test("equipment changes preserve the authoritative zero-HP death state", () => {
  const save = baseSave({
    player: { hp: 0 },
    expansion: {
      currentMapId: "world",
      ownedEquipment: ["novice_gloves"],
      equipped: {},
    },
  });
  const result = ServerGame.economyCommand(save, { action: "equip", itemId: "novice_gloves" });
  assert.equal(result.ok, true);
  assert.equal(result.state.player.hp, 0);
});

test("field random encounter rejects monsters and levels that the client mask could not generate", () => {
  const zonePosition = { x: 3296, y: 0 }; // authored Lv11–15 zone
  const wrongMonster = ServerGame.battleCommand(baseSave({ expansion: { currentMapId: "field" } }), {
    action: "start",
    monsterType: "snake",
    level: 15,
    encounterId: "field-wrong-monster",
    position: { mapId: "field", ...zonePosition },
  }, { nowMs: Date.now() });
  assert.equal(wrongMonster.ok, false);
  assert.equal(wrongMonster.reason, "monster-not-in-encounter-zone");

  const wrongLevel = ServerGame.battleCommand(baseSave({ expansion: { currentMapId: "field" } }), {
    action: "start",
    monsterType: "frog",
    level: 18,
    encounterId: "field-wrong-level",
    position: { mapId: "field", ...zonePosition },
  }, { nowMs: Date.now() });
  assert.equal(wrongLevel.ok, false);
  assert.equal(wrongLevel.reason, "encounter-level-mismatch");

  const noZone = ServerGame.battleCommand(baseSave({ expansion: { currentMapId: "field" } }), {
    action: "start",
    monsterType: "chick",
    level: 1,
    encounterId: "field-no-zone",
    position: { mapId: "field", x: 100, y: 100 },
  }, { nowMs: Date.now() });
  assert.equal(noZone.ok, false);
  assert.equal(noZone.reason, "invalid-encounter-zone");
});

