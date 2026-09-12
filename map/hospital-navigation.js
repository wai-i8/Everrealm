(function (root, factory) {
  const generated = root.LanternHospitalNavigationGenerated || (typeof require === "function"
    ? require("./hospital-navigation.generated.js")
    : null);
  const api = factory(generated);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternHospitalNavigation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (generated) {
  "use strict";

  const EXPECTED_WIDTH = 1254;
  const EXPECTED_HEIGHT = 1254;
  const FEET_RADIUS = 3;
  const SERVICE_INTERACTION_REACH_PX = 160;
  const SERVICE_INTERACTION_HIT_PADDING_PX = 32;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function validMask(mask) {
    if (!(mask instanceof Uint8Array) || mask.length !== EXPECTED_WIDTH * EXPECTED_HEIGHT) return false;
    for (const value of mask) if (value > 1) return false;
    return true;
  }

  function validRuntime(candidate) {
    return Boolean(candidate && candidate.width === EXPECTED_WIDTH && candidate.height === EXPECTED_HEIGHT && candidate.masks &&
      validMask(candidate.masks.white) && validMask(candidate.masks.magenta) && validMask(candidate.masks.cyan));
  }

  function createResolver(source = generated) {
    const data = source?.package || null;
    const runtime = source && validRuntime(source) ? source : null;
    const sourceValid = data?.source?.width === EXPECTED_WIDTH && data?.source?.height === EXPECTED_HEIGHT &&
      data?.authoring?.image === "assets/hospital/hospital_walkable.png" &&
      data?.authoring?.matching === "exact opaque RGB colors only; all other pixels are non-authored" &&
      data?.feet_radius_px === FEET_RADIUS && typeof data?.movement_rule === "string" && data.movement_rule.includes("feet disk") &&
      data?.regions?.npc?.length > 0 && data?.regions?.exit?.length > 0;
    const ready = Boolean(runtime && sourceValid);
    const failure = ready
      ? null
      : !source
        ? "generated Hospital navigation data is unavailable"
        : !validRuntime(source)
          ? "generated Hospital navigation data is malformed"
          : !sourceValid
            ? "Hospital navigation source contract is invalid"
            : "Hospital navigation failed to initialize";

    function insideDisk(maskPredicate, x, y, radius, mode = "all") {
      if (!ready || !Number.isFinite(x) || !Number.isFinite(y)) return false;
      const actualRadius = Math.max(0, Number(radius) || 0);
      const minX = Math.floor(x - actualRadius);
      const maxX = Math.ceil(x + actualRadius);
      const minY = Math.floor(y - actualRadius);
      const maxY = Math.ceil(y + actualRadius);
      let hit = false;
      for (let py = minY; py <= maxY; py += 1) {
        for (let px = minX; px <= maxX; px += 1) {
          if ((px - x) ** 2 + (py - y) ** 2 > actualRadius ** 2) continue;
          const inside = px >= 0 && py >= 0 && px < EXPECTED_WIDTH && py < EXPECTED_HEIGHT && maskPredicate(px, py);
          if (mode === "all" && !inside) return false;
          if (mode === "any" && inside) hit = true;
        }
      }
      return mode === "all" ? true : hit;
    }

    function valueAt(mask, x, y) {
      const px = Math.floor(Number(x));
      const py = Math.floor(Number(y));
      if (!ready || !Number.isFinite(px) || !Number.isFinite(py) || px < 0 || py < 0 || px >= EXPECTED_WIDTH || py >= EXPECTED_HEIGHT) return 0;
      return mask[py * EXPECTED_WIDTH + px] || 0;
    }

    function isPositionWalkable(position, footprint = {}) {
      if (!ready) return false;
      const x = Number(position?.x);
      const y = Number(position?.y);
      const radius = Number.isFinite(Number(footprint?.radius)) ? Number(footprint.radius) : FEET_RADIUS;
      if (!Number.isFinite(x) || !Number.isFinite(y) || radius < 0) return false;
      return insideDisk((px, py) => runtime.masks.white[py * EXPECTED_WIDTH + px] !== 0 || runtime.masks.cyan[py * EXPECTED_WIDTH + px] !== 0, x, y, radius, "all") &&
        !insideDisk((px, py) => runtime.masks.magenta[py * EXPECTED_WIDTH + px] !== 0, x, y, radius, "any");
    }

    function isRegionAt(region, position) {
      const mask = region === "npc" ? runtime?.masks.magenta : region === "exit" ? runtime?.masks.cyan : null;
      return Boolean(mask && valueAt(mask, position?.x, position?.y));
    }

    function nearestPointInRegion(region, position) {
      const mask = region === "npc" ? runtime?.masks.magenta : region === "exit" ? runtime?.masks.cyan : null;
      const x = Number(position?.x);
      const y = Number(position?.y);
      if (!ready || !mask || !Number.isFinite(x) || !Number.isFinite(y)) return null;
      let best = null;
      for (const entry of data?.regions?.[region] || []) {
        const bbox = entry?.bbox;
        if (!bbox) continue;
        const minX = Math.max(0, Math.floor(bbox.x));
        const minY = Math.max(0, Math.floor(bbox.y));
        const maxX = Math.min(EXPECTED_WIDTH - 1, Math.ceil(bbox.x + bbox.width) - 1);
        const maxY = Math.min(EXPECTED_HEIGHT - 1, Math.ceil(bbox.y + bbox.height) - 1);
        for (let py = minY; py <= maxY; py += 1) {
          for (let px = minX; px <= maxX; px += 1) {
            if (!mask[py * EXPECTED_WIDTH + px]) continue;
            const distanceSquared = (px - x) ** 2 + (py - y) ** 2;
            if (!best || distanceSquared < best.distanceSquared) best = { x: px, y: py, distanceSquared };
          }
        }
      }
      return best;
    }

    function distanceToRegion(region, position) {
      const nearest = nearestPointInRegion(region, position);
      return nearest ? Math.sqrt(nearest.distanceSquared) : Infinity;
    }

    function interactionHitTest(region, position, padding = SERVICE_INTERACTION_HIT_PADDING_PX) {
      return distanceToRegion(region, position) <= Math.max(0, Number(padding) || 0);
    }

    function interactionAtWorldPoint(position) {
      return isRegionAt("npc", position) ? "clinic-healer-siu-moon" : null;
    }

    function isInRegion(region, position) {
      const mask = region === "npc" ? runtime?.masks.magenta : region === "exit" ? runtime?.masks.cyan : null;
      if (!mask || !position) return false;
      const x = Number(position.x);
      const y = Number(position.y);
      const radius = Number.isFinite(Number(position.radius)) ? Number(position.radius) : FEET_RADIUS;
      return insideDisk((px, py) => mask[py * EXPECTED_WIDTH + px] !== 0, x, y, radius, "any");
    }

    return Object.freeze({
      data,
      runtime,
      ready,
      failure,
      feetRadiusPx: FEET_RADIUS,
      serviceInteractionReachPx: SERVICE_INTERACTION_REACH_PX,
      serviceInteractionHitPaddingPx: SERVICE_INTERACTION_HIT_PADDING_PX,
      status() {
        return {
          ready,
          failed: !ready,
          failure,
          source: data?.source ? clone(data.source) : null,
          dimensions: { width: EXPECTED_WIDTH, height: EXPECTED_HEIGHT },
          feetRadiusPx: FEET_RADIUS,
        };
      },
      isPositionWalkable,
      isRegionAt,
      isInRegion,
      nearestPointInRegion,
      distanceToRegion,
      interactionHitTest,
      interactionAtWorldPoint,
      valueAt,
    });
  }

  const resolver = createResolver(generated);
  return Object.freeze({
    data: resolver.data,
    runtime: resolver.runtime,
    ready: resolver.ready,
    failure: resolver.failure,
    feetRadiusPx: resolver.feetRadiusPx,
    serviceInteractionReachPx: resolver.serviceInteractionReachPx,
    serviceInteractionHitPaddingPx: resolver.serviceInteractionHitPaddingPx,
    status: resolver.status,
    isPositionWalkable: resolver.isPositionWalkable,
    isRegionAt: resolver.isRegionAt,
    isInRegion: resolver.isInRegion,
    nearestPointInRegion: resolver.nearestPointInRegion,
    distanceToRegion: resolver.distanceToRegion,
    interactionHitTest: resolver.interactionHitTest,
    interactionAtWorldPoint: resolver.interactionAtWorldPoint,
    valueAt: resolver.valueAt,
    createResolver,
  });
});
