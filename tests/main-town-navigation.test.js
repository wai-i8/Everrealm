const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const Core = require(path.join(root, "rpg-core.js"));
const Navigation = require(path.join(root, "map", "main-town-navigation.js"));
const MainTown = require(path.join(root, "maps", "main-town.js"));
const gameSource = fs.readFileSync(path.join(root, "game.js"), "utf8");
const artSource = fs.readFileSync(path.join(root, "character-art.js"), "utf8");
const packageData = JSON.parse(fs.readFileSync(path.join(root, "assets", "main-town", "main-town-navigation.json"), "utf8"));
const world = MainTown.createWorld();

const feet = { radius: Navigation.feetRadiusPx };
const walkable = (point, radius = feet.radius) => Navigation.isWorldPositionWalkable("world", point, { radius });

function pathOptions(nearestReachable = false) {
  return {
    bounds: { x: 0, y: 0, w: Navigation.data.source.width, h: Navigation.data.source.height },
    cellSize: 12,
    sampleStep: 1,
    radius: feet.radius,
    directions: 4,
    maxVisited: 30000,
    nearestReachable,
    isWalkable: (point) => walkable(point),
  };
}

function centre(rect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

test("canonical JPG package generates a deterministic synchronous runtime artifact", () => {
  const generator = path.join(root, "tools", "generate-main-town-navigation.js");
  const result = childProcess.execFileSync(process.execPath, [generator, "--check"], { cwd: root, encoding: "utf8" });
  assert.match(result, /Checked map[\\/]main-town-navigation\.generated\.js/);
  assert.match(fs.readFileSync(path.join(root, "map", "main-town-navigation.generated.js"), "utf8"), /DO NOT EDIT MANUALLY/);
});

test("Main Town uses the supplied 7680x4320 display and authoring coordinate space", () => {
  assert.deepEqual(packageData.source, Navigation.data.source);
  assert.equal(packageData.source.filename, "maintown.jpg");
  assert.equal(packageData.authoring.image, "assets/main-town/maintown_walkable.jpg");
  assert.deepEqual([packageData.source.width, packageData.source.height], [7680, 4320]);
  assert.deepEqual([packageData.authoring.width, packageData.authoring.height], [7680, 4320]);
  assert.deepEqual(world.art.sourceDimensions, { width: 7680, height: 4320 });
  assert.equal(world.art.background, "assets/main-town/maintown.jpg");
  assert.equal(world.art.authoring, "assets/main-town/maintown_walkable.jpg");
  assert.equal(Navigation.ready, true);
  assert.equal(Navigation.runtime.masks.walkable.length, 7680 * 4320);
  assert.equal(Navigation.runtime.masks.collision.length, 7680 * 4320);
  assert.equal(Navigation.runtime.masks.triggers.length, 7680 * 4320);
  assert.equal(Navigation.status().failure, null);
});

test("authoring colours have explicit Main Town semantics", () => {
  assert.deepEqual(packageData.authoring.colors, { white: [255, 255, 255], cyan: [0, 255, 255], pink: [255, 0, 255] });
  assert.match(packageData.movement_rule, /Every other pixel is blocked/);
  assert.equal(packageData.building_triggers.length, 5);
  assert.equal(packageData.deck_interaction.region_id, "deck-configuration");
  assert.equal(packageData.deck_interaction.region_value, 7);
  assert.equal(Navigation.triggerValueAt(world.spawnPoints.shopFront.x, world.spawnPoints.shopFront.y), 0);
  assert.equal(Navigation.interactionAtWorldPoint({ x: packageData.deck_interaction.x + packageData.deck_interaction.width / 2, y: packageData.deck_interaction.y + packageData.deck_interaction.height / 2 }), "harbour-gate-deck-console");
});

test("fixed cyan mapping is preserved without old coordinate inference", () => {
  assert.deepEqual(packageData.building_triggers.map((entry) => entry.name), ["Weapon Shop", "Guild", "Hospital / Clinic", "Item / General Store", "Inn"]);
  assert.deepEqual(world.transitionLinks.map((entry) => [entry.portalId, entry.targetMap]), [
    ["world-to-guild", "guild"], ["world-to-shop", "shop"], ["world-to-inn", "inn"], ["world-to-clinic", "clinic"], ["world-to-general-store", "general-store"],
  ]);
  assert.equal(world.exits.find((entry) => entry.id === "world-to-field").targetMap, "field");
  for (const entry of packageData.building_triggers) {
    const rect = { x: entry.rectangle.x, y: entry.rectangle.y, w: entry.rectangle.width, h: entry.rectangle.height };
    assert.equal(Navigation.triggerValueAt(entry.rectangle.x + Math.floor(entry.rectangle.width / 2), entry.rectangle.y + Math.floor(entry.rectangle.height / 2)), entry.region_value);
    assert.equal(walkable(centre(rect)), true);
  }
  const eastCentre = centre({ x: packageData.east_exit.x, y: packageData.east_exit.y, w: packageData.east_exit.width, h: packageData.east_exit.height });
  assert.equal(Navigation.triggerValueAt(eastCentre.x, eastCentre.y), 6);
  const deckCentre = { x: packageData.deck_interaction.x + packageData.deck_interaction.width / 2, y: packageData.deck_interaction.y + packageData.deck_interaction.height / 2 };
  assert.equal(Navigation.triggerValueAt(deckCentre.x, deckCentre.y), 7);
});

test("Main Town is fail-closed and blocks unmarked scenery", () => {
  for (const point of [{ x: 20, y: 20 }, { x: 7600, y: 200 }, { x: 7000, y: 4000 }, { x: -1, y: 200 }, { x: 7680, y: 200 }]) {
    assert.equal(walkable(point), false, `unmarked point ${JSON.stringify(point)} should be blocked`);
  }
  assert.equal(walkable(world.start), true);
  for (const anchor of Object.values(world.spawnPoints)) assert.equal(walkable(anchor), true, `spawn ${JSON.stringify(anchor)} should be walkable`);
  for (const candidate of [null, {}, {
    package: { source: { width: 1, height: 1 }, connectivity: { feet_radius_px: 3 } },
    width: 7680,
    height: 4320,
    masks: { walkable: new Uint8Array(1), collision: new Uint8Array(1), triggers: new Uint8Array(1) },
  }]) {
    const resolver = Navigation.createResolver(candidate);
    assert.equal(resolver.ready, false);
    assert.equal(resolver.isWorldPositionWalkable("world", world.start, feet), false);
    assert.equal(resolver.status().failed, true);
  }
});

test("shared pathfinder reaches all five doors, East Exit, and the deck region", () => {
  for (const [name, point] of Object.entries(world.spawnPoints)) {
    if (name === "start") continue;
    const route = Core.findOverworldPath(world.start, point, pathOptions(false));
    assert.ok(route.length > 0, `${name} should be reachable from the central seed`);
    assert.deepEqual(route.at(-1), point);
    assert.ok(route.every((candidate) => walkable(candidate)), `${name} route left the compiled allowlist`);
  }
  const deck = world.boards[0];
  const deckRoute = Core.findOverworldPath(world.start, deck.approachPoint, pathOptions(false));
  assert.ok(deckRoute.length > 0, "the pink deck region should be reachable");
  assert.ok(deckRoute.every((candidate) => walkable(candidate)), "deck route left the compiled allowlist");
  assert.ok(Navigation.isInRegion("deck-configuration", deck), "deck entity must be backed by the pink region");
  assert.equal(Navigation.interactionAtWorldPoint({ x: deck.x, y: deck.y }), deck.id, "deck interaction must resolve from the pink region");
});

test("door and East Exit trigger centres are walkable and distinct from the deck interaction", () => {
  for (const entry of [...packageData.building_triggers, packageData.east_exit]) {
    const rect = entry.rectangle || entry;
    const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    assert.equal(walkable(point), true);
    assert.notEqual(Navigation.triggerValueAt(point.x, point.y), 0);
  }
  const deckPoint = { x: packageData.deck_interaction.x + packageData.deck_interaction.width / 2, y: packageData.deck_interaction.y + packageData.deck_interaction.height / 2 };
  assert.equal(Navigation.isInRegion("deck-configuration", deckPoint), true);
  assert.equal(Navigation.isInRegion("deck-configuration", { ...deckPoint, radius: 3 }), true);
  assert.equal(Navigation.isInRegion("east-exit", { ...deckPoint, radius: 3 }), false);
});

test("Main Town runtime has no old image scanner, board rendering, or fail-open fallback", () => {
  assert.match(gameSource, /MainTownNavigation\.isWorldPositionWalkable/);
  assert.match(gameSource, /interactionAtWorldPoint/);
  assert.match(gameSource, /board\.render === false/);
  assert.doesNotMatch(gameSource, /Art\.mainTownNavigationMask/);
  assert.doesNotMatch(artSource, /scanNavigationMask|mainTownNavigationMask|mainTownWalkableMask|mainTownCollisionMask|mainTownTriggerMask/);
  assert.doesNotMatch(gameSource, /if \(walkable !== null && collision !== null\)/);
  assert.equal(world.boards[0].render, false);
  assert.equal(world.boards[0].canonicalSource, "assets/main-town/maintown_walkable.jpg");
});
