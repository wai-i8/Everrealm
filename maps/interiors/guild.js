(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../../map/map-constants.js") : null);
  const helpers = root.LanternInteriorHelpers || (typeof require === "function" ? require("../../map/interior-helpers.js") : null);
  const navigationApi = root.LanternGuildNavigation || (typeof require === "function" ? require("../../map/guild-navigation.js") : null);
  const api = factory(constants, helpers, navigationApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternGuildMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, interior, navigationApi) {
  "use strict";
  const { MAP_IDS, TILES } = constants;
  const { createInteriorMap, rect, point } = interior;
  const TILE = 40;
  const ART = "assets/guild/guild.png";
  const AUTHORING = "assets/guild/guild_walkable.png";
  const navigation = navigationApi.createResolver();
  const data = navigation.data;
  const npcRegion = data.regions.npc[0];
  const exitRegion = data.regions.exit[0];
  const npcFeet = npcRegion.anchor;
  const exitPoint = exitRegion.centroid;
  const entry = { x: exitPoint.x, y: exitRegion.bbox.y - 12 };

  function createGuildMap() {
    const furniture = [
      rect(7.25, 3.1, 7.5, 1.1, { id: "guild-counter", kind: "counter", name: "接待櫃台", zone: "reception-admin", render: false, solid: false }),
      rect(2, 2, 1, 4, { id: "guild-bookshelf-west", kind: "bookshelf", name: "委託紀錄架", zone: "archive-storage", render: false, solid: false }),
      rect(19, 2, 1, 4, { id: "guild-bookshelf-east", kind: "bookshelf", name: "冒險者名冊", zone: "archive-storage", render: false, solid: false }),
      rect(3, 8, 4, 1.25, { id: "guild-table-west", kind: "table", name: "候位長桌", zone: "waiting-lounge", render: false, solid: false }),
      rect(15, 8, 4, 1.25, { id: "guild-table-east", kind: "table", name: "候位長桌", zone: "waiting-lounge", render: false, solid: false }),
      rect(8.5, 9.7, 5, 1, { id: "guild-lounge-table", kind: "table", name: "公會休憩桌", zone: "waiting-lounge", render: false, solid: false }),
    ];
    const decorations = [
      { id: "guild-banner-left", kind: "banner", ...point(6, 1), color: "#e7ad48", emblem: "lantern", solid: false, render: false, zone: "reception-admin" },
      { id: "guild-banner-right", kind: "banner", ...point(15, 1), color: "#e7ad48", emblem: "lantern", solid: false, render: false, zone: "reception-admin" },
      { id: "guild-fireplace", kind: "fireplace", ...point(10.5, 1), radius: 22, glow: "#ffb35c", solid: false, render: false, zone: "reception-admin" },
      { id: "guild-lamp-west", kind: "wallSconce", ...point(5, 6), radius: 8, solid: false, render: false, zone: "waiting-lounge" },
      { id: "guild-lamp-east", kind: "wallSconce", ...point(16, 6), radius: 8, solid: false, render: false, zone: "waiting-lounge" },
    ];
    const boards = [{ id: "guild-request-board", kind: "questBoard", name: "公會委託", x: 4 * TILE + TILE / 2, y: 5 * TILE + TILE / 2, radius: 22, prompt: "查看重複委託", boardId: "repeatable-bounties", zone: "notice-commission", render: false }];
    const npcs = [{
      id: "guildmaster-yin", name: "妍姐", displayName: "公會接待員", role: "公會接待員／委託回報", kind: "npc",
      x: npcFeet.x, y: npcFeet.y - 13, radius: 12,
      color: "#efbd59", facing: "down", actor: "guildmaster", gender: "female", age: 32,
      appearance: "紅黑女劍士造型、赤紅披肩、黑色輕甲與高筒戰靴", zone: "reception-admin",
      services: ["guild-rank", "bounty-report", "repeatable-bounties"], render: false,
    }];
    const map = createInteriorMap({
      width: Math.ceil(data.source.width / TILE), height: Math.ceil(data.source.height / TILE), floor: TILES.WALL,
      features: [], furniture, decorations, npcs, exit: {
        id: "guild-to-world", tx: exitPoint.x / TILE - .5, ty: exitPoint.y / TILE - .5,
        targetMap: MAP_IDS.WORLD, targetSpawn: "guildFront", label: "返回米克雷帝國", targetPosition: point(11, 10), navigationRegion: "exit",
        entrance: { outward: "south", approachPoint: entry, threshold: { shape: "rect", x: exitRegion.bbox.x, y: exitRegion.bbox.y, w: exitRegion.bbox.width, h: exitRegion.bbox.height }, approachDistance: 0, entryFacing: "up", returnFacing: "down", marker: { kind: "bitmap", sprite: "interact", size: 34, anchorX: .5, anchorY: .5 } },
      },
      map: {
        id: MAP_IDS.GUILD, name: "公會", shortName: "公會", kind: "interior", type: "interior", theme: "guild", ambient: "warm-hall",
        start: entry, spawnPoints: { entrance: entry, counter: { x: npcFeet.x, y: npcFeet.y - 13 }, exit: exitPoint }, boards, worldBuildingId: "keeper-house",
        art: { flattened: true, background: "guild", backgroundScene: "guild", master: ART, authoring: AUTHORING, sourceDimensions: { width: data.source.width, height: data.source.height }, rendering: data.rendering },
      },
    });
    map.exits[0].navigationRegion = "exit";
    map.pixelWidth = data.source.width; map.pixelHeight = data.source.height;
    map.navigation = { data, ready: navigation.ready, failure: navigation.failure, packageId: data.package_id, source: { ...data.source }, coordinateSystem: data.coordinate_system, rendering: data.rendering, movementRule: data.movement_rule, feetRadiusPx: navigation.feetRadiusPx, serviceInteractionReachPx: navigation.serviceInteractionReachPx, serviceInteractionHitPaddingPx: navigation.serviceInteractionHitPaddingPx, sourceImage: AUTHORING, generatedRuntime: "map/guild-navigation.generated.js", resolver: navigation, isPositionWalkable: navigation.isPositionWalkable, isRegionAt: navigation.isRegionAt, isInRegion: navigation.isInRegion, nearestPointInRegion: navigation.nearestPointInRegion, distanceToRegion: navigation.distanceToRegion, interactionHitTest: navigation.interactionHitTest, interactionAtWorldPoint: navigation.interactionAtWorldPoint, status: navigation.status, authoritative: true };
    return map;
  }
  return { createGuildMap };
});
