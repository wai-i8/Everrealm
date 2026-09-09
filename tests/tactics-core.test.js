const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Tactics = require("../tactics-core.js");

function assertEveryFrameHasUniqueCells(result) {
  for (const frame of result.frames) {
    const keys = Object.values(frame).map((cell) => `${cell.x},${cell.y}`);
    assert.equal(new Set(keys).size, keys.length, `overlapping movement frame: ${JSON.stringify(frame)}`);
  }
}

test("UMD build exposes the same API to a browser global", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "tactics-core.js"), "utf8");
  const context = {};
  context.globalThis = context;
  vm.runInNewContext(source, context);
  assert.equal(typeof context.LanternTactics.createGrid, "function");
  assert.equal(typeof context.LanternTactics.chooseEnemyAction, "function");
  assert.equal(context.LanternTactics.manhattan({ x: 1, y: 1 }, { x: 4, y: 2 }), 4);
});

test("grid normalizes blockers and rejects invalid dimensions", () => {
  const grid = Tactics.createGrid(4.9, 3.2, [{ x: 1, y: 1 }, "2,1", { x: 99, y: 99 }]);
  assert.equal(grid.width, 4);
  assert.equal(grid.height, 3);
  assert.deepEqual([...grid.blocked], ["1,1", "2,1"]);
  assert.throws(() => Tactics.createGrid(0, 4), RangeError);
});

test("Manhattan distance and cardinal neighbours never use diagonals", () => {
  const grid = Tactics.createGrid(3, 3);
  assert.equal(Tactics.manhattan({ x: 0, y: 0 }, { x: 2, y: 2 }), 4);
  assert.deepEqual(Tactics.neighbours(grid, { x: 0, y: 0 }), [{ x: 1, y: 0 }, { x: 0, y: 1 }]);
});

test("walkability checks bounds, terrain, occupancy, and an ignored unit", () => {
  const grid = Tactics.createGrid(4, 4, [{ x: 2, y: 2 }]);
  const units = [{ id: "self", x: 1, y: 1 }, { id: "friend", x: 1, y: 2 }];
  assert.equal(Tactics.isWalkable(grid, { x: -1, y: 0 }, units), false);
  assert.equal(Tactics.isWalkable(grid, { x: 2, y: 2 }, units), false);
  assert.equal(Tactics.isWalkable(grid, { x: 1, y: 2 }, units), false);
  assert.equal(Tactics.isWalkable(grid, { x: 1, y: 1 }, units, { ignoreUnitId: "self" }), true);
});

test("reachable tiles obey movement points, blockers, and occupied cells", () => {
  const grid = Tactics.createGrid(5, 5, [{ x: 2, y: 1 }]);
  const occupied = [{ id: "hero", x: 2, y: 2 }, { id: "ally", x: 3, y: 2 }];
  const tiles = Tactics.reachableTiles(grid, { x: 2, y: 2 }, 2, occupied, { ignoreUnitId: "hero" });
  assert.equal(tiles.some((tile) => tile.x === 2 && tile.y === 1), false);
  assert.equal(tiles.some((tile) => tile.x === 3 && tile.y === 2), false);
  assert.equal(tiles.some((tile) => tile.x === 2 && tile.y === 0), false);
  assert.equal(tiles.some((tile) => tile.x === 0 && tile.y === 2), true);
  assert.equal(Math.max(...tiles.map((tile) => tile.cost)), 2);
});

test("reachable output and tie-broken paths are deterministic", () => {
  const grid = Tactics.createGrid(3, 3);
  const first = Tactics.reachableTiles(grid, { x: 1, y: 1 }, 2);
  const second = Tactics.reachableTiles(grid, { x: 1, y: 1 }, 2);
  assert.deepEqual(first, second);
  assert.deepEqual(first.map(({ x, y, cost }) => [x, y, cost]), [
    [1, 1, 0],
    [1, 0, 1], [0, 1, 1], [2, 1, 1], [1, 2, 1],
    [0, 0, 2], [2, 0, 2], [0, 2, 2], [2, 2, 2],
  ]);
  assert.deepEqual(first.find((tile) => tile.x === 0 && tile.y === 0).path, [
    { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 0, y: 0 },
  ]);
});

test("reachable tiles can omit the starting square", () => {
  const grid = Tactics.createGrid(3, 3);
  const tiles = Tactics.reachableTiles(grid, { x: 1, y: 1 }, 1, [], { includeStart: false });
  assert.equal(tiles.length, 4);
  assert.equal(tiles.some((tile) => tile.cost === 0), false);
});

test("battle movement charges half a point whenever a route changes direction", () => {
  const route = [
    { x: 2, y: 2 },
    { x: 1, y: 2 },
    { x: 1, y: 1 },
  ];
  assert.equal(Tactics.movementPathCost(route, .5), 2.5);
  assert.deepEqual(Tactics.truncatePathByCost([...route, { x: 1, y: 0 }], 3, .5), route);

  const grid = Tactics.createGrid(5, 5);
  const reachable = Tactics.reachableTiles(grid, route[0], 3, [], { turnCost: .5 });
  const corner = reachable.find((tile) => tile.x === 1 && tile.y === 1);
  assert.equal(corner.cost, 2.5);
  assert.equal(reachable.some((tile) => tile.x === 1 && tile.y === 0), false);
  assert.equal(reachable.some((tile) => tile.x === 0 && tile.y === 2), true, "a straight three-step route still fits");
});

test("the opening turn costs half a step when an initial facing is supplied", () => {
  const route = [{ x: 1, y: 1 }, { x: 1, y: 2 }];
  assert.equal(Tactics.movementPathCost(route, { turnCost: .5, initialFacing: "right" }), 1.5);
  assert.equal(Tactics.movementPathCost(route, .5), 1, "legacy callers without a facing keep their original cost");
  assert.deepEqual(Tactics.movementEvents(route, { turnCost: .5, initialFacing: "right" }).events.map((event) => [event.type, event.duration]), [
    ["turn", .5],
    ["move", 1],
  ]);

  const grid = Tactics.createGrid(3, 3);
  const tiles = Tactics.reachableTiles(grid, route[0], 1, [], {
    turnCost: .5,
    initialFacing: "right",
  });
  assert.equal(tiles.some((tile) => tile.x === 1 && tile.y === 2), false);
  assert.equal(tiles.some((tile) => tile.x === 2 && tile.y === 1), true);
});

test("equal-cost routes finish their straight segment before turning", () => {
  const grid = Tactics.createGrid(6, 4);
  assert.deepEqual(
    Tactics.findPath(grid, { x: 1, y: 2 }, { x: 4, y: 1 }, [], { turnCost: .5 }),
    [
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 4, y: 1 },
    ],
  );
});

test("path finding takes a deterministic shortest route around terrain", () => {
  const grid = Tactics.createGrid(5, 4, [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }]);
  const path = Tactics.findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
  assert.deepEqual(path, [
    { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
    { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 2, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 0 },
  ]);
});

test("path finding respects occupants but may enter an occupied goal", () => {
  const grid = Tactics.createGrid(4, 2);
  const target = { id: "target", x: 3, y: 0 };
  assert.deepEqual(Tactics.findPath(grid, { x: 0, y: 0 }, target, [target]), []);
  assert.deepEqual(
    Tactics.findPath(grid, { x: 0, y: 0 }, target, [target], { allowGoalOccupied: true }),
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
  );
});

test("path finding returns no route for sealed or over-distance goals", () => {
  const grid = Tactics.createGrid(3, 3, [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }]);
  assert.deepEqual(Tactics.findPath(grid, { x: 0, y: 1 }, { x: 2, y: 1 }), []);
  const open = Tactics.createGrid(4, 1);
  assert.deepEqual(Tactics.findPath(open, { x: 0, y: 0 }, { x: 3, y: 0 }, [], { maxDistance: 2 }), []);
});

test("priority wins an empty contested destination while the loser stays in its own cell", () => {
  const grid = Tactics.createGrid(3, 3);
  const hero = { id: "hero", cell: { x: 0, y: 1 }, hp: 10 };
  const enemy = { id: "enemy", cell: { x: 2, y: 1 }, hp: 10 };
  const result = Tactics.resolveSimultaneousMovement({
    grid,
    units: [hero, enemy],
    routes: {
      hero: [{ x: 0, y: 1 }, { x: 1, y: 1 }],
      enemy: [{ x: 2, y: 1 }, { x: 1, y: 1 }],
    },
    priorityUnitId: "hero",
  });
  assert.deepEqual(result.frames[1].hero, { x: 1, y: 1 });
  assert.deepEqual(result.frames[1].enemy, { x: 2, y: 1 });
  assert.deepEqual(new Set(result.cancelled), new Set(["hero", "enemy"]));
  assertEveryFrameHasUniqueCells(result);
});

test("head-on movement stops adjacent units even when one has priority", () => {
  const grid = Tactics.createGrid(2, 1);
  const units = [
    { id: "hero", cell: { x: 0, y: 0 }, hp: 10 },
    { id: "enemy", cell: { x: 1, y: 0 }, hp: 10 },
  ];
  const swapped = Tactics.resolveSimultaneousMovement({
    grid,
    units,
    routes: { hero: [{ x: 0, y: 0 }, { x: 1, y: 0 }], enemy: [{ x: 1, y: 0 }, { x: 0, y: 0 }] },
    priorityUnitId: "hero",
  });
  assert.deepEqual(swapped.frames[1], { hero: { x: 0, y: 0 }, enemy: { x: 1, y: 0 } });
  assertEveryFrameHasUniqueCells(swapped);
});

test("entering a stationary occupied cell stops both routes without phasing", () => {
  const grid = Tactics.createGrid(3, 1);
  const blocked = Tactics.resolveSimultaneousMovement({
    grid,
    units: [
      { id: "hero", cell: { x: 0, y: 0 }, hp: 10 },
      { id: "enemy", cell: { x: 1, y: 0 }, hp: 10 },
    ],
    routes: {
      hero: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
      enemy: [{ x: 1, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
    },
    priorityUnitId: "hero",
  });
  assert.deepEqual(blocked.frames[1], { hero: { x: 0, y: 0 }, enemy: { x: 1, y: 0 } });
  assert.deepEqual(blocked.frames[2], blocked.frames[1]);
  assertEveryFrameHasUniqueCells(blocked);
});

test("a stopped occupant propagates backwards through a movement chain", () => {
  const grid = Tactics.createGrid(4, 1);
  const result = Tactics.resolveSimultaneousMovement({
    grid,
    units: [
      { id: "a", cell: { x: 0, y: 0 }, hp: 10 },
      { id: "b", cell: { x: 1, y: 0 }, hp: 10 },
      { id: "c", cell: { x: 2, y: 0 }, hp: 10 },
    ],
    routes: {
      a: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      b: [{ x: 1, y: 0 }, { x: 2, y: 0 }],
      c: [{ x: 2, y: 0 }, { x: 2, y: 0 }],
    },
    priorityUnitId: "a",
  });
  assert.deepEqual(result.frames[1], {
    a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, c: { x: 2, y: 0 },
  });
  assertEveryFrameHasUniqueCells(result);
});

test("timed movement lets an unturned mover block a unit still paying its opening turn", () => {
  const grid = Tactics.createGrid(2, 2);
  const result = Tactics.resolveSimultaneousMovement({
    timed: true,
    grid,
    units: [
      { id: "hero", cell: { x: 1, y: 0 }, facing: "right", hp: 10 },
      { id: "enemy", cell: { x: 0, y: 0 }, facing: "right", hp: 10 },
    ],
    routes: {
      hero: [{ x: 1, y: 0 }, { x: 1, y: 1 }],
      enemy: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    },
  });
  assert.deepEqual(result.frameTimes, [0, .5, 1]);
  assert.deepEqual(result.unitResults.hero.cell, { x: 1, y: 0 });
  assert.deepEqual(result.unitResults.enemy.cell, { x: 0, y: 0 });
  assert.equal(result.unitResults.hero.facing, "down", "the paid turn completes before STOP");
  assert.equal(result.unitResults.enemy.facing, "right");
  assert.equal(result.unitResults.hero.blocked, true);
  assert.equal(result.unitResults.enemy.blocked, true);
  assert.equal(result.unitResults.hero.blockReason, "unit-collision");
  assert.deepEqual(result.unitResults.hero.completedPath, [{ x: 1, y: 0 }]);
  assert.equal(result.events.filter((event) => event.type === "blocked").length, 2);
  assertEveryFrameHasUniqueCells(result);
});

test("a collision preserves last executed facing and rejects a requested terminal facing", () => {
  const grid = Tactics.createGrid(3, 2);
  const result = Tactics.resolveTimedSimultaneousMovement({
    grid,
    units: [
      { id: "hero", cell: { x: 0, y: 0 }, facing: "up", hp: 10 },
      { id: "enemy", cell: { x: 1, y: 0 }, facing: "left", hp: 10 },
    ],
    routes: {
      hero: { path: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], finalFacing: "down" },
      enemy: [{ x: 1, y: 0 }],
    },
  });
  assert.equal(result.unitResults.hero.blocked, true);
  assert.equal(result.unitResults.hero.completed, false);
  assert.equal(result.unitResults.hero.facing, "right");
  assert.notEqual(result.unitResults.hero.facing, "down");
});

test("a completed low-intelligence mover keeps its final travel facing", () => {
  const grid = Tactics.createGrid(4, 2);
  const result = Tactics.resolveTimedSimultaneousMovement({
    grid,
    units: [{ id: "enemy", cell: { x: 0, y: 0 }, facing: "up", hp: 10 }],
    routes: { enemy: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }] },
  });
  assert.deepEqual(result.unitResults.enemy.cell, { x: 2, y: 0 });
  assert.deepEqual(result.unitResults.enemy.completedPath, [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
  ]);
  assert.equal(result.unitResults.enemy.completed, true);
  assert.equal(result.unitResults.enemy.facing, "right");
});

test("attack tiles form a clipped Manhattan ring", () => {
  const grid = Tactics.createGrid(5, 5);
  const ring = Tactics.attackTiles(grid, { x: 0, y: 0 }, 2, 1);
  assert.deepEqual(ring, [
    { x: 1, y: 0, distance: 1 }, { x: 0, y: 1, distance: 1 },
    { x: 2, y: 0, distance: 2 }, { x: 1, y: 1, distance: 2 }, { x: 0, y: 2, distance: 2 },
  ]);
  assert.equal(Tactics.isInAttackRange({ x: 0, y: 0 }, { x: 1, y: 1 }, 2), true);
  assert.equal(Tactics.isInAttackRange({ x: 0, y: 0 }, { x: 2, y: 2 }, 2), false);
});

test("turn order uses initiative, priority, and stable ids while skipping defeated units", () => {
  const units = [
    { id: "c", initiative: 4, hp: 10 },
    { id: "b", initiative: 8, turnPriority: 0, hp: 10 },
    { id: "a", initiative: 8, turnPriority: 2, hp: 10 },
    { id: "down", initiative: 99, hp: 0 },
  ];
  assert.deepEqual(Tactics.buildTurnOrder(units).map((unit) => unit.id), ["a", "b", "c"]);
});

test("turn advancement wraps into the next round", () => {
  const order = [{ id: "a" }, { id: "b" }];
  assert.deepEqual(Tactics.advanceTurn(order, -1, 1), { index: 0, round: 1, unit: order[0], wrapped: false });
  assert.deepEqual(Tactics.advanceTurn(order, 1, 3), { index: 0, round: 4, unit: order[0], wrapped: true });
});

test("melee enemy AI attempts the hero tile so simultaneous collision stops it adjacent", () => {
  const grid = Tactics.createGrid(6, 3);
  const enemy = { id: "mist", x: 1, y: 1, hp: 10, moveRange: 3, attackRange: 1 };
  const hero = { id: "hero", x: 2, y: 1, hp: 20 };
  const action = Tactics.chooseEnemyAction({ grid, enemy, targets: [hero], units: [enemy, hero] });
  assert.equal(action.type, "move-attack");
  assert.deepEqual(action.move, { x: 2, y: 1 });
  assert.deepEqual(action.path, [{ x: 1, y: 1 }, { x: 2, y: 1 }]);
  assert.equal(action.attackTargetId, "hero");
});

test("enemy AI spends its movement following the shortest route toward the target", () => {
  const grid = Tactics.createGrid(7, 1);
  const enemy = { id: "mist", x: 0, y: 0, hp: 10, moveRange: 3, attackRange: 1 };
  const hero = { id: "hero", x: 4, y: 0, hp: 20 };
  const action = Tactics.chooseEnemyAction({ grid, enemy, targets: [hero], units: [enemy, hero] });
  assert.equal(action.type, "move-attack");
  assert.deepEqual(action.move, { x: 3, y: 0 });
  assert.deepEqual(action.path, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]);
  assert.equal(action.attackTargetId, "hero");
  assert.equal(action.path.some((cell) => cell.x === hero.x && cell.y === hero.y), false);
});

test("ranged enemy takes the shortest route to an unoccupied attack-band cell", () => {
  const grid = Tactics.createGrid(8, 3);
  const enemy = {
    id: "wisp", x: 0, y: 1, hp: 10, moveRange: 2, attackRange: 3, minAttackRange: 2,
  };
  const hero = { id: "hero", x: 5, y: 1, hp: 20 };
  const action = Tactics.chooseEnemyAction({ grid, enemy, targets: [hero], units: [enemy, hero] });
  assert.equal(action.type, "move-attack");
  assert.deepEqual(action.move, { x: 2, y: 1 });
  assert.deepEqual(action.path, [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }]);
  assert.equal(Tactics.isInAttackRange(action.move, hero, 3, 2), true);
  assert.equal(action.path.some((cell) => cell.x === hero.x && cell.y === hero.y), false);
});

test("enemy AI routes to another attack cell when the nearest one is occupied", () => {
  const grid = Tactics.createGrid(5, 3);
  const enemy = { id: "mist", x: 0, y: 1, hp: 10, moveRange: 6, attackRange: 1 };
  const hero = { id: "hero", x: 3, y: 1, hp: 20 };
  const blocker = { id: "ally", x: 2, y: 1, hp: 20 };
  const action = Tactics.chooseEnemyAction({
    grid, enemy, targets: [hero], units: [enemy, hero, blocker],
  });
  assert.equal(action.type, "move-attack");
  assert.equal(action.move.x === blocker.x && action.move.y === blocker.y, false);
  assert.deepEqual(action.move, { x: hero.x, y: hero.y });
  assert.equal(action.path.some((cell) => cell.x === hero.x && cell.y === hero.y), true, "melee pursuit deliberately attempts the occupied hero goal");
  assert.equal(action.path.some((cell) => cell.x === blocker.x && cell.y === blocker.y), false);
});

test("enemy AI uses path distance to navigate around a wall", () => {
  const grid = Tactics.createGrid(5, 3, [{ x: 1, y: 0 }, { x: 1, y: 1 }]);
  const enemy = { id: "mist", x: 0, y: 0, hp: 10, moveRange: 2, attackRange: 1 };
  const hero = { id: "hero", x: 4, y: 0, hp: 20 };
  const action = Tactics.chooseEnemyAction({ grid, enemy, targets: [hero], units: [enemy, hero] });
  assert.equal(action.type, "move");
  assert.deepEqual(action.move, { x: 0, y: 2 });
  assert.deepEqual(action.path, [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }]);
});

test("enemy AI waits cleanly when there are no living targets", () => {
  const grid = Tactics.createGrid(3, 3);
  const enemy = { id: "mist", x: 1, y: 1, hp: 10 };
  const action = Tactics.chooseEnemyAction({ grid, enemy, targets: [{ id: "hero", x: 2, y: 2, hp: 0 }] });
  assert.deepEqual(action, {
    type: "wait", move: { x: 1, y: 1 }, path: [{ x: 1, y: 1 }], targetId: null, attackTargetId: null,
  });
});

test("four-way facing blocks rear targets but allows front and both sides", () => {
  const origin = { x: 3, y: 3 };
  assert.equal(Tactics.isInFacingArc(origin, { x: 5, y: 3 }, "right"), true);
  assert.equal(Tactics.isInFacingArc(origin, { x: 3, y: 1 }, "right"), true);
  assert.equal(Tactics.isInFacingArc(origin, { x: 3, y: 5 }, "right"), true);
  assert.equal(Tactics.isInFacingArc(origin, { x: 2, y: 3 }, "right"), false);
  assert.equal(Tactics.facingFromStep(origin, { x: 3, y: 2 }, "right"), "up");
  assert.equal(Tactics.facingFromStep(origin, origin, "left"), "left");
});

test("positional attacks give a larger rear bonus than a side bonus", () => {
  const defender = { cell: { x: 3, y: 3 }, facing: "up" };
  assert.deepEqual(Tactics.positionalAttack({ cell: { x: 3, y: 1 } }, defender), { position: "front", multiplier: 1 });
  assert.deepEqual(Tactics.positionalAttack({ cell: { x: 2, y: 3 } }, defender), { position: "side", multiplier: 1.15 });
  assert.deepEqual(Tactics.positionalAttack({ cell: { x: 3, y: 4 } }, defender), { position: "rear", multiplier: 1.35 });
});

test("damage calculation handles defence, criticals, guarding, and a minimum", () => {
  assert.equal(Tactics.calculateDamage({ attack: 12 }, { defence: 5 }), 7);
  assert.equal(Tactics.calculateDamage({ attack: 2 }, { defence: 99 }), 1);
  assert.equal(Tactics.calculateDamage({ attack: 12 }, { defence: 2 }, { critical: true }), 16);
  assert.equal(Tactics.calculateDamage({ attack: 12 }, { defence: 2 }, { guarded: true }), 5);
});

test("applying damage is immutable, clamps overkill, and reports defeat", () => {
  const original = { id: "hero", hp: 9, alive: true };
  const result = Tactics.applyDamage(original, 99);
  assert.equal(original.hp, 9);
  assert.deepEqual(result, {
    unit: { id: "hero", hp: 0, alive: false },
    damage: 9,
    hpBefore: 9,
    hpAfter: 0,
    defeated: true,
  });
  assert.equal(Tactics.applyDamage(result.unit, 3).defeated, false);
});


test("low cover blocks Linear delivery but a normal ballistic arc clears it", () => {
  const grid = Tactics.createGrid(5, 1, [{ x: 2, y: 0 }]);
  grid.heightMap = {};
  grid.terrainCells = {
    "2,0": { movementBlocked: true, obstacleHeight: "low", blocksLinear: true, blocksArc: false, occupiedHeight: .65 },
  };
  const target = { id: "target", cell: { x: 4, y: 0 }, hp: 10 };
  const linear = Tactics.traceAttackPath({
    origin: { x: 0, y: 0 }, target: target.cell, facing: "right", grid,
    units: [target], actorId: "hero", deliveryMode: "linear",
  });
  assert.equal(linear.stoppedReason, "terrain");
  assert.deepEqual(linear.firstImpactCell, { x: 2, y: 0 });
  assert.equal(linear.actualTarget, null);

  const arc = Tactics.traceAttackPath({
    origin: { x: 0, y: 0 }, target: target.cell, facing: "right", grid,
    units: [target], actorId: "hero", deliveryMode: "arc", arcHeight: 2,
  });
  assert.equal(arc.stoppedReason, "unit");
  assert.equal(arc.actualTarget, target);
  assert.deepEqual(arc.firstImpactCell, target.cell);
});

test("high cover blocks a ballistic arc when its occupied height intersects the trajectory", () => {
  const grid = Tactics.createGrid(5, 1, [{ x: 2, y: 0 }]);
  grid.heightMap = {};
  grid.terrainCells = {
    "2,0": { movementBlocked: true, obstacleHeight: "high", blocksLinear: true, blocksArc: true, occupiedHeight: 3.2 },
  };
  const target = { id: "target", cell: { x: 4, y: 0 }, hp: 10 };
  const arc = Tactics.traceAttackPath({
    origin: { x: 0, y: 0 }, target: target.cell, facing: "right", grid,
    units: [target], actorId: "hero", deliveryMode: "arc", arcHeight: 1.5,
  });
  assert.equal(arc.stoppedReason, "terrain");
  assert.deepEqual(arc.firstImpactCell, { x: 2, y: 0 });
  assert.equal(arc.actualTarget, null);
});

test("arc trajectory interpolates authored terrain elevation and remains deterministic", () => {
  const grid = Tactics.createGrid(4, 1);
  grid.heightMap = { "3,0": 2 };
  assert.equal(Tactics.terrainHeightAt(grid, { x: 3, y: 0 }), 2);
  const end = Tactics.arcTrajectoryHeight(grid, { x: 0, y: 0 }, { x: 3, y: 0 }, 2, 3, 1.5);
  assert.equal(end, 2);
  assert.equal(
    Tactics.arcTrajectoryHeight(grid, { x: 0, y: 0 }, { x: 3, y: 0 }, 0, 3, 1.5),
    Tactics.arcTrajectoryHeight(grid, { x: 0, y: 0 }, { x: 3, y: 0 }, 0, 3, 1.5),
  );
});
