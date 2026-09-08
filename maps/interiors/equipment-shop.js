(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../../map/map-constants.js") : null);
  const helpers = root.LanternInteriorHelpers || (typeof require === "function" ? require("../../map/interior-helpers.js") : null);
  const navigationApi = root.LanternWeaponNavigation || (typeof require === "function" ? require("../../map/weapon-navigation.js") : null);
  const api = factory(constants, helpers, navigationApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternEquipmentShopMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, interior, navigationApi) {
  "use strict";
  const { MAP_IDS, TILES } = constants;
  const { createInteriorMap, rect, point } = interior;
  const TILE = 40;
  const ART = "assets/weapon/weapon.png";
  const AUTHORING = "assets/weapon/weapon_walkable.png";
  const navigation = navigationApi.createResolver();
  const data = navigation.data;
  const npcRegion = data.regions.npc[0];
  const exitRegion = data.regions.exit[0];
  const npcFeet = npcRegion.anchor;
  const exitPoint = exitRegion.centroid;
  const entry = { x: exitPoint.x, y: exitRegion.bbox.y - 12 };

  function createEquipmentShopMap() {
    const furniture = [
      rect(2, 3.1, 5, 1.1, { id: "shop-weapon-counter", kind: "counter", name: "武器櫃台", zone: "sales-counter", render: false, solid: false, shopCategory: "weapon" }),
      rect(11, 3.1, 5, 1.1, { id: "shop-armour-counter", kind: "counter", name: "防具櫃台", zone: "sales-counter", render: false, solid: false, shopCategory: "armor" }),
      rect(2, 5, 1, 4, { id: "shop-sword-rack", kind: "weaponRack", name: "刀劍陳列架", zone: "weapon-display", render: false, solid: false, shopCategory: "weapon" }),
      rect(15, 5, 1, 4, { id: "shop-armour-rack", kind: "armourRack", name: "護甲陳列架", zone: "armour-display", render: false, solid: false, shopCategory: "armor" }),
      rect(4.2, 8.8, 2.4, 1.4, { id: "shop-anvil", kind: "anvil", name: "改裝鐵砧", zone: "work-storage", render: false, solid: false }),
      rect(11.4, 8, 2.1, 2.2, { id: "shop-fitting-screen", kind: "screen", name: "試身屏風", zone: "armour-display", render: false, solid: false }),
    ];
    const decorations = [
      { id: "shop-forge", kind: "forgeFire", ...point(3.5, 10), radius: 24, glow: "#ff744c", solid: false, render: false, zone: "work-storage" },
      { id: "shop-mannequin", kind: "mannequin", ...point(13.5, 5), displayItem: "mistguard-coat", solid: false, render: false, zone: "armour-display" },
      { id: "shop-lamp-left", kind: "wallSconce", ...point(5, 4), radius: 8, solid: false, render: false, zone: "sales-counter" },
      { id: "shop-lamp-right", kind: "wallSconce", ...point(12, 4), radius: 8, solid: false, render: false, zone: "sales-counter" },
    ];
    const npcs = [{
      id: "merchant-gin", name: "銀姐", displayName: "裝備店店員", role: "裝備店店員／裝備櫃台", kind: "npc",
      x: npcFeet.x, y: npcFeet.y - 13, radius: 12, interactionRadius: 114,
      color: "#f2a96b", facing: "down", actor: "merchant", gender: "female", age: 36,
      appearance: "紅髮海盜女商人造型、酒紅船長外套、金飾腰封與高筒靴",
      zone: "sales-counter", services: ["equipment-shop", "sell", "compare-equipment"], render: false,
    }];
    const map = createInteriorMap({
      width: Math.ceil(data.source.width / TILE), height: Math.ceil(data.source.height / TILE), floor: TILES.WALL,
      features: [], furniture, decorations, npcs,
      exit: {
        id: "shop-to-world", tx: exitPoint.x / TILE - .5, ty: exitPoint.y / TILE - .5,
        targetMap: MAP_IDS.WORLD, targetSpawn: "shopFront", label: "返回霧都", targetPosition: point(9, 21), navigationRegion: "exit",
        entrance: { outward: "south", approachPoint: entry, threshold: { shape: "rect", x: exitRegion.bbox.x, y: exitRegion.bbox.y, w: exitRegion.bbox.width, h: exitRegion.bbox.height }, approachDistance: 0, entryFacing: "up", returnFacing: "down", marker: { kind: "bitmap", sprite: "interact", size: 34, anchorX: .5, anchorY: .5 } },
      },
      map: {
        id: MAP_IDS.SHOP, name: "銀火裝備店", shortName: "裝備店", kind: "interior", type: "interior", theme: "forge-shop", ambient: "soft-forge",
        start: entry, spawnPoints: { entrance: entry, merchant: { x: npcFeet.x, y: npcFeet.y - 13 }, exit: exitPoint }, shopId: "silver-flame-equipment", worldBuildingId: "forge",
        art: { flattened: true, background: "weapon", backgroundScene: "weapon", master: ART, authoring: AUTHORING, sourceDimensions: { width: data.source.width, height: data.source.height }, rendering: data.rendering },
      },
    });
    map.exits[0].navigationRegion = "exit";
    map.pixelWidth = data.source.width; map.pixelHeight = data.source.height;
    map.navigation = { data, ready: navigation.ready, failure: navigation.failure, packageId: data.package_id, source: { ...data.source }, coordinateSystem: data.coordinate_system, rendering: data.rendering, movementRule: data.movement_rule, feetRadiusPx: navigation.feetRadiusPx, sourceImage: AUTHORING, generatedRuntime: "map/weapon-navigation.generated.js", resolver: navigation, isPositionWalkable: navigation.isPositionWalkable, isRegionAt: navigation.isRegionAt, isInRegion: navigation.isInRegion, interactionAtWorldPoint: navigation.interactionAtWorldPoint, status: navigation.status, authoritative: true };
    return map;
  }
  return { createEquipmentShopMap, createShopMap: createEquipmentShopMap };
});
