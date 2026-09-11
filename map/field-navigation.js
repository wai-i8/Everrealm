(function (root, factory) {
  const generated = root.LanternFieldNavigationGenerated || (typeof require === "function" ? require("./field-navigation.generated.js") : null);
  const api = factory(generated);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternFieldNavigation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (generated) {
  "use strict";

  const FEET_RADIUS = 3;
  const SERVICE_INTERACTION_REACH_PX = 160;
  const SERVICE_INTERACTION_HIT_PADDING_PX = 18;
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function createResolver(source = generated) {
    const data = source?.package || null;
    const expectedWidth = Number(data?.source?.width) || 0;
    const expectedHeight = Number(data?.source?.height) || 0;

    function validMask(mask) {
      if (!(mask instanceof Uint8Array) || !expectedWidth || !expectedHeight || mask.length !== expectedWidth * expectedHeight) return false;
      for (const value of mask) if (value > 1) return false;
      return true;
    }

    function validRuntime(candidate) {
      return Boolean(candidate && candidate.width === expectedWidth && candidate.height === expectedHeight && candidate.masks &&
        validMask(candidate.masks.white) && validMask(candidate.masks.magenta) && validMask(candidate.masks.cyan));
    }

    const runtime = source && validRuntime(source) ? source : null;
    const expectedImage = data?.authoring?.image;
    const sourceValid = data?.source?.width === expectedWidth && data?.source?.height === expectedHeight &&
      data?.authoring?.image === expectedImage && data?.authoring?.matching === "exact opaque RGB colors only; all other pixels are non-authored" &&
      data?.feet_radius_px === FEET_RADIUS && typeof data?.movement_rule === "string" && data.movement_rule.includes("feet disk") &&
      data?.regions?.npc?.length > 0 && data?.regions?.exit?.length > 0;
    const ready = Boolean(runtime && sourceValid);
    const failure = ready
      ? null
      : !source ? "generated field navigation data is unavailable"
        : !validRuntime(source) ? "generated field navigation data is malformed"
          : !sourceValid ? "field navigation source contract is invalid"
            : "field navigation failed to initialize";

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
          const inside = px >= 0 && py >= 0 && px < expectedWidth && py < expectedHeight && maskPredicate(px, py);
          if (mode === "all" && !inside) return false;
          if (mode === "any" && inside) hit = true;
        }
      }
      return mode === "all" ? true : hit;
    }

    function valueAt(mask, x, y) {
      const px = Math.floor(Number(x));
      const py = Math.floor(Number(y));
      if (!ready || !Number.isFinite(px) || !Number.isFinite(py) || px < 0 || py < 0 || px >= expectedWidth || py >= expectedHeight) return 0;
      return mask[py * expectedWidth + px] || 0;
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
        const maxX = Math.min(expectedWidth - 1, Math.ceil(bbox.x + bbox.width) - 1);
        const maxY = Math.min(expectedHeight - 1, Math.ceil(bbox.y + bbox.height) - 1);
        for (let py = minY; py <= maxY; py += 1) {
          for (let px = minX; px <= maxX; px += 1) {
            if (!mask[py * expectedWidth + px]) continue;
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
      return insideDisk((px, py) => runtime.masks.white[py * expectedWidth + px] !== 0 || runtime.masks.cyan[py * expectedWidth + px] !== 0, x, y, radius, "all") &&
        !insideDisk((px, py) => runtime.masks.magenta[py * expectedWidth + px] !== 0, x, y, radius, "any");
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
      return insideDisk((px, py) => mask[py * expectedWidth + px] !== 0, x, y, radius, "any");
    }

    function distanceToRegion(region, position) {
      const nearest = nearestPointInRegion(region, position);
      return nearest ? Math.sqrt(nearest.distanceSquared) : Infinity;
    }

    function interactionHitTest(region, position, padding = SERVICE_INTERACTION_HIT_PADDING_PX) {
      const mask = maskFor(region);
      const x = Number(position?.x);
      const y = Number(position?.y);
      const reach = Math.max(0, Number(padding) || 0);
      if (!ready || !mask || !Number.isFinite(x) || !Number.isFinite(y)) return false;
      const reachSquared = reach * reach;
      // Hot click path: only inspect pixels near the pointer. The previous
      // implementation searched every authored region pixel just to answer a
      // small hit-test, which caused visible pointerdown stalls on the 10k map.
      for (const entry of regionEntries(region)) {
        const bbox = entry?.bbox;
        if (!bbox) continue;
        const left = Number(bbox.x);
        const top = Number(bbox.y);
        const right = left + Number(bbox.width);
        const bottom = top + Number(bbox.height);
        if (![left, top, right, bottom].every(Number.isFinite)) continue;
        if (x < left - reach || x > right + reach || y < top - reach || y > bottom + reach) continue;
        const minX = Math.max(0, Math.floor(x - reach), Math.floor(left));
        const maxX = Math.min(expectedWidth - 1, Math.ceil(x + reach), Math.ceil(right) - 1);
        const minY = Math.max(0, Math.floor(y - reach), Math.floor(top));
        const maxY = Math.min(expectedHeight - 1, Math.ceil(y + reach), Math.ceil(bottom) - 1);
        for (let py = minY; py <= maxY; py += 1) {
          const dy = py - y;
          for (let px = minX; px <= maxX; px += 1) {
            const dx = px - x;
            if (dx * dx + dy * dy > reachSquared) continue;
            if (mask[py * expectedWidth + px]) return true;
          }
        }
      }
      return false;
    }

    function interactionAtWorldPoint(position) {
      return isRegionAt("npc", position) ? "mountain-wish-pool" : null;
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
        return { ready, failed: !ready, failure, source: data?.source ? clone(data.source) : null, dimensions: { width: expectedWidth, height: expectedHeight }, feetRadiusPx: FEET_RADIUS };
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
    ...resolver,
    createResolver,
  });
});
