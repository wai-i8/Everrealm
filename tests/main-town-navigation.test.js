const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const Core = require(path.join(root, "rpg-core.js"));
const Navigation = require(path.join(root, "map", "main-town-navigation.js"));
const gameSource = fs.readFileSync(path.join(root, "game.js"), "utf8");
const artSource = fs.readFileSync(path.join(root, "character-art.js"), "utf8");

const feet = { radius: Navigation.feetRadiusPx };
const walkable = (point, radius = feet.radius) => Navigation.isWorldPositionWalkable("world", point, { radius });

function pathOptions(nearestReachable = false) {
  return {
    bounds: { x: 0, y: 0, w: Navigation.data.source.width, h: Navigation.data.source.height },
    cellSize: Math.max(12, feet.radius * 4),
    radius: feet.radius,
    directions: 8,
    maxVisited: 14000,
    nearestReachable,
    isWalkable: (point) => walkable(point),
  };
}

test("canonical package generates a deterministic runtime artifact", () => {
  const generator = path.join(root, "tools", "generate-main-town-navigation.js");
  const result = childProcess.execFileSync(process.execPath, [generator, "--check"], { cwd: root, encoding: "utf8" });
  assert.match(result, /Checked map[\\/]main-town-navigation\.generated\.js/);
  assert.match(fs.readFileSync(path.join(root, "map", "main-town-navigation.generated.js"), "utf8"), /DO NOT EDIT MANUALLY/);
});

test("generated runtime preserves the canonical dimensions and synchronous mask data", () => {
  assert.equal(Navigation.ready, true);
  assert.equal(Navigation.data.source.width, 1536);
  assert.equal(Navigation.data.source.height, 1152);
  assert.equal(Navigation.runtime.masks.walkable.length, 1536 * 1152);
  assert.equal(Navigation.runtime.masks.collision.length, 1536 * 1152);
  assert.equal(Navigation.runtime.masks.triggers.length, 1536 * 1152);
  assert.equal(Navigation.status().failure, null);
});

test("Main Town resolver blocks all solid service buildings and unknown ground", () => {
  const blocked = {
    weaponShop: [378, 300],
    guild: [687, 250],
    hospital: [1016, 330],
    itemStore: [378, 680],
    inn: [1004, 680],
    grass: [100, 100],
    scenery: [1400, 1100],
  };
  for (const [name, [x, y]] of Object.entries(blocked)) assert.equal(walkable({ x, y }), false, `${name} should be blocked`);
  assert.equal(walkable({ x: -1, y: 300 }), false);
  assert.equal(walkable({ x: 1536, y: 300 }), false);
  assert.equal(walkable({ x: 687, y: 698 }), true, "central plaza should be walkable");
  assert.equal(walkable({ x: 260, y: 520 }), true, "cream paving should be walkable");
  assert.equal(walkable({ x: 687, y: 420 }), true, "grey diamond paving should be walkable");
  assert.equal(walkable({ x: 687, y: 740 }), true, "normal town paving should be walkable");
});

test("door approaches and East Exit remain separate, authored trigger data", () => {
  for (const [name, [x, y]] of Object.entries({
    weapon: [358, 430],
    guild: [665, 353],
    hospital: [996, 433],
    item: [358, 769],
    inn: [984, 772],
  })) {
    assert.equal(walkable({ x, y }), true, `${name} door approach should be walkable`);
  }
  assert.equal(walkable({ x: 1180, y: 518 }), true, "East approach should be walkable");
  assert.equal(walkable({ x: 1200, y: 518 }), false, "scenery beside the East approach should be blocked");
  assert.notEqual(Navigation.triggerValueAt(1180, 518), 0, "East trigger data should remain separate from walkability");
  assert.equal(walkable({ x: 1016, y: 400 }), false, "walking beside the Hospital door must not enter the building");
});

test("shared pathfinder rejects blocked targets and keeps nearest routes on authored ground", () => {
  const start = { x: 687, y: 698 };
  const hospital = { x: 1016, y: 330 };
  assert.deepEqual(Core.findOverworldPath(start, hospital, pathOptions(false)), []);
  const route = Core.findOverworldPath(start, hospital, pathOptions(true));
  assert.ok(route.length > 0);
  assert.notDeepEqual(route.at(-1), hospital);
  assert.ok(route.every((point) => walkable(point)), JSON.stringify(route));
  assert.ok(Core.distance(route.at(-1), hospital) < Core.distance(start, hospital));
  assert.deepEqual(Core.findOverworldPath(start, { x: 100, y: 100 }, pathOptions(false)), []);
});

test("shared pathfinder reaches every authored Main Town approach and the East exit", () => {
  const start = { x: 687, y: 698 };
  for (const [name, [x, y]] of Object.entries({
    weapon: [358, 430],
    guild: [665, 353],
    hospital: [996, 433],
    item: [358, 769],
    inn: [984, 772],
    east: [1180, 518],
  })) {
    const route = Core.findOverworldPath(start, { x, y }, pathOptions(false));
    assert.ok(route.length > 0, `${name} approach should have a path`);
    assert.deepEqual(route.at(-1), { x, y }, `${name} approach should be the route endpoint`);
    assert.ok(route.every((point) => walkable(point)), `${name} route left the authored allowlist`);
  }
});

test("actual collision substeps cannot enter Hospital but can traverse paving", () => {
  const entity = { x: 1016, y: 500, radius: 12 };
  const steps = 60;
  for (let index = 0; index < steps; index += 1) {
    const result = Core.moveWithCollision(entity, 0, -4, (candidate) => !walkable(candidate));
    entity.x = result.x;
    entity.y = result.y;
  }
  assert.equal(walkable(entity), true);
  assert.ok(entity.y > 430, `feet should stop outside the Hospital, got ${entity.y}`);
  const plaza = { x: 687, y: 698, radius: 12 };
  const result = Core.moveWithCollision(plaza, 40, 0, (candidate) => !walkable(candidate));
  assert.ok(result.x > plaza.x, "legal paving movement should advance");
});

test("missing, malformed, or invalid generated navigation always fails closed", () => {
  for (const candidate of [null, {}, {
    package: { source: { width: 1, height: 1 }, connectivity: { feet_radius_px: 3 } },
    width: 1536,
    height: 1152,
    masks: { walkable: new Uint8Array(1), collision: new Uint8Array(1), triggers: new Uint8Array(1) },
  }]) {
    const resolver = Navigation.createResolver(candidate);
    assert.equal(resolver.ready, false);
    assert.equal(resolver.isWorldPositionWalkable("world", { x: 687, y: 698 }, feet), false);
    assert.equal(resolver.status().failed, true);
  }
});

test("Main Town collision does not retain the old image scanner or fail-open fallback", () => {
  assert.match(gameSource, /MainTownNavigation\.isWorldPositionWalkable/);
  assert.doesNotMatch(gameSource, /Art\.mainTownNavigationMask/);
  assert.doesNotMatch(artSource, /scanNavigationMask|mainTownNavigationMask|mainTownWalkableMask|mainTownCollisionMask|mainTownTriggerMask/);
  assert.doesNotMatch(gameSource, /if \(walkable !== null && collision !== null\)/);
});
