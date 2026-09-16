const test = require("node:test");
const assert = require("node:assert/strict");
const Multiplayer = require("../multiplayer.js");

test("multiplayer records accept only the Phase 2 transient player states", () => {
  const record = Multiplayer.normalizePlayerRecord("USER_A", {
    name: "A",
    classId: "warrior",
    x: 12,
    y: 24,
    facing: "left",
    state: "battle",
    updatedAt: 100,
  });
  assert.deepEqual(record, {
    uid: "USER_A",
    name: "A",
    classId: "warrior",
    x: 12,
    y: 24,
    facing: "left",
    state: "battle",
    updatedAt: 100,
  });
  assert.equal(Multiplayer.normalizePlayerRecord("USER_A", { x: 1, y: 2, state: "chat" }).state, "exploring");
});

test("exploration publishing is throttled while battle state heartbeats remain infrequent", () => {
  const previous = { mapId: "world", name: "A", classId: "warrior", x: 0, y: 0, facing: "down", state: "exploring" };
  const moved = { ...previous, x: 4 };
  assert.equal(Multiplayer.shouldPublishSnapshot(previous, moved, { now: 50, lastPublishedAt: 0 }), false);
  assert.equal(Multiplayer.shouldPublishSnapshot(previous, moved, { now: 125, lastPublishedAt: 0 }), true);
  const battle = { ...previous, state: "battle" };
  assert.equal(Multiplayer.shouldPublishSnapshot(previous, battle, { now: 1000, lastPublishedAt: 0 }), true);
  assert.equal(Multiplayer.shouldPublishSnapshot(battle, battle, { now: 14999, lastPublishedAt: 0 }), false);
  assert.equal(Multiplayer.shouldPublishSnapshot(battle, battle, { now: 15000, lastPublishedAt: 0 }), true);
});

test("remote players interpolate toward the latest exploration position", () => {
  const remote = {
    targetX: 100,
    targetY: 0,
    renderX: 0,
    renderY: 0,
    facing: "right",
    initialized: true,
    locomotion: { state: "idle", facing: "right", time: 0 },
  };
  Multiplayer.interpolateRemotePlayer(remote, 0.1);
  assert.ok(remote.renderX > 0 && remote.renderX < 100);
  assert.equal(remote.x, remote.renderX);
  assert.equal(remote.moving, true);
});
