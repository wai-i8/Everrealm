(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("./map-constants.js") : null);
  const api = factory(constants);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMapHelpers = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants) {
  "use strict";

  const { TILE, TILES, TRANSITION_TYPES } = constants;

  function mulberry32(seed) {
    let value = seed >>> 0;
    return function random() {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function point(tx, ty, tileSize = TILE) {
    return { x: (tx + 0.5) * tileSize, y: (ty + 0.5) * tileSize };
  }

  function tileRect(tx, ty, tw, th, extra) {
    return Object.assign({ x: tx * TILE, y: ty * TILE, w: tw * TILE, h: th * TILE }, extra || {});
  }

  function makeTiles(width, height, fill) {
    return Array.from({ length: height }, () => Array(width).fill(fill));
  }

  function fillTiles(tiles, x, y, width, height, type) {
    for (let ty = y; ty < y + height; ty += 1) {
      for (let tx = x; tx < x + width; tx += 1) {
        if (tiles[ty]?.[tx] !== undefined) tiles[ty][tx] = type;
      }
    }
  }

  function paintDisc(tiles, cx, cy, radius, type) {
    for (let ty = Math.floor(cy - radius); ty <= Math.ceil(cy + radius); ty += 1) {
      for (let tx = Math.floor(cx - radius); tx <= Math.ceil(cx + radius); tx += 1) {
        if (Math.hypot(tx - cx, ty - cy) <= radius && tiles[ty]?.[tx] !== undefined) tiles[ty][tx] = type;
      }
    }
  }

  function paintLine(tiles, from, to, radius, type) {
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) * 2));
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      paintDisc(tiles, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, radius, type);
    }
  }

  function paintPath(tiles, points, radius = 1.2, type = TILES.PATH) {
    for (let index = 0; index < points.length - 1; index += 1) {
      paintLine(tiles, points[index], points[index + 1], radius, type);
    }
  }

  function makeExit(id, tx, ty, targetMap, targetSpawn, label, worldPosition, options = {}) {
    return {
      id,
      kind: "portal",
      interactionMode: options.interactionMode || "passage",
      transitionType: options.transitionType || TRANSITION_TYPES.PHYSICAL_PASSAGE,
      name: label,
      ...point(tx, ty),
      radius: 18,
      targetMap,
      targetSpawn,
      targetPosition: worldPosition || null,
      prompt: `E　${label}`,
      ...options,
    };
  }

  function withMapCollections(map) {
    map.pixelWidth = map.width * map.tileSize;
    map.pixelHeight = map.height * map.tileSize;
    map.exits = map.exits || [];
    map.portals = map.exits;
    map.interactables = [
      ...map.exits,
      ...(map.npcs || []),
      ...(map.boards || []),
      ...(map.chests || []),
      ...(map.shrine ? [map.shrine] : []),
      ...(map.waypoint && map.waypoint !== map.shrine ? [map.waypoint] : []),
    ];
    map.staticObjects = [
      ...(map.staticObjects || []),
      ...(map.solidRects || []),
      ...(map.furniture || []),
      ...(map.decorations || []),
      ...(map.boards || []),
      ...(map.chests || []),
      ...(map.shrine ? [map.shrine] : []),
    ].filter((object, index, all) => all.findIndex((candidate) => candidate.id === object.id) === index);
    map.collisionObjects = [
      ...(map.collisionObjects || []),
      ...(map.solidRects || []),
      ...(map.furniture || []).filter((item) => item.solid !== false),
    ].filter((object, index, all) => all.findIndex((candidate) => candidate.id === object.id) === index);
    return map;
  }

  function tileAt(map, tx, ty) {
    if (!map || tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return TILES.WALL;
    return map.tiles[ty][tx];
  }

  function isTileSolid(type) {
    return type === TILES.WATER || type === TILES.WALL;
  }

  return {
    TILE,
    TILES,
    TRANSITION_TYPES,
    mulberry32,
    point,
    tileRect,
    makeTiles,
    fillTiles,
    paintDisc,
    paintLine,
    paintPath,
    makeExit,
    withMapCollections,
    tileAt,
    isTileSolid,
  };
});
