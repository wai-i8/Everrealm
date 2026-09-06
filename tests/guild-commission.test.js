const test = require("node:test");
const assert = require("node:assert/strict");

const Guild = require("../guild-commission-core.js");
const Skills = require("../skill-core.js");
const Core = require("../rpg-core.js");
const Maps = require("../map/map-registry.js").createMapRegistry();

const COMMISSIONS = Guild.DEFAULT_COMMISSIONS;
const byId = (id) => COMMISSIONS.find((commission) => commission.id === id);

test("V1 catalog contains exactly the five fixed commissions", () => {
  assert.deepEqual(COMMISSIONS.map((commission) => commission.id), [
    "guild_hunt_chick_1star",
    "guild_delivery_mountain_2star",
    "guild_hunt_coyote_3star",
    "guild_hunt_bear_4star",
    "guild_hunt_snake_5star",
  ]);
  assert.deepEqual(COMMISSIONS.map((commission) => commission.star), [1, 2, 3, 4, 5]);
  assert.equal(new Set(COMMISSIONS.map((commission) => commission.id)).size, 5);
  assert.deepEqual(COMMISSIONS.map((commission) => commission.recommendedLevel), [1, 3, 4, 7, 8]);
  assert.ok(COMMISSIONS.every((commission) => commission.repeatable));
});

test("V1 objective and reward data uses canonical stable IDs", () => {
  assert.deepEqual(byId("guild_hunt_chick_1star").objective, { monster_id: "chick", count: 5 });
  assert.equal(byId("guild_hunt_chick_1star").reward.skill_envelope_star, 1);
  assert.deepEqual(byId("guild_delivery_mountain_2star").objective, {
    recipient_npc_id: "mountain_delivery_recipient",
    count: 1,
  });
  assert.equal(byId("guild_delivery_mountain_2star").reward.skill_envelope_star, 2);
  assert.deepEqual(byId("guild_hunt_coyote_3star").objective, { monster_id: "coyote", count: 5 });
  assert.equal(byId("guild_hunt_coyote_3star").reward.skill_envelope_star, 3);
  assert.deepEqual(byId("guild_hunt_bear_4star").objective, { monster_id: "bear", count: 5 });
  assert.equal(byId("guild_hunt_bear_4star").reward.skill_envelope_star, 4);
  assert.deepEqual(byId("guild_hunt_snake_5star").objective, { monster_id: "snake", count: 5 });
  assert.equal(byId("guild_hunt_snake_5star").reward.skill_envelope_star, 5);
});

test("Mountain Field recipient is permanent, far from town, and reachable on authored terrain", () => {
  const field = Maps.field;
  const recipient = field.npcs.find((npc) => npc.id === "mountain_delivery_recipient");
  assert.ok(recipient);
  assert.equal(recipient.name, "洛安");
  assert.ok(Core.distance(field.spawnPoints.entrance, recipient) > field.tileSize * 12);
  const recipientTile = {
    x: Math.floor(recipient.x / field.tileSize),
    y: Math.floor(recipient.y / field.tileSize),
  };
  assert.notEqual(field.tiles[recipientTile.y][recipientTile.x], field.tileTypes.WALL);
  const route = Core.findOverworldPath(field.spawnPoints.entrance, recipient, {
    bounds: { x: 0, y: 0, w: field.pixelWidth, h: field.pixelHeight },
    cellSize: 24,
    radius: 12,
    directions: 8,
    maxVisited: 14000,
    nearestReachable: true,
    isWalkable: (point) => {
      const tx = Math.floor(point.x / field.tileSize);
      const ty = Math.floor(point.y / field.tileSize);
      return field.tiles[ty]?.[tx] !== field.tileTypes.WALL;
    },
  });
  assert.ok(route.length > 0, "recipient should be reachable from the authored field entrance");
});

test("hunt progress only counts an active matching target and each instance once", () => {
  let state = Guild.emptyState();
  let result = Guild.recordHuntKill(state, { monsterId: "chick", instanceId: "chick:before" });
  assert.equal(result.changed, false);
  assert.equal(result.state.progress, 0);

  state = Guild.accept(state, "guild_hunt_chick_1star").state;
  result = Guild.recordHuntKill(state, { monsterId: "fox", instanceId: "fox:1" });
  assert.equal(result.reason, "wrong-monster");
  assert.equal(result.state.progress, 0);

  result = Guild.recordHuntKill(state, { monsterId: "chick", instanceId: "chick:1" });
  state = result.state;
  assert.equal(state.progress, 1);
  const duplicate = Guild.recordHuntKill(state, { monsterId: "chick", instanceId: "chick:1" });
  assert.equal(duplicate.reason, "duplicate-instance");
  assert.equal(duplicate.state.progress, 1);

  for (let index = 2; index <= 5; index += 1) state = Guild.recordHuntKill(state, { monsterId: "chick", instanceId: `chick:${index}` }).state;
  assert.equal(state.progress, 5);
  assert.equal(state.objectiveCompleted, true);
  assert.equal(state.status, "ready_to_report");
  assert.equal(Guild.recordHuntKill(state, { monsterId: "chick", instanceId: "chick:6" }).changed, false);
});

test("delivery only completes at the permanent recipient and remains ready until report", () => {
  let state = Guild.emptyState();
  state = Guild.accept(state, "guild_delivery_mountain_2star").state;
  let result = Guild.deliver(state, "wrong-npc");
  assert.equal(result.reason, "wrong-recipient");
  assert.equal(result.state.status, "active");
  assert.equal(result.state.deliveryCompleted, false);

  result = Guild.deliver(state, "mountain_delivery_recipient");
  state = result.state;
  assert.equal(result.changed, true);
  assert.equal(state.status, "ready_to_report");
  assert.equal(state.deliveryCompleted, true);
  assert.equal(state.progress, 1);
  assert.equal(Guild.deliver(state, "mountain_delivery_recipient").changed, false);
});

test("report rejects early, grants one matching envelope, and makes the commission repeatable", () => {
  let state = Guild.accept(Guild.emptyState(), "guild_hunt_coyote_3star").state;
  assert.equal(Guild.report(state).reason, "not-ready");
  for (let index = 1; index <= 5; index += 1) state = Guild.recordHuntKill(state, { monsterId: "coyote", instanceId: `coyote:${index}` }).state;
  const reported = Guild.report(state);
  assert.equal(reported.ok, true);
  assert.equal(reported.reward.skill_envelope_star, 3);
  assert.equal(reported.state.activeCommissionId, null);
  assert.equal(reported.state.status, "available");
  assert.equal(reported.state.envelopes[3], 1);
  assert.equal(Guild.report(reported.state).ok, false);
  const acceptedAgain = Guild.accept(reported.state, "guild_hunt_coyote_3star");
  assert.equal(acceptedAgain.ok, true);
  assert.equal(acceptedAgain.state.progress, 0);
});

test("normalized state preserves progress, delivery and reward safety while rejecting unknown commissions", () => {
  const active = Guild.normalizeState({
    activeCommissionId: "guild_delivery_mountain_2star",
    status: "ready_to_report",
    progress: 1,
    objectiveCompleted: true,
    deliveryCompleted: true,
    cycle: 4,
    rewardClaimed: false,
    envelopes: { 2: 3 },
  });
  assert.equal(active.activeCommissionId, "guild_delivery_mountain_2star");
  assert.equal(active.status, "ready_to_report");
  assert.equal(active.deliveryCompleted, true);
  assert.equal(active.envelopes[2], 3);
  assert.equal(active.cycle, 4);

  const unknown = Guild.normalizeState({ activeCommissionId: "old-contract", status: "active", progress: 4 });
  assert.equal(unknown.activeCommissionId, null);
  assert.equal(unknown.status, "available");
  assert.equal(unknown.progress, 0);
});

test("envelope stars resolve through canonical Fighter acquisition pools", () => {
  for (const star of Guild.COMMISSION_STARS) {
    const pool = Skills.getFighterGuildBookPool(star);
    assert.ok(pool.length > 0, `star ${star} should have a canonical Fighter pool`);
    assert.ok(pool.every((skill) => skill.classId === "fighter" && skill.guildBookStars.includes(star)));
    const first = Skills.drawFighterGuildSkillBook(star, { seed: "guild-test", serial: 3 });
    const again = Skills.drawFighterGuildSkillBook(star, { seed: "guild-test", serial: 3 });
    assert.equal(first.id, again.id);
    assert.ok(pool.some((skill) => skill.id === first.id));
  }
  assert.ok(Skills.getFighterGuildBookPool(2).some((skill) => skill.name === "連擊"), "the canonical 2-star acquisition pool should include 連擊 when authored by Fighter data");
});

test("consuming an envelope is one-time and increments its independent draw serial", () => {
  let state = Guild.normalizeState({ envelopes: { 5: 1 } });
  const consumed = Guild.consumeEnvelope(state, 5);
  assert.equal(consumed.ok, true);
  assert.equal(consumed.state.envelopes[5], 0);
  assert.equal(consumed.state.envelopeDrawSerial, 1);
  assert.equal(Guild.consumeEnvelope(consumed.state, 5).reason, "no-envelope");
});
