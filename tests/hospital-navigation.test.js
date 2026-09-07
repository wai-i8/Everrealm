const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const Core = require("../rpg-core.js");
const Navigation = require("../map/hospital-navigation.js");
const Maps = require("../map/map-registry.js").createMapRegistry();

function readPngDimensions(filePath) {
  const input = fs.readFileSync(filePath);
  assert.deepEqual([...input.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return { width: input.readUInt32BE(16), height: input.readUInt32BE(20) };
}

function pathTo(map, goal) {
  return Core.findOverworldPath(map.start, goal, {
    bounds: { x: 0, y: 0, w: map.pixelWidth, h: map.pixelHeight },
    cellSize: 12,
    radius: map.navigation.feetRadiusPx,
    directions: 8,
    maxVisited: 14000,
    nearestReachable: true,
    isWalkable: (point) => map.navigation.isPositionWalkable(point, { radius: map.navigation.feetRadiusPx }),
  });
}

test("Hospital source images preserve the supplied 1672x941 coordinate space", () => {
  const art = path.join(root, "assets", "hospital", "hospital.png");
  const authoring = path.join(root, "assets", "hospital", "hospital_walkable.png");
  assert.deepEqual(readPngDimensions(art), { width: 1672, height: 941 });
  assert.deepEqual(readPngDimensions(authoring), { width: 1672, height: 941 });
  assert.equal(fs.readFileSync(art).length > 0, true);
  assert.equal(fs.readFileSync(authoring).length > 0, true);
});

test("generated Hospital runtime data is synchronous, exact, and hash-locked to authoring", () => {
  const authoring = fs.readFileSync(path.join(root, "assets", "hospital", "hospital_walkable.png"));
  assert.equal(Navigation.ready, true);
  assert.equal(Navigation.data.source.width, 1672);
  assert.equal(Navigation.data.source.height, 941);
  assert.equal(Navigation.data.source.sha256, crypto.createHash("sha256").update(authoring).digest("hex"));
  assert.equal(Navigation.runtime.width, 1672);
  assert.equal(Navigation.runtime.height, 941);
  assert.deepEqual(Object.fromEntries(Object.entries(Navigation.runtime.masks).map(([name, mask]) => [name, mask.length])), {
    white: 1672 * 941,
    magenta: 1672 * 941,
    cyan: 1672 * 941,
  });
  assert.equal(Navigation.runtime.masks.white.reduce((sum, value) => sum + value, 0), 310805);
  assert.equal(Navigation.runtime.masks.magenta.reduce((sum, value) => sum + value, 0), 7068);
  assert.equal(Navigation.runtime.masks.cyan.reduce((sum, value) => sum + value, 0), 9853);
  assert.match(fs.readFileSync(path.join(root, "map", "hospital-navigation.generated.js"), "utf8"), /DO NOT EDIT MANUALLY/);
});

test("authored white and cyan regions control feet-disk walkability", () => {
  for (const point of [{ x: 600, y: 400 }, { x: 1100, y: 500 }, { x: 1200, y: 500 }, { x: 837, y: 780 }]) {
    assert.equal(Navigation.isPositionWalkable(point, { radius: 3 }), true, `${point.x},${point.y} should be authored walkable`);
  }
  assert.equal(Navigation.isPositionWalkable({ x: 837, y: 833 }, { radius: 3 }), true, "cyan exit must be enterable");
  assert.equal(Navigation.isInRegion("exit", { x: 837, y: 833, radius: 3 }), true);
  assert.equal(Navigation.isInRegion("exit", { x: 837, y: 780, radius: 3 }), false);
});

test("non-white Hospital furniture, wall, outside and nurse occupancy remain blocked", () => {
  for (const point of [{ x: 250, y: 350 }, { x: 1400, y: 350 }, { x: 100, y: 300 }, { x: 837, y: 310 }, { x: 20, y: 20 }, { x: 1600, y: 900 }]) {
    assert.equal(Navigation.isPositionWalkable(point, { radius: 3 }), false, `${point.x},${point.y} should be blocked`);
  }
  assert.equal(Navigation.isRegionAt("npc", { x: 829, y: 200 }), true);
  assert.equal(Navigation.isPositionWalkable({ x: 829, y: 200 }, { radius: 3 }), false);
  assert.equal(Navigation.isRegionAt("npc", { x: 600, y: 400 }), false);
});

test("Clinic reuses the existing nurse and owns the exact flattened-map navigation", () => {
  const clinic = Maps.clinic;
  assert.equal(clinic.art.master, "assets/hospital/hospital.png");
  assert.equal(clinic.art.authoring, "assets/hospital/hospital_walkable.png");
  assert.deepEqual([clinic.pixelWidth, clinic.pixelHeight], [1672, 941]);
  assert.equal(clinic.navigation.authoritative, true);
  assert.equal(clinic.navigation.generatedRuntime, "map/hospital-navigation.generated.js");
  assert.equal(clinic.navigation.status().ready, true);
  assert.equal(clinic.npcs.filter((npc) => npc.id === "clinic-healer-siu-moon").length, 1);
  const nurse = clinic.npcs[0];
  assert.equal(nurse.id, "clinic-healer-siu-moon");
  assert.equal(nurse.actor, "healer");
  assert.deepEqual(nurse.services, ["clinic-healing"]);
  assert.equal(nurse.x, 829);
  assert.equal(nurse.y + 13, 266, "nurse feet use the existing shared NPC draw baseline");
  assert.equal(clinic.exits.length, 1);
  assert.equal(clinic.exits[0].id, "clinic-to-world");
  assert.equal(clinic.exits[0].navigationRegion, "exit");
  assert.deepEqual(clinic.start, { x: 837, y: 780 });
  assert.equal(clinic.navigation.isPositionWalkable(clinic.start, { radius: 3 }), true);
  assert.equal(clinic.navigation.isInRegion("exit", { ...clinic.start, radius: 3 }), false);
  assert.deepEqual(clinic.furniture.map((item) => item.zone).sort(), ["medical-storage", "medical-storage", "reception", "treatment", "treatment", "treatment", "waiting", "waiting"]);
  assert.ok(clinic.furniture.every((item) => item.render === false && item.solid === false));
  assert.ok(clinic.decorations.every((item) => item.render === false));
});

test("authored magenta click maps to the existing nurse and pathfinding uses the same resolver", () => {
  const clinic = Maps.clinic;
  assert.equal(clinic.navigation.interactionAtWorldPoint({ x: 829, y: 200 }), "clinic-healer-siu-moon");
  assert.equal(clinic.navigation.interactionAtWorldPoint({ x: 600, y: 400 }), null);
  const nursePath = pathTo(clinic, clinic.spawnPoints.healer);
  const exitPath = pathTo(clinic, clinic.spawnPoints.exit);
  const blockedFurniturePath = pathTo(clinic, { x: 837, y: 310 });
  assert.deepEqual(nursePath.at(-1), clinic.spawnPoints.healer);
  assert.deepEqual(exitPath.at(-1), clinic.spawnPoints.exit);
  assert.deepEqual(blockedFurniturePath.at(-1), { x: 837, y: 360 });
  assert.ok(nursePath.length > 0);
  assert.ok(exitPath.length > 0);
});

test("missing or malformed Hospital navigation fails closed", () => {
  const missing = Navigation.createResolver(null);
  assert.equal(missing.ready, false);
  assert.equal(missing.isPositionWalkable({ x: 600, y: 400 }, { radius: 3 }), false);
  const malformed = Navigation.createResolver({ package: Navigation.data, width: 1, height: 1, masks: {} });
  assert.equal(malformed.ready, false);
  assert.equal(malformed.isPositionWalkable({ x: 600, y: 400 }, { radius: 3 }), false);
});

test("Hospital prototype does not use browser PNG scanning or migrate other interiors", () => {
  const generator = fs.readFileSync(path.join(root, "tools", "generate-hospital-navigation.js"), "utf8");
  const resolver = fs.readFileSync(path.join(root, "map", "hospital-navigation.js"), "utf8");
  const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
  const art = fs.readFileSync(path.join(root, "character-art.js"), "utf8");
  assert.doesNotMatch(generator, /getImageData|OffscreenCanvas|fetch\s*\(/);
  assert.doesNotMatch(resolver, /getImageData|OffscreenCanvas|fetch\s*\(|new Image/);
  assert.doesNotMatch(game, /hospital_walkable\.png/);
  assert.doesNotMatch(art, /hospital_walkable\.png/);
  assert.match(game, /world\.navigation\?\.authoritative/);
  assert.match(game, /navigationRegion/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, "docs", "MAP_SYSTEM.md"), "utf8"), /hospital-navigation-prototype/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, "docs", "maps", "CLINIC.md"), "utf8"), /hospital-navigation-prototype/);
});
