(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../map/map-constants.js") : null);
  const helpers = root.LanternMapHelpers || (typeof require === "function" ? require("../map/map-helpers.js") : null);
  const navigationApi = root.LanternFieldNavigation || (typeof require === "function" ? require("../map/field-navigation.js") : null);
  const api = factory(constants, helpers, navigationApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMountainFieldMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, helpers, navigationApi) {
  "use strict";

  const { TILE, TILES, MAP_IDS, TRANSITION_TYPES } = constants;
  const { makeTiles, withMapCollections } = helpers;

  const ART = "assets/field/vanmer-mountains.jpg";
  const AUTHORING = "assets/field/vanmer-mountains_walkable.png";
  const navigation = navigationApi?.createResolver ? navigationApi.createResolver() : (navigationApi || null);
  const data = navigation?.data || {
    source: { width: 4096, height: 4096 },
    package_id: "field-navigation-flat-v1",
    coordinate_system: "original image pixels; origin top-left; x right, y down; pixel regions use exact source coordinates",
    rendering: "vanmer-mountains.jpg is the only player-visible mountain field environment; the authoring image is never rendered",
    movement_rule: "A feet disk must be completely inside the authored walkable route.",
    regions: {
      npc: [{ bbox: { x: 1731, y: 947, width: 101, height: 101 }, centroid: { x: 1781, y: 997 }, anchor: { x: 1770, y: 938 } }],
      exit: [{ bbox: { x: 567, y: 2545, width: 99, height: 215 }, centroid: { x: 616, y: 2650 }, anchor: { x: 721, y: 2650 } }],
    },
    derived: {
      top_exit_trigger: { x: 3333, y: 0, width: 275, height: 104 },
      top_exit_center: { x: 3470, y: 44 },
      west_spawn: { x: 721, y: 2650 },
      north_spawn: { x: 3470, y: 144 },
    },
  };

  const width = Math.max(1, Math.ceil((data.source?.width || 4096) / TILE));
  const height = Math.max(1, Math.ceil((data.source?.height || 4096) / TILE));
  const tiles = makeTiles(width, height, TILES.GRASS);

  const npcRegion = data.regions?.npc?.[0] || { bbox: { x: 1731, y: 947, width: 101, height: 101 }, centroid: { x: 1781, y: 997 }, anchor: { x: 1770, y: 938 } };
  const westExitRegion = data.regions?.exit?.[0] || { bbox: { x: 567, y: 2545, width: 99, height: 215 }, centroid: { x: 616, y: 2650 }, anchor: { x: 721, y: 2650 } };
  const northTrigger = data.derived?.top_exit_trigger || { x: 3333, y: 0, width: 275, height: 104 };
  const westSpawn = data.derived?.west_spawn || westExitRegion.anchor || { x: 721, y: 2650 };
  const northSpawn = data.derived?.north_spawn || { x: 3470, y: 144 };

  function createMountainFieldMap() {
    const signs = [
      { id: "field-west-sign", kind: "sign", name: "城外路牌", x: 740, y: 2525, radius: 10, text: "← 米克雷帝國　　沉燈坑道 ↑" },
      { id: "field-bend-sign", kind: "sign", name: "山道路牌", x: 2575, y: 1465, radius: 10, text: "沿山路向北可達沉燈坑道。樹海內無路可行。" },
    ];

    const chests = [
      { id: "grove-cache", kind: "chest", x: 990, y: 2590, radius: 13, reward: { coins: 38, potions: 1 }, name: "樹根木箱" },
      { id: "river-cache", kind: "chest", x: 2270, y: 1344, radius: 13, reward: { coins: 55, potions: 1 }, name: "山路鐵箱" },
      { id: "ruin-cache", kind: "chest", x: 3470, y: 150, radius: 13, reward: { coins: 90, potions: 2 }, name: "坑道口寶箱" },
    ];

    const npcs = [{
      id: "mountain_delivery_recipient",
      name: "洛安",
      displayName: "山地收件員",
      role: "山地收件員／公會送信",
      kind: "npc",
      x: npcRegion.centroid?.x || 1781,
      y: npcRegion.centroid?.y || 997,
      radius: 12,
      approachPoint: { x: npcRegion.anchor?.x || 1770, y: npcRegion.anchor?.y || 938 },
      color: "#8ac9c0",
      facing: "down",
      actor: "mountainCourier",
      gender: "male",
      age: 38,
      appearance: "穿著灰綠旅行斗篷、背住防水信袋與登山杖的山地信使",
      zone: "far-field-clearing",
      services: ["guild-delivery"],
      chatter: "山路北面風大，信件交畀我保管就唔會畀霧氣浸壞。",
    }];

    // Exploration placement only. Battle level and party size come from the
    // canonical monster catalog; these spawns are ordered roughly from the
    // west entrance toward the northern climb.
    const enemySpawns = [
      { id: "chick-road-1", type: "chick", x: 900, y: 2630, level: 1 },
      { id: "fox-road-1", type: "fox", x: 1220, y: 2635, level: 5 },
      { id: "fox-road-2", type: "fox", x: 1420, y: 2610, level: 5 },
      { id: "raccoon-road-1", type: "raccoon", x: 1640, y: 2620, level: 10 },
      { id: "raccoon-road-2", type: "raccoon", x: 2080, y: 2615, level: 10 },
      { id: "wild-boar-road-1", type: "wild_boar", x: 2320, y: 2615, level: 15 },
      { id: "wild-boar-road-2", type: "wild_boar", x: 3194, y: 2302, level: 15 },
      { id: "wild-boar-hollow-1", type: "wild_boar", x: 2268, y: 1348, level: 15 },
      { id: "coyote-climb-1", type: "coyote", x: 2921, y: 1270, level: 27 },
      { id: "coyote-climb-2", type: "coyote", x: 3490, y: 1280, level: 27 },
      { id: "coyote-climb-3", type: "coyote", x: 3475, y: 1440, level: 27 },
      { id: "coyote-north-1", type: "coyote", x: 3515, y: 820, level: 27 },
    ];

    const westExit = {
      id: "field-to-world",
      kind: "portal",
      interactionMode: "passage",
      transitionType: TRANSITION_TYPES.PHYSICAL_PASSAGE,
      name: "返回米克雷帝國",
      x: westExitRegion.centroid?.x || 616,
      y: westExitRegion.centroid?.y || 2650,
      radius: 26,
      targetMap: MAP_IDS.WORLD,
      targetSpawn: "eastGateInside",
      targetPosition: null,
      targetFacing: "right",
      prompt: "返回米克雷帝國",
      direction: "west",
      mapLabel: "米克雷帝國出口",
      alwaysVisible: true,
      navigationRegion: "exit",
      entrance: {
        outward: "west",
        approachPoint: westSpawn,
        threshold: {
          shape: "rect",
          x: westExitRegion.bbox?.x || 567,
          y: westExitRegion.bbox?.y || 2545,
          w: westExitRegion.bbox?.width || 99,
          h: westExitRegion.bbox?.height || 215,
        },
        approachDistance: 0,
        entryFacing: "right",
        returnFacing: "left",
      },
    };

    const dungeonExit = {
      id: "field-to-dungeon",
      kind: "portal",
      interactionMode: "passage",
      transitionType: TRANSITION_TYPES.PHYSICAL_PASSAGE,
      name: "進入沉燈坑道",
      x: (data.derived?.top_exit_center?.x || 3470),
      y: (data.derived?.top_exit_center?.y || 44),
      radius: 38,
      targetMap: MAP_IDS.DUNGEON,
      targetSpawn: "entrance",
      targetPosition: null,
      targetFacing: "down",
      prompt: "進入沉燈坑道",
      direction: "north",
      mapLabel: "坑道",
      alwaysVisible: true,
      minLevel: 5,
      trigger: {
        shape: "rect",
        x: northTrigger.x,
        y: northTrigger.y,
        w: northTrigger.width,
        h: northTrigger.height,
      },
    };

    const start = { x: westSpawn.x, y: westSpawn.y };
    const openingBattlefield = {
      id: "mountain-opening-v3",
      width: 8,
      height: 3,
      projection: {
        xAxis: { x: .78, y: -.50 },
        yAxis: { x: .78, y: .50 },
        elevationStep: .26,
        baseThickness: .28,
      },
      deploymentZones: {
        ally: [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 0 }],
        enemy: [{ x: 6, y: 1 }, { x: 6, y: 0 }, { x: 6, y: 2 }],
      },
      heightMap: {
        "6,1": 1, "7,1": 1,
        "6,2": 1, "7,2": 1,
      },
      terrainCells: {
        "3,0": { kind: "tree", obstacleHeight: "high", movementBlocked: true, blocksLinear: true, blocksArc: true, occupiedHeight: 3.2 },
        "5,2": { kind: "scrub", obstacleHeight: "low", movementBlocked: true, blocksLinear: true, blocksArc: false, occupiedHeight: .65 },
      },
    };

    const map = withMapCollections({
      id: MAP_IDS.FIELD,
      name: "霧梅爾山地東南部",
      shortName: "霧梅爾山地",
      kind: "field",
      type: "world",
      biome: "mountain",
      theme: "forest-road",
      ambient: "misty-woodland",
      recommendedLevel: 1,
      maxRecommendedLevel: 27,
      tileSize: TILE,
      tileTypes: TILES,
      width,
      height,
      tiles,
      start,
      spawnPoints: {
        entrance: start,
        westGate: { x: westSpawn.x, y: westSpawn.y },
        dungeonFront: { x: northSpawn.x, y: northSpawn.y },
        courierApproach: { x: npcRegion.anchor?.x || 1770, y: npcRegion.anchor?.y || 938 },
      },
      spawnFacings: {
        entrance: "right",
        westGate: "right",
        dungeonFront: "down",
        courierApproach: "down",
      },
      exits: [westExit, dungeonExit],
      houses: [],
      trees: [],
      rocks: [],
      flowers: [],
      lamps: [],
      signs,
      solidRects: [],
      furniture: [],
      decorations: [],
      boards: [],
      npcs,
      enemySpawns,
      chests,
      shrine: null,
      waypoint: null,
      worldPortalId: "world-to-field",
      dungeonPortalId: dungeonExit.id,
      objectives: {
        dungeon: { x: dungeonExit.x, y: dungeonExit.y },
        town: { x: westExit.x, y: westExit.y },
      },
      battlefield: openingBattlefield,
      routeLayout: {
        style: "west-road-loop-north-climb",
        entrySide: "west",
        dungeonSide: "north",
        waypoints: [
          { x: westSpawn.x, y: westSpawn.y },
          { x: 2050, y: 2635 },
          { x: 3520, y: 2590 },
          { x: 3540, y: 1310 },
          { x: dungeonExit.x, y: northSpawn.y },
        ],
        solidOutsideRoute: true,
      },
      forestLayout: {
        style: "flattened-background-scene",
        collisionSource: "authored-walkable-mask",
        collisionRadius: 28,
        clearings: [{ id: "far-field-clearing", x: npcRegion.centroid?.x || 1781, y: npcRegion.centroid?.y || 997, radiusPx: 120 }],
      },
      art: {
        flattened: true,
        background: "field",
        backgroundScene: "field",
        master: ART,
        authoring: AUTHORING,
        sourceDimensions: { width: data.source?.width || 4096, height: data.source?.height || 4096 },
        rendering: data.rendering,
      },
    });

    map.pixelWidth = data.source?.width || 4096;
    map.pixelHeight = data.source?.height || 4096;
    map.navigation = {
      data,
      ready: navigation?.ready ?? false,
      failure: navigation?.failure || null,
      packageId: data.package_id,
      source: { ...(data.source || {}) },
      coordinateSystem: data.coordinate_system,
      rendering: data.rendering,
      movementRule: data.movement_rule,
      feetRadiusPx: navigation?.feetRadiusPx || data.feet_radius_px || 3,
      serviceInteractionReachPx: navigation?.serviceInteractionReachPx || 160,
      serviceInteractionHitPaddingPx: navigation?.serviceInteractionHitPaddingPx || 18,
      sourceImage: AUTHORING,
      generatedRuntime: "map/field-navigation.generated.js",
      resolver: navigation,
      isPositionWalkable: navigation?.isPositionWalkable || (() => false),
      isRegionAt: navigation?.isRegionAt || (() => false),
      isInRegion: navigation?.isInRegion || (() => false),
      nearestPointInRegion: navigation?.nearestPointInRegion || (() => null),
      distanceToRegion: navigation?.distanceToRegion || (() => Infinity),
      interactionHitTest: navigation?.interactionHitTest || (() => false),
      interactionAtWorldPoint: navigation?.interactionAtWorldPoint || (() => null),
      status: navigation?.status || (() => ({ ready: false, failed: true, failure: "field navigation unavailable" })),
      authoritative: true,
    };

    return map;
  }

  return { TILE, TILES, MAP_IDS, createMountainFieldMap, createFieldMap: createMountainFieldMap };
});
