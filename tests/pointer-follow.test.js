const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const game = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
const handlers = game.slice(game.indexOf("  function retargetExploreHoldGesture("), game.indexOf("  function visualTerrainTile("));
const event = (x, y, pointerType = "mouse") => ({ pointerId: 1, pointerType, clientX: x, clientY: y, button: 0, preventDefault() {} });

function pointerHarness() {
  let now = 0;
  let nextTimer = 0;
  let hovered = null;
  let cameraOffset = 0;
  const targets = [];
  const timers = new Map();
  const captures = new Set();
  const context = vm.createContext({
    targets,
    openedChests: new Set(),
    performance: { now: () => now },
    window: {
      setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { at: now + delay, callback }); return id; },
      clearTimeout(id) { timers.delete(id); },
    },
    canvas: {
      setPointerCapture(id) { captures.add(id); },
      hasPointerCapture(id) { return captures.has(id); },
      releasePointerCapture(id) { captures.delete(id); },
    },
    screenToWorld(x, y) { return { x: x + cameraOffset, y, screenX: x, screenY: y }; },
    clickedExploreEntity() { return hovered; },
    setExploreClickTarget(target, entity) { targets.push({ x: target.x, y: target.y, entityId: entity?.id || null }); },
    clearExploreMovePath() { context.pathCleared = (context.pathCleared || 0) + 1; },
  });
  vm.runInContext(`
    let mode = "playing";
    let currentMapId = "world";
    let explorePointerGesture = null;
    let pendingClickInteractionId = null;
    const EXPLORE_HOLD_DELAY_MS = 500;
    const EXPLORE_RETARGET_INTERVAL_MS = 150;
    ${handlers}
    globalThis.api = {
      down: handleCanvasPointer, move: handleCanvasPointerMove, up: finishCanvasPointer,
      tick: updateExplorePointerTracking, cancel: cancelExplorePointerTracking,
      gesture: () => explorePointerGesture,
      setMode: value => { mode = value; },
      setMap: value => { currentMapId = value; }
    };
  `, context);
  return {
    ...context.api, targets, captures, context,
    hover(value) { hovered = value; },
    setCameraOffset(value) { cameraOffset = value; },
    advance(milliseconds) {
      now += milliseconds;
      for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.callback(); }
    },
  };
}

test("short clicks immediately issue one target and never enable hover-follow", () => {
  const h = pointerHarness();
  h.down(event(100, 80));
  assert.equal(h.targets.length, 1);
  h.advance(499);
  h.up(event(100, 80));
  h.move(event(220, 90));
  h.tick();
  assert.equal(h.targets.length, 1);
  assert.equal(h.gesture(), null);
});

test("half-second mouse hold stays latched after release until the next short click", () => {
  const h = pointerHarness();
  h.down(event(100, 80));
  h.advance(500);
  h.up(event(100, 80));
  assert.equal(h.gesture().holdActive, true);
  assert.equal(h.gesture().pressed, false);
  assert.equal(h.captures.size, 0);
  h.advance(150);
  h.move(event(240, 110));
  assert.deepEqual(h.targets.at(-1), { x: 240, y: 110, entityId: null });
  h.down(event(60, 70));
  h.advance(100);
  h.up(event(60, 70));
  assert.equal(h.gesture(), null);
  assert.deepEqual(h.targets.at(-1), { x: 60, y: 70, entityId: null });
});

test("stationary cursor follows the moving camera while updates are throttled to 150 ms", () => {
  const h = pointerHarness();
  h.down(event(100, 80));
  h.advance(500);
  h.up(event(100, 80));
  const initialCalls = h.targets.length;
  h.setCameraOffset(32);
  h.advance(149);
  h.tick();
  assert.equal(h.targets.length, initialCalls);
  h.advance(1);
  h.tick();
  assert.equal(h.targets.length, initialCalls + 1);
  assert.equal(h.targets.at(-1).x, 132);
});

test("touch release chases its moving entity but a ground release retains a fixed target", () => {
  const h = pointerHarness();
  const monster = { id: "slime-1", type: "slime", alive: true, x: 120, y: 80 };
  h.hover(monster);
  h.down(event(120, 80, "touch"));
  h.advance(500);
  h.up(event(120, 80, "touch"));
  assert.equal(h.gesture().followReleasedEntity, true);
  h.hover(null);
  monster.x = 168;
  h.advance(150);
  h.tick();
  assert.deepEqual(h.targets.at(-1), { x: 168, y: 80, entityId: "slime-1" });
  monster.alive = false;
  h.advance(150);
  h.tick();
  assert.equal(h.gesture(), null);

  h.down(event(240, 110, "touch"));
  h.advance(500);
  h.up(event(240, 110, "touch"));
  const finalCalls = h.targets.length;
  h.setCameraOffset(100);
  h.advance(150);
  h.tick();
  assert.equal(h.gesture(), null);
  assert.equal(h.targets.length, finalCalls);
  assert.deepEqual(h.targets.at(-1), { x: 240, y: 110, entityId: null });
});

test("mode changes, map changes and cancelled pointers release follow state", () => {
  for (const action of [h => h.setMode("dialogue"), h => h.setMap("field"), h => h.cancel(1)]) {
    const h = pointerHarness();
    h.down(event(100, 80));
    h.advance(500);
    h.up(event(100, 80));
    action(h);
    h.tick();
    assert.equal(h.gesture(), null);
    assert.equal(h.captures.size, 0);
  }
  assert.match(game, /canvas\.addEventListener\("pointermove", handleCanvasPointerMove\)/);
  assert.match(game, /canvas\.addEventListener\("pointerup", finishCanvasPointer\)/);
  assert.match(game, /"pointercancel", \(event\) => cancelExplorePointerTracking\(event\.pointerId\)/);
  assert.match(game, /if \(explorePointerGesture\?\.pressed\) cancelExplorePointerTracking\(event\.pointerId, false\)/);
  assert.match(game, /window\.addEventListener\("blur",[^\n]*cancelExplorePointerTracking\(\)/);
  assert.match(game, /if \(mode !== "playing"\) cancelExplorePointerTracking\(\)/);
});
