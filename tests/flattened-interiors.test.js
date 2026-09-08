const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const Core = require("../rpg-core.js");
const Maps = require("../map/map-registry.js").createMapRegistry();
const scenes = [
  { id: "shop", folder: "weapon", visible: "weapon.png", authoring: "weapon_walkable.png", npc: "merchant-gin", generated: "map/weapon-navigation.generated.js" },
  { id: "inn", folder: "inn", visible: "inn.png", authoring: "inn_walkable.png", npc: "inn-keeper", generated: "map/inn-navigation.generated.js" },
  { id: "general-store", folder: "item", visible: "item.png", authoring: "item_walkable.png", npc: "store-merchant-gin", generated: "map/item-navigation.generated.js" },
  { id: "guild", folder: "guild", visible: "guild.png", authoring: "guild_walkable.png", npc: "guildmaster-yin", generated: "map/guild-navigation.generated.js" },
];

function dimensions(filePath) {
  const input = fs.readFileSync(filePath);
  assert.deepEqual([...input.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return { width: input.readUInt32BE(16), height: input.readUInt32BE(20) };
}

function route(map, goal) {
  return Core.findOverworldPath(map.start, goal, {
    bounds: { x: 0, y: 0, w: map.pixelWidth, h: map.pixelHeight },
    cellSize: 12,
    radius: map.navigation.feetRadiusPx,
    directions: 8,
    maxVisited: 14000,
    nearestReachable: true,
    isWalkable: (point) => map.navigation.isPositionWalkable(point, { radius: map.navigation.feetRadiusPx }),
  });
}

test("four supplied flattened interior pairs preserve the exact 1672x941 contract", () => {
  for (const scene of scenes) {
    const visiblePath = path.join(root, "assets", scene.folder, scene.visible);
    const authoringPath = path.join(root, "assets", scene.folder, scene.authoring);
    assert.deepEqual(dimensions(visiblePath), { width: 1672, height: 941 }, `${scene.id} visible art dimensions`);
    assert.deepEqual(dimensions(authoringPath), { width: 1672, height: 941 }, `${scene.id} authoring dimensions`);
    const authoring = fs.readFileSync(authoringPath);
    const nav = Maps[scene.id].navigation;
    assert.equal(nav.source.sha256, crypto.createHash("sha256").update(authoring).digest("hex"), `${scene.id} authoring hash`);
    assert.equal(nav.sourceImage, `assets/${scene.folder}/${scene.authoring}`);
    assert.equal(nav.generatedRuntime, scene.generated);
  }
});

test("each flattened interior uses exact white/magenta/cyan masks and one core NPC", () => {
  for (const scene of scenes) {
    const map = Maps[scene.id];
    const nav = map.navigation;
    const npcRegion = nav.data.regions.npc[0];
    const exitRegion = nav.data.regions.exit[0];
    assert.equal(nav.ready, true, `${scene.id} resolver should be ready`);
    assert.equal(nav.data.authoring.matching, "exact opaque RGB colors only; all other pixels are non-authored");
    assert.deepEqual(nav.data.authoring.colors, { white: [255, 255, 255], magenta: [255, 0, 255], cyan: [0, 255, 255] });
    assert.equal(nav.data.regions.npc.length, 1, `${scene.id} should have one authored NPC region`);
    assert.equal(nav.data.regions.exit.length, 1, `${scene.id} should have one authored exit region`);
    assert.equal(map.npcs.length, 1, `${scene.id} should expose one semantic NPC`);
    assert.equal(map.npcs[0].id, scene.npc);
    assert.equal(map.npcs[0].x, npcRegion.anchor.x);
    assert.equal(map.npcs[0].y + 13, npcRegion.anchor.y);
    assert.ok(map.furniture.every((item) => item.render === false && item.solid === false));
    assert.ok(map.decorations.every((item) => item.render === false && item.solid === false));
    assert.equal(map.exits[0].navigationRegion, "exit");
    assert.equal(map.navigation.isRegionAt("npc", npcRegion.centroid), true);
    assert.equal(map.navigation.interactionAtWorldPoint(npcRegion.centroid), scene.npc);
    assert.equal(map.navigation.serviceInteractionReachPx, 160);
    assert.equal(map.navigation.serviceInteractionHitPaddingPx, 18);
    const nearestNpcPixel = map.navigation.nearestPointInRegion("npc", npcRegion.centroid);
    assert.ok(nearestNpcPixel);
    assert.equal(map.navigation.distanceToRegion("npc", nearestNpcPixel), 0);
    assert.equal(map.navigation.interactionHitTest("npc", nearestNpcPixel), true);
    assert.equal(map.navigation.interactionHitTest("npc", { x: 0, y: 0 }), false);
    assert.equal(map.navigation.isPositionWalkable(npcRegion.centroid, { radius: 3 }), false);
    assert.equal(map.navigation.isRegionAt("exit", exitRegion.centroid), true);
    assert.equal(map.navigation.isPositionWalkable(exitRegion.centroid, { radius: 3 }), true);
    assert.equal(map.navigation.isPositionWalkable(map.start, { radius: 3 }), true);
    assert.equal(map.navigation.isInRegion("exit", { ...map.start, radius: 3 }), false);
    assert.equal(map.navigation.isPositionWalkable({ x: 0, y: 0 }, { radius: 3 }), false);
    assert.ok(route(map, exitRegion.centroid).length > 0, `${scene.id} exit should be reachable by the shared resolver`);
  }
});

test("flattened scenes retain the normal building transition graph and hide visual markers", () => {
  const expected = { guild: "keeper-house", shop: "forge", inn: "tea-house", "general-store": "general-store" };
  for (const scene of scenes) {
    const map = Maps[scene.id];
    assert.equal(map.art.flattened, true);
    assert.equal(map.art.backgroundScene, scene.folder === "weapon" ? "weapon" : scene.folder === "item" ? "item" : scene.folder);
    assert.equal(map.worldBuildingId, expected[scene.id]);
    assert.equal(map.exits[0].targetMap, "world");
    assert.equal(map.exits[0].transitionType, "physical-door");
    assert.equal(map.navigation.authoritative, true);
  }
  assert.equal(Maps.world.npcs.length, 0);
  const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
  assert.match(game, /interactionPrompt\.hidden = true/);
  assert.match(game, /Art\.drawFlattenedBackground/);
  assert.doesNotMatch(game, /drawInteractDiamond\([^;]+\);/);
  assert.doesNotMatch(game, /drawQuestMark\([^;]+\);/);
});
