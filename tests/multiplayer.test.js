const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Multiplayer = require("../multiplayer.js");

function createMockMultiplayer({ debug, holdWrites = false } = {}) {
  let mapListener = null;
  let mapUnsubscribeCount = 0;
  let clock = 1000;
  const writes = [];
  const removes = [];
  const pendingWriteReleases = [];
  let writesReleased = !holdWrites;
  const sdk = {
    ref: (_database, refPath) => ({ refPath }),
    onValue: (ref, callback) => {
      if (ref.refPath === ".info/connected") callback({ val: () => true });
      else if (ref.refPath.endsWith("/players")) mapListener = callback;
      return () => { mapUnsubscribeCount += 1; };
    },
    onDisconnect: (ref) => ({
      remove: async () => { removes.push(`disconnect:${ref.refPath}`); },
    }),
    set: async (ref, value) => {
      writes.push({ refPath: ref.refPath, value });
      if (holdWrites && !writesReleased) await new Promise((resolve) => pendingWriteReleases.push(resolve));
    },
    remove: async (ref) => { removes.push(ref.refPath); },
    serverTimestamp: () => ++clock,
  };
  const firebase = {
    realtime: async () => ({ database: {}, sdk }),
  };
  const client = Multiplayer.create({
    firebase,
    debug,
    locomotion: {
      create: (facing) => ({ state: "idle", facing, time: 0 }),
      update: (current, next) => ({ ...current, state: next.moving ? "walk" : "idle", facing: next.facing, time: current.time + next.dt }),
    },
  });
  return {
    client,
    writes,
    removes,
    get mapUnsubscribeCount() { return mapUnsubscribeCount; },
    emitMap(records) {
      assert.ok(mapListener, "map listener must be attached before emitting a remote record");
      const children = Object.entries(records).map(([key, value]) => ({ key, val: () => value }));
      mapListener({ forEach: (callback) => children.forEach(callback) });
    },
    releaseWrites() {
      writesReleased = true;
      while (pendingWriteReleases.length) pendingWriteReleases.shift()();
    },
  };
}

test("multiplayer records accept only the Phase 2 transient player states", () => {
  const record = Multiplayer.normalizePlayerRecord("USER_A", {
    name: "A",
    classId: "warrior",
    x: 12,
    y: 24,
    facing: "left",
    state: "battle",
    moving: false,
    seq: 0,
    sampledAt: 0,
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
    moving: false,
    seq: 0,
    sampledAt: 0,
    updatedAt: 100,
  });
  assert.equal(Multiplayer.normalizePlayerRecord("USER_A", { x: 1, y: 2, state: "chat" }).state, "exploring");
});

test("exploration publishing is throttled while battle state heartbeats remain infrequent", () => {
  const previous = { mapId: "world", name: "A", classId: "warrior", x: 0, y: 0, facing: "down", state: "exploring" };
  const moved = { ...previous, x: 4 };
  assert.equal(Multiplayer.shouldPublishSnapshot(previous, moved, { now: 50, lastPublishedAt: 0 }), false);
  assert.equal(Multiplayer.shouldPublishSnapshot(previous, moved, { now: 100, lastPublishedAt: 0 }), true);
  const battle = { ...previous, state: "battle" };
  assert.equal(Multiplayer.shouldPublishSnapshot(previous, battle, { now: 1000, lastPublishedAt: 0 }), true);
  assert.equal(Multiplayer.shouldPublishSnapshot(battle, battle, { now: 14999, lastPublishedAt: 0 }), false);
  assert.equal(Multiplayer.shouldPublishSnapshot(battle, battle, { now: 15000, lastPublishedAt: 0 }), true);
});

test("remote players interpolate toward the latest exploration position", () => {
  const remote = {
    snapshots: [],
    renderX: 0,
    renderY: 0,
    renderTime: 1000,
    facing: "right",
    initialized: true,
    locomotion: { state: "idle", facing: "right", time: 0 },
  };
  Multiplayer.appendRemoteSnapshot(remote, { x: 0, y: 0, facing: "right", state: "exploring", sampledAt: 1000, updatedAt: 5000 }, 1000);
  Multiplayer.appendRemoteSnapshot(remote, { x: 100, y: 0, facing: "right", state: "exploring", moving: true, sampledAt: 1125, updatedAt: 5001 }, 1125);
  Multiplayer.interpolateRemotePlayer(remote, 0.1);
  assert.ok(remote.renderX > 0 && remote.renderX < 100);
  assert.equal(remote.x, remote.renderX);
  assert.equal(remote.renderMoving, true);
});

test("map listener creates a remote entity immediately and exposes receiver timing", async () => {
  const diagnostics = [];
  const mock = createMockMultiplayer({ debug: (entry) => diagnostics.push(entry) });
  await mock.client.start({
    uid: "USER_A",
    getPlayer: () => ({ mapId: "world", name: "A", classId: "warrior", x: 10, y: 20, facing: "down" }),
  });
  mock.emitMap({
    USER_A: { uid: "USER_A", x: 10, y: 20, state: "exploring" },
    USER_B: { uid: "USER_B", name: "B", classId: "fighter", x: 120, y: 220, facing: "left", state: "exploring", updatedAt: 2 },
  });
  const [remote] = mock.client.getRenderPlayers("world");
  assert.equal(remote.uid, "USER_B");
  assert.equal(remote.x, 120);
  assert.equal(remote.y, 220);
  assert.equal(remote.state, "exploring");
  assert.ok(diagnostics.some((entry) => entry.event === "map.listener.attached"));
  assert.ok(diagnostics.some((entry) => entry.event === "remote.entity.created" && entry.remoteUid === "USER_B"));
  assert.ok(diagnostics.some((entry) => entry.event === "remote.entity.inserted" && entry.remoteUid === "USER_B"));
});

test("map listener is live before slow local writes finish", async () => {
  const mock = createMockMultiplayer({ holdWrites: true });
  const startPromise = mock.client.start({
    uid: "USER_A",
    getPlayer: () => ({ mapId: "world", name: "A", classId: "warrior", x: 10, y: 20, facing: "down" }),
  });
  await new Promise((resolve) => setImmediate(resolve));
  mock.emitMap({ USER_B: { uid: "USER_B", name: "B", classId: "fighter", x: 120, y: 220, state: "exploring", updatedAt: 2 } });
  assert.equal(mock.client.getRenderPlayers("world")[0].uid, "USER_B");
  mock.releaseWrites();
  await startPromise;
});

test("snapshot buffering interpolates behind the latest network sample", () => {
  const entry = {
    snapshots: [],
    renderX: 0,
    renderY: 0,
    renderTime: 1000,
    initialized: true,
    state: "exploring",
    facing: "right",
    locomotion: { state: "walk", facing: "right", time: 0 },
  };
  Multiplayer.appendRemoteSnapshot(entry, { x: 0, y: 0, facing: "right", state: "exploring", sampledAt: 1000, updatedAt: 5000 }, 1000);
  Multiplayer.appendRemoteSnapshot(entry, { x: 100, y: 0, facing: "right", state: "exploring", moving: true, sampledAt: 1125, updatedAt: 5001 }, 1125);
  Multiplayer.interpolateRemotePlayer(entry, .0625);
  assert.equal(entry.renderTime, 1062.5);
  assert.equal(entry.renderX, 50);
  assert.equal(entry.x, entry.renderX);
  assert.equal(entry.y, entry.renderY);
});

test("normal walking stays in the snapshot buffer without repeated snapping", () => {
  const entry = {
    snapshots: [],
    renderX: 0,
    renderY: 0,
    renderTime: 1000,
    initialized: true,
    state: "exploring",
    facing: "right",
    locomotion: { state: "walk", facing: "right", time: 0 },
    snapCount: 0,
  };
  Multiplayer.appendRemoteSnapshot(entry, { x: 0, y: 0, facing: "right", state: "exploring", sampledAt: 1000, updatedAt: 5000 }, 1000);
  Multiplayer.appendRemoteSnapshot(entry, { x: 12, y: 0, facing: "right", state: "exploring", moving: true, sampledAt: 1125, updatedAt: 5001 }, 1125);
  Multiplayer.appendRemoteSnapshot(entry, { x: 24, y: 0, facing: "right", state: "exploring", moving: true, sampledAt: 1250, updatedAt: 5002 }, 1250);
  Multiplayer.interpolateRemotePlayer(entry, .125);
  assert.equal(entry.renderX, 12);
  assert.equal(entry.snapCount, 0);
  assert.notEqual(entry.lastSnapReason, "discontinuity");
});

test("steady leftward snapshots render monotonically without reversing", () => {
  const entry = {
    snapshots: [],
    renderX: 500,
    renderY: 80,
    renderTime: 1000,
    initialized: true,
    state: "exploring",
    facing: "left",
    locomotion: { state: "walk", facing: "left", time: 0 },
  };
  Multiplayer.appendRemoteSnapshot(entry, { x: 500, y: 80, facing: "left", state: "exploring", sampledAt: 1000, updatedAt: 5000 }, 1000);
  Multiplayer.appendRemoteSnapshot(entry, { x: 480, y: 80, facing: "left", state: "exploring", moving: true, sampledAt: 1100, updatedAt: 5001 }, 1100);
  Multiplayer.appendRemoteSnapshot(entry, { x: 460, y: 80, facing: "left", state: "exploring", moving: true, sampledAt: 1200, updatedAt: 5002 }, 1200);
  Multiplayer.appendRemoteSnapshot(entry, { x: 440, y: 80, facing: "left", state: "exploring", moving: true, sampledAt: 1300, updatedAt: 5003 }, 1300);

  const rendered = [];
  for (let index = 0; index < 20; index += 1) {
    Multiplayer.interpolateRemotePlayer(entry, .05);
    rendered.push(entry.renderX);
  }

  for (let index = 1; index < rendered.length; index += 1) {
    assert.ok(rendered[index] <= rendered[index - 1] + 1e-9, `render reversed at sample ${index}`);
  }
  assert.ok(rendered.some((x) => x < 500));
});

test("large discontinuities reset the buffer and snap once", () => {
  const entry = { snapshots: [], renderX: 0, renderY: 0, initialized: true, state: "exploring", snapCount: 0 };
  Multiplayer.appendRemoteSnapshot(entry, { x: 0, y: 0, facing: "down", state: "exploring", updatedAt: 1 }, 1000);
  const result = Multiplayer.appendRemoteSnapshot(entry, { x: 1000, y: 0, facing: "down", state: "exploring", updatedAt: 2 }, 1125);
  assert.equal(result.discontinuity, true);
  assert.equal(entry.snapCount, 1);
  Multiplayer.interpolateRemotePlayer(entry, 0);
  assert.equal(entry.renderX, 1000);
});

test("remote interpolation uses sender sample time, sequence ordering, and no extrapolation", () => {
  const entry = { snapshots: [], renderX: 0, renderY: 0, initialized: false };
  Multiplayer.appendRemoteSnapshot(entry, { x: 0, y: 0, facing: "right", state: "exploring", seq: 1, moving: true, sampledAt: 1000, updatedAt: 9000 }, 1000);
  Multiplayer.appendRemoteSnapshot(entry, { x: 100, y: 0, facing: "right", state: "exploring", seq: 2, moving: true, sampledAt: 1100, updatedAt: 9001 }, 1100);
  assert.deepEqual(entry.snapshots.map((snapshot) => snapshot.time), [1000, 1100]);
  assert.equal(Multiplayer.appendRemoteSnapshot(entry, { x: 20, y: 0, facing: "right", state: "exploring", seq: 1, moving: true, sampledAt: 1050, updatedAt: 9002 }, 1050).stale, true);
  Multiplayer.interpolateRemotePlayer(entry, 0, undefined, { now: 1700 });
  assert.equal(entry.renderX, 100);
  assert.equal(entry.lastRenderSample.extrapolated, false);
});

test("battle state updates immediately and returning to exploration removes it", async () => {
  const mock = createMockMultiplayer();
  await mock.client.start({
    uid: "USER_A",
    getPlayer: () => ({ mapId: "world", name: "A", classId: "warrior", x: 10, y: 20, facing: "down" }),
  });
  const base = { uid: "USER_B", name: "B", classId: "fighter", x: 120, y: 220, facing: "left", updatedAt: 2 };
  mock.emitMap({ USER_B: { ...base, state: "exploring" } });
  assert.equal(mock.client.getRenderPlayers("world")[0].state, "exploring");
  mock.emitMap({ USER_B: { ...base, state: "battle", updatedAt: 3 } });
  const battleRemote = mock.client.getRenderPlayers("world")[0];
  assert.equal(battleRemote.state, "battle");
  assert.equal(battleRemote.x, 120);
  assert.equal(battleRemote.snapshots.length, 1);
  mock.emitMap({ USER_B: { ...base, state: "exploring", updatedAt: 4 } });
  const exploringRemote = mock.client.getRenderPlayers("world")[0];
  assert.equal(exploringRemote.state, "exploring");
  assert.equal(exploringRemote.snapshots.length, 1);
});

test("out-of-order remote snapshots are ignored without deleting the last accepted entity", async () => {
  const mock = createMockMultiplayer();
  await mock.client.start({
    uid: "USER_A",
    getPlayer: () => ({ mapId: "world", name: "A", classId: "warrior", x: 10, y: 20, facing: "down" }),
  });
  mock.emitMap({ USER_B: { uid: "USER_B", name: "B", classId: "fighter", x: 100, y: 200, state: "exploring", updatedAt: 20 } });
  mock.emitMap({ USER_B: { uid: "USER_B", name: "B", classId: "fighter", x: 10, y: 20, state: "exploring", updatedAt: 10 } });
  const [remote] = mock.client.getRenderPlayers("world");
  assert.equal(remote.x, 100);
  assert.equal(remote.y, 200);
  assert.equal(remote.snapshots.length, 1);
});

test("map changes replace the old listener and keep the new listener live", async () => {
  const mock = createMockMultiplayer();
  await mock.client.start({
    uid: "USER_A",
    getPlayer: () => ({ mapId: "world", name: "A", classId: "warrior", x: 10, y: 20, facing: "down" }),
  });
  await mock.client.setMap("field");
  assert.ok(mock.mapUnsubscribeCount >= 1);
  mock.emitMap({ USER_B: { uid: "USER_B", name: "B", classId: "fighter", x: 1, y: 2, state: "exploring", updatedAt: 5 } });
  assert.equal(mock.client.getRenderPlayers("field")[0].uid, "USER_B");
  assert.deepEqual(mock.client.getRenderPlayers("world"), []);
});

test("remote render path uses the graphical crossed-swords asset and shared render position", () => {
  const root = path.resolve(__dirname, "..");
  const gameSource = fs.readFileSync(path.join(root, "game.js"), "utf8");
  const artSource = fs.readFileSync(path.join(root, "character-art.js"), "utf8");
  assert.equal(fs.existsSync(path.join(root, "assets", "ui", "battle-state-crossed-swords-v1.png")), true);
  assert.match(gameSource, /remote\.state === "battle"/);
  assert.match(gameSource, /Art\.drawBattleStateIcon/);
  assert.match(gameSource, /x: stableCenterX/);
  assert.match(gameSource, /y: nameY - 8 \* scale/);
  assert.match(artSource, /battleState: \{ src: "assets\/ui\/battle-state-crossed-swords-v1\.png"/);
});
