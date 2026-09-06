const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const Registry = require("../map/map-registry.js");
const Transitions = require("../map/map-transitions.js");
const game = fs.readFileSync(path.resolve(__dirname, "..", "game.js"), "utf8");

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
    "world-to-field": Transitions.TRANSITION_TYPES.PHYSICAL_GATE,
    "field-to-world": Transitions.TRANSITION_TYPES.PHYSICAL_GATE,
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

test("bitmap doorway anchors resolve to the visible physical doors", () => {
  const maps = Registry.createMapRegistry();
  for (const [houseId, portalId] of [["forge", "world-to-shop"], ["clinic", "world-to-clinic"], ["general-store", "world-to-general-store"], ["tea-house", "world-to-inn"]]) {
    const house = maps.world.houses.find((candidate) => candidate.id === houseId);
    const portal = maps.world.exits.find((candidate) => candidate.id === portalId);
    const settings = Transitions.houseSpriteSettings(house);
    const expected = {
      x: settings.x + settings.width * (house.doorAnchor.x - settings.anchorX),
      y: settings.y - settings.height * settings.anchorY + settings.height * house.doorAnchor.y,
    };
    assert.deepEqual({ x: portal.x, y: portal.y }, expected);
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
