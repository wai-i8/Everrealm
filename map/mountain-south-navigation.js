(function (root, factory) {
  const generic = root.LanternFlattenedNavigation || (typeof require === "function" ? require("./flattened-navigation.js") : null);
  const generated = root.LanternMountainSouthNavigationGenerated || (typeof require === "function" ? require("./mountain-south-navigation.generated.js") : null);
  const api = factory(generic, generated);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMountainSouthNavigation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (generic, generated) {
  "use strict";
  const options = { scene: "mountainSouth", authoringImage: "assets/field/vanmer-mountains-south_walkable.png", requireNpc: false };
  const resolver = generic.createResolver(generated, options);
  return Object.freeze({
    ...resolver,
    createResolver: (source = generated) => generic.createResolver(source, options),
  });
});
