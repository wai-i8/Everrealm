(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../map/map-constants.js") : null);
  const helpers = root.LanternMapHelpers || (typeof require === "function" ? require("../map/map-helpers.js") : null);
  const navigationApi = root.LanternMountainSecondNavigation || (typeof require === "function" ? require("../map/mountain-second-navigation.js") : null);
  const monsters = root.LanternMonsterBlueprints || (typeof require === "function" ? require("../map/monster-blueprints.js") : null);
  const api = factory(constants, helpers, navigationApi, monsters);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMineMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, helpers, navigationApi, monsters) {
  "use strict";

  const { TILE, TILES, MAP_IDS, TRANSITION_TYPES } = constants;
  const { makeTiles, withMapCollections } = helpers;
  const { MONSTER_BLUEPRINTS } = monsters;

  const ART = "assets/field/vanmer-mountains-2.jpg";
  const AUTHORING = "assets/field/vanmer-mountains-2_walkable.png";
  const navigation = navigationApi.createResolver();
  const data = navigation.data;
  const width = Math.ceil(data.source.width / TILE);
  const height = Math.ceil(data.source.height / TILE);
  const tiles = makeTiles(width, height, TILES.WALL);
  const activeExitRegion = data.regions.exit[0];
  const reservedExitRegion = data.regions.exit[1] || null;
  const activeExitPoint = activeExitRegion.centroid;
  // Transition cyan is only the threshold. Arrival points sit safely inside
  // the adjacent authored white road, matching the first mountain field.
  const entranceSpawn = { x: 4716, y: 4383 };
  const reservedExitSpawn = { x: 524, y: 1036 };

  function monsterSpawn(id, type, x, y) {
    const blueprint = MONSTER_BLUEPRINTS[type];
    return {
      id,
      type,
      name: blueprint?.name || type,
      artType: blueprint?.artType || type,
      family: blueprint?.family || "monster",
      x,
      y,
      level: blueprint?.baseLevel || 1,
    };
  }

  function createMineMap() {
    const exit = {
      id: "dungeon-to-field",
      kind: "portal",
      interactionMode: "passage",
      transitionType: TRANSITION_TYPES.PHYSICAL_PASSAGE,
      name: "返回欣梅爾山地東南偏南",
      x: activeExitPoint.x,
      y: activeExitPoint.y,
      radius: 38,
      targetMap: MAP_IDS.FIELD,
      targetSpawn: "dungeonFront",
      targetPosition: null,
      targetFacing: "down",
      prompt: "返回欣梅爾山地東南偏南",
      direction: "east",
      mapLabel: "山地出口",
      alwaysVisible: true,
      trigger: {
        shape: "rect",
        x: activeExitRegion.bbox.x,
        y: activeExitRegion.bbox.y,
        w: activeExitRegion.bbox.width,
        h: activeExitRegion.bbox.height,
      },
    };

    const enemySpawns = [
      monsterSpawn("frog-mountain-2-1", "frog", 800, 900),
      monsterSpawn("frog-mountain-2-2", "frog", 1400, 900),
      monsterSpawn("coyote-mountain-2-1", "coyote", 2260, 1370),
      monsterSpawn("coyote-mountain-2-2", "coyote", 2000, 1100),
      monsterSpawn("turtle-mountain-2-1", "turtle", 2468, 1400),
      monsterSpawn("turtle-mountain-2-2", "turtle", 2949, 1981),
      monsterSpawn("snake-mountain-2-1", "snake", 3518, 2788),
      monsterSpawn("snake-mountain-2-2", "snake", 3898, 3260),
    ];

    const shrine = {
      id: "echo-lantern-shrine",
      kind: "shrine",
      name: "山徑燈火",
      x: 4680,
      y: 4680,
      radius: 19,
      prompt: "E　點亮山徑燈火",
      waypointId: "mountain-2-lantern",
      services: ["heal", "save", "waypoint"],
      render: false,
    };

    const map = withMapCollections({
      id: MAP_IDS.DUNGEON,
      name: "欣梅爾山地東南部",
      shortName: "欣梅爾山地東南部",
      kind: "dungeon",
      type: "dungeon",
      biome: "mountain",
      theme: "mountain-road",
      ambient: "sunlit-mountain",
      recommendedLevel: 21,
      maxRecommendedLevel: 45,
      tileSize: TILE,
      tileTypes: TILES,
      width,
      height,
      tiles,
      start: entranceSpawn,
      spawnPoints: {
        entrance: entranceSpawn,
        waypoint: { x: shrine.x, y: shrine.y },
        reservedExit: reservedExitRegion ? reservedExitSpawn : null,
      },
      exits: [exit],
      houses: [],
      trees: [],
      rocks: [],
      flowers: [],
      lamps: [],
      signs: [],
      solidRects: [],
      furniture: [],
      decorations: [],
      boards: [],
      npcs: [],
      enemySpawns,
      chests: [],
      shrine,
      waypoint: shrine,
      worldPortalId: "field-to-dungeon",
      objectives: {
        waypoint: { x: shrine.x, y: shrine.y },
        exit: { x: exit.x, y: exit.y },
      },
      routeLayout: {
        style: "authored-mountain-road",
        entrySide: "east-south",
        reservedExitSide: "west-north",
        solidOutsideRoute: true,
      },
      forestLayout: {
        style: "flattened-background-scene",
        collisionSource: "authored-walkable-mask",
        collisionRadius: 28,
      },
      battlefield: {
        theme: "mountain",
        biome: "mountain",
      },
      art: {
        flattened: true,
        background: "mountain2",
        backgroundScene: "mountain2",
        master: ART,
        authoring: AUTHORING,
        sourceDimensions: { width: data.source.width, height: data.source.height },
        rendering: data.rendering,
      },
    });

    map.pixelWidth = data.source.width;
    map.pixelHeight = data.source.height;
    map.navigation = {
      data,
      ready: navigation.ready,
      failure: navigation.failure,
      packageId: data.package_id,
      source: { ...data.source },
      coordinateSystem: data.coordinate_system,
      rendering: data.rendering,
      movementRule: data.movement_rule,
      feetRadiusPx: navigation.feetRadiusPx,
      serviceInteractionReachPx: navigation.serviceInteractionReachPx,
      serviceInteractionHitPaddingPx: navigation.serviceInteractionHitPaddingPx,
      sourceImage: AUTHORING,
      generatedRuntime: "map/mountain-second-navigation.generated.js",
      resolver: navigation,
      isPositionWalkable: navigation.isPositionWalkable,
      isRegionAt: navigation.isRegionAt,
      isInRegion: navigation.isInRegion,
      isFeetInRegion: navigation.isFeetInRegion,
      nearestPointInRegion: navigation.nearestPointInRegion,
      distanceToRegion: navigation.distanceToRegion,
      interactionHitTest: navigation.interactionHitTest,
      interactionAtWorldPoint: navigation.interactionAtWorldPoint,
      status: navigation.status,
      authoritative: true,
    };
    return map;
  }

  return { TILE, TILES, MAP_IDS, createMineMap, createDungeonMap: createMineMap, monsterSpawn };
});
