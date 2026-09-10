(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../../map/map-constants.js") : null);
  const helpers = root.LanternInteriorHelpers || (typeof require === "function" ? require("../../map/interior-helpers.js") : null);
  const navigationApi = root.LanternItemNavigation || (typeof require === "function" ? require("../../map/item-navigation.js") : null);
  const api = factory(constants, helpers, navigationApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternGeneralStoreMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, interior, navigationApi) {
  "use strict";
  const { MAP_IDS, TILES } = constants;
  const { createInteriorMap, rect, point } = interior;
  const TILE = 40;
  const ART = "assets/item/item.png";
  const AUTHORING = "assets/item/item_walkable.png";
  const navigation = navigationApi.createResolver();
  const data = navigation.data;
  const npcRegion = data.regions.npc[0];
  const exitRegion = data.regions.exit[0];
  const npcFeet = npcRegion.anchor;
  const exitPoint = exitRegion.centroid;
  const entry = { x: exitPoint.x, y: exitRegion.bbox.y - 12 };

  function createGeneralStoreMap() {
    const furniture = [
      rect(6, 3.1, 8, 1.1, { id: "store-counter", kind: "counter", name: "雜貨櫃台", zone: "sales-counter", render: false, solid: false }),
      rect(2, 2, 1, 6, { id: "store-shelf-west", kind: "bookshelf", name: "乾貨貨架", zone: "food-goods", render: false, solid: false }),
      rect(17, 2, 1, 6, { id: "store-shelf-east", kind: "bookshelf", name: "工具貨架", zone: "general-supplies", render: false, solid: false }),
      rect(4.5, 6, 3.2, 1.15, { id: "store-food-display", kind: "table", name: "乾糧展示桌", zone: "food-goods", render: false, solid: false }),
      rect(12.3, 6, 3.2, 1.15, { id: "store-bottle-display", kind: "table", name: "瓶裝雜貨桌", zone: "bottles-potions", render: false, solid: false }),
      rect(5, 9.4, 2.2, 1.1, { id: "store-stock-west", kind: "goodsCrate", name: "乾貨箱", zone: "storage", render: false, solid: false }),
      rect(12.8, 9.4, 2.2, 1.1, { id: "store-stock-east", kind: "goodsCrate", name: "工具箱", zone: "storage", render: false, solid: false }),
    ];
    const decorations = [
      { id: "store-lamp-west", kind: "wallSconce", ...point(5, 2.1), radius: 8, solid: false, render: false, zone: "sales-counter" },
      { id: "store-lamp-east", kind: "wallSconce", ...point(14, 2.1), radius: 8, solid: false, render: false, zone: "sales-counter" },
      { id: "store-banner", kind: "banner", ...point(10, 1.3), color: "#f0c36a", emblem: "basket", solid: false, render: false, zone: "sales-counter" },
    ];
    const npcs = [{
      id: "store-merchant-gin", name: "穀嬸", displayName: "道具店店員", role: "道具店店員／雜貨櫃台", kind: "npc",
      x: npcFeet.x, y: npcFeet.y - 13, radius: 12,
      color: "#f0c36a", facing: "down", actor: "merchant", gender: "female", age: 36,
      appearance: "紅髮女商人造型、酒紅短外套、金飾腰封與高筒靴", zone: "sales-counter", services: ["general-store"], render: false,
    }];
    const map = createInteriorMap({
      width: Math.ceil(data.source.width / TILE), height: Math.ceil(data.source.height / TILE), floor: TILES.WALL,
      features: [], furniture, decorations, npcs,
      exit: {
        id: "general-store-to-world", tx: exitPoint.x / TILE - .5, ty: exitPoint.y / TILE - .5,
        targetMap: MAP_IDS.WORLD, targetSpawn: "generalStoreFront", label: "返回米克雷帝國", targetPosition: point(14, 22), navigationRegion: "exit",
        entrance: { outward: "south", approachPoint: entry, threshold: { shape: "rect", x: exitRegion.bbox.x, y: exitRegion.bbox.y, w: exitRegion.bbox.width, h: exitRegion.bbox.height }, approachDistance: 0, entryFacing: "up", returnFacing: "down", marker: { kind: "bitmap", sprite: "interact", size: 34, anchorX: .5, anchorY: .5 } },
      },
      map: {
        id: MAP_IDS.GENERAL_STORE, name: "霧穀雜貨舖", shortName: "雜貨舖", kind: "interior", type: "interior", theme: "general-store", ambient: "market-warm",
        start: entry, spawnPoints: { entrance: entry, merchant: { x: npcFeet.x, y: npcFeet.y - 13 }, exit: exitPoint }, worldBuildingId: "general-store",
        art: { flattened: true, background: "item", backgroundScene: "item", master: ART, authoring: AUTHORING, sourceDimensions: { width: data.source.width, height: data.source.height }, rendering: data.rendering },
      },
    });
    map.exits[0].navigationRegion = "exit";
    map.pixelWidth = data.source.width; map.pixelHeight = data.source.height;
    map.navigation = { data, ready: navigation.ready, failure: navigation.failure, packageId: data.package_id, source: { ...data.source }, coordinateSystem: data.coordinate_system, rendering: data.rendering, movementRule: data.movement_rule, feetRadiusPx: navigation.feetRadiusPx, serviceInteractionReachPx: navigation.serviceInteractionReachPx, serviceInteractionHitPaddingPx: navigation.serviceInteractionHitPaddingPx, sourceImage: AUTHORING, generatedRuntime: "map/item-navigation.generated.js", resolver: navigation, isPositionWalkable: navigation.isPositionWalkable, isRegionAt: navigation.isRegionAt, isInRegion: navigation.isInRegion, nearestPointInRegion: navigation.nearestPointInRegion, distanceToRegion: navigation.distanceToRegion, interactionHitTest: navigation.interactionHitTest, interactionAtWorldPoint: navigation.interactionAtWorldPoint, status: navigation.status, authoritative: true };
    return map;
  }
  return { createGeneralStoreMap };
});
