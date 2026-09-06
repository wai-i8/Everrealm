(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("../../map/map-constants.js") : null);
  const helpers = root.LanternInteriorHelpers || (typeof require === "function" ? require("../../map/interior-helpers.js") : null);
  const api = factory(constants, helpers);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternGuildMap = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, interior) {
  "use strict";
  const { MAP_IDS, TILES } = constants;
  const { createInteriorMap, rect, point } = interior;
  function createGuildMap() {
    const furniture = [
      rect(7.25, 2, 7.5, 1.2, { id: "guild-counter", kind: "counter", name: "接待櫃台", solid: true }),
      rect(2, 2, 1, 4, { id: "guild-bookshelf-west", kind: "bookshelf", name: "委託紀錄架", solid: true }),
      rect(19, 2, 1, 4, { id: "guild-bookshelf-east", kind: "bookshelf", name: "冒險者名冊", solid: true }),
      rect(3, 8, 4, 1.25, { id: "guild-table-west", kind: "table", name: "聚會長桌", solid: true }),
      rect(15, 8, 4, 1.25, { id: "guild-table-east", kind: "table", name: "聚會長桌", solid: true }),
      rect(3, 12, 2, .6, { id: "guild-training-rack", kind: "weaponRack", name: "練習武器架", solid: true }),
    ];
    const decorations = [
      { id: "guild-banner-left", kind: "banner", ...point(6, 1), color: "#e7ad48", emblem: "lantern", solid: false },
      { id: "guild-banner-right", kind: "banner", ...point(15, 1), color: "#e7ad48", emblem: "lantern", solid: false },
      { id: "guild-fireplace", kind: "fireplace", ...point(10.5, 1), radius: 22, glow: "#ffb35c", solid: false },
      { id: "guild-lamp-west", kind: "wallSconce", ...point(5, 6), radius: 8, solid: false },
      { id: "guild-lamp-east", kind: "wallSconce", ...point(16, 6), radius: 8, solid: false },
    ];
    const boards = [
      { id: "guild-request-board", kind: "questBoard", name: "霧都委託板", ...point(4, 5), radius: 22, prompt: "E　查看重複委託", boardId: "repeatable-bounties" },
    ];
    const npcs = [
      { id: "guildmaster-yin", name: "妍姐", role: "公會會長", kind: "npc", ...point(10, 3.7), radius: 12, color: "#efbd59", facing: "down", actor: "guildmaster", gender: "female", age: 32, appearance: "紅黑女劍士造型、赤紅披肩、黑色輕甲與高筒戰靴", services: ["guild-rank", "bounty-report"] },
      { id: "guild-clerk-po", name: "阿寶", role: "委託接待員", kind: "npc", ...point(13, 3.7), radius: 12, color: "#71c7b5", facing: "down", actor: "clerk", gender: "female", age: 24, appearance: "藍髮兔耳侍從造型、藍白公會制服、束腰短裙與長襪短靴", services: ["repeatable-bounties"] },
      { id: "guild-adventurer-nok", name: "諾拉", role: "見習女遊俠", kind: "npc", ...point(17, 10), radius: 12, color: "#9da8ef", facing: "left", actor: "adventurer", gender: "female", age: 25, appearance: "綠衣精靈女弓手造型、尖耳、翠綠短斗篷、輕皮甲與長靴", chatter: "地下坑道啲苔糰子，睇落得意但撞人幾痛㗎。" },
      { id: "guild-duelist-rhea", name: "麗雅", role: "賞金女劍士", kind: "npc", ...point(5, 10.5), radius: 12, color: "#e8889c", facing: "right", actor: "duelist", gender: "female", age: 29, appearance: "紅黑女劍士造型、露肩赤紅戰衣、黑金腰封與高筒戰靴", chatter: "高星委託唔止獎金高，抽到稀有技能書先係真正驚喜。" },
    ];
    return createInteriorMap({
      width: 22,
      height: 15,
      floor: TILES.WALL,
      features: [
        { x: 1, y: 1, w: 20, h: 13, type: TILES.WOOD },
        { x: 8, y: 4, w: 6, h: 7, type: TILES.PATH },
        { x: 10, y: 13, w: 2, h: 2, type: TILES.WOOD },
      ],
      furniture,
      decorations,
      npcs,
      exit: { id: "guild-to-world", tx: 10.5, ty: 14, targetMap: MAP_IDS.WORLD, targetSpawn: "guildFront", label: "返回霧都", targetPosition: point(11, 10) },
      map: {
        id: MAP_IDS.GUILD,
        name: "霧都冒險者公會",
        shortName: "冒險者公會",
        kind: "interior",
        type: "interior",
        theme: "guild",
        ambient: "warm-hall",
        start: point(10.5, 12.4),
        spawnPoints: { entrance: point(10.5, 12.4), counter: point(10.5, 5) },
        boards,
        worldBuildingId: "keeper-house",
      },
    });
  }
  return { createGuildMap };
});
