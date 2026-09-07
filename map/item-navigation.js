(function (root, factory) {
  const generic = root.LanternFlattenedNavigation || (typeof require === "function" ? require("./flattened-navigation.js") : null);
  const generated = root.LanternItemNavigationGenerated || (typeof require === "function" ? require("./item-navigation.generated.js") : null);
  const api = factory(generic, generated);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternItemNavigation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (generic, generated) {
  "use strict";
  const resolver = generic.createResolver(generated, { scene: "item", authoringImage: "assets/item/item_walkable.png", npcId: "store-merchant-gin" });
  return Object.freeze({ ...resolver, createResolver: (source = generated) => generic.createResolver(source, { scene: "item", authoringImage: "assets/item/item_walkable.png", npcId: "store-merchant-gin" }) });
});
