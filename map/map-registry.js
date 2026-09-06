(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("./map-constants.js") : null);
  const transitions = root.LanternMapTransitions || (typeof require === "function" ? require("./map-transitions.js") : null);
  const mainTown = root.LanternMainTownMap || (typeof require === "function" ? require("../maps/main-town.js") : null);
  const field = root.LanternMountainFieldMap || (typeof require === "function" ? require("../maps/mountain-field.js") : null);
  const mine = root.LanternMineMap || (typeof require === "function" ? require("../maps/mine.js") : null);
  const guild = root.LanternGuildMap || (typeof require === "function" ? require("../maps/interiors/guild.js") : null);
  const shop = root.LanternEquipmentShopMap || (typeof require === "function" ? require("../maps/interiors/equipment-shop.js") : null);
  const clinic = root.LanternClinicMap || (typeof require === "function" ? require("../maps/interiors/clinic.js") : null);
  const generalStore = root.LanternGeneralStoreMap || (typeof require === "function" ? require("../maps/interiors/general-store.js") : null);
  const inn = root.LanternInnMap || (typeof require === "function" ? require("../maps/interiors/inn.js") : null);
  const api = factory(constants, transitions, mainTown, field, mine, guild, shop, clinic, generalStore, inn);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMapRegistry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, transitions, mainTown, field, mine, guild, shop, clinic, generalStore, inn) {
  "use strict";
  const { MAP_IDS, TILE, TILES } = constants;

  function createMapRegistry() {
    const maps = {
      [MAP_IDS.WORLD]: mainTown.createMainTownMap(),
      [MAP_IDS.FIELD]: field.createMountainFieldMap(),
      [MAP_IDS.DUNGEON]: mine.createMineMap(),
      [MAP_IDS.GUILD]: guild.createGuildMap(),
      [MAP_IDS.SHOP]: shop.createEquipmentShopMap(),
      [MAP_IDS.CLINIC]: clinic.createClinicMap(),
      [MAP_IDS.GENERAL_STORE]: generalStore.createGeneralStoreMap(),
      [MAP_IDS.INN]: inn.createInnMap(),
    };
    return transitions.resolveMapTransitions(maps);
  }

  function getMap(maps, mapId) { return maps?.[mapId] || null; }
  return { TILE, TILES, MAP_IDS, createMapRegistry, createMaps: createMapRegistry, getMap };
});
