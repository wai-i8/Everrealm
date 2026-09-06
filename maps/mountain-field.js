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
    const treeVariants = ["broadleafTree", "pineTree", "autumnTree", "blossomTree"];
    const treeSeeds = { broadleafTree: .125, pineTree: .375, autumnTree: .625, blossomTree: .875 };
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
        const variant = treeVariants[(Math.floor(tx / 10) + Math.floor(ty / 9)) % treeVariants.length];
        trees.push({ id: `field-tree-${trees.length}`, kind: "tree", ...point(tx, ty), tileX: tx, tileY: ty, radius: 28, seed: treeSeeds[variant] + (random() - .5) * .035, variant, groveId: `field-mass-${Math.floor(tx / 10)}-${Math.floor(ty / 9)}`, renderScale: 2.1 });
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
    const lamps = [[3, 24], [10, 24], [18, 28], [26, 24], [33, 23], [35, 18], [39, 13], [35, 8]].map(([tx, ty], index) => ({ id: `field-lamp-${index}`, kind: "lamp", ...point(tx, ty), radius: 7 }));
    const chests = [
      { id: "grove-cache", kind: "chest", ...point(7, 27), radius: 13, reward: { coins: 38, potions: 1 }, name: "樹根木箱" },
      { id: "river-cache", kind: "chest", ...point(31, 24), radius: 13, reward: { coins: 55, potions: 1 }, name: "山路鐵箱" },
      { id: "ruin-cache", kind: "chest", ...point(39, 4), radius: 13, reward: { coins: 90, potions: 2 }, name: "坑道口寶箱" },
    ];
    const npcs = [
      { id: "mountain_delivery_recipient", name: "洛安", role: "山地信使", kind: "npc", ...point(35, 12), radius: 12, color: "#8ac9c0", facing: "down", actor: "explorer", gender: "male", age: 38, appearance: "穿著灰綠旅行斗篷、背住防水信袋與登山杖的山地信使", services: ["guild-delivery"], chatter: "山路北面風大，信件交畀我保管就唔會畀霧氣浸壞。" },
    ];
    const enemySpawns = [
      { id: "slime-1", type: "raccoon", ...point(8, 25), level: 1 }, { id: "slime-2", type: "raccoon", ...point(12, 27), level: 1 },
      { id: "slime-3", type: "raccoon", ...point(20, 25), level: 1 }, { id: "slime-4", type: "raccoon", ...point(25, 27), level: 2 },
      { id: "warden-west", type: "turtle", ...point(16, 25), level: 2, crystal: "west" }, { id: "warden-hollow", type: "turtle", ...point(28, 27), level: 3, crystal: "hollow" }, { id: "warden-north", type: "turtle", ...point(37, 14), level: 2, crystal: "north" },
      { id: "wisp-1", type: "chick", ...point(22, 27), level: 2 }, { id: "wisp-2", type: "fox", ...point(34, 21), level: 2 }, { id: "hound-1", type: "wild_boar", ...point(37, 18), level: 3 }, { id: "hound-2", type: "wild_boar", ...point(37, 10), level: 3 }, { id: "hound-3", type: "coyote", ...point(35, 7), level: 4 },
      { id: "boss-mistfang", type: "bear", ...point(37, 4), level: 5, boss: true, mainBoss: true },
    ];
    const gate = { id: "ruin-gate", name: "坑道封印", kind: "gate", x: 35 * TILE, y: 7 * TILE + 10, w: 5 * TILE, h: 20 };
    const westExit = makeExit("field-to-world", 1, 26, MAP_IDS.WORLD, "eastGateInside", "返回霧都主城", point(32.5, 13), { interactionMode: "gate", transitionType: TRANSITION_TYPES.PHYSICAL_GATE });
    westExit.direction = "west"; westExit.mapLabel = "霧都"; westExit.alwaysVisible = true;
    const dungeonExit = makeExit("field-to-dungeon", 37, 1, MAP_IDS.DUNGEON, "entrance", "進入沉燈坑道", point(9, 26), { interactionMode: "passage", transitionType: TRANSITION_TYPES.PHYSICAL_PASSAGE });
    dungeonExit.direction = "north"; dungeonExit.mapLabel = "坑道"; dungeonExit.alwaysVisible = true; dungeonExit.minLevel = 5;
    const start = point(3, 26);
    return withMapCollections({
      id: MAP_IDS.FIELD, name: "霧梅爾山地東南部", shortName: "霧梅爾山地", kind: "field", type: "world", biome: "mountain", theme: "forest-road", ambient: "misty-woodland",
      tileSize: TILE, tileTypes: TILES, width, height, tiles, start,
      spawnPoints: { entrance: start, westGate: point(2, 26), dungeonFront: point(37, 2.6) }, exits: [westExit, dungeonExit], houses: [], trees, rocks: [], flowers, lamps, signs,
      solidRects: [], furniture: [], decorations: [], boards: [], npcs, enemySpawns, chests, shrine: null, waypoint: null, gate,
      worldPortalId: "world-to-field", dungeonPortalId: dungeonExit.id,
      objectives: { crystals: { west: point(16, 25), hollow: point(28, 27), north: point(37, 14) }, gate: point(37, 8), boss: point(37, 4), dungeon: point(37, 1), town: point(1, 26) },
      routeLayout: { style: "east-then-north", entrySide: "west", dungeonSide: "north", waypoints: [point(1, 26), point(29, 26), point(35, 22), point(37, 16), point(37, 1)], solidOutsideRoute: true },
      forestLayout: { style: "solid-tree-mass", treePattern: "two-tile-canopy-grid", collisionTile: TILES.WALL, visualGroundTile: TILES.GRASS, collisionRadius: 28, roadClearanceTiles: 2.15 },
      staticObjects: [...trees, ...lamps, ...signs],
    });
  }
  return { TILE, TILES, MAP_IDS, createMountainFieldMap, createFieldMap: createMountainFieldMap };
});
