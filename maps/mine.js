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

  function monsterSpawn(id, type, tx, ty, extra) {
    const blueprint = MONSTER_BLUEPRINTS[type];
    return Object.assign({
      id,
      type,
      name: blueprint?.name || type,
      artType: blueprint?.artType || type,
      family: blueprint?.family || "monster",
      ...point(tx, ty),
      level: blueprint?.baseLevel || 1,
    }, extra || {});
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
      { id: "deep-chamber", x: 30, y: 2, w: 10, h: 7, label: "深霧核心" },
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
      tileRect(33, 4.1, 1, 1, { id: "deep-pillar-left", kind: "pillar", name: "深霧石柱" }),
      tileRect(37, 4.1, 1, 1, { id: "deep-pillar-right", kind: "pillar", name: "深霧石柱" }),
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
    const chests = [];
    const shrine = { id: "echo-lantern-shrine", kind: "shrine", name: "回音燈龕", ...point(18, 24), radius: 19, prompt: "E　點亮回音燈", waypointId: "dungeon-echo-lantern", services: ["heal", "save", "waypoint"] };
    const exit = makeExit("dungeon-to-field", 10.5, 29, MAP_IDS.FIELD, "dungeonFront", "返回霧梅爾山地", point(37, 2.6), { interactionMode: "passage", transitionType: TRANSITION_TYPES.PHYSICAL_PASSAGE });
    const enemySpawns = [
      monsterSpawn("frog-entry-1", "frog", 5, 24),
      monsterSpawn("frog-entry-2", "frog", 8, 22),
      monsterSpawn("coyote-entry-1", "coyote", 15, 26),
      monsterSpawn("coyote-gallery-1", "coyote", 21, 21),
      monsterSpawn("turtle-court-1", "turtle", 16, 15),
      monsterSpawn("turtle-vault-1", "turtle", 23, 11),
      monsterSpawn("coyote-west-1", "coyote", 4, 15),
      monsterSpawn("turtle-west-1", "turtle", 4, 10),
      monsterSpawn("snake-gallery-1", "snake", 31, 16),
      monsterSpawn("snake-gallery-2", "snake", 37, 12),
      monsterSpawn("snake-relic-1", "snake", 20, 4),
      monsterSpawn("turtle-relic-1", "turtle", 16, 4),
      monsterSpawn("snake-deep-1", "snake", 32, 7),
      monsterSpawn("bear-deep-1", "bear", 38, 7),
      monsterSpawn("bear-deep-2", "bear", 35, 5),
    ];
    const npcs = [{
      id: "lost-explorer-kai",
      name: "露娜",
      displayName: "坑道探索者",
      role: "坑道探索者／路線提示",
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
      chatter: "點著回音燈就有落腳點。再入面啲毒霧蛇會遠距離噴毒，行位要小心。",
    }];
    return withMapCollections({
      id: MAP_IDS.DUNGEON, name: "沉燈坑道", shortName: "沉燈坑道", kind: "dungeon", type: "dungeon", biome: "cave", theme: "flooded-ruins", ambient: "deep-mist", recommendedLevel: 21, maxRecommendedLevel: 45,
      tileSize: TILE, tileTypes: TILES, width, height, tiles, rooms, start: point(9, 26), spawnPoints: { entrance: point(9, 26), waypoint: point(18, 25.5), deepDoor: point(35, 8) }, exits: [exit], solidRects, furniture: [], decorations, boards: [], npcs, enemySpawns, chests, shrine, waypoint: shrine, worldPortalId: "field-to-dungeon",
      objectives: { waypoint: point(18, 24), relic: point(20, 4), deepChamber: point(35, 5), exit: point(10.5, 29) },
    });
  }
  return { TILE, TILES, MAP_IDS, createMineMap, createDungeonMap: createMineMap, monsterSpawn };
});
