(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../map/map-constants.js") : null);
  const helpers = root.LanternMapHelpers || (typeof require === "function" ? require("../map/map-helpers.js") : null);
  const api = factory(constants, helpers);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMountainFieldMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, helpers) {
  "use strict";
  const { TILE, TILES, MAP_IDS, TRANSITION_TYPES } = constants;
  const { mulberry32, point, makeTiles, paintLine, withMapCollections, makeExit } = helpers;

  function createMountainFieldMap() {
    const width = 48;
    const height = 36;
    const tiles = makeTiles(width, height, TILES.WALL);
    paintLine(tiles, { x: 0, y: 26 }, { x: 29, y: 26 }, 2.15, TILES.PATH);
    paintLine(tiles, { x: 29, y: 26 }, { x: 35, y: 22 }, 2.15, TILES.PATH);
    paintLine(tiles, { x: 35, y: 22 }, { x: 37, y: 16 }, 2.15, TILES.PATH);
    paintLine(tiles, { x: 37, y: 16 }, { x: 37, y: 0 }, 2.15, TILES.PATH);

    const random = mulberry32(0xf13d2026);
    const routeNodes = [[0, 26], [29, 26], [35, 22], [37, 16], [37, 0]];
    function distanceToSegment(px, py, ax, ay, bx, by) {
      const dx = bx - ax;
      const dy = by - ay;
      const lengthSquared = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
      return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
    }
    function routeDistance(tx, ty) {
      let closest = Infinity;
      for (let index = 1; index < routeNodes.length; index += 1) {
        const [ax, ay] = routeNodes[index - 1];
        const [bx, by] = routeNodes[index];
        closest = Math.min(closest, distanceToSegment(tx, ty, ax, ay, bx, by));
      }
      return closest;
    }
    const treeVariants = ["broadleafTree", "pineTree", "autumnTree", "blossomTree"];
    const treeSeeds = { broadleafTree: .125, pineTree: .375, autumnTree: .625, blossomTree: .875 };
    const deliveryClearing = { x: 35, y: 12, radius: 4 };
    const trees = [];
    for (let ty = 1; ty < height - 1; ty += 2) {
      for (let tx = 1; tx < width - 1; tx += 2) {
        let deepForest = true;
        for (let dy = -1; dy <= 1 && deepForest; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (tiles[ty + dy]?.[tx + dx] !== TILES.WALL) { deepForest = false; break; }
          }
        }
        if (!deepForest) continue;
        // The lower edge of the road is the player's most common approach
        // lane. Keep a wider visual buffer there so the canopy cannot cover a
        // readable unit even though the tree's collision trunk is clear.
        const lowerRoadBuffer = ty >= 26 ? 4.2 : 2.6;
        if (routeDistance(tx, ty) < lowerRoadBuffer) continue;
        if (Math.hypot(tx - deliveryClearing.x, ty - deliveryClearing.y) < deliveryClearing.radius) continue;
        const variant = treeVariants[(Math.floor(tx / 10) + Math.floor(ty / 9)) % treeVariants.length];
        const renderScale = ty >= 26 ? 1.3 : 2.1;
        trees.push({ id: `field-tree-${trees.length}`, kind: "tree", ...point(tx, ty), tileX: tx, tileY: ty, radius: ty >= 26 ? 23 : 28, seed: treeSeeds[variant] + (random() - .5) * .035, variant, groveId: `field-mass-${Math.floor(tx / 10)}-${Math.floor(ty / 9)}`, renderScale });
      }
    }

    const flowers = [];
    for (let index = 0; index < 80; index += 1) {
      const tx = 2 + Math.floor(random() * 38);
      const ty = 2 + Math.floor(random() * 31);
      if (tiles[ty]?.[tx] !== TILES.PATH) continue;
      const base = point(tx, ty);
      flowers.push({ id: `field-flower-${flowers.length}`, x: base.x + (random() - .5) * 28, y: base.y + (random() - .5) * 28, color: random() > .55 ? "#f5e9ca" : "#ae91ff", seed: random() });
    }
    const signs = [
      { id: "field-west-sign", kind: "sign", name: "城外路牌", ...point(5, 24), radius: 10, text: "← 霧都主城　　沉燈坑道 ↑" },
      { id: "field-bend-sign", kind: "sign", name: "山道路牌", ...point(33, 24), radius: 10, text: "沿山路向北可達沉燈坑道。樹海內無路可行。" },
    ];
    const chests = [
      { id: "grove-cache", kind: "chest", ...point(7, 27), radius: 13, reward: { coins: 38, potions: 1 }, name: "樹根木箱" },
      { id: "river-cache", kind: "chest", ...point(31, 24), radius: 13, reward: { coins: 55, potions: 1 }, name: "山路鐵箱" },
      { id: "ruin-cache", kind: "chest", ...point(39, 4), radius: 13, reward: { coins: 90, potions: 2 }, name: "坑道口寶箱" },
    ];
    const npcs = [
      { id: "mountain_delivery_recipient", name: "洛安", displayName: "山地收件員", role: "山地收件員／公會送信", kind: "npc", ...point(35, 12), radius: 12, color: "#8ac9c0", facing: "down", actor: "mountainCourier", gender: "male", age: 38, appearance: "穿著灰綠旅行斗篷、背住防水信袋與登山杖的山地信使", zone: "far-field-clearing", services: ["guild-delivery"], chatter: "山路北面風大，信件交畀我保管就唔會畀霧氣浸壞。" },
    ];
    const enemySpawns = [
      { id: "slime-1", type: "raccoon", ...point(8, 25), level: 1 }, { id: "slime-2", type: "raccoon", ...point(12, 27), level: 1 },
      { id: "slime-3", type: "raccoon", ...point(20, 25), level: 1 }, { id: "slime-4", type: "raccoon", ...point(25, 27), level: 2 },
      { id: "warden-west", type: "turtle", ...point(16, 25), level: 2 }, { id: "warden-hollow", type: "turtle", ...point(28, 27), level: 3 }, { id: "warden-north", type: "turtle", ...point(37, 14), level: 2 },
      { id: "wisp-1", type: "chick", ...point(22, 27), level: 2 }, { id: "wisp-2", type: "fox", ...point(34, 21), level: 2 }, { id: "hound-1", type: "wild_boar", ...point(37, 18), level: 3 }, { id: "hound-2", type: "wild_boar", ...point(37, 10), level: 3 }, { id: "hound-3", type: "coyote", ...point(35, 7), level: 4 },
    ];
    const westExit = makeExit("field-to-world", 1, 26, MAP_IDS.WORLD, "eastGateInside", "返回霧都主城", point(32.5, 13), { interactionMode: "passage", transitionType: TRANSITION_TYPES.PHYSICAL_PASSAGE });
    westExit.direction = "west"; westExit.mapLabel = "霧都出口"; westExit.alwaysVisible = true;
    const dungeonExit = makeExit("field-to-dungeon", 37, 1, MAP_IDS.DUNGEON, "entrance", "進入沉燈坑道", point(9, 26), { interactionMode: "passage", transitionType: TRANSITION_TYPES.PHYSICAL_PASSAGE });
    dungeonExit.direction = "north"; dungeonExit.mapLabel = "坑道"; dungeonExit.alwaysVisible = true; dungeonExit.minLevel = 5;
    const start = point(3, 26);
    const openingBattlefield = {
      id: "mountain-opening-v1",
      width: 8,
      height: 3,
      projection: {
        // Equal-length screen axes keep every logical 1×1 cell visually
        // square/rhombic instead of stretching one direction into a rectangle.
        // The board is a flat oblique plane; elevation is applied only to the
        // explicit raised plateau below.
        xAxis: { x: .78, y: -.36 },
        yAxis: { x: .78, y: .36 },
        elevationStep: .18,
        baseThickness: .075,
      },
      deploymentZones: {
        ally: [{ x: 0, y: 2 }, { x: 0, y: 1 }, { x: 1, y: 2 }],
        enemy: [{ x: 7, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 1 }],
      },
      // The first field battle teaches height with one compact raised shelf
      // behind the low-cover scrub.  The whole Level-0 board remains one flat
      // plane; only this 2×2 corner rises by a single clear terrain tier.
      heightMap: {
        "6,0": 1, "7,0": 1,
        "6,1": 1, "7,1": 1,
      },
      terrainCells: {
        // High obstacle: blocks movement, direct lines and ballistic arcs.
        "2,1": { kind: "tree", obstacleHeight: "high", movementBlocked: true, blocksLinear: true, blocksArc: true, occupiedHeight: 3.2 },
        // Low obstacle: blocks movement and direct lines, but a normal arc can
        // clear it.  This is the player's first low-cover example.
        "5,1": { kind: "scrub", obstacleHeight: "low", movementBlocked: true, blocksLinear: true, blocksArc: false, occupiedHeight: .65 },
      },
    };
    return withMapCollections({
      id: MAP_IDS.FIELD, name: "霧梅爾山地東南部", shortName: "霧梅爾山地", kind: "field", type: "world", biome: "mountain", theme: "forest-road", ambient: "misty-woodland",
      tileSize: TILE, tileTypes: TILES, width, height, tiles, start,
      spawnPoints: { entrance: start, westGate: point(2, 26), dungeonFront: point(37, 2.6) }, exits: [westExit, dungeonExit], houses: [], trees, rocks: [], flowers, lamps: [], signs,
      solidRects: [], furniture: [], decorations: [], boards: [], npcs, enemySpawns, chests, shrine: null, waypoint: null,
      worldPortalId: "world-to-field", dungeonPortalId: dungeonExit.id,
      objectives: { dungeon: point(37, 1), town: point(1, 26) },
      battlefield: openingBattlefield,
      routeLayout: { style: "east-then-north", entrySide: "west", dungeonSide: "north", waypoints: [point(1, 26), point(29, 26), point(35, 22), point(37, 16), point(37, 1)], solidOutsideRoute: true },
      forestLayout: { style: "solid-tree-mass", treePattern: "two-tile-canopy-grid", collisionTile: TILES.WALL, visualGroundTile: TILES.GRASS, collisionRadius: 28, roadClearanceTiles: 2.15, clearings: [{ id: "far-field-clearing", ...point(deliveryClearing.x, deliveryClearing.y), radiusTiles: deliveryClearing.radius }] },
      staticObjects: [...trees, ...signs],
    });
  }
  return { TILE, TILES, MAP_IDS, createMountainFieldMap, createFieldMap: createMountainFieldMap };
});
