(function (root, factory) {
  const constants = root.EverrealmMapConstants || (typeof require === "function" ? require("./map/map-constants.js") : null);
  const helpers = root.EverrealmMapHelpers || (typeof require === "function" ? require("./map/map-helpers.js") : null);
  const registry = root.EverrealmMapRegistry || (typeof require === "function" ? require("./map/map-registry.js") : null);
  const monsters = root.EverrealmMonsterBlueprints || (typeof require === "function" ? require("./map/monster-blueprints.js") : null);
  const field = root.EverrealmMountainFieldMap || (typeof require === "function" ? require("./maps/mountain-field.js") : null);
  const mountainSoutheast = root.EverrealmMountainSoutheastMap || (typeof require === "function" ? require("./maps/mountain-southeast.js") : null);
  const guild = root.EverrealmGuildMap || (typeof require === "function" ? require("./maps/interiors/guild.js") : null);
  const shop = root.EverrealmEquipmentShopMap || (typeof require === "function" ? require("./maps/interiors/equipment-shop.js") : null);
  const clinic = root.EverrealmClinicMap || (typeof require === "function" ? require("./maps/interiors/clinic.js") : null);
  const generalStore = root.EverrealmGeneralStoreMap || (typeof require === "function" ? require("./maps/interiors/general-store.js") : null);
  const inn = root.EverrealmInnMap || (typeof require === "function" ? require("./maps/interiors/inn.js") : null);
  // Compatibility shim only: index.html loads the shared modules and map
  // definitions before this file. It intentionally owns no map data.
  const api = factory(constants, helpers, registry, monsters, field, mountainSoutheast, guild, shop, clinic, generalStore, inn);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmExpansionWorld = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, helpers, registry, monsters, field, mountainSoutheast, guild, shop, clinic, generalStore, inn) {
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
    createMountainSoutheastMap: mountainSoutheast.createMountainSoutheastMap,
    tileAt: helpers.tileAt,
    isTileSolid: helpers.isTileSolid,
    monsterBlueprint: monsters.monsterBlueprint,
    normalizeMonsterId: monsters.normalizeMonsterId,
    hydrateMonsterSpawn: monsters.hydrateMonsterSpawn,
    monsterStatsAtLevel: monsters.monsterStatsAtLevel,
    levelXpMultiplier: monsters.levelXpMultiplier,
    encounterXpMultiplier: monsters.encounterXpMultiplier,
    encounterHpMultiplier: monsters.encounterHpMultiplier,
    xpReward: monsters.xpReward,
    battleXpReward: monsters.battleXpReward,
    retreatChance: monsters.retreatChance,
    highestLivingEnemyLevel: monsters.highestLivingEnemyLevel,
    selectMonsterSkill: monsters.selectMonsterSkill,
    CANONICAL_MONSTER_IDS: monsters.CANONICAL_MONSTER_IDS,
    MONSTER_SKILLS: monsters.SKILLS,
  };
});
