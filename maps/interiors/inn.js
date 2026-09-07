(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../../map/map-constants.js") : null);
  const helpers = root.LanternInteriorHelpers || (typeof require === "function" ? require("../../map/interior-helpers.js") : null);
  const navigationApi = root.LanternInnNavigation || (typeof require === "function" ? require("../../map/inn-navigation.js") : null);
  const api = factory(constants, helpers, navigationApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternInnMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, interior, navigationApi) {
  "use strict";
  const { MAP_IDS, TILES } = constants;
  const { createInteriorMap, rect, point } = interior;
  const TILE = 40;
  const ART = "assets/inn/inn.png";
  const AUTHORING = "assets/inn/inn_walkable.png";
  const navigation = navigationApi.createResolver();
  const data = navigation.data;
  const npcRegion = data.regions.npc[0];
  const exitRegion = data.regions.exit[0];
  const npcFeet = npcRegion.anchor;
  const exitPoint = exitRegion.centroid;
  const entry = { x: exitPoint.x, y: exitRegion.bbox.y - 12 };

  function createInnMap() {
    const furniture = [
      rect(7, 3.1, 6, 1.1, { id: "inn-counter", kind: "counter", name: "旅店櫃台", zone: "front-desk", render: false, solid: false }),
      rect(2, 2, 1, 5, { id: "inn-bookshelf", kind: "bookshelf", name: "旅店名冊與房匙架", zone: "guest-service", render: false, solid: false }),
      rect(17, 2, 1, 5, { id: "inn-luggage-shelf", kind: "bookshelf", name: "旅客行李櫃", zone: "guest-service", render: false, solid: false }),
      rect(4, 6.5, 3, 1, { id: "inn-lounge-bench-west", kind: "table", name: "休憩長凳", zone: "lounge", render: false, solid: false }),
      rect(13, 6.5, 3, 1, { id: "inn-lounge-bench-east", kind: "table", name: "休憩長凳", zone: "lounge", render: false, solid: false }),
      rect(8, 6.5, 4, 1.1, { id: "inn-lounge-table", kind: "table", name: "旅客茶桌", zone: "lounge", render: false, solid: false }),
      rect(4, 9, 3, 1.35, { id: "inn-bed-west", kind: "bed", name: "客房床", zone: "guest-service", render: false, solid: false, blanket: "#5d8ea2" }),
      rect(13, 9, 3, 1.35, { id: "inn-bed-east", kind: "bed", name: "客房床", zone: "guest-service", render: false, solid: false, blanket: "#b783a4" }),
    ];
    const decorations = [
      { id: "inn-fireplace", kind: "fireplace", ...point(17, 4), radius: 15, glow: "#ffb35c", solid: false, render: false, zone: "lounge" },
      { id: "inn-lamp-west", kind: "wallSconce", ...point(5, 2.1), radius: 8, solid: false, render: false, zone: "front-desk" },
      { id: "inn-lamp-east", kind: "wallSconce", ...point(14, 2.1), radius: 8, solid: false, render: false, zone: "front-desk" },
      { id: "inn-banner", kind: "banner", ...point(10, 1.3), color: "#87db82", emblem: "bed", solid: false, render: false, zone: "front-desk" },
    ];
    const npcs = [{
      id: "inn-keeper", name: "朵姨", role: "旅店老闆娘／前台", kind: "npc",
      x: npcFeet.x, y: npcFeet.y - 13, radius: 12, interactionRadius: 114,
      color: "#87db82", facing: "down", actor: "clerk", gender: "female", age: 41,
      appearance: "藍髮兔耳侍從造型、墨綠旅店制服、白色圍裙與短靴", zone: "front-desk", services: ["inn-rest"], render: false,
    }];
    const map = createInteriorMap({
      width: Math.ceil(data.source.width / TILE), height: Math.ceil(data.source.height / TILE), floor: TILES.WALL,
      features: [], furniture, decorations, npcs,
      exit: {
        id: "inn-to-world", tx: exitPoint.x / TILE - .5, ty: exitPoint.y / TILE - .5,
        targetMap: MAP_IDS.WORLD, targetSpawn: "innFront", label: "返回霧都", targetPosition: point(29, 20), navigationRegion: "exit",
        entrance: { outward: "south", approachPoint: entry, threshold: { shape: "rect", x: exitRegion.bbox.x, y: exitRegion.bbox.y, w: exitRegion.bbox.width, h: exitRegion.bbox.height }, approachDistance: 0, entryFacing: "up", returnFacing: "down", marker: { kind: "bitmap", sprite: "interact", size: 34, anchorX: .5, anchorY: .5 } },
      },
      map: {
        id: MAP_IDS.INN, name: "霧燈旅店", shortName: "旅店", kind: "interior", type: "interior", theme: "inn", ambient: "inn-warm",
        start: entry, spawnPoints: { entrance: entry, keeper: { x: npcFeet.x, y: npcFeet.y - 13 }, exit: exitPoint }, worldBuildingId: "tea-house",
        art: { flattened: true, background: "inn", backgroundScene: "inn", master: ART, authoring: AUTHORING, sourceDimensions: { width: data.source.width, height: data.source.height }, rendering: data.rendering },
      },
    });
    map.exits[0].navigationRegion = "exit";
    map.pixelWidth = data.source.width; map.pixelHeight = data.source.height;
    map.navigation = { data, ready: navigation.ready, failure: navigation.failure, packageId: data.package_id, source: { ...data.source }, coordinateSystem: data.coordinate_system, rendering: data.rendering, movementRule: data.movement_rule, feetRadiusPx: navigation.feetRadiusPx, sourceImage: AUTHORING, generatedRuntime: "map/inn-navigation.generated.js", resolver: navigation, isPositionWalkable: navigation.isPositionWalkable, isRegionAt: navigation.isRegionAt, isInRegion: navigation.isInRegion, interactionAtWorldPoint: navigation.interactionAtWorldPoint, status: navigation.status, authoritative: true };
    return map;
  }
  return { createInnMap };
});
