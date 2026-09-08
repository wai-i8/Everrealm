(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LanternLocomotion = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // The single geometry contract used by authoring tools, audit and runtime.
  const STANDARD_MOBILE_UNIT_SPRITE = Object.freeze({
    version: 1, columns: 7, rows: 4,
    cellWidth: 256, cellHeight: 256, anchorX: 128, anchorY: 224,
    gutter: 20,
    directions: Object.freeze({ down: 0, right: 1, up: 2, left: 3 }),
    idleColumn: 0, walkColumns: Object.freeze([1, 2, 3, 4, 5, 6]), walkFps: 10,
  });
  const assets = Object.freeze({
    fighter: "assets/locomotion/fighter-v1.png",
    warrior: "assets/locomotion/warrior-v1.png",
    raccoon: "assets/locomotion/raccoon-v1.png",
    chick: "assets/locomotion/chick-v1.png",
    fox: "assets/locomotion/fox-v1.png",
    wild_boar: "assets/locomotion/wild-boar-v1.png",
    bear: "assets/locomotion/bear-v1.png",
    turtle: "assets/locomotion/turtle-v1.png",
    coyote: "assets/locomotion/coyote-v1.png",
    frog: "assets/locomotion/frog-v1.png",
    snake: "assets/locomotion/snake-v1.png",
    // Save/smoke compatibility aliases; new runtime spawns use canonical IDs.
    slime: "assets/locomotion/raccoon-v1.png",
    wisp: "assets/locomotion/chick-v1.png",
    hound: "assets/locomotion/fox-v1.png",
  });
  const sourceArt = Object.freeze({
    snake: "assets/monster-sources/snake.png",
    fox: "assets/monster-sources/fox.png",
    wild_boar: "assets/monster-sources/wild-boar.png",
    frog: "assets/monster-sources/frog.png",
    turtle: "assets/monster-sources/turtle.png",
    bear: "assets/monster-sources/bear.png",
    coyote: "assets/locomotion/sources/raw/coyote-atlas-source-v1.png",
  });
  const direction = (value) => Object.hasOwn(STANDARD_MOBILE_UNIT_SPRITE.directions, value) ? value : "down";
  function facingFromDelta(dx, dy, fallback = "down") {
    if (Math.hypot(dx, dy) < 1e-7) return direction(fallback);
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
  }
  function create(facing = "down") { return { state: "idle", facing: direction(facing), time: 0 }; }
  function update(previous, { moving = false, facing = previous?.facing, dt = 0, stopped = false } = {}) {
    const next = create(facing);
    if (moving && !stopped) {
      next.state = "walk";
      next.time = (previous?.state === "walk" && previous.facing === next.facing ? previous.time : 0) + Math.max(0, Number(dt) || 0);
    }
    return next;
  }
  function frame(animation = {}) {
    const m = STANDARD_MOBILE_UNIT_SPRITE;
    const facing = direction(animation.facing);
    const row = m.directions[facing];
    const column = animation.state === "walk" ? m.walkColumns[Math.floor(Math.max(0, animation.time || 0) * m.walkFps + 1e-9) % m.walkColumns.length] : m.idleColumn;
    return { facing, row, column, index: row * m.columns + column, sx: column * m.cellWidth, sy: row * m.cellHeight, sw: m.cellWidth, sh: m.cellHeight };
  }
  function layout(x, y, scale = 1) {
    const m = STANDARD_MOBILE_UNIT_SPRITE;
    // The fixed atlas geometry is authored world geometry. Map dimensions
    // never change the size of a mobile unit, and there is no migration
    // scale between the atlas pixels and world pixels.
    const factor = scale;
    return { x: x - m.anchorX * factor, y: y - m.anchorY * factor, width: m.cellWidth * factor, height: m.cellHeight * factor, baselineY: y, centerX: x };
  }
  // Read-only sampling of the resolver's positions. Never changes collision,
  // occupancy, turn costs, final facing, or movement timing.
  function sampleMovement(movement, id, seconds, fallbackFacing = "down") {
    const timeline = movement.timeline || [];
    const times = movement.frameTimes || timeline.map((entry) => entry.time);
    const time = Math.max(0, seconds / movement.stepDuration);
    let index = 0;
    while (index + 1 < times.length && times[index + 1] <= time + 1e-9) index++;
    const current = timeline[index];
    const next = timeline[index + 1];
    const from = current?.renderCells?.[id] || current?.positions?.[id];
    const to = next?.renderCells?.[id] || from;
    const moving = !!(next && from && to && Math.hypot(to.x - from.x, to.y - from.y) > 1e-7);
    const facing = moving ? facingFromDelta(to.x - from.x, to.y - from.y, fallbackFacing) : direction(current?.facings?.[id] || fallbackFacing);
    // Carry cadence across timeline events belonging to other units.
    let start = index;
    while (moving && start > 0) {
      const a = timeline[start - 1]?.renderCells?.[id];
      const b = timeline[start]?.renderCells?.[id];
      if (!a || !b || Math.hypot(b.x - a.x, b.y - a.y) < 1e-7 || facingFromDelta(b.x - a.x, b.y - a.y) !== facing) break;
      start--;
    }
    return { state: moving ? "walk" : "idle", facing, time: moving ? Math.max(0, time - times[start]) * movement.stepDuration : 0 };
  }
  return Object.freeze({ STANDARD_MOBILE_UNIT_SPRITE, assets, sourceArt, create, update, frame, layout, facingFromDelta, sampleMovement });
});
