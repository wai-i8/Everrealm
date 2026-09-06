const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Locomotion = require("../locomotion.js");

const root = path.resolve(__dirname, "..");
const metadata = Locomotion.STANDARD_MOBILE_UNIT_SPRITE;

test("standard mobile unit contract is one fixed 4 x 7 geometry", () => {
  assert.deepEqual({ columns: metadata.columns, rows: metadata.rows }, { columns: 7, rows: 4 });
  assert.deepEqual(metadata.directions, { down: 0, right: 1, up: 2, left: 3 });
  assert.equal(metadata.idleColumn, 0);
  assert.deepEqual(metadata.walkColumns, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual({ cellWidth: metadata.cellWidth, cellHeight: metadata.cellHeight, anchorX: metadata.anchorX, anchorY: metadata.anchorY },
    { cellWidth: 256, cellHeight: 256, anchorX: 128, anchorY: 224 });
});

test("idle and Walk frames resolve by direction without cut tables or offsets", () => {
  for (const [direction, row] of Object.entries(metadata.directions)) {
    assert.deepEqual(Locomotion.frame({ state: "idle", facing: direction, time: 99 }), {
      facing: direction, row, column: 0, index: row * 7, sx: 0, sy: row * 256, sw: 256, sh: 256,
    });
    const cycle = Array.from({ length: 6 }, (_, index) => Locomotion.frame({ state: "walk", facing: direction, time: index / metadata.walkFps }).column);
    assert.deepEqual(cycle, [1, 2, 3, 4, 5, 6]);
  }
});

test("animation controller preserves facing and returns immediately to Idle on STOP", () => {
  let state = Locomotion.create("left");
  state = Locomotion.update(state, { moving: true, facing: "up", dt: .16 });
  assert.deepEqual(state, { state: "walk", facing: "up", time: .16 });
  state = Locomotion.update(state, { moving: true, facing: "up", dt: .1, stopped: true });
  assert.deepEqual(state, { state: "idle", facing: "up", time: 0 });
});

test("battle sampling reads actual interpolation and never changes resolver state", () => {
  const movement = Object.freeze({
    stepDuration: .5,
    frameTimes: Object.freeze([0, 1]),
    timeline: Object.freeze([
      Object.freeze({ renderCells: Object.freeze({ hero: Object.freeze({ x: 2, y: 3 }) }), facings: Object.freeze({ hero: "down" }) }),
      Object.freeze({ renderCells: Object.freeze({ hero: Object.freeze({ x: 3, y: 3 }) }), facings: Object.freeze({ hero: "right" }) }),
    ]),
  });
  assert.deepEqual(Locomotion.sampleMovement(movement, "hero", .25, "down"), { state: "walk", facing: "right", time: .25 });
  assert.deepEqual(movement.timeline[0].renderCells.hero, { x: 2, y: 3 });
  assert.deepEqual(Locomotion.sampleMovement(movement, "hero", .5, "right"), { state: "idle", facing: "right", time: 0 });
});

test("runtime locomotion atlases and audit reports exist and pass", () => {
  for (const source of new Set(Object.values(Locomotion.assets))) {
    const file = path.join(root, source);
    const report = file.replace(/\.png$/, ".audit.json");
    assert.ok(fs.existsSync(file), source);
    assert.equal(JSON.parse(fs.readFileSync(report, "utf8")).passed, true, `${source} audit`);
  }
});
