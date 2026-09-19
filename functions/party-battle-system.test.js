"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const ServerGame = require("./server-game.js");
const PartyBattle = require("./party-battle-system.js");
const Party = require("./party-system.js");
const Skills = require("./shared/skill-core.js");
const Guild = require("./shared/guild-commission-core.js");

function baseSave(name = "冒險者") {
  return {
    player: { name, gender: "male", x: 1856, y: 2336, hp: 300, level: 1, xp: 0, coins: 1000, potions: 2, weaponLevel: 1, upgrades: {} },
    openedChests: [],
    expansion: {
      currentMapId: "field",
      classId: "fighter",
      inventory: {},
      ownedEquipment: [],
      equipped: {},
      guildCommission: Guild.emptyState(),
      guildMarks: 0,
      guildRenown: 0,
      monsterKills: {},
      skills: Skills.createSkillState({ classId: "fighter" }),
    },
  };
}

function makeBattle(nowMs = 1000) {
  const saveA = baseSave("甲");
  const saveB = baseSave("乙");
  const started = ServerGame.battleCommand(saveA, {
    action: "start",
    monsterType: "chick",
    level: 1,
    encounterId: "party-test",
    position: { mapId: "field", x: 1856, y: 2336 },
  }, { nowMs });
  assert.equal(started.ok, true);
  const party = {
    id: "party-test",
    leaderUid: "a",
    memberUids: ["a", "b"],
    members: {
      a: Party.memberFromSave("a", saveA),
      b: Party.memberFromSave("b", saveB),
    },
  };
  const saves = { a: saveA, b: saveB };
  const battle = PartyBattle.createBattle({
    id: "pb-test",
    party,
    saves,
    canonicalBattle: started.state.expansion.serverBattle,
    nowMs,
  });
  return { battle, saves };
}

test("shared party battle gives every member a distinct deployment cell", () => {
  const { battle } = makeBattle();
  assert.equal(battle.status, "loading");
  assert.deepEqual(battle.memberUids, ["a", "b"]);
  assert.notDeepEqual(battle.members.a.cell, battle.members.b.cell);
});

test("shared party battle uses 30 second move and action phases", () => {
  const { battle, saves } = makeBattle(1000);
  PartyBattle.beginMovePhase(battle, 2000);
  assert.equal(battle.phase, "planning_move");
  assert.equal(battle.phaseEndsAtMs, 2000 + Party.PHASE_MS);
  assert.equal(battle.members.a.ap, PartyBattle.AP_GAIN);

  battle.movePlans = {
    a: { commands: [], facing: battle.members.a.facing },
    b: { commands: [], facing: battle.members.b.facing },
  };
  const moved = PartyBattle.resolveMovement(battle, saves, 5000);
  assert.equal(moved.ok, true);
  assert.equal(moved.battle.phase, "planning_action");
  assert.equal(moved.battle.phaseEndsAtMs, 5000 + Party.PHASE_MS);
});

test("connected party members can submit wait and battle advances without local autoplay", () => {
  const { battle, saves } = makeBattle(1000);
  PartyBattle.beginMovePhase(battle, 2000);
  battle.movePlans = {
    a: { commands: [], facing: battle.members.a.facing },
    b: { commands: [], facing: battle.members.b.facing },
  };
  const moved = PartyBattle.resolveMovement(battle, saves, 3000);
  assert.equal(moved.ok, true);
  const waitA = PartyBattle.validatePlayerAction(moved.battle, "a", saves.a, { type: "wait" });
  const waitB = PartyBattle.validatePlayerAction(moved.battle, "b", saves.b, { type: "wait" });
  assert.equal(waitA.ok, true);
  assert.equal(waitB.ok, true);
  moved.battle.actions = { a: waitA.action, b: waitB.action };
  const acted = PartyBattle.resolveActions(moved.battle, saves, 4000);
  assert.equal(acted.ok, true);
  assert.ok(["planning_move", "finished"].includes(acted.battle.phase));
  if (acted.battle.status !== "finished") assert.equal(acted.battle.round, 2);
});

test("retreated and disconnected players are excluded from shared battle active members", () => {
  const { battle } = makeBattle();
  battle.members.a.retreated = true;
  battle.members.a.alive = false;
  battle.members.b.disconnected = true;
  battle.members.b.alive = false;
  assert.deepEqual(PartyBattle.activeMemberUids(battle), []);
});

test("dead units remain static corpse blockers without joining active submissions", () => {
  const { battle, saves } = makeBattle(1000);
  PartyBattle.beginMovePhase(battle, 2000);
  battle.enemies[0].alive = false;
  battle.enemies[0].hp = 0;
  battle.enemies[0].deathRound = battle.round;
  const blockers = PartyBattle.corpseBlockers(battle, saves);
  assert.equal(blockers.length, 1);
  assert.equal(blockers[0].type, "corpse");
  assert.equal(blockers[0].moveRange, 0);
  assert.ok(blockers[0].id.startsWith("corpse:"));
});

test("shared battle continues to the next round while another monster is still alive", () => {
  const { battle, saves } = makeBattle(1000);
  battle.enemies = [
    { ...battle.enemies[0], id: "enemy-dead", hp: 0, alive: false, deathRound: 1 },
    { ...battle.enemies[0], id: "enemy-live", hp: Math.max(1, battle.enemies[0].hp), alive: true, deathRound: null },
  ];
  battle.status = "active";
  PartyBattle.beginMovePhase(battle, 2000);
  battle.movePlans = {
    a: { commands: [], facing: battle.members.a.facing },
    b: { commands: [], facing: battle.members.b.facing },
  };
  const moved = PartyBattle.resolveMovement(battle, saves, 3000);
  assert.equal(moved.ok, true);
  moved.battle.actions = { a: { type: "wait" }, b: { type: "wait" } };
  const acted = PartyBattle.resolveActions(moved.battle, saves, 4000);
  assert.equal(acted.ok, true);
  assert.equal(acted.battle.status, "active");
  assert.equal(acted.battle.phase, "planning_move");
  assert.equal(acted.battle.round, 2);
  assert.equal(acted.battle.enemies.some((enemy) => enemy.id === "enemy-live" && enemy.alive), true);
});
