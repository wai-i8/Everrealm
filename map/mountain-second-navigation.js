(function (root, factory) {
  const generic = root.EverrealmFlattenedNavigation || (typeof require === "function" ? require("./flattened-navigation.js") : null);
  const generated = root.EverrealmMountainSecondNavigationGenerated || (typeof require === "function" ? require("./mountain-second-navigation.generated.js") : null);
  const api = factory(generic, generated);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmMountainSecondNavigation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (generic, generated) {
  "use strict";
  const options = { scene: "mountain2", authoringImage: "assets/field/vanmer-mountains-2_walkable.png", requireNpc: false };
  const resolver = generic.createResolver(generated, options);
  return Object.freeze({
    ...resolver,
    createResolver: (source = generated) => generic.createResolver(source, options),
  });
});
