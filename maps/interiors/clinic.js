(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../../map/map-constants.js") : null);
  const helpers = root.LanternInteriorHelpers || (typeof require === "function" ? require("../../map/interior-helpers.js") : null);
  const api = factory(constants, helpers);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternClinicMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, interior) {
  "use strict";
  const { MAP_IDS, TILES } = constants;
  const { createInteriorMap, rect, point } = interior;
  function createClinicMap() {
    const furniture = [
      rect(6, 2, 8, 1.1, { id: "clinic-counter", kind: "counter", name: "配藥櫃台", solid: true }),
      rect(2, 3, 1, 5, { id: "clinic-herb-shelf", kind: "bookshelf", name: "藥草架", solid: true }),
      rect(15, 3, 1, 5, { id: "clinic-bottle-shelf", kind: "bookshelf", name: "藥瓶架", solid: true }),
      rect(4, 6, 3, 1.35, { id: "clinic-bed-a", kind: "bed", name: "療癒床", solid: true, blanket: "#87c5c1" }),
      rect(4, 9, 3, 1.35, { id: "clinic-bed-b", kind: "bed", name: "療癒床", solid: true, blanket: "#c8a6d8" }),
      rect(12, 8, 3, 1.2, { id: "clinic-herb-table", kind: "table", name: "曬草桌", solid: true }),
    ];
    const decorations = [
      { id: "clinic-lamp-west", kind: "wallSconce", ...point(5, 2.1), radius: 8, solid: false },
      { id: "clinic-lamp-east", kind: "wallSconce", ...point(14, 2.1), radius: 8, solid: false },
      { id: "clinic-herb-bundle", kind: "banner", ...point(17, 2), color: "#82d6c7", emblem: "leaf", solid: false },
    ];
    const npcs = [{
      id: "clinic-healer-siu-moon",
      name: "小滿",
      role: "療癒師",
      kind: "npc",
      ...point(10, 3.8),
      radius: 12,
      color: "#87db82",
      facing: "down",
      actor: "healer",
      gender: "female",
      age: 27,
      appearance: "金髮藍白女法師造型、白金短斗篷、藍寶石法袍與長靴",
      services: ["clinic-healing"],
    }];
    return createInteriorMap({
      width: 20,
      height: 14,
      floor: TILES.WALL,
      features: [
        { x: 1, y: 1, w: 18, h: 12, type: TILES.WOOD },
        { x: 3, y: 3, w: 14, h: 6, type: TILES.PATH },
        { x: 9, y: 12, w: 2, h: 2, type: TILES.WOOD },
      ],
      furniture,
      decorations,
      npcs,
      exit: { id: "clinic-to-world", tx: 9.5, ty: 12, targetMap: MAP_IDS.WORLD, targetSpawn: "clinicFront", label: "返回霧都", targetPosition: point(27, 8) },
      map: {
        id: MAP_IDS.CLINIC,
        name: "霧草療癒所",
        shortName: "療癒所",
        kind: "interior",
        type: "interior",
        theme: "clinic",
        ambient: "herbal-warm",
        start: point(9.5, 11.3),
        spawnPoints: { entrance: point(9.5, 11.3), healer: point(10, 3.8) },
        worldBuildingId: "clinic",
      },
    });
  }
  return { createClinicMap };
});
