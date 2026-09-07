(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../../map/map-constants.js") : null);
  const helpers = root.LanternInteriorHelpers || (typeof require === "function" ? require("../../map/interior-helpers.js") : null);
  const api = factory(constants, helpers);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternEquipmentShopMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, interior) {
  "use strict";
  const { MAP_IDS, TILES } = constants;
  const { createInteriorMap, rect, point } = interior;
  function createEquipmentShopMap() {
    const furniture = [
      rect(2, 3.1, 5, 1.1, { id: "shop-weapon-counter", kind: "counter", name: "武器櫃台", zone: "sales-counter", solid: true, shopCategory: "weapon" }),
      rect(11, 3.1, 5, 1.1, { id: "shop-armour-counter", kind: "counter", name: "防具櫃台", zone: "sales-counter", solid: true, shopCategory: "armor" }),
      rect(2, 5, 1, 4, { id: "shop-sword-rack", kind: "weaponRack", name: "刀劍陳列架", zone: "weapon-display", solid: true, shopCategory: "weapon" }),
      rect(15, 5, 1, 4, { id: "shop-armour-rack", kind: "armourRack", name: "護甲陳列架", zone: "armour-display", solid: true, shopCategory: "armor" }),
      rect(4.2, 8.8, 2.4, 1.4, { id: "shop-anvil", kind: "anvil", name: "改裝鐵砧", zone: "work-storage", solid: true }),
      rect(11.4, 8, 2.1, 2.2, { id: "shop-fitting-screen", kind: "screen", name: "試身屏風", zone: "armour-display", solid: true }),
    ];
    const decorations = [
      { id: "shop-forge", kind: "forgeFire", ...point(3.5, 10), radius: 24, glow: "#ff744c", solid: false },
      { id: "shop-mannequin", kind: "mannequin", ...point(13.5, 5), displayItem: "mistguard-coat", solid: false },
      { id: "shop-lamp-left", kind: "wallSconce", ...point(5, 4), radius: 8, solid: false },
      { id: "shop-lamp-right", kind: "wallSconce", ...point(12, 4), radius: 8, solid: false },
    ];
    const npcs = [
      { id: "merchant-gin", name: "銀姐", role: "銀火店主／武器櫃台", kind: "npc", ...point(5, 2.3), radius: 12, color: "#f2a96b", facing: "down", actor: "merchant", gender: "female", age: 36, appearance: "紅髮海盜女商人造型、酒紅船長外套、金飾腰封與高筒靴", zone: "sales-counter", services: ["equipment-shop", "sell"] },
      { id: "armorer-yuet", name: "阿月", role: "防具師／防具櫃台", kind: "npc", ...point(13, 2.3), radius: 12, color: "#8ac7d3", facing: "down", actor: "armorer", gender: "female", age: 28, appearance: "紫髮女忍者造型、紫黑輕甲、護臂、忍具腰帶與長靴", zone: "sales-counter", services: ["equipment-shop", "compare-equipment"] },
      { id: "shop-tailor-safi", name: "莎菲", role: "魔裝裁縫師", kind: "npc", ...point(14, 10.5), radius: 12, color: "#d89adf", facing: "left", actor: "tailor", gender: "female", age: 26, appearance: "成年粉髮小惡魔裁縫造型、短角、紫紅裁縫裙、翼紋披肩與繫帶靴", zone: "work-storage", chatter: "防具唔只要頂得住，剪裁夠俐落先襯得起冒險者嘛。" },
    ];
    return createInteriorMap({
      width: 18,
      height: 13,
      floor: TILES.WALL,
      features: [
        { x: 1, y: 1, w: 16, h: 11, type: TILES.WOOD },
        { x: 7, y: 3, w: 4, h: 8, type: TILES.STONE },
        { x: 8, y: 11, w: 2, h: 2, type: TILES.WOOD },
      ],
      furniture,
      decorations,
      npcs,
      exit: { id: "shop-to-world", tx: 8.5, ty: 12, targetMap: MAP_IDS.WORLD, targetSpawn: "shopFront", label: "返回霧都", targetPosition: point(9, 21) },
      map: {
        id: MAP_IDS.SHOP,
        name: "銀火裝備店",
        shortName: "裝備店",
        kind: "interior",
        type: "interior",
        theme: "forge-shop",
        ambient: "soft-forge",
        start: point(8.5, 10.5),
        spawnPoints: { entrance: point(8.5, 10.5), counter: point(8.5, 5) },
        shopId: "silver-flame-equipment",
        worldBuildingId: "forge",
      },
    });
  }
  return { createEquipmentShopMap, createShopMap: createEquipmentShopMap };
});
