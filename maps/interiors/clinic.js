(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../../map/map-constants.js") : null);
  const helpers = root.LanternInteriorHelpers || (typeof require === "function" ? require("../../map/interior-helpers.js") : null);
  const navigationApi = root.LanternHospitalNavigation || (typeof require === "function" ? require("../../map/hospital-navigation.js") : null);
  const api = factory(constants, helpers, navigationApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternClinicMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, interior, navigationApi) {
  "use strict";
  const { MAP_IDS, TILES } = constants;
  const { createInteriorMap, rect, point } = interior;
  const HOSPITAL_ART = "assets/hospital/hospital.png";
  const HOSPITAL_AUTHORING = "assets/hospital/hospital_walkable.png";
  const navigation = navigationApi.createResolver();
  const navigationPackage = navigation.data;
  const NPC_REGION = navigationPackage?.regions?.npc?.[0] || { anchor: { x: 829, y: 266 }, bbox: { x: 786, y: 147, width: 86, height: 120 } };
  const EXIT_REGION = navigationPackage?.regions?.exit?.[0] || { centroid: { x: 837, y: 833 }, bbox: { x: 735, y: 806, width: 204, height: 55 } };
  const NPC_FEET = { x: NPC_REGION.anchor.x, y: NPC_REGION.anchor.y };
  const EXIT_POINT = { x: EXIT_REGION.centroid.x, y: EXIT_REGION.centroid.y };
  const ENTRANCE_SPAWN = { x: 837, y: 780 };

  function createClinicMap() {
    const furniture = [
      rect(6, 3.1, 8, 1.1, { id: "clinic-counter", kind: "counter", name: "配藥櫃台", zone: "reception", render: false, solid: false }),
      rect(2, 2, 1, 5, { id: "clinic-herb-shelf", kind: "bookshelf", name: "藥草架", zone: "medical-storage", render: false, solid: false }),
      rect(17, 2, 1, 5, { id: "clinic-bottle-shelf", kind: "bookshelf", name: "藥瓶架", zone: "medical-storage", render: false, solid: false }),
      rect(4, 5.5, 3, 1, { id: "clinic-waiting-bench-west", kind: "table", name: "候診長凳", zone: "waiting", render: false, solid: false }),
      rect(11.5, 5.5, 3, 1, { id: "clinic-waiting-bench-east", kind: "table", name: "候診長凳", zone: "waiting", render: false, solid: false }),
      rect(4, 8, 3, 1.35, { id: "clinic-bed-a", kind: "bed", name: "療癒床", zone: "treatment", render: false, solid: false, blanket: "#87c5c1" }),
      rect(12, 8, 3, 1.35, { id: "clinic-bed-b", kind: "bed", name: "療癒床", zone: "treatment", render: false, solid: false, blanket: "#c8a6d8" }),
      rect(8, 9.7, 3, 1, { id: "clinic-treatment-table", kind: "table", name: "處置桌", zone: "treatment", render: false, solid: false }),
    ];
    const decorations = [
      { id: "clinic-lamp-west", kind: "wallSconce", ...point(5, 2.1), radius: 8, render: false, solid: false },
      { id: "clinic-lamp-east", kind: "wallSconce", ...point(14, 2.1), radius: 8, render: false, solid: false },
      { id: "clinic-herb-bundle", kind: "banner", ...point(17, 2), color: "#82d6c7", emblem: "leaf", render: false, solid: false },
    ];
    const npcs = [{
      id: "clinic-healer-siu-moon",
      name: "小滿",
      displayName: "醫療所護士",
      role: "醫療所護士／療癒服務",
      kind: "npc",
      x: NPC_FEET.x,
      y: NPC_FEET.y - 13,
      radius: 12,
      render: false,
      color: "#87db82",
      facing: "down",
      actor: "healer",
      gender: "female",
      age: 27,
      appearance: "金髮藍白女法師造型、白金短斗篷、藍寶石法袍與長靴",
      zone: "reception",
      services: ["clinic-healing"],
    }];
    const map = createInteriorMap({
      // The neutral tile scaffold only keeps legacy map consumers rectangular;
      // Hospital rendering and collision are owned by the flattened art and
      // generated navigation resolver below.
      width: Math.ceil(navigationPackage.source.width / 40),
      height: Math.ceil(navigationPackage.source.height / 40),
      floor: TILES.WOOD,
      features: [],
      furniture,
      decorations,
      npcs,
      exit: {
        id: "clinic-to-world",
        tx: EXIT_POINT.x / 40 - .5,
        ty: EXIT_POINT.y / 40 - .5,
        targetMap: MAP_IDS.WORLD,
        targetSpawn: "clinicFront",
        label: "返回霧都",
        targetPosition: point(27, 8),
        navigationRegion: "exit",
        entrance: {
          outward: "south",
          approachPoint: ENTRANCE_SPAWN,
          threshold: {
            shape: "rect",
            x: EXIT_REGION.bbox.x,
            y: EXIT_REGION.bbox.y,
            w: EXIT_REGION.bbox.width,
            h: EXIT_REGION.bbox.height,
          },
          approachDistance: 0,
          entryFacing: "up",
          returnFacing: "down",
          marker: { kind: "bitmap", sprite: "interact", size: 34, anchorX: .5, anchorY: .5 },
        },
      },
      map: {
        id: MAP_IDS.CLINIC,
        name: "霧草療癒所",
        shortName: "療癒所",
        kind: "interior",
        type: "interior",
        theme: "clinic",
        ambient: "herbal-warm",
        start: ENTRANCE_SPAWN,
        spawnPoints: { entrance: ENTRANCE_SPAWN, healer: { x: 829, y: 356 }, exit: EXIT_POINT },
        worldBuildingId: "clinic",
        art: {
          flattened: true,
          background: "hospital",
          backgroundScene: "hospital",
          master: HOSPITAL_ART,
          authoring: HOSPITAL_AUTHORING,
          sourceDimensions: { width: navigationPackage.source.width, height: navigationPackage.source.height },
          rendering: navigationPackage.rendering,
        },
      },
    });
    // The cyan mask, rather than the generated bbox, owns the actual exit
    // trigger. Keep the authored region on the resolved portal object because
    // createInteriorMap normalizes the rest of the doorway contract.
    map.exits[0].navigationRegion = "exit";
    map.pixelWidth = navigationPackage.source.width;
    map.pixelHeight = navigationPackage.source.height;
    map.navigation = {
      packageId: "hospital-navigation-prototype",
      source: { ...navigationPackage.source },
      coordinateSystem: navigationPackage.coordinate_system,
      rendering: navigationPackage.rendering,
      movementRule: navigationPackage.movement_rule,
      feetRadiusPx: navigation.feetRadiusPx,
      sourceImage: HOSPITAL_AUTHORING,
      generatedRuntime: "map/hospital-navigation.generated.js",
      resolver: navigation,
      isPositionWalkable: navigation.isPositionWalkable,
      isRegionAt: navigation.isRegionAt,
      isInRegion: navigation.isInRegion,
      nearestPointInRegion: navigation.nearestPointInRegion,
      distanceToRegion: navigation.distanceToRegion,
      interactionHitTest: navigation.interactionHitTest,
      serviceInteractionReachPx: navigation.serviceInteractionReachPx,
      serviceInteractionHitPaddingPx: navigation.serviceInteractionHitPaddingPx,
      interactionAtWorldPoint: navigation.interactionAtWorldPoint,
      status: navigation.status,
      authoritative: true,
    };
    return map;
  }
  return { createClinicMap };
});
