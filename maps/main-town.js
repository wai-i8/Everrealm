(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../map/map-constants.js") : null);
  const helpers = root.LanternMapHelpers || (typeof require === "function" ? require("../map/map-helpers.js") : null);
  const api = factory(constants, helpers);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMainTownMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, helpers) {
  "use strict";

  const { TILE, TILES, MAP_IDS, TRANSITION_TYPES } = constants;
  const { mulberry32, point, paintPath } = helpers;
  const WIDTH = 50;
  const HEIGHT = 42;
  const PHYSICAL_BUILDING_ENTRANCE = Object.freeze({
    outward: "south",
    threshold: Object.freeze({ shape: "rect", widthTiles: 1.5, depthTiles: 1 }),
    approachDistanceTiles: 2,
    entryFacing: "up",
    returnFacing: "down",
    marker: Object.freeze({ kind: "bitmap", sprite: "townDoorMarker", width: 42, height: 28, anchorX: .5, anchorY: 1 }),
  });

  function createMainTownMapLegacy() {
    const random = mulberry32(0x71a5cafe);
    const tiles = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(TILES.GRASS));

    function setTile(tx, ty, type) {
      if (tx >= 0 && ty >= 0 && tx < WIDTH && ty < HEIGHT) tiles[ty][tx] = type;
    }
    function fillTownTiles(x, y, width, height, type) {
      for (let ty = y; ty < y + height; ty += 1) {
        for (let tx = x; tx < x + width; tx += 1) setTile(tx, ty, type);
      }
    }

    // The town is deliberately wider and deeper than the old compressed grid.
    // Roads are painted after the plaza so the civic space reads as one connected
    // street plan instead of a stone island with decorative strips around it.
    for (let tx = 0; tx < WIDTH; tx += 1) {
      setTile(tx, 0, TILES.WALL);
      setTile(tx, HEIGHT - 1, TILES.WALL);
    }
    for (let ty = 0; ty < HEIGHT; ty += 1) {
      setTile(0, ty, TILES.WALL);
      setTile(WIDTH - 1, ty, TILES.WALL);
    }

    // A compact civic plaza leaves breathing room for the five service districts.
    fillTownTiles(17, 11, 11, 7, TILES.STONE);

    // Main street: west arrival -> plaza -> east gate. Branches are authored to
    // meet each bitmap doorway's approach point rather than merely decorating grass.
    paintPath(tiles, [{ x: 1, y: 15 }, { x: 43, y: 15 }], 1.45);
    paintPath(tiles, [{ x: 22, y: 2 }, { x: 22, y: 10 }], .95);
    paintPath(tiles, [{ x: 22, y: 18 }, { x: 22, y: 28 }], .95);
    paintPath(tiles, [{ x: 9, y: 15 }, { x: 9, y: 9.65 }], .95);
    paintPath(tiles, [{ x: 34, y: 15 }, { x: 34, y: 9.6 }], .95);
    paintPath(tiles, [{ x: 7, y: 15 }, { x: 7, y: 27 }], .95);
    paintPath(tiles, [{ x: 20, y: 15 }, { x: 20, y: 27 }], .95);
    paintPath(tiles, [{ x: 37, y: 15 }, { x: 37, y: 27 }], .95);

    // Keep the wall solid everywhere except the three-tile physical east gate.
    for (let tx = 0; tx < WIDTH; tx += 1) {
      setTile(tx, 0, TILES.WALL);
      setTile(tx, HEIGHT - 1, TILES.WALL);
    }
    for (let ty = 0; ty < HEIGHT; ty += 1) {
      setTile(0, ty, TILES.WALL);
      if (ty < 14 || ty > 16) setTile(WIDTH - 1, ty, TILES.WALL);
    }
    for (let ty = 14; ty <= 16; ty += 1) setTile(WIDTH - 1, ty, TILES.PATH);

    const houses = [
      {
        id: "keeper-house", kind: "house", x: 2 * TILE, y: 3 * TILE, w: 10 * TILE, h: 7 * TILE,
        sprite: "guildHouse", label: "✦ 拾燈公會", district: "civic", entryPortalId: "world-to-guild", doorWidth: 50, doorDepth: 64,
        doorAnchor: { x: 254 / 384, y: 354 / 384 },
        roof: "#263452", light: "#ffc857",
      },
      {
        id: "forge", kind: "house", x: 2 * TILE, y: 20 * TILE, w: 10 * TILE, h: 7 * TILE,
        sprite: "equipmentShopBuilding", bitmap: true, label: "⚒ 銀火裝備店", district: "craft", entryPortalId: "world-to-shop", doorWidth: 54, doorDepth: 88,
        spriteWidth: 440, spriteHeight: 410, spriteAnchorY: 1, doorAnchor: { x: .46, y: .86 },
        roof: "#472f38", light: "#ff8b62",
      },
      {
        id: "tea-house", kind: "house", sprite: "innBuilding", bitmap: true, label: "▰ 霧燈旅店", district: "life", entryPortalId: "world-to-inn",
        x: 31 * TILE, y: 20 * TILE, w: 10 * TILE, h: 7 * TILE, doorWidth: 54, doorDepth: 82,
        spriteWidth: 430, spriteHeight: 380, spriteAnchorY: 1, doorAnchor: { x: .57, y: .87 },
        roof: "#294846", light: "#87db82",
      },
      {
        id: "clinic", kind: "house", role: "clinic", sprite: "clinicBuilding", bitmap: true, label: "✚ 霧草療癒所", district: "care", entryPortalId: "world-to-clinic",
        x: 30 * TILE, y: 3 * TILE, w: 9 * TILE, h: 7 * TILE, doorWidth: 54,
        spriteWidth: 420, spriteHeight: 390, spriteAnchorY: 1, doorAnchor: { x: .47, y: .85 }, doorDepth: 88,
        roof: "#3f5360", light: "#82d6c7", accent: "#82d6c7",
      },
      {
        id: "general-store", kind: "house", role: "general-store", sprite: "generalStoreBuilding", bitmap: true, label: "◇ 霧穀雜貨舖", district: "trade", entryPortalId: "world-to-general-store",
        x: 14 * TILE, y: 21 * TILE, w: 9 * TILE, h: 6 * TILE, doorWidth: 54, doorDepth: 82,
        spriteWidth: 420, spriteHeight: 340, spriteAnchorY: 1, doorAnchor: { x: .63, y: .86 },
        roof: "#6a4c3d", light: "#f0c36a", accent: "#f0c36a",
      },
    ];

    const npcs = [
      { id: "ah-ching", name: "阿澄", role: "守燈星術師", kind: "npc", ...point(21, 14), radius: 12, color: "#ffc857", facing: "down", actor: "keeper", gender: "female", age: 25, appearance: "銀藍長髮、青綠眼、紫黑金星術法衣、白羽披肩、月輪法杖與藍色精靈同伴", referenceAsset: "assets/ah-ching-v1.png" },
      { id: "town-smith", name: "鐵叔", role: "街坊鍛刀匠", kind: "npc", ...point(8, 19), radius: 12, color: "#ff8b62", facing: "right", actor: "smith", gender: "male", age: 43 },
      { id: "town-herbalist", name: "草姨", role: "街坊草藥師", kind: "npc", ...point(34, 10), radius: 12, color: "#87db82", facing: "left", actor: "healer", gender: "female", age: 47 },
    ];

    const shrine = { id: "harbour-shrine", name: "中央燈龕", kind: "shrine", ...point(22, 14), radius: 18 };
    const townGate = {
      id: "east-city-gate", name: "霧都東門", kind: "townGate", ...point(40.1, 15), radius: 24, side: "east",
      opening: { minTileY: 14, maxTileY: 16 }, sprite: "townGateEast", spriteWidth: 600, spriteHeight: 400, spriteBottomOffset: 30,
    };
    const boards = [{ id: "harbour-gate-deck-console", kind: "questBoard", name: "城門戰技面板台", ...point(38.5, 12), radius: 22, boardId: "deck-loadout", prompt: "設定戰技面板", gateId: townGate.id }];
    const portals = [{
      id: "world-to-field", kind: "portal", interactionMode: "gate", transitionType: TRANSITION_TYPES.PHYSICAL_GATE, name: "前往霧梅爾山地", mapLabel: "東門",
      alwaysVisible: true, markerSize: 38, ...point(42.5, 15), radius: 23,
      targetMap: MAP_IDS.FIELD, targetSpawn: "westGate", targetPosition: point(2, 26), prompt: "離開主城", gateId: townGate.id, direction: "east",
    }];
    const signs = [
      { id: "town-sign-square", kind: "sign", name: "中央廣場路牌", ...point(26, 18.8), radius: 10, text: "北側：療癒所　西側：拾燈公會　南側：雜貨舖" },
      { id: "town-sign-gate", kind: "sign", name: "東門告示", ...point(39, 17.5), radius: 10, text: "東門 → 霧梅爾山地。出發前請先整理戰技面板。" },
    ];
    const chests = [{ id: "town-supply-chest", kind: "chest", name: "城防補給箱", ...point(38.5, 10.5), radius: 13, reward: { coins: 24, potions: 1 } }];

    // Boundary groves frame the town and the top district without spilling into
    // the authored road corridors. All variants come from the cleaned v5 atlas.
    const trees = [];
    for (const [tx, ty, variant, renderScale] of [
      [2, 2, "pineTree", 1.25], [15, 2, "blossomTree", 1.15], [24, 2, "broadleafTree", 1.1], [41, 3, "pineTree", 1.25],
      [2, 14, "autumnTree", 1.15], [2, 28, "broadleafTree", 1.15], [13, 28, "blossomTree", 1.1], [28, 28, "autumnTree", 1.1],
      [41, 19, "broadleafTree", 1.15], [41, 28, "blossomTree", 1.2], [29, 11, "pineTree", 1.05], [12, 19, "broadleafTree", 1.05],
    ]) {
      trees.push({ id: `town-tree-${trees.length}`, kind: "tree", ...point(tx, ty), tileX: tx, tileY: ty, radius: 23, seed: random(), variant, groveId: "town-greenery", renderScale });
    }
    const rocks = [
      { id: "town-rock-west", kind: "rock", ...point(3, 27.5), radius: 10, seed: random() },
      { id: "town-rock-north", kind: "rock", ...point(28, 2.4), radius: 9, seed: random() },
      { id: "town-rock-east", kind: "rock", ...point(41, 27), radius: 10, seed: random() },
    ];
    const flowers = [[15, 10], [16, 10], [27, 10], [28, 10], [16, 19], [17, 19], [27, 19], [28, 19], [30, 17], [31, 17], [39, 18], [40, 18], [4, 16], [5, 16], [12, 16], [13, 16], [29, 11], [30, 11]].map(([tx, ty], index) => {
      const base = point(tx, ty);
      return { id: `town-flower-${index}`, x: base.x + (random() - .5) * 10, y: base.y + (random() - .5) * 10, color: random() > .5 ? "#f5e9ca" : "#ae91ff", seed: random() };
    });
    // Lamps sit on the verge of the route, with a deliberate pair at each civic
    // threshold instead of occupying the street centerline.
    const lamps = [[8, 13], [13, 13], [31, 13], [36, 13], [17, 9.5], [27, 9.5], [17, 20], [27, 20], [6, 17], [8.5, 27.5], [21.5, 27.5], [35.5, 27.5], [39, 13]].map(([tx, ty], index) => ({ id: `town-lamp-${index}`, kind: "lamp", ...point(tx, ty), radius: 7 }));
    const staticObjects = [...houses, ...trees, ...rocks, ...lamps, shrine, ...signs, ...chests, ...boards];
    // Keep the default arrival in the open south road between the market and
    // inn districts; the old x22 spawn landed inside the market building's
    // collision shell after the district resize.
    const start = point(25, 23);
    return {
      id: MAP_IDS.WORLD, name: "霧都主城", shortName: "霧都", kind: "town", type: "world", biome: "town", theme: "walled-town",
      tileSize: TILE, width: WIDTH, height: HEIGHT, pixelWidth: WIDTH * TILE, pixelHeight: HEIGHT * TILE,
      tiles, tileTypes: TILES, houses, trees, rocks, flowers, lamps, npcs, shrine, townGate,
      gate: { id: "world-no-quest-gate", kind: "gate", x: -9999, y: -9999, w: 0, h: 0 },
      signs, boards, portals, exits: portals, chests, staticObjects, collisionObjects: [], decorations: [], furniture: [], enemySpawns: [], start,
      // Exterior returns are authored spawn data, not a renderer-relative offset.
      // They sit on the road-facing side of each facade after the redesign.
      spawnPoints: {
        start,
        guildFront: { x: 352, y: 386 },
        shopFront: { x: 262.4, y: 1065 },
        clinicFront: { x: 1367.4, y: 384 },
        generalStoreFront: { x: 794.6, y: 1074.4 },
        innFront: { x: 1470.1, y: 1068.6 },
        eastGateInside: point(41.4, 15),
      },
      spawnFacings: {
        guildFront: "down",
        shopFront: "down",
        clinicFront: "down",
        generalStoreFront: "down",
        innFront: "down",
        eastGateInside: "right",
      },
      objectives: { elder: point(21, 13.5), townGate: point(41, 15), gate: point(41, 15), boss: point(41, 15), crystals: {} },
      questDestinations: {
        crystals: { mapId: MAP_IDS.FIELD, objectiveGroup: "crystals" },
        seal: { mapId: MAP_IDS.FIELD, objectiveId: "gate" },
        boss: { mapId: MAP_IDS.FIELD, objectiveId: "boss" },
        dungeon: { mapId: MAP_IDS.FIELD, objectiveId: "dungeon" },
      },
      townLayout: {
        style: "districted-walled-town", wallTile: TILES.WALL, perimeter: { left: 0, top: 0, right: WIDTH - 1, bottom: HEIGHT - 1 },
        eastGate: { tx: WIDTH - 1, minTy: 14, maxTy: 16 }, serviceBuildingIds: houses.map((house) => house.id), deckConsoleId: boards[0].id,
        districts: [
          { id: "civic", label: "中央燈龕廣場", bounds: { x: 17, y: 11, w: 11, h: 7 } },
          { id: "care", label: "北側療癒街", bounds: { x: 29, y: 2, w: 11, h: 9 } },
          { id: "craft", label: "西南工坊街", bounds: { x: 2, y: 19, w: 11, h: 9 } },
          { id: "trade", label: "南側市集", bounds: { x: 14, y: 20, w: 10, h: 8 } },
          { id: "life", label: "東南旅店街", bounds: { x: 30, y: 19, w: 11, h: 9 } },
        ],
        roadNetwork: { main: "east-west-gate-route", cross: "north-south-plaza-route", branches: ["guild-approach", "clinic-approach", "forge-approach", "market-approach", "inn-approach"], laneCount: 2 },
      },
      forestLayout: { style: "town-greenery", treePattern: "authored-boundary-groves", collisionRadius: 23, roadClearanceTiles: 1, objectiveClearanceTiles: 1, groves: [{ id: "town-greenery", variant: "cleaned-v5-mixed", blocks: [] }] },
      transitionLinks: [
        { houseId: "keeper-house", portalId: "world-to-guild", targetMap: MAP_IDS.GUILD, targetSpawn: "entrance", returnSpawn: "guildFront", entryFacing: "up", returnFacing: "down", entrance: PHYSICAL_BUILDING_ENTRANCE, name: "拾燈公會", mapLabel: "公會", prompt: "進入拾燈公會" },
        { houseId: "forge", portalId: "world-to-shop", targetMap: MAP_IDS.SHOP, targetSpawn: "entrance", returnSpawn: "shopFront", entryFacing: "up", returnFacing: "down", entrance: PHYSICAL_BUILDING_ENTRANCE, name: "銀火裝備店", mapLabel: "裝備店", prompt: "進入裝備店" },
        { houseId: "clinic", portalId: "world-to-clinic", targetMap: MAP_IDS.CLINIC, targetSpawn: "entrance", returnSpawn: "clinicFront", entryFacing: "up", returnFacing: "down", entrance: PHYSICAL_BUILDING_ENTRANCE, name: "霧草療癒所", mapLabel: "療癒所", prompt: "進入療癒所" },
        { houseId: "general-store", portalId: "world-to-general-store", targetMap: MAP_IDS.GENERAL_STORE, targetSpawn: "entrance", returnSpawn: "generalStoreFront", entryFacing: "up", returnFacing: "down", entrance: PHYSICAL_BUILDING_ENTRANCE, name: "霧穀雜貨舖", mapLabel: "雜貨舖", prompt: "進入雜貨舖" },
        { houseId: "tea-house", portalId: "world-to-inn", targetMap: MAP_IDS.INN, targetSpawn: "entrance", returnSpawn: "innFront", entrance: PHYSICAL_BUILDING_ENTRANCE, name: "霧燈旅店", mapLabel: "旅店", prompt: "進入旅店" },
      ],
    };
  }

  const BLOCK_MODULE = Object.freeze({ widthTiles: 12, heightTiles: 12 });
  const STANDARD_BUILDING = Object.freeze({
    offsetTiles: Object.freeze({ x: 2, y: 1 }),
    widthTiles: 8,
    heightTiles: 7,
    spriteWidth: 8 * TILE,
    spriteHeight: 7 * TILE,
    spriteAnchorY: 1,
    doorAnchor: Object.freeze({ x: .5, y: 1 }),
  });
  const BLOCKS = Object.freeze({
    A1: Object.freeze({ id: "A1", rect: Object.freeze([4, 4, 12, 12]), use: "guild" }),
    A2: Object.freeze({ id: "A2", rect: Object.freeze([19, 4, 12, 12]), use: "clinic" }),
    A3: Object.freeze({ id: "A3", rect: Object.freeze([34, 4, 12, 12]), use: "inn" }),
    B1: Object.freeze({ id: "B1", rect: Object.freeze([4, 20, 12, 12]), use: "equipment_shop" }),
    B2: Object.freeze({ id: "B2", rect: Object.freeze([19, 20, 12, 12]), use: "central_plaza", civicBlock: true }),
    B3: Object.freeze({ id: "B3", rect: Object.freeze([34, 20, 12, 12]), use: "general_store" }),
  });
  const BLUEPRINT_ROADS = Object.freeze({
    north_service_street: Object.freeze({ rect: Object.freeze([2, 16, 44, 4]), role: "secondary" }),
    main_street: Object.freeze({ rect: Object.freeze([2, 32, 46, 5]), role: "primary", connectsDirectlyTo: "east_gate" }),
    west_avenue: Object.freeze({ rect: Object.freeze([16, 16, 3, 21]), role: "connector" }),
    east_avenue: Object.freeze({ rect: Object.freeze([31, 16, 3, 21]), role: "connector" }),
  });
  function worldPoint(tx, ty) { return { x: tx * TILE, y: ty * TILE }; }
  function setRect(tiles, rect, type) {
    const [x, y, width, height] = rect;
    for (let ty = y; ty < y + height; ty += 1) for (let tx = x; tx < x + width; tx += 1) if (tiles[ty]?.[tx] !== undefined) tiles[ty][tx] = type;
  }
  function copyBlock(blockId) {
    const block = BLOCKS[blockId];
    return { id: block.id, rect: [...block.rect], use: block.use, civicBlock: Boolean(block.civicBlock) };
  }
  function makeServiceBuilding({ id, blockId, sprite, label, district, entryPortalId, role }) {
    const [blockX, blockY] = BLOCKS[blockId].rect;
    const x = (blockX + STANDARD_BUILDING.offsetTiles.x) * TILE;
    const y = (blockY + STANDARD_BUILDING.offsetTiles.y) * TILE;
    return {
      id, kind: "house", role, blockId, block: copyBlock(blockId), bitmap: true, sprite, label, district, entryPortalId,
      x, y, w: STANDARD_BUILDING.spriteWidth, h: STANDARD_BUILDING.spriteHeight,
      spriteWidth: STANDARD_BUILDING.spriteWidth, spriteHeight: STANDARD_BUILDING.spriteHeight, spriteAnchorY: STANDARD_BUILDING.spriteAnchorY,
      doorAnchor: { ...STANDARD_BUILDING.doorAnchor }, doorWidth: 72, doorDepth: 76,
    };
  }
  function createMainTownMap() {
    const random = mulberry32(0x71a5cafe);
    const tiles = Array.from({ length: 42 }, () => Array(50).fill(TILES.GRASS));
    setRect(tiles, [0, 0, 50, 2], TILES.WALL);
    setRect(tiles, [0, 40, 50, 2], TILES.WALL);
    setRect(tiles, [0, 0, 2, 42], TILES.WALL);
    setRect(tiles, [48, 0, 2, 32], TILES.WALL);
    setRect(tiles, [48, 37, 2, 5], TILES.WALL);
    setRect(tiles, BLUEPRINT_ROADS.north_service_street.rect, TILES.STONE);
    setRect(tiles, BLUEPRINT_ROADS.main_street.rect, TILES.STONE);
    setRect(tiles, BLUEPRINT_ROADS.west_avenue.rect, TILES.STONE);
    setRect(tiles, BLUEPRINT_ROADS.east_avenue.rect, TILES.STONE);
    setRect(tiles, [48, 32, 2, 5], TILES.STONE);
    setRect(tiles, BLOCKS.B2.rect, TILES.STONE);

    const houses = [
      makeServiceBuilding({ id: "keeper-house", blockId: "A1", sprite: "guildBuilding", label: "✦ 拾燈公會", district: "guild", entryPortalId: "world-to-guild", role: "guild" }),
      makeServiceBuilding({ id: "forge", blockId: "B1", sprite: "equipmentShopBuilding", label: "⚒ 銀火裝備店", district: "equipment", entryPortalId: "world-to-shop", role: "equipment-shop" }),
      makeServiceBuilding({ id: "tea-house", blockId: "A3", sprite: "innBuilding", label: "▰ 霧燈旅店", district: "inn", entryPortalId: "world-to-inn", role: "inn" }),
      makeServiceBuilding({ id: "clinic", blockId: "A2", sprite: "clinicBuilding", label: "✚ 霧草療癒所", district: "clinic", entryPortalId: "world-to-clinic", role: "clinic" }),
      makeServiceBuilding({ id: "general-store", blockId: "B3", sprite: "generalStoreBuilding", label: "◇ 霧穀雜貨舖", district: "general-store", entryPortalId: "world-to-general-store", role: "general-store" }),
    ];
    for (const [blockId, tx] of [["A1", 10], ["A2", 25], ["A3", 40], ["B1", 10], ["B3", 40]]) {
      const [, blockY] = BLOCKS[blockId].rect;
      setRect(tiles, [tx - 1, blockY + 8, 3, 4], TILES.STONE);
    }

    const npcs = [
      { id: "ah-ching", name: "阿澄", role: "守燈星術師", kind: "npc", ...point(25.2, 28.1), radius: 12, color: "#ffc857", facing: "down", actor: "keeper", gender: "female", age: 25, appearance: "銀藍長髮、青綠眼、紫黑金星術法衣、白羽披肩、月輪法杖與藍色精靈同伴", referenceAsset: "assets/ah-ching-v1.png" },
      { id: "town-smith", name: "鐵叔", role: "街坊鍛刀匠", kind: "npc", ...point(14.1, 18.5), radius: 12, color: "#ff8b62", facing: "right", actor: "smith", gender: "male", age: 43 },
      { id: "town-herbalist", name: "草姨", role: "街坊草藥師", kind: "npc", ...point(33.5, 18.5), radius: 12, color: "#87db82", facing: "left", actor: "healer", gender: "female", age: 47 },
    ];
    const shrine = { id: "harbour-shrine", name: "中央燈龕", kind: "shrine", ...point(25, 25), radius: 18 };
    const townGate = { id: "east-city-gate", name: "霧都東門", kind: "townGate", x: 44.55 * TILE, y: 33.25 * TILE, radius: 24, side: "east", opening: { minTileY: 32, maxTileY: 36 }, corridor: [46, 32, 4, 5], sprite: "townGateEast", spriteWidth: 720, spriteHeight: 480, spriteBottomOffset: 30 };
    const boards = [{ id: "harbour-gate-deck-console", kind: "questBoard", name: "城門戰技面板台", ...point(44.5, 29.5), radius: 22, boardId: "deck-loadout", prompt: "設定戰技面板", gateId: townGate.id }];
    const portals = [{ id: "world-to-field", kind: "portal", interactionMode: "gate", transitionType: TRANSITION_TYPES.PHYSICAL_GATE, name: "前往霧梅爾山地", mapLabel: "東門", alwaysVisible: true, markerSize: 38, ...worldPoint(48.5, 34.5), radius: 23, targetMap: MAP_IDS.FIELD, targetSpawn: "westGate", targetPosition: point(2, 26), prompt: "離開主城", gateId: townGate.id, direction: "east" }];
    const signs = [
      { id: "town-sign-plaza", kind: "sign", name: "中央廣場路牌", ...point(28, 29.5), radius: 10, text: "北側：療癒所　西側：裝備店　東側：雜貨舖" },
      { id: "town-sign-gate", kind: "sign", name: "東門告示", ...point(45.5, 30.5), radius: 10, text: "東門 → 霧梅爾山地。出發前請先整理戰技面板。" },
    ];
    const chests = [{ id: "town-supply-chest", kind: "chest", name: "城防補給箱", ...point(46, 29), radius: 13, reward: { coins: 24, potions: 1 } }];
    const trees = [];
    for (const [tx, ty, variant, renderScale] of [[3, 3, "pineTree", 1.05], [17, 3, "broadleafTree", .98], [32, 3, "blossomTree", .98], [47, 3, "pineTree", 1.05], [3, 22, "autumnTree", .9], [47, 22, "broadleafTree", .9], [3, 38, "broadleafTree", .9], [47, 38, "blossomTree", .9]]) {
      trees.push({ id: `town-tree-${trees.length}`, kind: "tree", ...point(tx, ty), tileX: tx, tileY: ty, radius: 23, seed: random(), variant, groveId: "town-edge-greenery", renderScale });
    }
    const rocks = [{ id: "town-rock-northwest", kind: "rock", ...point(3.2, 38.5), radius: 10, seed: random() }, { id: "town-rock-southeast", kind: "rock", ...point(46.2, 38.5), radius: 10, seed: random() }];
    const flowers = [[3, 5], [17, 5], [32, 5], [47, 5], [3, 27], [47, 27], [3, 39], [47, 39], [7, 18.8], [13, 18.8], [37, 18.8], [43, 18.8]].map(([tx, ty], index) => { const base = point(tx, ty); return { id: `town-flower-${index}`, x: base.x, y: base.y, color: random() > .5 ? "#f5e9ca" : "#ae91ff", seed: random() }; });
    const lamps = [[3.5, 15.25], [15, 15.25], [20.5, 15.25], [29.5, 15.25], [45.5, 15.25], [3.5, 31.25], [15, 31.25], [20.5, 31.25], [29.5, 31.25], [45.5, 31.25], [15.25, 21.5], [15.25, 29.5], [33.75, 21.5], [33.75, 29.5]].map(([tx, ty], index) => ({ id: `town-lamp-${index}`, kind: "lamp", ...point(tx, ty), radius: 7 }));
    const start = worldPoint(25, 35);
    const spawnPoints = { start, guildFront: worldPoint(10, 14.5), clinicFront: worldPoint(25, 14.5), innFront: worldPoint(40, 14.5), shopFront: worldPoint(10, 30.5), generalStoreFront: worldPoint(40, 30.5), eastGateInside: worldPoint(47, 34.5) };
    const spawnFacings = { guildFront: "down", clinicFront: "down", innFront: "down", shopFront: "down", generalStoreFront: "down", eastGateInside: "right" };
    return {
      id: MAP_IDS.WORLD, name: "霧都主城", shortName: "霧都", kind: "town", type: "world", biome: "town", theme: "walled-town", tileSize: TILE, width: 50, height: 42, pixelWidth: WIDTH * TILE, pixelHeight: HEIGHT * TILE, tiles, tileTypes: TILES,
      houses, trees, rocks, flowers, lamps, npcs, shrine, townGate, gate: { id: "world-no-quest-gate", kind: "gate", x: -9999, y: -9999, w: 0, h: 0 }, signs, boards, portals, exits: portals, chests,
      staticObjects: [...houses, ...trees, ...rocks, ...lamps, shrine, ...signs, ...chests, ...boards], collisionObjects: [], decorations: [], furniture: [], enemySpawns: [], start, spawnPoints, spawnFacings,
      objectives: { elder: point(25.2, 28.1), townGate: worldPoint(48.5, 34.5), gate: worldPoint(48.5, 34.5), boss: worldPoint(48.5, 34.5), crystals: {} },
      questDestinations: { crystals: { mapId: MAP_IDS.FIELD, objectiveGroup: "crystals" }, seal: { mapId: MAP_IDS.FIELD, objectiveId: "gate" }, boss: { mapId: MAP_IDS.FIELD, objectiveId: "boss" }, dungeon: { mapId: MAP_IDS.FIELD, objectiveId: "dungeon" } },
      townLayout: {
        blueprintVersion: 1, style: "canonical-orthogonal-block-town", tileSizePx: TILE, map: { widthTiles: 50, heightTiles: 42 }, blockModule: { ...BLOCK_MODULE }, blocks: Object.fromEntries(Object.entries(BLOCKS).map(([id]) => [id, copyBlock(id)])),
        serviceBuildingTemplate: { containingBlock: [12, 12], visualBox: { offsetFromBlock: [2, 1], sizeTiles: [8, 7] }, doorAxis: { xFromBlockLeft: 6 }, doorAnchor: { relative: [6, 8] }, threshold: { centerRelative: [6, 8.25], sizeTiles: [1.5, 1] }, approachPoint: { relative: [6, 10] }, exteriorSpawn: { relative: [6, 10.5] }, entryFacing: "up", returnFacing: "down" },
        roads: Object.fromEntries(Object.entries(BLUEPRINT_ROADS).map(([id, road]) => [id, { ...road, rect: [...road.rect] }])),
        centralPlaza: { rect: [19, 20, 12, 12], pavedAsOneSpace: true, focalReserve: { rect: [24, 24, 2, 2] } },
        cityWall: { north: [0, 0, 50, 2], west: [0, 0, 2, 42], south: [0, 40, 50, 2], eastNorth: [48, 0, 2, 32], eastSouth: [48, 37, 2, 5] },
        eastGate: { corridor: [46, 32, 4, 5], opening: [48, 32, 2, 5], exitDirection: "east", destination: "field", transitionType: TRANSITION_TYPES.PHYSICAL_GATE }, perimeter: { left: 0, top: 0, right: WIDTH - 1, bottom: HEIGHT - 1 }, wallTile: TILES.WALL, serviceBuildingIds: houses.map((house) => house.id), deckConsoleId: boards[0].id,
        roadNetwork: { main: "main_street", secondary: "north_service_street", connectors: ["west_avenue", "east_avenue"], intersections: [[16, 16, 3, 4], [31, 16, 3, 4], [16, 32, 3, 5], [31, 32, 3, 5]] },
      },
      forestLayout: { style: "controlled-edge-groves", treePattern: "authored-boundary-groves", collisionRadius: 23, roadClearanceTiles: 1, objectiveClearanceTiles: 1, groves: [{ id: "town-edge-greenery", variant: "cleaned-v5-mixed", blocks: [] }] },
      transitionLinks: [
        { houseId: "keeper-house", portalId: "world-to-guild", targetMap: MAP_IDS.GUILD, targetSpawn: "entrance", returnSpawn: "guildFront", entryFacing: "up", returnFacing: "down", entrance: PHYSICAL_BUILDING_ENTRANCE, name: "拾燈公會", mapLabel: "公會", prompt: "進入拾燈公會" },
        { houseId: "forge", portalId: "world-to-shop", targetMap: MAP_IDS.SHOP, targetSpawn: "entrance", returnSpawn: "shopFront", entryFacing: "up", returnFacing: "down", entrance: PHYSICAL_BUILDING_ENTRANCE, name: "銀火裝備店", mapLabel: "裝備店", prompt: "進入裝備店" },
        { houseId: "clinic", portalId: "world-to-clinic", targetSpawn: "entrance", targetMap: MAP_IDS.CLINIC, returnSpawn: "clinicFront", entryFacing: "up", returnFacing: "down", entrance: PHYSICAL_BUILDING_ENTRANCE, name: "霧草療癒所", mapLabel: "療癒所", prompt: "進入療癒所" },
        { houseId: "general-store", portalId: "world-to-general-store", targetMap: MAP_IDS.GENERAL_STORE, targetSpawn: "entrance", returnSpawn: "generalStoreFront", entryFacing: "up", returnFacing: "down", entrance: PHYSICAL_BUILDING_ENTRANCE, name: "霧穀雜貨舖", mapLabel: "雜貨舖", prompt: "進入雜貨舖" },
        { houseId: "tea-house", portalId: "world-to-inn", targetMap: MAP_IDS.INN, targetSpawn: "entrance", returnSpawn: "innFront", entryFacing: "up", returnFacing: "down", entrance: PHYSICAL_BUILDING_ENTRANCE, name: "霧燈旅店", mapLabel: "旅店", prompt: "進入旅店" },
      ],
    };
  }

  return { TILE, WIDTH, HEIGHT, TILES, BLOCKS, STANDARD_BUILDING, point, worldPoint, createMainTownMap };
});
