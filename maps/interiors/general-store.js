(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../../map/map-constants.js") : null);
  const helpers = root.LanternInteriorHelpers || (typeof require === "function" ? require("../../map/interior-helpers.js") : null);
  const api = factory(constants, helpers);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternGeneralStoreMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, interior) {
  "use strict";
  const { MAP_IDS, TILES } = constants;
  const { createInteriorMap, rect, point } = interior;
  function createGeneralStoreMap() {
    const furniture = [
      rect(6, 2, 8, 1.1, { id: "store-counter", kind: "counter", name: "雜貨櫃台", solid: true }),
      rect(2, 3, 1, 6, { id: "store-shelf-west", kind: "bookshelf", name: "乾貨貨架", solid: true }),
      rect(16, 3, 1, 6, { id: "store-shelf-east", kind: "bookshelf", name: "工具貨架", solid: true }),
      rect(5, 6, 3, 1.2, { id: "store-display", kind: "table", name: "材料展示桌", solid: true }),
      rect(12, 8, 3, 1.2, { id: "store-crates", kind: "table", name: "待入庫材料", solid: true }),
    ];
    const decorations = [
      { id: "store-lamp-west", kind: "wallSconce", ...point(5, 2.1), radius: 8, solid: false },
      { id: "store-lamp-east", kind: "wallSconce", ...point(14, 2.1), radius: 8, solid: false },
      { id: "store-banner", kind: "banner", ...point(10, 1.3), color: "#f0c36a", emblem: "basket", solid: false },
    ];
    const npcs = [{
      id: "store-merchant-gin",
      name: "穀嬸",
      role: "雜貨商",
      kind: "npc",
      ...point(10, 3.8),
      radius: 12,
      color: "#f0c36a",
      facing: "down",
      actor: "merchant",
      gender: "female",
      age: 36,
      appearance: "紅髮女商人造型、酒紅短外套、金飾腰封與高筒靴",
      services: ["general-store"],
    }];
    return createInteriorMap({
      width: 20,
      height: 14,
      floor: TILES.WALL,
      features: [
        { x: 1, y: 1, w: 18, h: 12, type: TILES.WOOD },
        { x: 3, y: 3, w: 14, h: 6, type: TILES.STONE },
        { x: 9, y: 12, w: 2, h: 2, type: TILES.WOOD },
      ],
      furniture,
      decorations,
      npcs,
      exit: { id: "general-store-to-world", tx: 9.5, ty: 12, targetMap: MAP_IDS.WORLD, targetSpawn: "generalStoreFront", label: "返回霧都", targetPosition: point(14, 22) },
      map: {
        id: MAP_IDS.GENERAL_STORE,
        name: "霧穀雜貨舖",
        shortName: "雜貨舖",
        kind: "interior",
        type: "interior",
        theme: "general-store",
        ambient: "market-warm",
        start: point(9.5, 11.3),
        spawnPoints: { entrance: point(9.5, 11.3), merchant: point(10, 3.8) },
        worldBuildingId: "general-store",
      },
    });
  }
  return { createGeneralStoreMap };
});
