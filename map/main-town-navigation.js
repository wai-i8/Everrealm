(function (root, factory) {
  const generated = root.LanternMainTownNavigationGenerated || (typeof require === "function"
    ? require("./main-town-navigation.generated.js")
    : null);
  const api = factory(generated);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMainTownNavigation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (generated) {
  "use strict";

  const EXPECTED_WIDTH = 7680;
  const EXPECTED_HEIGHT = 4320;
  const MAIN_TOWN_ID = "world";
  const DECK_REGION_VALUE = 7;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function validRuntime(candidate) {
    const validShape = (mask) => mask instanceof Uint8Array && mask.length === EXPECTED_WIDTH * EXPECTED_HEIGHT;
    if (!(
      candidate && candidate.width === EXPECTED_WIDTH && candidate.height === EXPECTED_HEIGHT && candidate.masks &&
      validShape(candidate.masks.walkable) && validShape(candidate.masks.collision) && validShape(candidate.masks.triggers)
    )) return false;
    if (candidate.maskValuesValidated === true) return true;
    const validValues = (mask, maximum) => {
      for (const value of mask) if (value > maximum) return false;
      return true;
    };
    return validValues(candidate.masks.walkable, 1) && validValues(candidate.masks.collision, 1) &&
      validValues(candidate.masks.triggers, DECK_REGION_VALUE);
  }

  function createResolver(source = generated) {
    const data = source?.package || null;
    const runtimeValid = Boolean(source && validRuntime(source));
    const runtime = runtimeValid ? source : null;
    const sourceDimensionsValid = data?.source?.width === EXPECTED_WIDTH && data?.source?.height === EXPECTED_HEIGHT &&
      data?.authoring?.image === "assets/main-town/maintown_walkable.jpg" &&
      data?.authoring?.width === EXPECTED_WIDTH && data?.authoring?.height === EXPECTED_HEIGHT;
    const feetRadius = Number(data?.connectivity?.feet_radius_px);
    const sourceContractValid = sourceDimensionsValid && feetRadius === 3 &&
      typeof data?.movement_rule === "string" && data.movement_rule.includes("feet disk") &&
      Array.isArray(data?.building_triggers) && data.building_triggers.length === 5 &&
      data?.east_exit && Number.isFinite(data.east_exit.x) && Number.isFinite(data.east_exit.y) &&
      data?.deck_interaction?.region_value === DECK_REGION_VALUE;
    const ready = Boolean(runtime && sourceContractValid);
    const failure = ready
      ? null
      : !source
        ? "generated Main Town navigation data is unavailable"
        : !runtimeValid
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
      const wantAll = mode === "all";
      let hit = false;
      for (let py = minY; py <= maxY; py += 1) {
        for (let px = minX; px <= maxX; px += 1) {
          if ((px - x) ** 2 + (py - y) ** 2 > actualRadius ** 2) continue;
          const inside = px >= 0 && py >= 0 && px < EXPECTED_WIDTH && py < EXPECTED_HEIGHT && mask[py * EXPECTED_WIDTH + px] !== 0;
          if (wantAll && !inside) return false;
          if (!wantAll && inside) hit = true;
        }
      }
      return wantAll ? true : hit;
    }

    function isWorldPositionWalkable(mapOrId, position, footprint = {}) {
      const mapId = typeof mapOrId === "string" ? mapOrId : mapOrId?.id;
      if (mapId !== MAIN_TOWN_ID || !ready) return false;
      const x = Number(position?.x);
      const y = Number(position?.y);
      const requestedRadius = Number(footprint?.radius);
      const radius = Number.isFinite(requestedRadius) ? requestedRadius : feetRadius;
      if (!Number.isFinite(x) || !Number.isFinite(y) || radius < 0) return false;

      // Hot path: pathfinding and movement need the same exact feet-disk
      // semantics, so combine the allowlist and collision checks into one
      // scan instead of walking the disk twice.
      const minX = Math.floor(x - radius);
      const maxX = Math.ceil(x + radius);
      const minY = Math.floor(y - radius);
      const maxY = Math.ceil(y + radius);
      const radiusSquared = radius * radius;
      const walkable = runtime.masks.walkable;
      const collision = runtime.masks.collision;
      for (let py = minY; py <= maxY; py += 1) {
        const dy = py - y;
        for (let px = minX; px <= maxX; px += 1) {
          const dx = px - x;
          if (dx * dx + dy * dy > radiusSquared) continue;
          if (px < 0 || py < 0 || px >= EXPECTED_WIDTH || py >= EXPECTED_HEIGHT) return false;
          const index = py * EXPECTED_WIDTH + px;
          if (walkable[index] === 0 || collision[index] !== 0) return false;
        }
      }
      return true;
    }

    function triggerValueAt(x, y) {
      if (!ready || !Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return 0;
      const px = Math.floor(Number(x));
      const py = Math.floor(Number(y));
      if (px < 0 || py < 0 || px >= EXPECTED_WIDTH || py >= EXPECTED_HEIGHT) return 0;
      return runtime.masks.triggers[py * EXPECTED_WIDTH + px] || 0;
    }

    function regionValue(region) {
      if (region === "deck" || region === "deck-configuration") return DECK_REGION_VALUE;
      if (region === "east" || region === "east-exit") return Number(data?.east_exit?.region_value) || 6;
      const building = data?.building_triggers?.find((entry) => entry.region_id === region || entry.name === region);
      return Number(building?.region_value) || 0;
    }

    function isInRegion(region, position) {
      const value = regionValue(region);
      if (!value || !Number.isFinite(Number(position?.x)) || !Number.isFinite(Number(position?.y))) return false;
      const x = Number(position.x);
      const y = Number(position.y);
      const radius = Number.isFinite(Number(position.radius)) ? Number(position.radius) : feetRadius;
      const actualRadius = Math.max(0, Number(radius) || 0);
      const minX = Math.floor(x - actualRadius);
      const maxX = Math.ceil(x + actualRadius);
      const minY = Math.floor(y - actualRadius);
      const maxY = Math.ceil(y + actualRadius);
      for (let py = minY; py <= maxY; py += 1) {
        for (let px = minX; px <= maxX; px += 1) {
          if ((px - x) ** 2 + (py - y) ** 2 > actualRadius ** 2) continue;
          if (px >= 0 && py >= 0 && px < EXPECTED_WIDTH && py < EXPECTED_HEIGHT && runtime.masks.triggers[py * EXPECTED_WIDTH + px] === value) return true;
        }
      }
      return false;
    }

    function interactionAtWorldPoint(position) {
      return triggerValueAt(position?.x, position?.y) === DECK_REGION_VALUE ? "harbour-gate-deck-console" : null;
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
          authoring: data?.authoring ? clone(data.authoring) : null,
          dimensions: { width: EXPECTED_WIDTH, height: EXPECTED_HEIGHT },
          feetRadiusPx: ready ? feetRadius : 3,
        };
      },
      isWorldPositionWalkable,
      triggerValueAt,
      isInRegion,
      interactionAtWorldPoint,
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
    isInRegion: resolver.isInRegion,
    interactionAtWorldPoint: resolver.interactionAtWorldPoint,
    createResolver,
  });
});
