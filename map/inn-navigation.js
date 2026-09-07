(function (root, factory) {
  const generic = root.LanternFlattenedNavigation || (typeof require === "function" ? require("./flattened-navigation.js") : null);
  const generated = root.LanternInnNavigationGenerated || (typeof require === "function" ? require("./inn-navigation.generated.js") : null);
  const api = factory(generic, generated);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternInnNavigation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (generic, generated) {
  "use strict";
  const resolver = generic.createResolver(generated, { scene: "inn", authoringImage: "assets/inn/inn_walkable.png", npcId: "inn-keeper" });
  return Object.freeze({ ...resolver, createResolver: (source = generated) => generic.createResolver(source, { scene: "inn", authoringImage: "assets/inn/inn_walkable.png", npcId: "inn-keeper" }) });
});
