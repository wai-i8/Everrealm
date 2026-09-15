(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../map/map-constants.js") : null);
  const helpers = root.LanternMapHelpers || (typeof require === "function" ? require("../map/map-helpers.js") : null);
  const navigationApi = root.LanternMountainSouthNavigation || (typeof require === "function" ? require("../map/mountain-south-navigation.js") : null);
  const api = factory(constants, helpers, navigationApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMountainSouthMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, helpers, navigationApi) {
  "use strict";

  const { TILE, TILES, MAP_IDS, TRANSITION_TYPES } = constants;
  const { makeTiles, withMapCollections } = helpers;

  const ART = "assets/field/vanmer-mountains-south.jpg";
  const AUTHORING = "assets/field/vanmer-mountains-south_walkable.png";
  const navigation = navigationApi.createResolver();
  const data = navigation.data;
  const width = Math.ceil(data.source.width / TILE);
  const height = Math.ceil(data.source.height / TILE);
  const tiles = makeTiles(width, height, TILES.GRASS);
  const exitRegions = Array.isArray(data.regions?.exit) ? data.regions.exit.filter(Boolean) : [];

  // The south map currently has two authored cyan passages. The east-most one
  // is the live link back to the southeast map; the northern one is reserved.
  // Bind by authored position rather than generated component order.
  const eastExitRegion = exitRegions.reduce((best, region) => {
    const x = Number(region?.centroid?.x);
    const bestX = Number(best?.centroid?.x);
    if (!Number.isFinite(x)) return best;
    if (!best || !Number.isFinite(bestX) || x > bestX) return region;
    return best;
  }, null);
  const northExitRegion = exitRegions
    .filter((region) => region !== eastExitRegion)
    .reduce((best, region) => {
      const y = Number(region?.centroid?.y);
      const bestY = Number(best?.centroid?.y);
      if (!Number.isFinite(y)) return best;
      if (!best || !Number.isFinite(bestY) || y < bestY) return region;
      return best;
    }, null);

  // Cyan is transition-only. Arrival is deliberately inside the adjacent
  // white road so the player can immediately move away from the passage.
  const eastEntranceSpawn = { x: 4500, y: 1489 };

  function createMountainSouthMap() {
    if (!eastExitRegion) throw new Error("mountain-south east cyan exit is unavailable");

    const eastExit = {
      id: "mountain-south-to-dungeon",
      kind: "portal",
      interactionMode: "passage",
      transitionType: TRANSITION_TYPES.PHYSICAL_PASSAGE,
      name: "返回欣梅爾山地東南部",
      x: eastExitRegion.centroid.x,
      y: eastExitRegion.centroid.y,
      radius: 38,
      targetMap: MAP_IDS.DUNGEON,
      targetSpawn: "southEntrance",
      targetPosition: null,
      targetFacing: "right",
      prompt: "返回欣梅爾山地東南部",
      direction: "east",
      mapLabel: "欣梅爾山地東南部",
      alwaysVisible: true,
      trigger: {
        shape: "rect",
        x: eastExitRegion.bbox.x,
        y: eastExitRegion.bbox.y,
        w: eastExitRegion.bbox.width,
        h: eastExitRegion.bbox.height,
      },
    };

    const map = withMapCollections({
      id: MAP_IDS.MOUNTAIN_SOUTH,
      name: "欣梅爾山地南部",
      shortName: "欣梅爾山地南部",
      kind: "field",
      type: "world",
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
      start: eastEntranceSpawn,
      spawnPoints: {
        entrance: eastEntranceSpawn,
        eastEntrance: eastEntranceSpawn,
      },
      spawnFacings: {
        entrance: "left",
        eastEntrance: "left",
      },
      exits: [eastExit],
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
      enemySpawns: [],
      chests: [],
      shrine: null,
      waypoint: null,
      routeLayout: {
        style: "authored-mountain-road",
        entrySide: "east",
        reservedExitSide: northExitRegion ? "north" : null,
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
        background: "mountainSouth",
        backgroundScene: "mountainSouth",
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
      generatedRuntime: "map/mountain-south-navigation.generated.js",
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

  return { TILE, TILES, MAP_IDS, createMountainSouthMap };
});
