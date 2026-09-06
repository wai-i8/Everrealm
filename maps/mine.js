(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../map/map-constants.js") : null);
  const helpers = root.LanternMapHelpers || (typeof require === "function" ? require("../map/map-helpers.js") : null);
  const monsters = root.LanternMonsterBlueprints || (typeof require === "function" ? require("../map/monster-blueprints.js") : null);
  const api = factory(constants, helpers, monsters);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMineMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, helpers, monsters) {
  "use strict";
  const { TILE, TILES, MAP_IDS, TRANSITION_TYPES } = constants;
  const { mulberry32, point, tileRect, makeTiles, fillTiles, paintLine, makeExit, withMapCollections } = helpers;
  const { MONSTER_BLUEPRINTS } = monsters;

  function monsterSpawn(id, type, tx, ty, level, extra) {
    const blueprint = MONSTER_BLUEPRINTS[type];
    return Object.assign({ id, type, name: blueprint?.name || type, artType: blueprint?.artType || type, family: blueprint?.family || "monster", ...point(tx, ty), level: level || blueprint?.baseLevel || 1 }, extra || {});
  }

  function createMineMap() {
    const width = 42;
    const height = 30;
    const tiles = makeTiles(width, height, TILES.WALL);
    const rooms = [
      { id: "entry-hall", x: 2, y: 21, w: 9, h: 7, label: "廢棄入口" },
      { id: "waypoint-room", x: 13, y: 20, w: 10, h: 8, label: "回音燈室" },
      { id: "central-vault", x: 13, y: 10, w: 13, h: 8, label: "沉沒中庭" },
      { id: "west-crypt", x: 2, y: 8, w: 8, h: 9, label: "苔石窟" },
      { id: "east-gallery", x: 28, y: 10, w: 11, h: 8, label: "殘燈迴廊" },
      { id: "relic-room", x: 14, y: 2, w: 11, h: 6, label: "封存庫" },
      { id: "boss-chamber", x: 30, y: 2, w: 10, h: 7, label: "深霧核心" },
    ];
    rooms.forEach((room) => fillTiles(tiles, room.x, room.y, room.w, room.h, TILES.STONE));
    paintLine(tiles, { x: 8, y: 24 }, { x: 15, y: 24 }, 1, TILES.STONE);
    paintLine(tiles, { x: 18, y: 21 }, { x: 19, y: 16 }, 1, TILES.STONE);
    paintLine(tiles, { x: 14, y: 14 }, { x: 8, y: 13 }, 1, TILES.STONE);
    paintLine(tiles, { x: 24, y: 14 }, { x: 30, y: 14 }, 1, TILES.STONE);
    paintLine(tiles, { x: 19, y: 11 }, { x: 19, y: 7 }, 1, TILES.STONE);
    paintLine(tiles, { x: 36, y: 11 }, { x: 35, y: 7 }, 1, TILES.STONE);
    fillTiles(tiles, 15, 12, 2, 2, TILES.WATER);
    fillTiles(tiles, 22, 15, 2, 2, TILES.WATER);
    fillTiles(tiles, 30, 11, 2, 2, TILES.WATER);
    fillTiles(tiles, 7, 9, 2, 2, TILES.WATER);
    fillTiles(tiles, 10, height - 2, 2, 2, TILES.STONE);
    const solidRects = [
      tileRect(16.2, 21.3, .9, .9, { id: "dungeon-pillar-1", kind: "pillar", name: "斷裂石柱" }),
      tileRect(20.8, 25.2, .9, .9, { id: "dungeon-pillar-2", kind: "pillar", name: "斷裂石柱" }),
      tileRect(18.2, 13.2, 1.1, 1.1, { id: "dungeon-pillar-3", kind: "pillar", name: "刻紋石柱" }),
      tileRect(32.2, 14.2, .9, .9, { id: "dungeon-pillar-4", kind: "pillar", name: "殘燈柱" }),
      tileRect(36.2, 14.2, .9, .9, { id: "dungeon-pillar-5", kind: "pillar", name: "殘燈柱" }),
      tileRect(33, 4.1, 1, 1, { id: "boss-pillar-left", kind: "pillar", name: "深霧石柱" }),
      tileRect(37, 4.1, 1, 1, { id: "boss-pillar-right", kind: "pillar", name: "深霧石柱" }),
    ];
    const random = mulberry32(0x4d495354);
    const decorations = [];
    let attempts = 0;
    while (decorations.length < 54 && attempts < 800) {
      attempts += 1;
      const tx = 1 + Math.floor(random() * (width - 2));
      const ty = 1 + Math.floor(random() * (height - 2));
      if (tiles[ty][tx] !== TILES.STONE) continue;
      if (Math.hypot(tx - 10.5, ty - 26) < 3 || Math.hypot(tx - 18, ty - 24) < 2.5) continue;
      const p = point(tx, ty);
      decorations.push({ id: `dungeon-detail-${decorations.length}`, kind: random() > .62 ? "glowMushroom" : random() > .35 ? "rubble" : "crackedTile", x: p.x + (random() - .5) * 22, y: p.y + (random() - .5) * 22, seed: random(), color: random() > .5 ? "#65ceb7" : "#91a9ef", solid: false });
    }
    [[5, 14], [17, 17], [21, 10], [29, 15], [23, 4], [31, 7], [38, 7]].forEach(([tx, ty], index) => decorations.push({ id: `dungeon-lamp-${index}`, kind: "ancientLamp", ...point(tx, ty), radius: 8, glow: "#75dbc7", solid: false }));
    const chests = [
      { id: "moss-cave-chest", kind: "chest", name: "長苔補給箱", ...point(3, 9), radius: 13, reward: { coins: 95, potions: 2, itemId: "mistguard-boots" } },
      { id: "sealed-relic-chest", kind: "chest", name: "封存庫寶箱", ...point(22, 3), radius: 13, lockedBy: "lantern-golem-1", reward: { coins: 145, itemId: "echo-blade" } },
      { id: "gallery-chest", kind: "chest", name: "迴廊鐵箱", ...point(37, 16), radius: 13, reward: { coins: 120, potions: 2, itemId: "fogweave-coat" } },
      { id: "warden-chest", kind: "chest", name: "看守者秘藏", ...point(35, 3), radius: 14, lockedBy: "deepwarden-1", reward: { coins: 260, potions: 3, itemId: "warden-lantern" } },
    ];
    const shrine = { id: "echo-lantern-shrine", kind: "shrine", name: "回音燈龕", ...point(18, 24), radius: 19, prompt: "E　點亮回音燈", waypointId: "dungeon-echo-lantern", services: ["heal", "save", "waypoint"] };
    const exit = makeExit("dungeon-to-field", 10.5, 29, MAP_IDS.FIELD, "dungeonFront", "返回霧梅爾山地", point(37, 2.6), { interactionMode: "passage", transitionType: TRANSITION_TYPES.PHYSICAL_PASSAGE });
    const enemySpawns = [
      monsterSpawn("mossbun-1", "mossbun", 5, 24, 5),
      monsterSpawn("mossbun-2", "mossbun", 8, 22, 5),
      monsterSpawn("mistwing-1", "mistwing", 15, 26, 6),
      monsterSpawn("mistwing-2", "mistwing", 21, 21, 6),
      monsterSpawn("cragboar-1", "cragboar", 16, 15, 7),
      monsterSpawn("mossbun-3", "mossbun", 23, 11, 7, { elite: true }),
      monsterSpawn("mistwing-3", "mistwing", 4, 15, 7),
      monsterSpawn("cragboar-2", "cragboar", 4, 10, 8),
      monsterSpawn("hollowmage-1", "hollowmage", 31, 16, 8),
      monsterSpawn("hollowmage-2", "hollowmage", 37, 12, 9),
      monsterSpawn("lantern-golem-1", "lantern-golem", 20, 4, 10, { elite: true, guardsChest: "sealed-relic-chest" }),
      monsterSpawn("mistwing-4", "mistwing", 16, 4, 9),
      monsterSpawn("hollowmage-3", "hollowmage", 32, 7, 10),
      monsterSpawn("lantern-golem-2", "lantern-golem", 38, 7, 11, { elite: true }),
      monsterSpawn("deepwarden-1", "deepwarden", 35, 5, 12, { boss: true, guardsChest: "warden-chest", respawn: false }),
    ];
    const npcs = [{
      id: "lost-explorer-kai",
      name: "露娜",
      role: "迷路女法師",
      kind: "npc",
      ...point(14, 22),
      radius: 12,
      color: "#92c3e5",
      facing: "right",
      actor: "explorer",
      gender: "female",
      age: 29,
      appearance: "銀髮冰系女法師造型、冰藍法袍、雪晶披肩與白銀長靴",
      services: ["dungeon-tip"],
      chatter: "點著回音燈就有落腳點。再入面嗰啲燈偶會隔住石柱射過嚟！",
    }];
    return withMapCollections({
      id: MAP_IDS.DUNGEON, name: "沉燈坑道", shortName: "沉燈坑道", kind: "dungeon", type: "dungeon", biome: "cave", theme: "flooded-ruins", ambient: "deep-mist", recommendedLevel: 5, maxRecommendedLevel: 12,
      tileSize: TILE, tileTypes: TILES, width, height, tiles, rooms, start: point(9, 26), spawnPoints: { entrance: point(9, 26), waypoint: point(18, 25.5), bossDoor: point(35, 8) }, exits: [exit], solidRects, furniture: [], decorations, boards: [], npcs, enemySpawns, chests, shrine, waypoint: shrine, worldPortalId: "field-to-dungeon",
      objectives: { waypoint: point(18, 24), relic: point(20, 4), boss: point(35, 5), exit: point(10.5, 29) },
    });
  }
  return { TILE, TILES, MAP_IDS, createMineMap, createDungeonMap: createMineMap, monsterSpawn };
});
