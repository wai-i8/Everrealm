(function (root, factory) {
  const constants = root.LanternMapConstants || (typeof require === "function" ? require("./map/map-constants.js") : null);
  const helpers = root.LanternMapHelpers || (typeof require === "function" ? require("./map/map-helpers.js") : null);
  const definition = root.LanternMainTownMap || (typeof require === "function" ? require("./maps/main-town.js") : null);
  const api = factory(constants, helpers, definition);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternWorld = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants, helpers, definition) {
  "use strict";
  return {
    TILE: constants.TILE,
    WIDTH: definition.WIDTH,
    HEIGHT: definition.HEIGHT,
    TILES: constants.TILES,
    MAP_IDS: constants.MAP_IDS,
    point: helpers.point,
    createWorld: definition.createMainTownMap,
    tileAt: helpers.tileAt,
    isTileSolid: helpers.isTileSolid,
  };
});
