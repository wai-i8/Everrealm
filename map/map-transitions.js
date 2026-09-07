(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("./map-constants.js") : null);
  const helpers = root.LanternMapHelpers || (typeof require === "function" ? require("./map-helpers.js") : null);
  const api = factory(constants, helpers);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMapTransitions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, helpers) {
  "use strict";
  const { TILE, MAP_IDS, TRANSITION_TYPES } = constants;
  const { point } = helpers;

  const DEFAULT_ENTRANCE_MARKER = Object.freeze({
    kind: "bitmap",
    // Bottom-left frame (index 2) of marker-atlas-v1: the shared physical
    // interaction marker for doors and ordinary passages.
    sprite: "interact",
    size: 34,
    anchorX: .5,
    anchorY: .5,
  });

  const HOUSE_SPRITE_PROFILES = Object.freeze({
    "keeper-house": Object.freeze({ sprite: "guildHouse", widthScale: 1.12, heightScale: 1.4, anchorY: 1.125 }),
    forge: Object.freeze({ sprite: "forgeHouse", widthScale: 1.12, heightScale: 1.4, anchorY: 1.26 }),
    "tea-house": Object.freeze({ sprite: "teaHouse", widthScale: .86, heightScale: 1.02, anchorY: 1.1 }),
    clinic: Object.freeze({ sprite: "teaHouse", widthScale: .92, heightScale: 1.08, anchorY: 1.1 }),
    "general-store": Object.freeze({ sprite: "teaHouse", widthScale: .8, heightScale: .96, anchorY: 1.1 }),
    default: Object.freeze({ sprite: "cottage", widthScale: 1.12, heightScale: 1.4, anchorY: 1.1 }),
  });

  function houseSpriteSettings(house) {
    const profile = HOUSE_SPRITE_PROFILES[house?.id] || HOUSE_SPRITE_PROFILES.default;
    if (house?.bitmap) return { sprite: house.sprite, standalone: true, x: house.x + house.w / 2, y: house.y + house.h, width: house.spriteWidth || house.w, height: house.spriteHeight || house.h, anchorX: .5, anchorY: house.spriteAnchorY ?? 1 };
    const spriteSize = Math.max(house.w * profile.widthScale, house.h * profile.heightScale);
    // Environment atlas sprites are drawn with a bottom anchor. Keeping the
    // same anchor in the semantic settings makes the resolved doorway and the
    // visible sprite agree even when the atlas image is not square.
    return { sprite: house.sprite || profile.sprite, x: house.x + house.w / 2, y: house.y + house.h * profile.anchorY, width: spriteSize, height: spriteSize, anchorX: .5, anchorY: 1 };
  }

  // Resolve semantic bitmap metadata into the world-space point used by both
  // the renderer and the transition trigger. The image remains presentation;
  // the resolved point is the physical doorway contract.
  function resolveHouseDoorAnchor(house) {
    if (!house) return null;
    const settings = houseSpriteSettings(house);
    if (house.doorAnchor) {
      const anchor = house.doorAnchor;
      const resolved = {
        x: settings.x + settings.width * (anchor.x - settings.anchorX),
        y: settings.y - settings.height * settings.anchorY + settings.height * anchor.y,
      };
      house.doorX = resolved.x;
      house.doorY = resolved.y;
      return resolved;
    }
    const fallback = { x: Number.isFinite(house.doorX) ? house.doorX : house.x + house.w / 2, y: Number.isFinite(house.doorY) ? house.doorY : house.y + house.h };
    house.doorX = fallback.x;
    house.doorY = fallback.y;
    return fallback;
  }

  function transitionTypeFor(transition) {
    if (transition?.transitionType && transition.transitionType !== "physical") return transition.transitionType;
    if (transition?.interactionMode === "door") return TRANSITION_TYPES.PHYSICAL_DOOR;
    if (transition?.interactionMode === "gate") return TRANSITION_TYPES.PHYSICAL_GATE;
    return TRANSITION_TYPES.PHYSICAL_PASSAGE;
  }

  function normalizeTransition(transition) {
    if (!transition) return transition;
    transition.transitionType = transitionTypeFor(transition);
    if (!transition.interactionMode) {
      transition.interactionMode = transition.transitionType === TRANSITION_TYPES.PHYSICAL_DOOR
        ? "door"
        : transition.transitionType === TRANSITION_TYPES.PHYSICAL_GATE ? "gate" : "passage";
    }
    return transition;
  }

  function isMagicalTeleport(transition) {
    return transitionTypeFor(transition) === TRANSITION_TYPES.MAGIC_TELEPORT;
  }

  function isPhysicalTransition(transition) {
    return !isMagicalTeleport(transition);
  }

  function directionVector(direction) {
    if (direction === "north") return { x: 0, y: -1 };
    if (direction === "west") return { x: -1, y: 0 };
    if (direction === "east") return { x: 1, y: 0 };
    return { x: 0, y: 1 };
  }

  function oppositeDirection(direction) {
    if (direction === "north") return "down";
    if (direction === "west") return "right";
    if (direction === "east") return "left";
    return "up";
  }

  function copyPoint(position) {
    return position && Number.isFinite(position.x) && Number.isFinite(position.y)
      ? { x: position.x, y: position.y }
      : null;
  }

  function resolveThreshold(doorAnchor, rawThreshold, outward) {
    const threshold = rawThreshold || {};
    if ([threshold.x, threshold.y, threshold.w, threshold.h].every(Number.isFinite)) {
      return {
        shape: "rect",
        x: threshold.x,
        y: threshold.y,
        w: Math.max(1, threshold.w),
        h: Math.max(1, threshold.h),
        outward,
      };
    }
    const width = Math.max(1, Number(threshold.width) || Number(threshold.widthTiles) * TILE || 1.2 * TILE);
    const depth = Math.max(1, Number(threshold.depth) || Number(threshold.depthTiles) * TILE || .65 * TILE);
    const centreOffset = Number(threshold.offsetTiles) * TILE || 0;
    const vector = directionVector(outward);
    const centre = {
      x: doorAnchor.x + vector.x * centreOffset,
      y: doorAnchor.y + vector.y * centreOffset,
    };
    return { shape: "rect", x: centre.x - width / 2, y: centre.y - depth / 2, w: width, h: depth, outward };
  }

  function normalizeAuthoredRect(rect) {
    if (!rect || ![rect.x, rect.y, rect.w ?? rect.width, rect.h ?? rect.height].every(Number.isFinite)) return null;
    return {
      shape: "rect",
      x: rect.x,
      y: rect.y,
      w: Math.max(1, rect.w ?? rect.width),
      h: Math.max(1, rect.h ?? rect.height),
    };
  }

  // Shared data contract for a physical doorway. Authored pixel rectangles
  // remain exact at runtime; legacy callers may still provide tile-derived
  // threshold metadata and receive the same normalized contract.
  function resolveEntranceContract(doorAnchor, rawEntrance = {}, exteriorSpawn = null) {
    const door = copyPoint(doorAnchor);
    if (!door) return null;
    const outward = rawEntrance.outward || "south";
    const vector = directionVector(outward);
    const threshold = resolveThreshold(door, rawEntrance.threshold, outward);
    const authoredApproach = copyPoint(rawEntrance.approachPoint);
    const approachDistance = Number(rawEntrance.approachDistance) || Number(rawEntrance.approachDistanceTiles) * TILE || 1.05 * TILE;
    const approachPoint = authoredApproach || {
      x: door.x + vector.x * approachDistance,
      y: door.y + vector.y * approachDistance,
    };
    const marker = { ...DEFAULT_ENTRANCE_MARKER, ...(rawEntrance.marker || {}) };
    const trigger = normalizeAuthoredRect(rawEntrance.trigger);
    return {
      doorAnchor: door,
      approachPoint,
      threshold,
      ...(trigger ? { trigger } : {}),
      exteriorSpawn: copyPoint(exteriorSpawn) || copyPoint(rawEntrance.exteriorSpawn),
      entryFacing: rawEntrance.entryFacing || oppositeDirection(outward),
      returnFacing: rawEntrance.returnFacing || null,
      outward,
      marker,
    };
  }

  function applyEntranceContract(transition, contract) {
    if (!transition || !contract) return transition;
    transition.entrance = contract;
    // Keep flat aliases for renderer/debug consumers and older integrations.
    transition.doorAnchor = contract.doorAnchor;
    transition.approachPoint = contract.approachPoint;
    transition.threshold = contract.threshold;
    transition.trigger = contract.trigger || transition.trigger || null;
    transition.exteriorSpawn = contract.exteriorSpawn;
    transition.entryFacing = contract.entryFacing;
    transition.returnFacing = contract.returnFacing;
    transition.marker = contract.marker;
    return transition;
  }

  function entranceFor(transition) {
    return transition?.entrance || null;
  }

  function pointInThreshold(transition, position) {
    const threshold = entranceFor(transition)?.threshold || transition?.threshold;
    if (!threshold || !position) return false;
    if (threshold.shape !== "rect") return false;
    return position.x >= threshold.x
      && position.x < threshold.x + threshold.w
      && position.y >= threshold.y
      && position.y < threshold.y + threshold.h;
  }

  function pointInTrigger(transition, position) {
    const trigger = transition?.trigger || entranceFor(transition)?.trigger;
    if (!trigger || trigger.shape !== "rect" || !position) return false;
    return position.x >= trigger.x
      && position.x < trigger.x + trigger.w
      && position.y >= trigger.y
      && position.y < trigger.y + trigger.h;
  }

  function copyPosition(position) {
    return position && Number.isFinite(position.x) && Number.isFinite(position.y)
      ? { x: position.x, y: position.y }
      : null;
  }

  function ensureMapShape(map, id) {
    map.id = map.id || id;
    map.name = map.name || (id === MAP_IDS.WORLD ? "霧都" : id);
    for (const key of ["houses", "trees", "rocks", "flowers", "lamps", "npcs", "signs", "chests", "staticObjects", "enemySpawns", "portals", "exits", "boards", "collisionObjects", "decorations"]) if (!Array.isArray(map[key])) map[key] = [];
    if (!map.gate) map.gate = { id: `${id}-no-gate`, x: -9999, y: -9999, w: 0, h: 0 };
    if (!map.shrine) map.shrine = null;
    if (!map.spawnPoints) map.spawnPoints = {};
    map.exits = map.exits || map.portals;
    map.portals = map.exits;
    return map;
  }

  function upsertPortal(map, portal) {
    const index = map.exits.findIndex((entry) => entry.id === portal.id);
    if (index >= 0) map.exits[index] = { ...map.exits[index], ...portal };
    else map.exits.push(portal);
    map.portals = map.exits;
    return map.exits[index >= 0 ? index : map.exits.length - 1];
  }

  function resolveMapTransitions(maps) {
    for (const [id, map] of Object.entries(maps)) ensureMapShape(map, id);
    const town = maps[MAP_IDS.WORLD];
    if (!town) return maps;

    for (const house of town.houses) resolveHouseDoorAnchor(house);
    for (const link of town.transitionLinks || []) {
      const house = town.houses.find((candidate) => candidate.id === link.houseId);
      const door = resolveHouseDoorAnchor(house);
      const target = maps[link.targetMap];
      if (!door || !target) continue;
      const returnPosition = copyPosition(town.spawnPoints?.[link.returnSpawn]);
      const entrance = resolveEntranceContract(door, {
        ...(link.entrance || {}),
        entryFacing: link.entrance?.entryFacing || link.entryFacing,
        returnFacing: link.entrance?.returnFacing || link.returnFacing,
      }, returnPosition);
      // Keep the resolved facing aliases on the authored link for save/debug
      // tooling and older map consumers that read the link directly.
      link.entryFacing = entrance.entryFacing;
      link.returnFacing = entrance.returnFacing;
      upsertPortal(town, {
        id: link.portalId,
        kind: "portal",
        transitionType: TRANSITION_TYPES.PHYSICAL_DOOR,
        interactionMode: "door",
        houseId: link.houseId,
        anchor: { type: "door", x: door.x, y: door.y },
        entrance,
        ...entrance,
        name: link.name,
        mapLabel: link.mapLabel,
        alwaysVisible: true,
        markerSize: 30,
        x: door.x,
        y: door.y,
        radius: 22,
        targetMap: link.targetMap,
        targetSpawn: link.targetSpawn,
        targetPosition: target.spawnPoints?.[link.targetSpawn] || target.start,
        targetFacing: target.spawnFacings?.[link.targetSpawn] || entrance.entryFacing || null,
        returnSpawn: link.returnSpawn || null,
        returnPosition,
        returnFacing: entrance.returnFacing || null,
        prompt: link.prompt,
      });
      const destination = maps[link.targetMap];
      const exit = destination.exits.find((candidate) => candidate.targetMap === MAP_IDS.WORLD && candidate.targetSpawn === link.returnSpawn);
      if (exit) {
        normalizeTransition(exit);
        exit.sourceMapId = link.targetMap;
        exit.sourceTransitionId = link.portalId;
        exit.returnPosition = copyPoint(door);
        exit.returnFacing = entrance.entryFacing || null;
        if (returnPosition) exit.targetPosition = returnPosition;
        if (entrance.returnFacing) exit.targetFacing = entrance.returnFacing;
        applyEntranceContract(exit, resolveEntranceContract(
          { x: exit.x, y: exit.y },
          {
            ...(exit.entrance || {}),
            entryFacing: exit.entrance?.entryFacing || "down",
            returnFacing: entrance.returnFacing,
          },
          returnPosition,
        ));
      }
    }

    for (const [sourceId, map] of Object.entries(maps)) {
      for (const exit of map.exits) {
        exit.sourceMapId = sourceId;
        normalizeTransition(exit);
        const target = maps[exit.targetMap];
        if (!target) continue;
        if (exit.targetSpawn && target.spawnPoints?.[exit.targetSpawn]) {
          exit.targetPosition = target.spawnPoints[exit.targetSpawn];
          exit.targetFacing = exit.targetFacing || target.spawnFacings?.[exit.targetSpawn] || null;
        }
        if (exit.transitionType === TRANSITION_TYPES.PHYSICAL_DOOR && !exit.entrance) {
          applyEntranceContract(exit, resolveEntranceContract(
            { x: exit.x, y: exit.y },
            { outward: exit.outward || "south", entryFacing: exit.entryFacing || "down", returnFacing: exit.returnFacing },
            exit.targetPosition,
          ));
        }
      }
    }
    town.exits = town.portals;
    return maps;
  }

  function resolveDestination(maps, transition) {
    return resolveArrival(maps, transition)?.position || null;
  }

  function resolveArrival(maps, transition) {
    const target = maps?.[transition?.targetMap];
    if (!target) return null;
    return {
      position: target.spawnPoints?.[transition.targetSpawn] || transition.targetPosition || target.start || point(1, 1),
      facing: transition.targetFacing || target.spawnFacings?.[transition.targetSpawn] || null,
      transitionType: transitionTypeFor(transition),
    };
  }

  return {
    TRANSITION_TYPES,
    HOUSE_SPRITE_PROFILES,
    houseSpriteSettings,
    transitionTypeFor,
    normalizeTransition,
    isMagicalTeleport,
    isPhysicalTransition,
    resolveEntranceContract,
    applyEntranceContract,
    entranceFor,
    pointInThreshold,
    pointInTrigger,
    resolveHouseDoorAnchor,
    resolveMapTransitions,
    resolveDestination,
    resolveArrival,
  };
});
