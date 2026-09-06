const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ExpansionWorld = require("../expansion-world.js");

const REQUIRED_API = [
  "TILE",
  "TILES",
  "MAP_IDS",
  "MONSTER_BLUEPRINTS",
  "point",
  "tileRect",
  "createExpansionMaps",
  "createGuildMap",
  "createShopMap",
  "createFieldMap",
  "createDungeonMap",
  "tileAt",
  "isTileSolid",
  "monsterBlueprint",
  "normalizeMonsterId",
  "hydrateMonsterSpawn",
  "monsterStatsAtLevel",
  "xpReward",
  "retreatChance",
];

function circleRectOverlap(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

// This mirrors the exploration collision rules in game.js for expansion maps.
function isBlockedAt(map, x, y, radius = 12) {
  const circle = { x, y, radius };
  if (
    x - radius < 0 ||
    y - radius < 0 ||
    x + radius > map.pixelWidth ||
    y + radius > map.pixelHeight
  ) return true;

  const left = Math.floor((x - radius) / map.tileSize);
  const right = Math.floor((x + radius) / map.tileSize);
  const top = Math.floor((y - radius) / map.tileSize);
  const bottom = Math.floor((y + radius) / map.tileSize);
  for (let ty = top; ty <= bottom; ty += 1) {
    for (let tx = left; tx <= right; tx += 1) {
      if (!ExpansionWorld.isTileSolid(ExpansionWorld.tileAt(map, tx, ty))) continue;
      if (circleRectOverlap(circle, {
        x: tx * map.tileSize,
        y: ty * map.tileSize,
        w: map.tileSize,
        h: map.tileSize,
      })) return true;
    }
  }

  return map.collisionObjects.some((object) => {
    if (Number.isFinite(object.w) && Number.isFinite(object.h)) {
      return circleRectOverlap(circle, object);
    }
    if (Number.isFinite(object.radius)) {
      const combinedRadius = radius + object.radius - 2;
      return Math.hypot(x - object.x, y - object.y) < combinedRadius;
    }
    return false;
  });
}

function tileKey(tx, ty) {
  return `${tx},${ty}`;
}

function tileForPoint(map, point) {
  return {
    tx: Math.floor(point.x / map.tileSize),
    ty: Math.floor(point.y / map.tileSize),
  };
}

function reachableTiles(map) {
  const start = tileForPoint(map, map.start);
  const queue = [start];
  const reached = new Set([tileKey(start.tx, start.ty)]);
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const [dx, dy] of directions) {
      const tx = current.tx + dx;
      const ty = current.ty + dy;
      const key = tileKey(tx, ty);
      if (reached.has(key) || tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) continue;
      const x = (tx + 0.5) * map.tileSize;
      const y = (ty + 0.5) * map.tileSize;
      if (isBlockedAt(map, x, y)) continue;
      reached.add(key);
      queue.push({ tx, ty });
    }
  }
  return reached;
}

function assertReachable(map, reached, entity, group) {
  assert.ok(Number.isFinite(entity.x) && Number.isFinite(entity.y), `${map.id} ${group} ${entity.id} needs a position`);
  assert.ok(entity.x >= 0 && entity.x <= map.pixelWidth, `${map.id} ${group} ${entity.id} x is in bounds`);
  assert.ok(entity.y >= 0 && entity.y <= map.pixelHeight, `${map.id} ${group} ${entity.id} y is in bounds`);
  assert.equal(isBlockedAt(map, entity.x, entity.y), false, `${map.id} ${group} ${entity.id} must not spawn in collision`);
  const { tx, ty } = tileForPoint(map, entity);
  assert.ok(reached.has(tileKey(tx, ty)), `${map.id} ${group} ${entity.id} must be reachable from start`);
}

function canonicalEntities(map) {
  const entities = [];
  for (const key of [
    "exits",
    "solidRects",
    "furniture",
    "decorations",
    "boards",
    "npcs",
    "enemySpawns",
    "chests",
  ]) entities.push(...map[key]);
  if (map.shrine) entities.push(map.shrine);
  if (map.waypoint && map.waypoint !== map.shrine) entities.push(map.waypoint);
  return entities;
}

function namedObjectivePoints(objectives, prefix = "") {
  const points = [];
  for (const [id, value] of Object.entries(objectives || {})) {
    const name = prefix ? `${prefix}.${id}` : id;
    if (Number.isFinite(value?.x) && Number.isFinite(value?.y)) points.push([name, value]);
    else if (value && typeof value === "object") points.push(...namedObjectivePoints(value, name));
  }
  return points;
}

test("exports the same UMD API to Node and a browser-like global", () => {
  for (const key of REQUIRED_API) assert.ok(key in ExpansionWorld, `Node API is missing ${key}`);

  const root = path.join(__dirname, "..");
  const runtimeScripts = [
    "map/map-constants.js",
    "map/map-helpers.js",
    "map/monster-blueprints.js",
    "map/interior-helpers.js",
    "maps/main-town.js",
    "maps/mountain-field.js",
    "maps/mine.js",
    "maps/interiors/guild.js",
    "maps/interiors/equipment-shop.js",
    "maps/interiors/clinic.js",
    "maps/interiors/general-store.js",
    "maps/interiors/inn.js",
    "map/map-transitions.js",
    "map/map-registry.js",
    "expansion-world.js",
  ];
  const browserContext = vm.createContext({});
  for (const relativePath of runtimeScripts) {
    const source = fs.readFileSync(path.join(root, relativePath), "utf8");
    vm.runInContext(source, browserContext, { filename: relativePath });
  }
  const browserApi = browserContext.LanternExpansionWorld;

  assert.ok(browserApi, "browser global should be installed");
  for (const key of REQUIRED_API) assert.ok(key in browserApi, `browser API is missing ${key}`);
  assert.equal(browserApi.TILE, ExpansionWorld.TILE);
  assert.equal(browserApi.MAP_IDS.DUNGEON, ExpansionWorld.MAP_IDS.DUNGEON);
  assert.equal(browserApi.createDungeonMap().name, ExpansionWorld.createDungeonMap().name);
});

test("all expansion maps have a renderer-compatible, rectangular shape", () => {
  const maps = ExpansionWorld.createExpansionMaps();
  assert.deepEqual(Object.keys(maps).sort(), ["clinic", "dungeon", "field", "general-store", "guild", "inn", "shop"]);

  for (const [id, map] of Object.entries(maps)) {
    assert.equal(map.id, id);
    assert.ok(map.name && map.shortName);
    assert.equal(map.tileSize, ExpansionWorld.TILE);
    assert.equal(map.pixelWidth, map.width * map.tileSize);
    assert.equal(map.pixelHeight, map.height * map.tileSize);
    assert.equal(map.tiles.length, map.height);
    assert.ok(map.tiles.every((row) => Array.isArray(row) && row.length === map.width));
    assert.ok(map.tiles.flat().every((tile) => Object.values(ExpansionWorld.TILES).includes(tile)));
    assert.ok(Number.isFinite(map.start.x) && Number.isFinite(map.start.y));

    for (const key of [
      "exits", "portals", "interactables", "staticObjects", "collisionObjects",
      "furniture", "decorations", "boards", "npcs", "enemySpawns", "chests",
    ]) assert.ok(Array.isArray(map[key]), `${id}.${key} must be an array`);
    assert.strictEqual(map.portals, map.exits, `${id} portals should alias exits`);
  }
});

test("portals and service objects are exposed through interactables", () => {
  const maps = ExpansionWorld.createExpansionMaps();
  for (const map of Object.values(maps)) {
    assert.ok(map.exits.length >= 1, `${map.id} needs an exit`);
    const interactableIds = map.interactables.map((entity) => entity.id);
    assert.equal(new Set(interactableIds).size, interactableIds.length, `${map.id} interactable IDs must be unique`);

    const expected = [
      ...map.exits,
      ...map.npcs,
      ...map.boards,
      ...map.chests,
      ...(map.shrine ? [map.shrine] : []),
      ...(map.waypoint && map.waypoint !== map.shrine ? [map.waypoint] : []),
    ];
    for (const entity of expected) {
      assert.ok(map.interactables.includes(entity), `${map.id} should expose ${entity.id} as interactable`);
    }

    for (const portal of map.exits) {
      assert.equal(portal.kind, "portal");
      assert.ok(Object.values(ExpansionWorld.MAP_IDS).includes(portal.targetMap));
      assert.ok(portal.targetSpawn);
      assert.ok(portal.prompt);
      assert.ok(Number.isFinite(portal.targetPosition?.x) && Number.isFinite(portal.targetPosition?.y));
    }
  }
});

test("starts, portals, NPCs, chests, monsters and named destinations are reachable", async (t) => {
  const maps = ExpansionWorld.createExpansionMaps();
  for (const map of Object.values(maps)) {
    await t.test(map.id, async (mapTest) => {
      const reached = reachableTiles(map);
      const targets = [["start", { id: "start", ...map.start }]];
      for (const [group, entities] of [
        ["portal", map.exits],
        ["NPC", map.npcs],
        ["chest", map.chests],
        ["enemy", map.enemySpawns],
      ]) for (const entity of entities) targets.push([group, entity]);
      for (const [id, destination] of Object.entries(map.spawnPoints || {})) {
        targets.push(["spawn point", { id, ...destination }]);
      }
      for (const [id, destination] of namedObjectivePoints(map.objectives)) {
        targets.push(["objective", { id, ...destination }]);
      }

      for (const [group, entity] of targets) {
        await mapTest.test(`${group}: ${entity.id}`, () => {
          assertReachable(map, reached, entity, group);
        });
      }
    });
  }
});

test("field separates the town and dungeon with one west-then-north road", () => {
  const field = ExpansionWorld.createFieldMap();
  const reached = reachableTiles(field);
  const west = field.exits.find((portal) => portal.id === "field-to-world");
  const dungeon = field.exits.find((portal) => portal.id === "field-to-dungeon");

  assert.equal(field.id, ExpansionWorld.MAP_IDS.FIELD);
  assert.equal(field.kind, "field");
  assert.ok(field.width > field.height, "the wilderness should have room for its long eastbound road");
  assert.equal(field.routeLayout.style, "east-then-north");
  assert.equal(field.routeLayout.entrySide, "west");
  assert.equal(field.routeLayout.dungeonSide, "north");
  assert.ok(tileForPoint(field, west).tx <= 1, "the town connection belongs on the west edge");
  assert.ok(tileForPoint(field, dungeon).ty <= 1, "the mine entrance belongs at the north edge");
  assert.equal(west.targetMap, ExpansionWorld.MAP_IDS.WORLD);
  assert.equal(dungeon.targetMap, ExpansionWorld.MAP_IDS.DUNGEON);
  assert.equal(ExpansionWorld.createDungeonMap().exits[0].targetMap, ExpansionWorld.MAP_IDS.FIELD);

  for (const waypoint of field.routeLayout.waypoints) {
    const tile = tileForPoint(field, waypoint);
    assert.ok(reached.has(tileKey(tile.tx, tile.ty)), `road waypoint ${tile.tx},${tile.ty} must connect to the entrance`);
  }
});

test("field tree masses are solid while the authored road stays walkable", () => {
  const field = ExpansionWorld.createFieldMap();
  assert.equal(field.forestLayout.style, "solid-tree-mass");
  assert.ok(field.trees.length > 150, "large forest regions need a dense visible canopy");

  for (const [tx, ty] of [[5, 5], [20, 12], [44, 30]]) {
    assert.equal(ExpansionWorld.tileAt(field, tx, ty), ExpansionWorld.TILES.WALL);
    assert.equal(isBlockedAt(field, ...Object.values(ExpansionWorld.point(tx, ty))), true, `forest ${tx},${ty} must be impassable`);
  }
  for (const waypoint of field.routeLayout.waypoints) {
    const { tx, ty } = tileForPoint(field, waypoint);
    assert.equal(ExpansionWorld.isTileSolid(ExpansionWorld.tileAt(field, tx, ty)), false, `road ${tx},${ty} must remain open`);
  }
});

test("the expanded adult female NPC cast is substantial and reachable", () => {
  const women = [];
  for (const map of Object.values(ExpansionWorld.createExpansionMaps())) {
    const reached = reachableTiles(map);
    for (const npc of map.npcs.filter((candidate) => candidate.gender === "female")) {
      women.push(npc);
      assert.ok(npc.age >= 18, `${map.id} NPC ${npc.id} should be unambiguously adult`);
      assertReachable(map, reached, npc, "female NPC");
    }
  }

  assert.ok(women.length >= 6, `expected at least six adult female NPCs, got ${women.length}`);
  assert.equal(new Set(women.map((npc) => npc.name)).size, women.length, "female NPC names should be distinct");
});

test("every expansion NPC has an explicit visual actor, with service interiors reusing the actor roster", () => {
  const npcs = Object.values(ExpansionWorld.createExpansionMaps()).flatMap((map) => map.npcs);
  const expectedActors = [
    "adventurer",
    "armorer",
    "clerk",
    "duelist",
    "explorer",
    "guildmaster",
    "healer",
    "merchant",
    "tailor",
  ];

  assert.ok(npcs.every((npc) => typeof npc.actor === "string" && npc.actor.length > 0));
  const actorSet = [...new Set(npcs.map((npc) => npc.actor))].sort();
  assert.deepEqual(actorSet, expectedActors.sort());
  assert.ok(npcs.length > actorSet.length, "service interiors should be allowed to reuse the established NPC art roster");
});

test("authored entity IDs are globally unique, including generated dungeon detail", () => {
  const seen = new Map();
  for (const map of Object.values(ExpansionWorld.createExpansionMaps())) {
    for (const entity of canonicalEntities(map)) {
      assert.equal(typeof entity.id, "string", `${map.id} entity needs a string ID`);
      assert.ok(entity.id.length > 0, `${map.id} entity needs a non-empty ID`);
      assert.equal(seen.has(entity.id), false, `${entity.id} is duplicated in ${map.id} and ${seen.get(entity.id)}`);
      seen.set(entity.id, map.id);
    }
  }
  assert.ok(seen.size >= 100, "the expansion should retain a substantial authored/generated roster");
});

test("monster blueprints hydrate tactical stats and rewards without mutating spawns", () => {
  assert.equal(ExpansionWorld.monsterBlueprint("missing-monster"), null);
  assert.equal(ExpansionWorld.hydrateMonsterSpawn(null), null);

  const unknown = { id: "unknown-1", type: "unknown", level: 99 };
  const unknownHydrated = ExpansionWorld.hydrateMonsterSpawn(unknown);
  assert.notStrictEqual(unknownHydrated, unknown);
  assert.deepEqual(unknownHydrated, unknown);

  for (const [type, blueprint] of Object.entries(ExpansionWorld.MONSTER_BLUEPRINTS)) {
    const spawn = { id: `${type}-test`, type, level: blueprint.baseLevel + 1, elite: true };
    const before = { ...spawn };
    const hydrated = ExpansionWorld.hydrateMonsterSpawn(spawn);

    assert.deepEqual(spawn, before, `${type} hydration must not mutate its spawn`);
    assert.notStrictEqual(hydrated, spawn);
    assert.equal(hydrated.type, type);
    assert.equal(hydrated.name, blueprint.name);
    assert.equal(hydrated.level, spawn.level);
    assert.equal(hydrated.elite, true);
    assert.deepEqual(hydrated.stats, ExpansionWorld.monsterStatsAtLevel(type, spawn.level, { elite: true }));
    assert.equal(hydrated.reward.xp, ExpansionWorld.xpReward(blueprint.rewards.baseXp, spawn.level, 1));
    assert.equal(hydrated.reward.drop, blueprint.drop);
  }
});

test("dungeon advertises its level band and includes a full escalating roster with a boss", () => {
  const dungeon = ExpansionWorld.createDungeonMap();
  assert.equal(dungeon.kind, "dungeon");
  assert.ok(dungeon.recommendedLevel >= 2);
  assert.ok(dungeon.maxRecommendedLevel >= dungeon.recommendedLevel);
  assert.ok(dungeon.enemySpawns.length >= 12);
  assert.ok(dungeon.rooms.length >= 6);
  assert.ok(dungeon.chests.length >= 3);

  const roster = new Set(dungeon.enemySpawns.map((spawn) => spawn.type));
  assert.deepEqual([...roster].sort(), ["bear", "frog", "raccoon", "snake", "turtle", "wild_boar"].sort());
  for (const spawn of dungeon.enemySpawns) {
    assert.ok(ExpansionWorld.monsterBlueprint(spawn.type), `${spawn.id} needs a blueprint`);
    assert.ok(spawn.level >= dungeon.recommendedLevel);
    assert.ok(spawn.level <= dungeon.maxRecommendedLevel);
  }

  const bosses = dungeon.enemySpawns.filter((spawn) => spawn.boss || ExpansionWorld.monsterBlueprint(spawn.type)?.boss);
  assert.equal(bosses.length, 1);
  assert.equal(bosses[0].type, "bear");
  assert.equal(bosses[0].respawn, false);
  const lockedTreasure = dungeon.chests.find((chest) => chest.lockedBy === bosses[0].id);
  assert.ok(lockedTreasure, "the dungeon boss should guard a reward chest");
  assert.equal(bosses[0].guardsChest, lockedTreasure.id);
});
