(function (root, factory) {
  const generic = root.EverrealmFlattenedNavigation || (typeof require === "function" ? require("./flattened-navigation.js") : null);
  const generated = root.EverrealmWeaponNavigationGenerated || (typeof require === "function" ? require("./weapon-navigation.generated.js") : null);
  const api = factory(generic, generated);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmWeaponNavigation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (generic, generated) {
  "use strict";
  const resolver = generic.createResolver(generated, { scene: "weapon", authoringImage: "assets/weapon/weapon_walkable.png", npcId: "merchant-gin" });
  return Object.freeze({ ...resolver, createResolver: (source = generated) => generic.createResolver(source, { scene: "weapon", authoringImage: "assets/weapon/weapon_walkable.png", npcId: "merchant-gin" }) });
});
