const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../rpg-core.js");
const World = require("../world.js");

test("diagonal movement normalizes to unit speed", () => {
  const result = Core.normalize({ x: 1, y: 1 });
  assert.ok(Math.abs(Math.hypot(result.x, result.y) - 1) < 1e-12);
});

test("circle-rectangle collision handles edges and misses", () => {
  const rect = { x: 10, y: 10, w: 20, h: 20 };
  assert.equal(Core.circleRectOverlap({ x: 7, y: 20, radius: 4 }, rect), true);
  assert.equal(Core.circleRectOverlap({ x: 5, y: 5, radius: 4 }, rect), false);
});

test("attack arc hits in front but not behind", () => {
  const player = { x: 0, y: 0 };
  assert.equal(Core.attackHitsTarget(player, "right", 40, Math.PI / 3, { x: 38, y: 8, radius: 10 }), true);
  assert.equal(Core.attackHitsTarget(player, "right", 40, Math.PI / 3, { x: -20, y: 0, radius: 10 }), false);
});

test("movement collision slides along one blocked axis", () => {
  const entity = { x: 10, y: 10, radius: 2 };
  const result = Core.moveWithCollision(entity, 5, 4, (circle) => circle.x > 12);
  assert.equal(result.x, 10);
  assert.equal(result.y, 14);
  assert.equal(result.hitX, true);
  assert.equal(result.hitY, false);
});

test("overworld click path returns the exact goal and omits the start", () => {
  const start = { x: 20, y: 20 };
  const goal = { x: 173, y: 91 };
  assert.deepEqual(Core.findOverworldPath(start, goal, {
    bounds: { x: 0, y: 0, w: 240, h: 160 },
    cellSize: 20,
  }), [goal]);
  assert.deepEqual(Core.findOverworldPath(start, start), []);
});

test("overworld click path deterministically navigates around a rectangular blocker", () => {
  const options = {
    bounds: { x: 0, y: 0, w: 240, h: 160 },
    colliders: [{ x: 80, y: 30, w: 60, h: 80 }],
    cellSize: 20,
    radius: 5,
    directions: 8,
  };
  const first = Core.findOverworldPath({ x: 20, y: 70 }, { x: 210, y: 70 }, options);
  const second = Core.findOverworldPath({ x: 20, y: 70 }, { x: 210, y: 70 }, options);
  assert.deepEqual(first, second);
  assert.deepEqual(first.at(-1), { x: 210, y: 70 });
  assert.ok(first.length >= 3 && first.length <= 6, `expected short turning waypoints, got ${JSON.stringify(first)}`);
  for (const point of first) {
    assert.equal(point.x >= 75 && point.x <= 145 && point.y >= 25 && point.y <= 115, false);
  }
});

test("four-way overworld paths keep every segment cardinal", () => {
  const start = { x: 10, y: 10 };
  const path = Core.findOverworldPath(start, { x: 130, y: 90 }, {
    bounds: { x: 0, y: 0, w: 160, h: 120 },
    directions: 4,
    cellSize: 20,
  });
  let previous = start;
  for (const point of path) {
    assert.equal(point.x === previous.x || point.y === previous.y, true, `${JSON.stringify(previous)} -> ${JSON.stringify(point)}`);
    previous = point;
  }
  assert.deepEqual(path.at(-1), { x: 130, y: 90 });
});

test("overworld path supports a callback-backed walkability grid", () => {
  const visited = [];
  const path = Core.findOverworldPath({ x: 10, y: 50 }, { x: 130, y: 50 }, {
    bounds: { x: 0, y: 0, w: 160, h: 120 },
    cellSize: 10,
    directions: 4,
    isWalkable(point) {
      visited.push(point);
      return !(point.x >= 60 && point.x <= 80 && point.y >= 20 && point.y <= 90);
    },
  });
  assert.ok(visited.length > 0);
  assert.deepEqual(path.at(-1), { x: 130, y: 50 });
  assert.ok(path.some((point) => point.y < 20 || point.y > 90), JSON.stringify(path));
});

test("overworld path returns no route through a sealed bound", () => {
  const path = Core.findOverworldPath({ x: 20, y: 50 }, { x: 180, y: 50 }, {
    bounds: { x: 0, y: 0, w: 200, h: 100 },
    colliders: [{ x: 90, y: 0, w: 20, h: 100 }],
    cellSize: 10,
    radius: 4,
  });
  assert.deepEqual(path, []);
});

test("overworld path can fall back to the nearest reachable point beside a blocked goal", () => {
  const start = { x: 10, y: 40 };
  const goal = { x: 70, y: 40 };
  const options = {
    bounds: { x: 0, y: 0, w: 120, h: 80 },
    colliders: [{ x: 60, y: 25, w: 20, h: 30 }],
    cellSize: 10,
    directions: 4,
  };

  assert.deepEqual(Core.findOverworldPath(start, goal, options), []);
  const fallback = Core.findOverworldPath(start, goal, { ...options, nearestReachable: true });
  assert.deepEqual(fallback, [{ x: 50, y: 40 }]);
  assert.ok(Core.distance(fallback.at(-1), goal) < Core.distance(start, goal));
  assert.deepEqual(
    Core.findOverworldPath(start, goal, { ...options, nearestReachable: true, maxVisited: 1 }),
    [{ x: 20, y: 40 }],
    "a capped search should still use a closer reachable point discovered from the start",
  );
});

test("nearest reachable overworld fallback is deterministic across a sealed region", () => {
  const start = { x: 20, y: 50 };
  const goal = { x: 180, y: 50 };
  const options = {
    bounds: { x: 0, y: 0, w: 200, h: 100 },
    colliders: [{ x: 90, y: 0, w: 20, h: 100 }],
    cellSize: 10,
    radius: 4,
    directions: 4,
    nearestReachable: true,
  };

  const first = Core.findOverworldPath(start, goal, options);
  const second = Core.findOverworldPath(start, goal, options);
  assert.deepEqual(first, second);
  assert.deepEqual(first.at(-1), { x: 80, y: 50 });
  assert.ok(first.every((point) => point.x < 86), JSON.stringify(first));
});

test("experience can grant multiple levels without losing remainder", () => {
  const first = Core.xpRequired(1);
  const second = Core.xpRequired(2);
  const result = Core.grantExperience(1, first - 1, second + 6);
  assert.equal(result.level, 3);
  assert.equal(result.levelsGained, 2);
  assert.equal(result.xp, 5);
});

test("upgrades and weapon level derive stronger stats", () => {
  const base = Core.deriveStats({ level: 1, weaponLevel: 1, upgrades: {} });
  const grown = Core.deriveStats({ level: 4, weaponLevel: 3, upgrades: { vigor: 2, edge: 2, swift: 2 } });
  assert.ok(grown.maxHp > base.maxHp);
  assert.ok(grown.attack > base.attack);
  assert.ok(grown.speed > base.speed);
  assert.ok(grown.dashCooldown < base.dashCooldown);
});

test("save sanitizer rejects unknown schemas and corrupt coordinates", () => {
  assert.equal(Core.sanitizeSave(null), null);
  assert.equal(Core.sanitizeSave({ version: 2, player: { x: 10, y: 10 } }), null);
  assert.equal(Core.sanitizeSave({ version: 1, player: { x: Number.NaN, y: 10 } }), null);
});

test("save sanitizer clamps values and removes duplicate flags", () => {
  const clean = Core.sanitizeSave({
    version: 1,
    player: {
      x: -500,
      y: 99999,
      hp: 22,
      level: 999,
      xp: 999999,
      coins: -20,
      potions: 70,
      weaponLevel: 9,
      upgrades: { vigor: 2, edge: -4, swift: 200 },
    },
    questStage: 99,
    pendingLevelUps: 99,
    crystals: ["north", "north", "bogus", "west"],
    openedChests: ["a", "a", "b"],
  });
  assert.equal(clean.player.x, 40);
  assert.equal(clean.player.y, 1800);
  assert.equal(clean.player.level, 40);
  assert.equal(clean.player.coins, 0);
  assert.equal(clean.player.potions, 9);
  assert.deepEqual(clean.crystals, ["north", "west"]);
  assert.deepEqual(clean.openedChests, ["a", "b"]);
  assert.equal(clean.questStage, 5);
  assert.equal(clean.pendingLevelUps, 39);
});

test("old saves default to no pending level-up choices", () => {
  const clean = Core.sanitizeSave({ version: 1, player: { x: 100, y: 100, level: 4 } });
  assert.equal(clean.pendingLevelUps, 0);
});

test("world generator returns the expanded walled starting town", () => {
  const world = World.createWorld();
  assert.equal(world.id, "world");
  assert.equal(world.kind, "town");
  assert.equal(world.width, 44);
  assert.equal(world.height, 30);
  assert.equal(world.tiles.length, 30);
  assert.equal(world.tiles[0].length, 44);
  assert.deepEqual(world.houses.map((house) => house.id), ["keeper-house", "forge", "tea-house", "clinic", "general-store"]);
  assert.equal(world.enemySpawns.length, 0, "monsters belong in the separate field map");
  assert.equal(world.townLayout.style, "districted-walled-town");
  assert.equal(world.townLayout.districts.length, 5);
});

test("town perimeter is solid except for its explicit three-tile east gate", () => {
  const world = World.createWorld();
  const gate = world.townLayout.eastGate;
  for (let tx = 0; tx < world.width; tx += 1) {
    assert.equal(World.isTileSolid(World.tileAt(world, tx, 0)), true, `north wall ${tx} must be solid`);
    assert.equal(World.isTileSolid(World.tileAt(world, tx, world.height - 1)), true, `south wall ${tx} must be solid`);
  }
  for (let ty = 0; ty < world.height; ty += 1) {
    assert.equal(World.isTileSolid(World.tileAt(world, 0, ty)), true, `west wall ${ty} must be solid`);
    assert.equal(
      World.isTileSolid(World.tileAt(world, world.width - 1, ty)),
      ty < gate.minTy || ty > gate.maxTy,
      `east edge ${ty} must match the authored gate opening`,
    );
  }
});

test("town square, services, DECK console and east exit share one walkable component", () => {
  const world = World.createWorld();
  const start = toTile(world, world.start);
  const deckConsole = world.boards.find((board) => board.id === "harbour-gate-deck-console");
  const eastExit = world.portals.find((portal) => portal.id === "world-to-field");
  assert.equal(deckConsole.boardId, "deck-loadout");
  assert.equal(eastExit.targetMap, "field");
  assert.equal(eastExit.targetSpawn, "westGate");
  for (const destination of [world.objectives.elder, ...world.npcs, deckConsole, eastExit]) {
    assert.equal(tileReachable(world, start, toTile(world, destination)), true, `unreachable town point ${JSON.stringify(toTile(world, destination))}`);
  }
});

test("normal town services use physical door entries and the east gate uses a physical exit", () => {
  const world = World.createWorld();
  const eastGate = world.portals.find((portal) => portal.id === "world-to-field");
  assert.equal(eastGate.interactionMode, "gate");
  assert.equal(eastGate.transitionType, "physical-gate");
  assert.deepEqual(world.houses.map((house) => house.entryPortalId), [
    "world-to-guild", "world-to-shop", "world-to-inn", "world-to-clinic", "world-to-general-store",
  ]);
  assert.match(world.houses.find((house) => house.id === "clinic").label, /霧草療癒所/);
  assert.match(world.houses.find((house) => house.id === "general-store").label, /霧穀雜貨舖/);
  assert.match(world.houses.find((house) => house.id === "tea-house").label, /霧燈旅店/);
});

test("Ah Ching is authored as an adult female keeper", () => {
  const ahChing = World.createWorld().npcs.find((npc) => npc.id === "ah-ching");
  assert.ok(ahChing, "ah-ching should remain in the village NPC roster");
  assert.equal(ahChing.name, "阿澄");
  assert.equal(ahChing.actor, "keeper");
  assert.equal(ahChing.gender, "female");
  assert.ok(ahChing.age >= 18, "Ah Ching should be unambiguously adult");
  assert.equal(ahChing.role, "守燈星術師");
  assert.equal(ahChing.referenceAsset, "assets/ah-ching-v1.png");
  assert.match(ahChing.appearance, /銀藍長髮/);
  assert.match(ahChing.appearance, /月輪法杖/);
  assert.match(ahChing.appearance, /藍色精靈/);
});

test("village NPCs each have a distinct visual actor", () => {
  const npcs = World.createWorld().npcs;
  assert.deepEqual(npcs.map((npc) => npc.actor).sort(), ["healer", "keeper", "smith"]);
  assert.equal(new Set(npcs.map((npc) => npc.actor)).size, npcs.length);
});

test("town quest points stand on walkable tiles", () => {
  const world = World.createWorld();
  const points = [world.start, world.objectives.elder, world.objectives.townGate];
  for (const point of points) {
    const tx = Math.floor(point.x / world.tileSize);
    const ty = Math.floor(point.y / world.tileSize);
    assert.equal(World.isTileSolid(World.tileAt(world, tx, ty)), false, `blocked quest point at ${tx},${ty}`);
  }
});

test("hash2D is stable and stays in range", () => {
  const first = Core.hash2D(17, 42, 9);
  assert.equal(first, Core.hash2D(17, 42, 9));
  assert.ok(first >= 0 && first <= 1);
  assert.notEqual(first, Core.hash2D(18, 42, 9));
});

function toTile(world, point) {
  return { x: Math.floor(point.x / world.tileSize), y: Math.floor(point.y / world.tileSize) };
}

function tileReachable(world, start, goal, blocked = new Set()) {
  const queue = [start];
  const seen = new Set([`${start.x},${start.y}`]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current.x === goal.x && current.y === goal.y) return true;
    for (const direction of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
      const next = { x: current.x + direction[0], y: current.y + direction[1] };
      const key = `${next.x},${next.y}`;
      if (seen.has(key) || blocked.has(key) || World.isTileSolid(World.tileAt(world, next.x, next.y))) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return false;
}

function tileReachableWithGate(world, start, goal, gateOpen) {
  const queue = [start];
  const seen = new Set([`${start.x},${start.y}`]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current.x === goal.x && current.y === goal.y) return true;
    for (const direction of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
      const next = { x: current.x + direction[0], y: current.y + direction[1] };
      const key = `${next.x},${next.y}`;
      const tile = World.tileAt(world, next.x, next.y);
      const inClosedGate = !gateOpen && next.x === 49 && next.y >= 14 && next.y <= 16;
      if (seen.has(key) || World.isTileSolid(tile) || inClosedGate) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return false;
}
