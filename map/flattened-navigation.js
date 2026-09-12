(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternFlattenedNavigation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_WIDTH = 1672;
  const DEFAULT_HEIGHT = 941;
  const FEET_RADIUS = 3;
  const SERVICE_INTERACTION_REACH_PX = 160;
  const SERVICE_INTERACTION_HIT_PADDING_PX = 18;
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function positiveDimension(value) {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  function validMask(mask, width, height) {
    if (!(mask instanceof Uint8Array) || !positiveDimension(width) || !positiveDimension(height) || mask.length !== width * height) return false;
    for (const value of mask) if (value > 1) return false;
    return true;
  }

  function validRuntime(candidate) {
    const width = positiveDimension(candidate?.width);
    const height = positiveDimension(candidate?.height);
    return Boolean(width && height && candidate?.masks &&
      validMask(candidate.masks.white, width, height) && validMask(candidate.masks.magenta, width, height) && validMask(candidate.masks.cyan, width, height));
  }

  function createResolver(source, options = {}) {
    const data = source?.package || null;
    const runtime = source && validRuntime(source) ? source : null;
    const width = runtime?.width || positiveDimension(data?.source?.width) || DEFAULT_WIDTH;
    const height = runtime?.height || positiveDimension(data?.source?.height) || DEFAULT_HEIGHT;
    const sourceScale = Math.max(1, Math.min(width / DEFAULT_WIDTH, height / DEFAULT_HEIGHT));
    const serviceInteractionReachPx = Math.round(SERVICE_INTERACTION_REACH_PX * sourceScale);
    const serviceInteractionHitPaddingPx = Math.round(SERVICE_INTERACTION_HIT_PADDING_PX * sourceScale);
    const expectedImage = options.authoringImage || data?.authoring?.image;
    const sourceValid = data?.source?.width === width && data?.source?.height === height &&
      data?.authoring?.image === expectedImage && data?.authoring?.matching === "exact opaque RGB colors only; all other pixels are non-authored" &&
      data?.feet_radius_px === FEET_RADIUS && typeof data?.movement_rule === "string" && data.movement_rule.includes("feet disk") &&
      data?.regions?.npc?.length > 0 && data?.regions?.exit?.length > 0;
    const ready = Boolean(runtime && sourceValid);
    const scene = options.scene || data?.scene || "flattened";
    const failure = ready
      ? null
      : !source ? `generated ${scene} navigation data is unavailable`
        : !validRuntime(source) ? `generated ${scene} navigation data is malformed`
          : !sourceValid ? `${scene} navigation source contract is invalid`
            : `${scene} navigation failed to initialize`;

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
          const inside = px >= 0 && py >= 0 && px < width && py < height && maskPredicate(px, py);
          if (mode === "all" && !inside) return false;
          if (mode === "any" && inside) hit = true;
        }
      }
      return mode === "all" ? true : hit;
    }

    function valueAt(mask, x, y) {
      const px = Math.floor(Number(x));
      const py = Math.floor(Number(y));
      if (!ready || !Number.isFinite(px) || !Number.isFinite(py) || px < 0 || py < 0 || px >= width || py >= height) return 0;
      return mask[py * width + px] || 0;
    }

    function maskFor(region) {
      return region === "npc" ? runtime?.masks.magenta : region === "exit" ? runtime?.masks.cyan : null;
    }

    function regionEntries(region) {
      return data?.regions?.[region] || [];
    }

    function nearestPointInRegion(region, position) {
      const mask = maskFor(region);
      const x = Number(position?.x);
      const y = Number(position?.y);
      if (!ready || !mask || !Number.isFinite(x) || !Number.isFinite(y)) return null;
      let best = null;
      for (const entry of regionEntries(region)) {
        const bbox = entry?.bbox;
        if (!bbox || !Number.isFinite(bbox.x) || !Number.isFinite(bbox.y) || !Number.isFinite(bbox.width) || !Number.isFinite(bbox.height)) continue;
        const minX = Math.max(0, Math.floor(bbox.x));
        const minY = Math.max(0, Math.floor(bbox.y));
        const maxX = Math.min(width - 1, Math.ceil(bbox.x + bbox.width) - 1);
        const maxY = Math.min(height - 1, Math.ceil(bbox.y + bbox.height) - 1);
        for (let py = minY; py <= maxY; py += 1) {
          for (let px = minX; px <= maxX; px += 1) {
            if (!mask[py * width + px]) continue;
            const distanceSquared = (px - x) ** 2 + (py - y) ** 2;
            if (!best || distanceSquared < best.distanceSquared) best = { x: px, y: py, distanceSquared };
          }
        }
      }
      return best;
    }

    function isPositionWalkable(position, footprint = {}) {
      if (!ready) return false;
      const x = Number(position?.x);
      const y = Number(position?.y);
      const radius = Number.isFinite(Number(footprint?.radius)) ? Number(footprint.radius) : FEET_RADIUS;
      if (!Number.isFinite(x) || !Number.isFinite(y) || radius < 0) return false;
      return insideDisk((px, py) => runtime.masks.white[py * width + px] !== 0 || runtime.masks.cyan[py * width + px] !== 0, x, y, radius, "all") &&
        !insideDisk((px, py) => runtime.masks.magenta[py * width + px] !== 0, x, y, radius, "any");
    }

    function isRegionAt(region, position) {
      const mask = maskFor(region);
      return Boolean(mask && valueAt(mask, position?.x, position?.y));
    }

    function isInRegion(region, position) {
      const mask = maskFor(region);
      if (!mask || !position) return false;
      const x = Number(position.x);
      const y = Number(position.y);
      const radius = Number.isFinite(Number(position.radius)) ? Number(position.radius) : FEET_RADIUS;
      return insideDisk((px, py) => mask[py * width + px] !== 0, x, y, radius, "any");
    }

    function distanceToRegion(region, position) {
      const nearest = nearestPointInRegion(region, position);
      return nearest ? Math.sqrt(nearest.distanceSquared) : Infinity;
    }

    function interactionHitTest(region, position, padding = serviceInteractionHitPaddingPx) {
      return distanceToRegion(region, position) <= Math.max(0, Number(padding) || 0);
    }

    function interactionAtWorldPoint(position) {
      return isRegionAt("npc", position) ? (options.npcId || "flattened-npc") : null;
    }

    return Object.freeze({
      data,
      runtime,
      ready,
      failure,
      feetRadiusPx: FEET_RADIUS,
      serviceInteractionReachPx,
      serviceInteractionHitPaddingPx,
      status() {
        return { ready, failed: !ready, failure, source: data?.source ? clone(data.source) : null, dimensions: { width, height }, feetRadiusPx: FEET_RADIUS, serviceInteractionReachPx, serviceInteractionHitPaddingPx };
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

  return Object.freeze({ EXPECTED_WIDTH: DEFAULT_WIDTH, EXPECTED_HEIGHT: DEFAULT_HEIGHT, FEET_RADIUS, createResolver });
});
