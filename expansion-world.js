(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("./map/map-constants.js") : null);
  const helpers = root.LanternMapHelpers || (typeof require === "function" ? require("./map/map-helpers.js") : null);
  const registry = root.LanternMapRegistry || (typeof require === "function" ? require("./map/map-registry.js") : null);
  const monsters = root.LanternMonsterBlueprints || (typeof require === "function" ? require("./map/monster-blueprints.js") : null);
  const field = root.LanternMountainFieldMap || (typeof require === "function" ? require("./maps/mountain-field.js") : null);
  const mine = root.LanternMineMap || (typeof require === "function" ? require("./maps/mine.js") : null);
  const guild = root.LanternGuildMap || (typeof require === "function" ? require("./maps/interiors/guild.js") : null);
  const shop = root.LanternEquipmentShopMap || (typeof require === "function" ? require("./maps/interiors/equipment-shop.js") : null);
  const clinic = root.LanternClinicMap || (typeof require === "function" ? require("./maps/interiors/clinic.js") : null);
  const generalStore = root.LanternGeneralStoreMap || (typeof require === "function" ? require("./maps/interiors/general-store.js") : null);
  const inn = root.LanternInnMap || (typeof require === "function" ? require("./maps/interiors/inn.js") : null);
  // Compatibility shim only: index.html loads the shared modules and map
  // definitions before this file. It intentionally owns no map data.
  const api = factory(constants, helpers, registry, monsters, field, mine, guild, shop, clinic, generalStore, inn);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternExpansionWorld = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, helpers, registry, monsters, field, mine, guild, shop, clinic, generalStore, inn) {
  "use strict";
  const { TILE, TILES, MAP_IDS } = constants;
  function createExpansionMaps() {
    const maps = registry.createMapRegistry();
    delete maps[MAP_IDS.WORLD];
    return maps;
  }
  return {
    TILE,
    TILES,
    MAP_IDS,
    MONSTER_BLUEPRINTS: monsters.MONSTER_BLUEPRINTS,
    point: helpers.point,
    tileRect: helpers.tileRect,
    createExpansionMaps,
    createGuildMap: guild.createGuildMap,
    createShopMap: shop.createEquipmentShopMap,
    createEquipmentShopMap: shop.createEquipmentShopMap,
    createClinicMap: clinic.createClinicMap,
    createGeneralStoreMap: generalStore.createGeneralStoreMap,
    createInnMap: inn.createInnMap,
    createFieldMap: field.createMountainFieldMap,
    createMountainFieldMap: field.createMountainFieldMap,
    createDungeonMap: mine.createMineMap,
    createMineMap: mine.createMineMap,
    tileAt: helpers.tileAt,
    isTileSolid: helpers.isTileSolid,
    monsterBlueprint: monsters.monsterBlueprint,
    hydrateMonsterSpawn: monsters.hydrateMonsterSpawn,
  };
});
