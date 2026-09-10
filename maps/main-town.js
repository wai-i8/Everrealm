(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../map/map-constants.js") : null);
  const helpers = root.LanternMapHelpers || (typeof require === "function" ? require("../map/map-helpers.js") : null);
  const navigationApi = root.LanternMainTownNavigation || (typeof require === "function" ? require("../map/main-town-navigation.js") : null);
  const api = factory(constants, helpers, navigationApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMainTownMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, helpers, navigationApi) {
  "use strict";

  const { TILES, MAP_IDS, TRANSITION_TYPES } = constants;
  const { makeTiles } = helpers;
  const navigationPackage = navigationApi.data;
  const TILE = 32;
  const WIDTH = navigationPackage.source.width / TILE;
  const HEIGHT = navigationPackage.source.height / TILE;
  const ART_BACKGROUND = "assets/main-town/maintown.jpg";
  const AUTHORING_IMAGE = "assets/main-town/maintown_walkable.jpg";
  const NAVIGATION_JSON = "assets/main-town/main-town-navigation.json";

  // The package order is intentionally semantic rather than guessed from the
  // old scene: every rectangle comes from a named colour component in the
  // supplied authoring JPG.
  const BUILDINGS = Object.freeze([
    Object.freeze({ id: "keeper-house", role: "guild", triggerName: "Guild", portalId: "world-to-guild", targetMap: MAP_IDS.GUILD, targetSpawn: "entrance", returnSpawn: "guildFront", label: "✦ 公會", mapLabel: "公會", name: "公會", entryFacing: "up", returnFacing: "down" }),
    Object.freeze({ id: "forge", role: "equipment-shop", triggerName: "Weapon Shop", portalId: "world-to-shop", targetMap: MAP_IDS.SHOP, targetSpawn: "entrance", returnSpawn: "shopFront", label: "⚒ 銀火裝備店", mapLabel: "裝備店", name: "銀火裝備店", entryFacing: "up", returnFacing: "down" }),
    Object.freeze({ id: "tea-house", role: "inn", triggerName: "Inn", portalId: "world-to-inn", targetMap: MAP_IDS.INN, targetSpawn: "entrance", returnSpawn: "innFront", label: "▰ 霧燈旅店", mapLabel: "旅店", name: "霧燈旅店", entryFacing: "up", returnFacing: "down" }),
    Object.freeze({ id: "clinic", role: "clinic", triggerName: "Hospital / Clinic", portalId: "world-to-clinic", targetMap: MAP_IDS.CLINIC, targetSpawn: "entrance", returnSpawn: "clinicFront", label: "✚ 霧草療癒所", mapLabel: "療癒所", name: "霧草療癒所", entryFacing: "up", returnFacing: "down" }),
    Object.freeze({ id: "general-store", role: "general-store", triggerName: "Item / General Store", portalId: "world-to-general-store", targetMap: MAP_IDS.GENERAL_STORE, targetSpawn: "entrance", returnSpawn: "generalStoreFront", label: "◇ 霧穀雜貨舖", mapLabel: "雜貨舖", name: "霧穀雜貨舖", entryFacing: "up", returnFacing: "down" }),
  ]);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function triggerFor(name) {
    const trigger = navigationPackage.building_triggers.find((entry) => entry.name === name);
    if (!trigger) throw new Error(`Missing Main Town authoring region: ${name}`);
    return trigger;
  }

  function triggerRect(trigger) {
    return { shape: "rect", x: trigger.rectangle?.x ?? trigger.x, y: trigger.rectangle?.y ?? trigger.y, w: trigger.rectangle?.width ?? trigger.width, h: trigger.rectangle?.height ?? trigger.height };
  }

  function authoredAnchor(triggerName) {
    const result = navigationPackage.connectivity.results[triggerName];
    if (!result?.example_anchor) throw new Error(`Missing Main Town connectivity anchor: ${triggerName}`);
    return { x: result.example_anchor[0], y: result.example_anchor[1] };
  }

  function makeHouse(definition) {
    const trigger = triggerFor(definition.triggerName);
    const rect = triggerRect(trigger);
    const doorY = rect.y + rect.h / 2;
    return {
      id: definition.id,
      kind: "house",
      role: definition.role,
      label: definition.label,
      name: definition.name,
      entryPortalId: definition.portalId,
      masterArt: true,
      render: false,
      x: trigger.doorway_center_x,
      y: doorY,
      w: 0,
      h: 0,
      doorX: trigger.doorway_center_x,
      doorY,
      doorway: { centerX: trigger.doorway_center_x, trigger: rect },
    };
  }

  function makeDoorEntrance(definition) {
    const trigger = triggerFor(definition.triggerName);
    const exactRect = triggerRect(trigger);
    return {
      outward: "south",
      trigger: exactRect,
      threshold: exactRect,
      approachPoint: authoredAnchor(definition.triggerName),
      entryFacing: definition.entryFacing,
      returnFacing: definition.returnFacing,
      marker: { kind: "bitmap", sprite: "interact", size: 34, anchorX: .5, anchorY: .5 },
    };
  }

  function makeTransitionLink(definition) {
    return {
      houseId: definition.id,
      portalId: definition.portalId,
      targetMap: definition.targetMap,
      targetSpawn: definition.targetSpawn,
      returnSpawn: definition.returnSpawn,
      entryFacing: definition.entryFacing,
      returnFacing: definition.returnFacing,
      entrance: makeDoorEntrance(definition),
      name: definition.name,
      mapLabel: definition.mapLabel,
      prompt: `進入${definition.name}`,
    };
  }

  function createMainTownMap() {
    const eastExit = navigationPackage.east_exit;
    const eastTrigger = triggerRect(eastExit);
    const eastAnchor = authoredAnchor("East exit");
    const eastCentre = { x: eastExit.x + eastExit.width / 2, y: eastExit.y + eastExit.height / 2 };
    const deck = navigationPackage.deck_interaction;
    const deckInteraction = {
      id: "harbour-gate-deck-console",
      kind: "questBoard",
      name: "城門戰技配置",
      boardId: "deck-loadout",
      prompt: "設定戰技面板",
      navigationRegion: deck.region_id,
      authoredRegion: { shape: "rect", x: deck.x, y: deck.y, w: deck.width, h: deck.height, value: deck.region_value },
      approachPoint: { x: deck.approach_anchor[0], y: deck.approach_anchor[1] },
      x: deck.x + deck.width / 2,
      y: deck.y + deck.height / 2,
      radius: 22,
      interactionRadius: 80,
      render: false,
      canonicalSource: AUTHORING_IMAGE,
    };
    const eastPortal = {
      id: "world-to-field",
      kind: "portal",
      interactionMode: "passage",
      transitionType: TRANSITION_TYPES.PHYSICAL_PASSAGE,
      name: "前往霧梅爾山地",
      mapLabel: "東側出口",
      alwaysVisible: true,
      markerSize: 38,
      x: eastCentre.x,
      y: eastCentre.y,
      radius: 18,
      trigger: eastTrigger,
      authoredTrigger: clone(eastTrigger),
      navigationRegion: eastExit.region_id,
      targetMap: MAP_IDS.FIELD,
      targetSpawn: "westGate",
      targetPosition: { x: 2 * 40 + 20, y: 26 * 40 + 20 },
      prompt: "離開主城",
      passageId: "east-town-passage",
      direction: "east",
      canonicalSource: AUTHORING_IMAGE,
    };
    const houses = BUILDINGS.map(makeHouse);
    const spawnPoints = {
      start: { x: navigationPackage.connectivity.central_seed[0], y: navigationPackage.connectivity.central_seed[1] },
      guildFront: authoredAnchor("Guild"),
      shopFront: authoredAnchor("Weapon Shop"),
      clinicFront: authoredAnchor("Hospital / Clinic"),
      generalStoreFront: authoredAnchor("Item / General Store"),
      innFront: authoredAnchor("Inn"),
      eastGateInside: eastAnchor,
    };
    const spawnFacings = { guildFront: "down", shopFront: "down", clinicFront: "down", generalStoreFront: "down", innFront: "down", eastGateInside: "right" };
    const shrine = null;
    const npcs = [];
    const signs = [];
    const chests = [];
    const tiles = makeTiles(WIDTH, HEIGHT, TILES.GRASS);
    const transitionLinks = BUILDINGS.map(makeTransitionLink);
    const navigation = {
      packageId: "main-town-jpg-navigation-v1",
      source: clone(navigationPackage.source),
      authoring: clone(navigationPackage.authoring),
      coordinateSystem: navigationPackage.coordinate_system,
      rendering: navigationPackage.rendering,
      movementRule: navigationPackage.movement_rule,
      feetRadiusPx: navigationPackage.feet_radius_px,
      sourceImage: AUTHORING_IMAGE,
      displayImage: ART_BACKGROUND,
      sourceJson: NAVIGATION_JSON,
      generatedRuntime: "map/main-town-navigation.generated.js",
      resolver: navigationApi,
      isWorldPositionWalkable: navigationApi.isWorldPositionWalkable,
      isInRegion: navigationApi.isInRegion,
      interactionAtWorldPoint: navigationApi.interactionAtWorldPoint,
      status: navigationApi.status,
      files: clone(navigationPackage.files),
      buildingTriggers: clone(navigationPackage.building_triggers),
      eastExit: clone(navigationPackage.east_exit),
      deckInteraction: clone(navigationPackage.deck_interaction),
      connectivity: clone(navigationPackage.connectivity),
      authoritative: true,
    };
    return {
      id: MAP_IDS.WORLD,
      name: "米克雷帝國",
      shortName: "米克雷帝國",
      kind: "town",
      type: "world",
      biome: "town",
      theme: "walled-town",
      rendering: "flattened",
      tileSize: TILE,
      width: WIDTH,
      height: HEIGHT,
      pixelWidth: navigationPackage.source.width,
      pixelHeight: navigationPackage.source.height,
      tiles,
      tileTypes: TILES,
      art: { flattened: true, background: ART_BACKGROUND, backgroundScene: "mainTown", master: ART_BACKGROUND, authoring: AUTHORING_IMAGE, sourceDimensions: { width: navigationPackage.source.width, height: navigationPackage.source.height }, masterSha256: navigationPackage.source.sha256, authoringSha256: navigationPackage.authoring.sha256 },
      navigation,
      houses,
      trees: [],
      rocks: [],
      flowers: [],
      lamps: [],
      npcs,
      shrine,
      signs,
      boards: [deckInteraction],
      portals: [eastPortal],
      exits: [eastPortal],
      chests,
      staticObjects: [],
      collisionObjects: [],
      decorations: [],
      furniture: [],
      enemySpawns: [],
      start: spawnPoints.start,
      spawnPoints,
      spawnFacings,
      objectives: { town: eastCentre },
      townLayout: {
        style: "flattened-jpg-authoring-package",
        sourceDimensions: { width: navigationPackage.source.width, height: navigationPackage.source.height },
        coordinateSystem: navigationPackage.coordinate_system,
        rendering: navigationPackage.rendering,
        navigationPackageId: navigation.packageId,
        navigationJson: NAVIGATION_JSON,
        displayImage: ART_BACKGROUND,
        authoringImage: AUTHORING_IMAGE,
        buildingTriggers: clone(navigationPackage.building_triggers),
        eastPassage: { trigger: eastTrigger, destination: "field", transitionType: TRANSITION_TYPES.PHYSICAL_PASSAGE, canonicalSource: AUTHORING_IMAGE },
        deckInteraction: clone(navigationPackage.deck_interaction),
        serviceBuildingIds: houses.map((house) => house.id),
        roadNetwork: null,
        perimeter: null,
      },
      forestLayout: { style: "flattened-jpg-master-art", treePattern: "baked-into-master-art", collisionRadius: 0, roadClearanceTiles: 0, objectiveClearanceTiles: 0, groves: [] },
      transitionLinks,
    };
  }

  return { TILE, WIDTH, HEIGHT, TILES, point: (x, y) => ({ x, y }), worldPoint: (x, y) => ({ x, y }), createMainTownMap, createWorld: createMainTownMap };
});
