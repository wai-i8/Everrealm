(function (root, factory) {
  const helpers = root.LanternMapHelpers || (typeof require === "function" ? require("./map-helpers.js") : null);
  const api = factory(helpers);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternInteriorHelpers = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (helpers) {
  "use strict";
  const { TILE, TILES, TRANSITION_TYPES } = helpers;
  const { makeTiles, fillTiles, tileRect, point, makeExit, withMapCollections } = helpers;

  function createInteriorMap(options) {
    const { width, height, floor, features, furniture, decorations, npcs, exit, map } = options;
    const tiles = makeTiles(width, height, floor ?? TILES.WALL);
    for (const feature of features || []) fillTiles(tiles, feature.x, feature.y, feature.w, feature.h, feature.type);
    const exits = [makeExit(
      exit.id,
      exit.tx,
      exit.ty,
      exit.targetMap,
      exit.targetSpawn,
      exit.label,
      exit.targetPosition,
      {
        interactionMode: exit.interactionMode || "door",
        transitionType: exit.transitionType || TRANSITION_TYPES.PHYSICAL_DOOR,
        targetFacing: exit.targetFacing,
        entrance: exit.entrance || {
          outward: exit.outward || "south",
          threshold: { shape: "rect", widthTiles: 1.2, depthTiles: .65 },
          approachDistanceTiles: 1.05,
          entryFacing: exit.entryFacing || "down",
          returnFacing: exit.returnFacing || null,
          marker: { kind: "bitmap", sprite: "interact", size: 34, anchorX: .5, anchorY: .5 },
        },
      },
    )];
    return withMapCollections({
      ...map,
      tileSize: TILE,
      tileTypes: TILES,
      width,
      height,
      tiles,
      start: map.start || point(exit.tx, exit.ty - 1),
      spawnPoints: map.spawnPoints || { entrance: map.start || point(exit.tx, exit.ty - 1) },
      exits,
      solidRects: map.solidRects || [],
      furniture: furniture || [],
      decorations: decorations || [],
      boards: map.boards || [],
      npcs: npcs || [],
      enemySpawns: map.enemySpawns || [],
      chests: map.chests || [],
      shrine: map.shrine || null,
      waypoint: map.waypoint || null,
    });
  }

  function rect(tx, ty, tw, th, extra) { return tileRect(tx, ty, tw, th, extra); }
  return { createInteriorMap, rect, point };
});
