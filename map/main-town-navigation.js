(function (root, factory) {
  const generated = root.LanternMainTownNavigationGenerated || (typeof require === "function"
    ? require("./main-town-navigation.generated.js")
    : null);
  const api = factory(generated);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMainTownNavigation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (generated) {
  "use strict";

  const EXPECTED_WIDTH = 1536;
  const EXPECTED_HEIGHT = 1152;
  const MAIN_TOWN_ID = "world";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function validRuntime(candidate) {
    const validValues = (mask, maximum) => {
      if (!(mask instanceof Uint8Array) || mask.length !== EXPECTED_WIDTH * EXPECTED_HEIGHT) return false;
      for (const value of mask) if (value > maximum) return false;
      return true;
    };
    return Boolean(
      candidate && candidate.width === EXPECTED_WIDTH && candidate.height === EXPECTED_HEIGHT &&
      candidate.masks && validValues(candidate.masks.walkable, 1) &&
      validValues(candidate.masks.collision, 1) && validValues(candidate.masks.triggers, 2),
    );
  }

  function createResolver(source = generated) {
    const data = source?.package || null;
    const runtime = source && validRuntime(source) ? source : null;
    const sourceDimensionsValid = data?.source?.width === EXPECTED_WIDTH && data?.source?.height === EXPECTED_HEIGHT;
    const feetRadius = Number(data?.connectivity?.feet_radius_px);
    const sourceContractValid = sourceDimensionsValid && feetRadius === 3 &&
      typeof data?.movement_rule === "string" && data.movement_rule.includes("feet disk") &&
      Array.isArray(data?.building_triggers) && data.building_triggers.length === 5 &&
      data?.east_exit && Number.isFinite(data.east_exit.x) && Number.isFinite(data.east_exit.y);
    const ready = Boolean(runtime && sourceContractValid);
    const failure = ready
      ? null
      : !source
        ? "generated Main Town navigation data is unavailable"
        : !validRuntime(source)
          ? "generated Main Town navigation data is malformed"
          : !sourceContractValid
            ? "Main Town navigation source contract is invalid"
            : "Main Town navigation failed to initialize";

    function insideDisk(mask, x, y, radius, mode) {
      if (!ready || !mask || !Number.isFinite(x) || !Number.isFinite(y)) return false;
      const actualRadius = Math.max(0, Number(radius) || 0);
      const minX = Math.floor(x - actualRadius);
      const maxX = Math.ceil(x + actualRadius);
      const minY = Math.floor(y - actualRadius);
      const maxY = Math.ceil(y + actualRadius);
      const wantAllWhite = mode === "all-white";
      let hit = false;
      for (let py = minY; py <= maxY; py += 1) {
        for (let px = minX; px <= maxX; px += 1) {
          if ((px - x) ** 2 + (py - y) ** 2 > actualRadius ** 2) continue;
          const inside = px >= 0 && py >= 0 && px < EXPECTED_WIDTH && py < EXPECTED_HEIGHT && mask[py * EXPECTED_WIDTH + px] !== 0;
          if (wantAllWhite && !inside) return false;
          if (!wantAllWhite && inside) hit = true;
        }
      }
      return wantAllWhite ? true : hit;
    }

    function isWorldPositionWalkable(mapOrId, position, footprint = {}) {
      const mapId = typeof mapOrId === "string" ? mapOrId : mapOrId?.id;
      if (mapId !== MAIN_TOWN_ID || !ready) return false;
      const x = Number(position?.x);
      const y = Number(position?.y);
      const radius = Number.isFinite(Number(footprint?.radius)) ? Number(footprint.radius) : feetRadius;
      if (!Number.isFinite(x) || !Number.isFinite(y) || radius < 0) return false;
      return insideDisk(runtime.masks.walkable, x, y, radius, "all-white") &&
        !insideDisk(runtime.masks.collision, x, y, radius, "any-white");
    }

    function triggerValueAt(x, y) {
      if (!ready || !Number.isFinite(x) || !Number.isFinite(y)) return 0;
      const px = Math.floor(x);
      const py = Math.floor(y);
      if (px < 0 || py < 0 || px >= EXPECTED_WIDTH || py >= EXPECTED_HEIGHT) return 0;
      return runtime.masks.triggers[py * EXPECTED_WIDTH + px] || 0;
    }

    return Object.freeze({
      data,
      runtime,
      ready,
      failure,
      feetRadiusPx: ready ? feetRadius : 3,
      status() {
        return {
          ready,
          failed: !ready,
          failure,
          source: data?.source ? clone(data.source) : null,
          dimensions: { width: EXPECTED_WIDTH, height: EXPECTED_HEIGHT },
          feetRadiusPx: ready ? feetRadius : 3,
        };
      },
      isWorldPositionWalkable,
      triggerValueAt,
    });
  }

  const resolver = createResolver(generated);
  return Object.freeze({
    data: resolver.data,
    runtime: resolver.runtime,
    ready: resolver.ready,
    failure: resolver.failure,
    feetRadiusPx: resolver.feetRadiusPx,
    status: resolver.status,
    isWorldPositionWalkable: resolver.isWorldPositionWalkable,
    triggerValueAt: resolver.triggerValueAt,
    createResolver,
  });
});
