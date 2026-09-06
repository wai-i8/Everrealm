const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const Art = require("../character-art.js");

test("named NPCs own unique glasses-free frames and the generic fallback never uses the eyewear frame", () => {
  const namedRoles = [
    "keeper", "smith", "healer", "guildmaster", "clerk", "adventurer",
    "duelist", "merchant", "armorer", "tailor", "explorer",
  ];
  const indices = Art.npcArtIndices;
  const namedValues = namedRoles.map((role) => indices[role]);

  assert.deepEqual(Object.keys(indices).sort(), [...namedRoles, "villager"].sort());
  assert.deepEqual([...new Set(namedValues)].sort((a, b) => a - b), [...Array(11).keys()]);
  assert.equal(indices.villager, indices.adventurer, "generic dialogue fallback should reuse a glasses-free frame");
  assert.equal(Object.values(indices).includes(11), false, "the glasses frame must never be selected at runtime");
  assert.deepEqual(Art.npcArtPolicy.excludedFrameIndices, [11]);
  assert.equal(Art.npcArtPolicy.eyewearAllowed, false);
  assert.equal(Art.npcArtPolicy.keeperMapStyle, "chibi-head-crop");
  assert.ok(Art.npcMapProfiles.keeper.head.scale >= 1.2, "Ah Ching's map head should be enlarged to the shared Q-style proportion");
  assert.deepEqual(Art.npcMapProfiles.keeper.foot, { x: .641, y: .978 });
  assert.deepEqual(Art.npcMapProfiles.smith.foot, { x: .521, y: .978 });
  assert.deepEqual(Art.npcMapProfiles.healer.foot, { x: .449, y: .978 });
  for (const role of ["keeper", "smith", "healer"]) {
    assert.ok(Number.isFinite(Art.npcMapProfiles[role].name.x), `${role} needs a semantic name anchor`);
    assert.ok(Number.isFinite(Art.npcMapProfiles[role].marker.x), `${role} needs a semantic marker anchor`);
  }
  assert.equal(Art.spriteStatus().npcMap.src, "assets/npc-map-chibi-v4.png");
  assert.equal(Art.spriteStatus().npcPortraits.src, "assets/npc-dialogue-portraits-v4.png");
});

test("environment scale manifest keeps trees over two characters tall and buildings dominant", () => {
  const metrics = Art.environmentSpriteMetrics;
  for (const tree of ["broadleafTree", "pineTree", "autumnTree", "blossomTree"]) {
    assert.equal(metrics[tree].category, "tree");
    assert.ok(metrics[tree].scale >= 2);
    assert.ok(88 * metrics[tree].scale >= 76 * 2, `${tree} should render at least two NPC heights`);
  }
  assert.ok(224 * metrics.forgeHouse.scale > 88 * metrics.autumnTree.scale, "the smallest village building should stay taller than a tree");
  assert.ok(62 * metrics.lamp.scale >= 76, "lamp posts should reach roughly human height");
  assert.ok(metrics.rock.scale <= metrics.lamp.scale, "ground rocks should remain below tall street props");
});

test("portal atlas visibility is controlled by map semantics", () => {
  assert.equal(Art.markerDisplayPolicy.portal, "caller-controlled-map-marker");
  assert.equal(Art.markerDisplayPolicy.interact, "nearby-interaction-only");
});

test("hero animation manifest exposes the requested multi-frame state counts", () => {
  const expectedCounts = { idle: 6, walk: 8, run: 8, attack: 10, death: 8 };
  for (const [state, count] of Object.entries(expectedCounts)) {
    assert.equal(Art.heroAnimationStates[state].frames.length, count, `${state} frame count`);
  }
  const status = Art.spriteStatus();
  assert.equal(status.heroDown.src, "assets/hero-anim-down-v3.png");
  assert.equal(status.heroUp.src, "assets/hero-anim-up-v3.png");
  assert.equal(status.heroRight.src, "assets/hero-anim-right-v3.png");
  assert.equal(status.fighterWalk.src, "assets/fighter-walk-atlas-v4.png");
});

test("shared frame fitting keeps opaque art centred on one exact foot baseline", () => {
  const box = Art.fitFrameToBaseline({ sw: 120, sh: 240 }, { x: 110, y: 218, height: 204 });
  assert.deepEqual(
    { left: box.left, right: box.right, top: box.top, bottom: box.bottom, centerX: box.centerX },
    { left: 59, right: 161, top: 14, bottom: 218, centerX: 110 },
  );
  assert.equal(box.baselineY, 218);
  assert.equal(box.nameAnchorX, 110);
  assert.equal(box.nameAnchorY, 14);
});

test("monster visual profiles provide semantic name anchors independent of atlas padding", () => {
  const profiles = Art.monsterVisualProfiles;
  for (const type of Object.keys(Art.monsterSpriteIndices)) {
    assert.ok(Number.isFinite(profiles[type]?.nameLift), `${type} needs a semantic name lift`);
    assert.ok(profiles[type].nameLift > 0, `${type} name lift should be above its foot baseline`);
    assert.ok(Number.isFinite(profiles[type].nameOffsetX), `${type} needs a semantic name x offset`);
  }
  assert.ok(profiles.bear.nameLift > profiles.fox.nameLift, "large monsters need a higher label anchor");
  assert.ok(profiles.snake.nameLift > profiles.wild_boar.nameLift, "tall source art needs a higher label anchor");
});

test("semantic pivots align asymmetric cut-outs without changing their scale", () => {
  const box = Art.fitFrameToBaseline(
    { sw: 120, sh: 240 },
    { x: 110, y: 218, height: 204, anchorXRatio: .6, anchorYRatio: .9 },
  );
  assert.equal(box.width, 102);
  assert.ok(Math.abs(box.left - 48.8) < 1e-9);
  assert.ok(Math.abs(box.top - 34.4) < 1e-9);
  assert.ok(Math.abs(box.bottom - 238.4) < 1e-9);
  assert.equal(box.baselineY, 218);
});

test("building door anchors resolve through the same scaled sprite layout", () => {
  const settings = { sprite: "guildHouse", x: 500, y: 600, width: 200, height: 200 };
  const layout = Art.environmentSpriteLayout(settings);
  const door = Art.environmentSpriteAnchor(settings, "door");
  assert.deepEqual(layout, { left: 376, top: 352, width: 248, height: 248 });
  assert.ok(Math.abs(door.x - (376 + 248 * 254 / 384)) < 1e-9);
  assert.ok(Math.abs(door.y - (352 + 248 * 354 / 384)) < 1e-9);
});

test("generated art atlases expose stable manifests and all active assets exist", () => {
  assert.deepEqual(
    [...new Set(Object.values(Art.environmentSpriteIndices))].sort((a, b) => a - b),
    [...Array(20).keys()],
  );
  assert.deepEqual([...new Set(Object.values(Art.terrainSpriteIndices))].sort((a, b) => a - b), [...Array(12).keys()]);
  assert.deepEqual([...new Set(Object.values(Art.interiorSpriteIndices))].sort((a, b) => a - b), [...Array(12).keys()]);
  const monsterFrames = Object.values(Art.monsterSpriteIndices);
  assert.ok(monsterFrames.length >= 19);
  assert.deepEqual(
    [...new Set(monsterFrames.filter((frame) => frame.atlas === "monstersCore").map((frame) => frame.row))].sort((a, b) => a - b),
    [...Array(5).keys()],
  );
  assert.deepEqual(
    [...new Set(monsterFrames.filter((frame) => frame.atlas === "monstersDepths").map((frame) => frame.row))].sort((a, b) => a - b),
    [...Array(5).keys()],
  );
  assert.deepEqual([...new Set(Object.values(Art.markerSpriteIndices))].sort((a, b) => a - b), [...Array(4).keys()]);
  const status = Art.spriteStatus();
  assert.equal(status.environment.src, "assets/environment-atlas-v5.png");
  assert.equal(status.fighter.src, "assets/fighter-atlas-v2.png");
  assert.equal(status.fighterWalk.src, "assets/fighter-walk-atlas-v4.png");
  assert.equal(status.battleMountainBackground.src, "assets/battle/mountain/mountain-battle-background-v1.png");
  assert.equal(status.battleMountainGround.src, "assets/battle/mountain/mountain-battle-ground-v2.png");
  assert.equal(status.monstersCore.src, "assets/monster-facing-core-v1.png");
  assert.equal(status.monstersDepths.src, "assets/monster-facing-depths-v1.png");
  for (const file of [
    "npc-map-chibi-v4.png",
    "npc-dialogue-portraits-v4.png",
    "environment-atlas-v5.png",
    "terrain-atlas-v1.png",
    "battle/mountain/mountain-battle-background-v1.png",
    "battle/mountain/mountain-battle-ground-v2.png",
    "interior-props-v2.png",
    "fighter-atlas-v2.png",
    "fighter-walk-atlas-v4.png",
    "monster-facing-core-v1.png",
    "monster-facing-depths-v1.png",
    "minimap-frame-v1.png",
    "marker-atlas-v1.png",
    "hero-anim-down-v3.png",
    "hero-anim-up-v3.png",
    "hero-anim-right-v3.png",
  ]) {
    assert.equal(fs.existsSync(path.join(__dirname, "..", "assets", file)), true, file);
  }
});
