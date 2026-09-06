(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMapConstants = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TILE = 40;
  const TILES = Object.freeze({
    GRASS: 0,
    PATH: 1,
    WATER: 2,
    STONE: 3,
    WOOD: 4,
    WALL: 5,
  });
  const MAP_IDS = Object.freeze({
    WORLD: "world",
    FIELD: "field",
    GUILD: "guild",
    SHOP: "shop",
    CLINIC: "clinic",
    GENERAL_STORE: "general-store",
    INN: "inn",
    DUNGEON: "dungeon",
  });

  const TRANSITION_TYPES = Object.freeze({
    PHYSICAL_DOOR: "physical-door",
    PHYSICAL_GATE: "physical-gate",
    PHYSICAL_PASSAGE: "physical-passage",
    MAGIC_TELEPORT: "magic-teleport",
  });

  return { TILE, TILES, MAP_IDS, TRANSITION_TYPES };
});
