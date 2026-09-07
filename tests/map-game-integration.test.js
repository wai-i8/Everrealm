const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const Registry = require("../map/map-registry.js");
const Transitions = require("../map/map-transitions.js");
const MainTownNavigation = require("../map/main-town-navigation.js");
const game = fs.readFileSync(path.resolve(__dirname, "..", "game.js"), "utf8");

test("final main-town navigation package is complete and hash-locked", () => {
  const root = path.resolve(__dirname, "..");
  const packagePath = path.join(root, "assets", "main-town", "main-town-navigation.json");
  const packageData = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  assert.deepEqual(packageData.source, MainTownNavigation.data.source);
  for (const filename of ["main-town-final.png", "main-town-walkable-mask.png", "main-town-collision-mask.png", "main-town-trigger-mask.png", "main-town-navigation-review.png"]) {
    const filePath = path.join(root, "assets", "main-town", filename);
    assert.equal(fs.existsSync(filePath), true, `${filename} should be present in the authored package`);
  }
  const masterArt = fs.readFileSync(path.join(root, "assets", "main-town", "main-town-final.png"));
  assert.equal(crypto.createHash("sha256").update(masterArt).digest("hex"), packageData.source.sha256);
  assert.deepEqual(packageData.qa.all_image_dimensions, [packageData.source.width, packageData.source.height]);
  assert.equal(packageData.qa.six_destinations_reachable, true);
});

test("map registry exposes every current map without game-side construction", () => {
  const maps = Registry.createMapRegistry();
  assert.deepEqual(Object.keys(maps).sort(), ["clinic", "dungeon", "field", "general-store", "guild", "inn", "shop", "world"]);
  for (const id of Object.keys(maps)) assert.equal(maps[id].id, id);
  assert.match(game, /MapRegistry\.createMapRegistry\(\)/);
  assert.doesNotMatch(game, /World\.createWorld\(\)|ExpansionWorld\.createExpansionMaps\(\)/);
});

test("transition linker preserves the authored physical route graph", () => {
  const maps = Registry.createMapRegistry();
  const expected = [
    ["world", "world-to-field", "field"], ["field", "field-to-world", "world"],
    ["field", "field-to-dungeon", "dungeon"], ["dungeon", "dungeon-to-field", "field"],
    ["world", "world-to-guild", "guild"], ["guild", "guild-to-world", "world"],
    ["world", "world-to-shop", "shop"], ["shop", "shop-to-world", "world"],
    ["world", "world-to-clinic", "clinic"], ["clinic", "clinic-to-world", "world"],
    ["world", "world-to-general-store", "general-store"], ["general-store", "general-store-to-world", "world"],
    ["world", "world-to-inn", "inn"], ["inn", "inn-to-world", "world"],
  ];
  const expectedTypes = {
    "world-to-field": Transitions.TRANSITION_TYPES.PHYSICAL_PASSAGE,
    "field-to-world": Transitions.TRANSITION_TYPES.PHYSICAL_PASSAGE,
    "field-to-dungeon": Transitions.TRANSITION_TYPES.PHYSICAL_PASSAGE,
    "dungeon-to-field": Transitions.TRANSITION_TYPES.PHYSICAL_PASSAGE,
  };
  for (const [sourceId, transitionId, targetId] of expected) {
    const transition = maps[sourceId].exits.find((entry) => entry.id === transitionId);
    assert.ok(transition, `${transitionId} should exist`);
    assert.equal(transition.targetMap, targetId);
    assert.equal(transition.transitionType, expectedTypes[transitionId] || Transitions.TRANSITION_TYPES.PHYSICAL_DOOR);
    assert.equal(Transitions.isPhysicalTransition(transition), true);
    assert.equal(Transitions.isMagicalTeleport(transition), false);
    assert.ok(Transitions.resolveDestination(maps, transition));
  }
  assert.equal(maps.world.portals, maps.world.exits);
});

test("authored bitmap doorway triggers resolve to physical doors", () => {
  const maps = Registry.createMapRegistry();
  const expectedTriggers = new Map(MainTownNavigation.data.building_triggers.map((entry) => [entry.name, entry]));
  for (const [houseId, portalId, triggerName] of [
    ["keeper-house", "world-to-guild", "Guild"],
    ["forge", "world-to-shop", "Weapon Shop"],
    ["clinic", "world-to-clinic", "Hospital / Clinic"],
    ["general-store", "world-to-general-store", "Item / General Store"],
    ["tea-house", "world-to-inn", "Inn"],
  ]) {
    const house = maps.world.houses.find((candidate) => candidate.id === houseId);
    const portal = maps.world.exits.find((candidate) => candidate.id === portalId);
    const authored = expectedTriggers.get(triggerName);
    const expectedRect = { shape: "rect", x: authored.rectangle.x, y: authored.rectangle.y, w: authored.rectangle.width, h: authored.rectangle.height };
    const expectedThreshold = { ...expectedRect, outward: "south" };
    assert.equal(house.masterArt, true);
    assert.equal(house.render, false);
    assert.deepEqual(house.doorway.trigger, expectedRect);
    assert.deepEqual(portal.entrance.trigger, expectedRect);
    assert.deepEqual(portal.entrance.threshold, expectedThreshold);
    assert.deepEqual(portal.entrance.approachPoint, { x: authored.rectangle.x, y: MainTownNavigation.data.connectivity.results[triggerName].example_anchor[1] });
    assert.deepEqual({ x: portal.x, y: portal.y }, { x: authored.doorway_center_x, y: authored.rectangle.y + authored.rectangle.height / 2 });
    const link = maps.world.transitionLinks.find((candidate) => candidate.portalId === portal.id);
    assert.ok(link?.returnSpawn, `${portal.id} should declare an exterior return spawn`);
    assert.deepEqual(portal.returnPosition, maps.world.spawnPoints[link.returnSpawn]);
    const returnExit = maps[portal.targetMap].exits.find((candidate) => candidate.sourceTransitionId === portal.id);
    assert.ok(returnExit, `${portal.id} should link an interior return exit`);
    assert.deepEqual(returnExit.targetPosition, maps.world.spawnPoints[link.returnSpawn]);
    assert.equal(returnExit.targetFacing, link.returnFacing);
  }
  assert.doesNotMatch(game, /syncHouseDoorAnchor|function townDoor|useTownDoor|overworld\.portals =|doorAction/);
  assert.doesNotMatch(game, /door\.y\s*\+\s*34/);
  assert.doesNotMatch(fs.readFileSync(path.resolve(__dirname, "..", "map", "map-transitions.js"), "utf8"), /door\.y\s*\+\s*34/);
});

test("legacy portal objects have explicit physical or magical semantics", () => {
  const maps = Registry.createMapRegistry();
  const physicalTypes = new Set(Object.values(Transitions.TRANSITION_TYPES).filter((type) => type !== Transitions.TRANSITION_TYPES.MAGIC_TELEPORT));
  for (const map of Object.values(maps)) {
    for (const exit of map.exits) assert.ok(physicalTypes.has(exit.transitionType), `${map.id}.${exit.id} needs an explicit physical type`);
  }
  const magic = { kind: "portal", transitionType: Transitions.TRANSITION_TYPES.MAGIC_TELEPORT };
  assert.equal(Transitions.isMagicalTeleport(magic), true);
  assert.equal(Transitions.isPhysicalTransition(magic), false);
});

test("field keeps the authored forest-road topology and mine remains cave context", () => {
  const maps = Registry.createMapRegistry();
  assert.equal(maps.field.routeLayout.style, "east-then-north");
  assert.equal(maps.field.forestLayout.style, "solid-tree-mass");
  assert.equal(maps.field.biome, "mountain");
  assert.equal(maps.dungeon.biome, "cave");
  assert.equal(maps.dungeon.rooms.length, 7);
});

test("game resolves portal arrivals through the shared transition layer", () => {
  assert.match(game, /MapTransitions\.resolveArrival\(maps, portal\)/);
  assert.doesNotMatch(game, /targetWorld\?\.spawnPoints/);
});
