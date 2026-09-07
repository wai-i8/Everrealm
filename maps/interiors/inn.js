(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../../map/map-constants.js") : null);
  const helpers = root.LanternInteriorHelpers || (typeof require === "function" ? require("../../map/interior-helpers.js") : null);
  const api = factory(constants, helpers);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternInnMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, interior) {
  "use strict";
  const { MAP_IDS, TILES } = constants;
  const { createInteriorMap, rect, point } = interior;
  function createInnMap() {
    const furniture = [
      rect(7, 3.1, 6, 1.1, { id: "inn-counter", kind: "counter", name: "旅店櫃台", zone: "front-desk", solid: true }),
      rect(2, 2, 1, 5, { id: "inn-bookshelf", kind: "bookshelf", name: "旅店名冊與房匙架", zone: "guest-service", solid: true }),
      rect(17, 2, 1, 5, { id: "inn-luggage-shelf", kind: "bookshelf", name: "旅客行李櫃", zone: "guest-service", solid: true }),
      rect(4, 6.5, 3, 1, { id: "inn-lounge-bench-west", kind: "table", name: "休憩長凳", zone: "lounge", solid: true }),
      rect(13, 6.5, 3, 1, { id: "inn-lounge-bench-east", kind: "table", name: "休憩長凳", zone: "lounge", solid: true }),
      rect(8, 6.5, 4, 1.1, { id: "inn-lounge-table", kind: "table", name: "旅客茶桌", zone: "lounge", solid: true }),
      rect(4, 9, 3, 1.35, { id: "inn-bed-west", kind: "bed", name: "客房床", zone: "guest-service", solid: true, blanket: "#5d8ea2" }),
      rect(13, 9, 3, 1.35, { id: "inn-bed-east", kind: "bed", name: "客房床", zone: "guest-service", solid: true, blanket: "#b783a4" }),
    ];
    const decorations = [
      { id: "inn-fireplace", kind: "fireplace", ...point(17, 4), radius: 15, glow: "#ffb35c", solid: false },
      { id: "inn-lamp-west", kind: "wallSconce", ...point(5, 2.1), radius: 8, solid: false },
      { id: "inn-lamp-east", kind: "wallSconce", ...point(14, 2.1), radius: 8, solid: false },
      { id: "inn-banner", kind: "banner", ...point(10, 1.3), color: "#87db82", emblem: "bed", solid: false },
    ];
    const npcs = [{
      id: "inn-keeper",
      name: "朵姨",
      role: "旅店老闆娘／前台",
      kind: "npc",
      ...point(10, 2.3),
      radius: 12,
      color: "#87db82",
      facing: "down",
      actor: "clerk",
      gender: "female",
      age: 41,
      appearance: "藍髮兔耳侍從造型、墨綠旅店制服、白色圍裙與短靴",
      zone: "front-desk",
      services: ["inn-rest"],
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
      exit: { id: "inn-to-world", tx: 9.5, ty: 12, targetMap: MAP_IDS.WORLD, targetSpawn: "innFront", label: "返回霧都", targetPosition: point(29, 20) },
      map: {
        id: MAP_IDS.INN,
        name: "霧燈旅店",
        shortName: "旅店",
        kind: "interior",
        type: "interior",
        theme: "inn",
        ambient: "inn-warm",
        start: point(9.5, 11.3),
        spawnPoints: { entrance: point(9.5, 11.3), keeper: point(10, 2.3) },
        worldBuildingId: "tea-house",
      },
    });
  }
  return { createInnMap };
});
