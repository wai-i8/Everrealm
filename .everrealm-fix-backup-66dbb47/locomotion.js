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

  // Alpha bounds are generated from the audited runtime atlases. They are
  // kept beside the shared contract because file-hosted browsers taint an
  // image-backed canvas, making a live getImageData scan unavailable. Each
  // entry is [left, top, width] inside its 256px cell; the audited foot
  // baseline is the contract's anchorY for every frame.
  const STANDARD_MOBILE_UNIT_VISUAL_BOUNDS = Object.freeze({
    fighter: Object.freeze([Object.freeze([73,32,179]),Object.freeze([81,32,175]),Object.freeze([80,32,176]),Object.freeze([80,32,176]),Object.freeze([80,32,176]),Object.freeze([81,32,175]),Object.freeze([82,32,174]),Object.freeze([76,32,177]),Object.freeze([77,32,179]),Object.freeze([76,32,181]),Object.freeze([73,32,173]),Object.freeze([76,32,176]),Object.freeze([71,32,171]),Object.freeze([70,32,171]),Object.freeze([74,32,184]),Object.freeze([88,32,197]),Object.freeze([88,32,195]),Object.freeze([89,32,193]),Object.freeze([74,32,183]),Object.freeze([88,32,194]),Object.freeze([75,32,182]),Object.freeze([79,32,179]),Object.freeze([78,32,181]),Object.freeze([81,32,183]),Object.freeze([80,32,183]),Object.freeze([82,32,182]),Object.freeze([83,32,183]),Object.freeze([84,32,183])]),
    warrior: Object.freeze([Object.freeze([40,32,186]),Object.freeze([50,32,187]),Object.freeze([52,32,188]),Object.freeze([61,32,186]),Object.freeze([52,32,185]),Object.freeze([56,32,187]),Object.freeze([58,32,187]),Object.freeze([81,32,215]),Object.freeze([64,32,222]),Object.freeze([65,32,222]),Object.freeze([65,32,216]),Object.freeze([67,32,217]),Object.freeze([58,32,196]),Object.freeze([64,32,203]),Object.freeze([72,32,218]),Object.freeze([69,32,213]),Object.freeze([67,32,208]),Object.freeze([69,32,202]),Object.freeze([68,32,206]),Object.freeze([72,32,212]),Object.freeze([71,32,206]),Object.freeze([40,32,181]),Object.freeze([29,32,194]),Object.freeze([41,32,195]),Object.freeze([39,32,187]),Object.freeze([50,32,187]),Object.freeze([52,32,192]),Object.freeze([44,32,201])]),
    raccoon: Object.freeze([Object.freeze([64,96,194]),Object.freeze([62,96,204]),Object.freeze([61,96,205]),Object.freeze([64,96,198]),Object.freeze([57,96,197]),Object.freeze([60,96,196]),Object.freeze([61,96,201]),Object.freeze([49,96,234]),Object.freeze([47,96,234]),Object.freeze([52,96,230]),Object.freeze([50,96,236]),Object.freeze([50,96,235]),Object.freeze([50,96,233]),Object.freeze([53,96,236]),Object.freeze([81,96,174]),Object.freeze([79,96,178]),Object.freeze([81,96,176]),Object.freeze([78,96,176]),Object.freeze([79,96,182]),Object.freeze([76,96,180]),Object.freeze([70,96,186]),Object.freeze([22,96,207]),Object.freeze([22,96,209]),Object.freeze([26,96,204]),Object.freeze([20,96,206]),Object.freeze([21,96,206]),Object.freeze([23,96,206]),Object.freeze([20,96,203])]),
    chick: Object.freeze([Object.freeze([73,80,182]),Object.freeze([77,80,179]),Object.freeze([79,80,176]),Object.freeze([80,80,175]),Object.freeze([77,80,177]),Object.freeze([79,80,177]),Object.freeze([78,80,177]),Object.freeze([75,80,190]),Object.freeze([76,80,192]),Object.freeze([78,80,189]),Object.freeze([77,80,191]),Object.freeze([76,80,190]),Object.freeze([77,80,191]),Object.freeze([77,80,189]),Object.freeze([76,80,180]),Object.freeze([77,80,179]),Object.freeze([78,80,178]),Object.freeze([78,80,178]),Object.freeze([77,80,179]),Object.freeze([77,80,178]),Object.freeze([77,80,179]),Object.freeze([66,80,181]),Object.freeze([66,80,181]),Object.freeze([67,80,181]),Object.freeze([66,80,181]),Object.freeze([68,80,179]),Object.freeze([67,80,180]),Object.freeze([67,80,180])]),
    fox: Object.freeze([Object.freeze([56,70,195]),Object.freeze([56,70,199]),Object.freeze([60,70,200]),Object.freeze([61,70,202]),Object.freeze([60,70,205]),Object.freeze([59,70,203]),Object.freeze([57,70,203]),Object.freeze([37,70,221]),Object.freeze([36,70,222]),Object.freeze([30,70,228]),Object.freeze([31,70,227]),Object.freeze([29,70,226]),Object.freeze([30,70,227]),Object.freeze([29,70,228]),Object.freeze([82,70,195]),Object.freeze([79,70,197]),Object.freeze([75,70,198]),Object.freeze([76,70,199]),Object.freeze([71,70,201]),Object.freeze([73,70,200]),Object.freeze([79,70,199]),Object.freeze([30,70,223]),Object.freeze([29,70,225]),Object.freeze([30,70,225]),Object.freeze([29,70,226]),Object.freeze([27,70,229]),Object.freeze([29,70,224]),Object.freeze([28,70,225])]),
    wild_boar: Object.freeze([Object.freeze([60,32,196]),Object.freeze([60,34,196]),Object.freeze([60,32,196]),Object.freeze([60,33,195]),Object.freeze([60,33,195]),Object.freeze([60,38,195]),Object.freeze([60,37,195]),Object.freeze([38,72,219]),Object.freeze([36,72,219]),Object.freeze([38,73,219]),Object.freeze([40,74,215]),Object.freeze([42,71,213]),Object.freeze([44,75,213]),Object.freeze([46,75,211]),Object.freeze([64,35,192]),Object.freeze([64,35,193]),Object.freeze([64,33,192]),Object.freeze([64,33,193]),Object.freeze([64,35,192]),Object.freeze([63,33,193]),Object.freeze([62,33,194]),Object.freeze([38,65,217]),Object.freeze([36,67,221]),Object.freeze([34,68,222]),Object.freeze([34,68,221]),Object.freeze([36,68,221]),Object.freeze([36,69,220]),Object.freeze([35,67,221])]),
    bear: Object.freeze([Object.freeze([59,49,198]),Object.freeze([58,49,199]),Object.freeze([59,48,197]),Object.freeze([58,49,198]),Object.freeze([61,47,195]),Object.freeze([56,48,199]),Object.freeze([60,47,196]),Object.freeze([36,70,221]),Object.freeze([38,70,218]),Object.freeze([37,69,219]),Object.freeze([34,76,221]),Object.freeze([35,75,221]),Object.freeze([30,78,225]),Object.freeze([38,71,219]),Object.freeze([61,50,195]),Object.freeze([64,41,191]),Object.freeze([64,34,193]),Object.freeze([60,32,196]),Object.freeze([64,45,192]),Object.freeze([62,38,194]),Object.freeze([62,51,195]),Object.freeze([36,69,221]),Object.freeze([34,73,222]),Object.freeze([32,71,225]),Object.freeze([30,71,227]),Object.freeze([34,76,223]),Object.freeze([35,72,221]),Object.freeze([35,70,221])]),
    turtle: Object.freeze([Object.freeze([35,57,221]),Object.freeze([34,57,223]),Object.freeze([31,60,225]),Object.freeze([32,49,225]),Object.freeze([29,60,227]),Object.freeze([30,57,225]),Object.freeze([32,52,224]),Object.freeze([29,64,227]),Object.freeze([26,53,231]),Object.freeze([24,57,232]),Object.freeze([24,58,233]),Object.freeze([22,67,234]),Object.freeze([24,74,233]),Object.freeze([26,66,229]),Object.freeze([36,40,220]),Object.freeze([36,43,221]),Object.freeze([36,48,221]),Object.freeze([34,38,223]),Object.freeze([32,37,225]),Object.freeze([34,43,222]),Object.freeze([34,40,221]),Object.freeze([28,66,227]),Object.freeze([29,65,227]),Object.freeze([26,67,230]),Object.freeze([26,67,231]),Object.freeze([21,69,236]),Object.freeze([22,67,233]),Object.freeze([27,66,229])]),
    coyote: Object.freeze([Object.freeze([85,32,171]),Object.freeze([72,39,183]),Object.freeze([84,34,173]),Object.freeze([76,40,179]),Object.freeze([70,46,187]),Object.freeze([78,48,179]),Object.freeze([73,47,183]),Object.freeze([31,50,225]),Object.freeze([38,93,217]),Object.freeze([52,95,205]),Object.freeze([55,92,201]),Object.freeze([49,91,207]),Object.freeze([32,82,223]),Object.freeze([34,80,222]),Object.freeze([87,48,169]),Object.freeze([86,40,169]),Object.freeze([84,36,171]),Object.freeze([84,35,171]),Object.freeze([82,35,174]),Object.freeze([83,35,173]),Object.freeze([77,41,179]),Object.freeze([32,58,225]),Object.freeze([42,71,215]),Object.freeze([49,80,207]),Object.freeze([49,78,207]),Object.freeze([48,81,209]),Object.freeze([28,72,229]),Object.freeze([30,77,226])]),
    frog: Object.freeze([Object.freeze([27,55,229]),Object.freeze([39,53,217]),Object.freeze([29,55,227]),Object.freeze([30,68,225]),Object.freeze([32,41,223]),Object.freeze([33,52,223]),Object.freeze([30,65,226]),Object.freeze([32,60,224]),Object.freeze([34,58,222]),Object.freeze([23,66,232]),Object.freeze([27,67,229]),Object.freeze([27,64,229]),Object.freeze([26,62,231]),Object.freeze([32,63,223]),Object.freeze([26,67,229]),Object.freeze([41,52,215]),Object.freeze([28,58,228]),Object.freeze([29,69,227]),Object.freeze([32,32,225]),Object.freeze([38,46,217]),Object.freeze([34,65,222]),Object.freeze([34,55,222]),Object.freeze([26,47,231]),Object.freeze([26,69,230]),Object.freeze([28,62,229]),Object.freeze([24,63,231]),Object.freeze([26,62,231]),Object.freeze([34,51,221])]),
    snake: Object.freeze([Object.freeze([44,36,212]),Object.freeze([48,36,208]),Object.freeze([42,36,213]),Object.freeze([42,41,215]),Object.freeze([43,38,213]),Object.freeze([48,38,207]),Object.freeze([50,37,206]),Object.freeze([32,38,224]),Object.freeze([30,41,226]),Object.freeze([32,36,224]),Object.freeze([36,44,221]),Object.freeze([35,50,222]),Object.freeze([39,40,219]),Object.freeze([38,46,217]),Object.freeze([42,37,215]),Object.freeze([44,40,212]),Object.freeze([45,36,211]),Object.freeze([36,38,219]),Object.freeze([45,40,211]),Object.freeze([45,40,211]),Object.freeze([52,38,204]),Object.freeze([28,33,228]),Object.freeze([28,34,229]),Object.freeze([30,33,226]),Object.freeze([34,33,222]),Object.freeze([35,32,221]),Object.freeze([40,34,217]),Object.freeze([40,35,216])]),
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
  const visualBounds = Object.freeze({ ...STANDARD_MOBILE_UNIT_VISUAL_BOUNDS, slime: STANDARD_MOBILE_UNIT_VISUAL_BOUNDS.raccoon, wisp: STANDARD_MOBILE_UNIT_VISUAL_BOUNDS.chick, hound: STANDARD_MOBILE_UNIT_VISUAL_BOUNDS.fox });
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
  function frameVisualBounds(id, index) {
    const bounds = visualBounds[id]?.[index];
    if (!bounds) return null;
    const m = STANDARD_MOBILE_UNIT_SPRITE;
    return { sx: bounds[0], sy: Math.floor(index / m.columns) * m.cellHeight + bounds[1], sw: bounds[2], sh: m.anchorY - bounds[1] };
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
  return Object.freeze({ STANDARD_MOBILE_UNIT_SPRITE, STANDARD_MOBILE_UNIT_VISUAL_BOUNDS, assets, sourceArt, create, update, frame, frameVisualBounds, layout, facingFromDelta, sampleMovement });
});
