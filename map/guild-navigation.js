(function (root, factory) {
  const generic = root.LanternFlattenedNavigation || (typeof require === "function" ? require("./flattened-navigation.js") : null);
  const generated = root.LanternGuildNavigationGenerated || (typeof require === "function" ? require("./guild-navigation.generated.js") : null);
  const api = factory(generic, generated);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternGuildNavigation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (generic, generated) {
  "use strict";
  const resolver = generic.createResolver(generated, { scene: "guild", authoringImage: "assets/guild/guild_walkable.png", npcId: "guildmaster-yin" });
  return Object.freeze({ ...resolver, createResolver: (source = generated) => generic.createResolver(source, { scene: "guild", authoringImage: "assets/guild/guild_walkable.png", npcId: "guildmaster-yin" }) });
});
