const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rpgRoot = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(rpgRoot, "index.html"), "utf8");
const game = fs.readFileSync(path.join(rpgRoot, "game.js"), "utf8");
const css = fs.readFileSync(path.join(rpgRoot, "styles.css"), "utf8");
const worldSource = fs.readFileSync(path.join(rpgRoot, "world.js"), "utf8");
const mainTownSource = fs.readFileSync(path.join(rpgRoot, "maps", "main-town.js"), "utf8");
const transitionsSource = fs.readFileSync(path.join(rpgRoot, "map", "map-transitions.js"), "utf8");

test("exploration shell keeps character tools left and reserves the right for the minimap", () => {
  const sidebar = html.match(/<aside id="exploreSidebar"[\s\S]*?<\/aside>/)?.[0] || "";
  assert.match(sidebar, /id="playerHud"/);
  assert.match(sidebar, /id="inventoryButton"/);
  assert.match(sidebar, /id="skillTreeButton"/);
  assert.match(sidebar, /id="questHud"/);
  assert.match(html, /<aside class="minimap-wrap/);
  assert.match(css, /\.explore-sidebar\s*\{[\s\S]*?left:\s*\.8rem/);
  assert.match(css, /\.minimap-wrap\s*\{[^}]*right:\s*\.8rem/);
});

test("three persisted exploration zoom levels are wired to the camera", () => {
  for (const level of ["far", "mid", "near"]) {
    assert.match(html, new RegExp(`data-zoom-level="${level}"`));
  }
  assert.match(game, /EXPLORE_ZOOM_SCALES = Object\.freeze\(\{ far: \.78, mid: 1, near: 1\.22 \}\)/);
  assert.match(game, /const ZOOM_KEY = "everrealm-zoom"/);
  assert.match(game, /localStorage\.setItem\(ZOOM_KEY, level\)/);
  assert.match(game, /setExploreZoomLevel\(button\.dataset\.zoomLevel\)/);
});

test("named building entrances stay visible while remote portals remain proximity gated", () => {
  assert.doesNotMatch(game, /function drawObjective\(/);
  assert.doesNotMatch(game, /drawObjective\(shakeX, shakeY\)/);
  assert.match(game, /!portal\.alwaysVisible && Core\.distance\(player, portal\) > revealDistance/);
  assert.match(transitionsSource, /mapLabel: link\.mapLabel,[\s\S]*?alwaysVisible: true/);
  assert.match(mainTownSource, /mapLabel: "公會"/);
  assert.match(mainTownSource, /mapLabel: "裝備店"/);
  assert.match(game, /mapPortal:\s*true/);
});

test("click-only exploration plans a collision-aware path and carries no mobile d-pad binder", () => {
  assert.match(game, /Core\.findOverworldPath\(player, goal/);
  assert.match(game, /nearestReachable:\s*true/);
  assert.match(game, /isWalkable:\s*\(point\)\s*=>\s*!isBlocked/);
  assert.doesNotMatch(html, /id="mobileControls"|data-direction=/);
  assert.doesNotMatch(game, /bindMobileControls|virtualDirections|KeyK/);
  assert.doesNotMatch(css, /\.dpad\s*\{|\.mobile-dash\s*\{/);
});

test("city-gate DECK console and minimap use world art instead of primitive scenery", () => {
  assert.match(mainTownSource, /harbour-gate-deck-console/);
  assert.match(mainTownSource, /id:\s*"harbour-gate-deck-console"[\s\S]*?\.\.\.point\(38\.5, 12\)/);
  assert.match(mainTownSource, /eastGateInside: point\(41\.4, 15\)/);
  assert.match(game, /Art\.drawTerrainTile\(miniCtx/);
  assert.match(game, /Art\.drawEnvironmentSprite\(miniCtx/);
  assert.match(game, /awardDeckCapacityMilestone/);
});

test("facility modals keep one focused topic without summary or cross-panel tab rows", () => {
  assert.doesNotMatch(html, /id="facilitySummary"|id="facilityTabs"/);
  assert.match(game, /<strong>沒有技能<\/strong>/);
  assert.match(game, /openFacility\("deck", "deck-view"\)/);
  assert.match(game, /facilityContext === "deck" && currentMapId === "world"/);
});

test("skill manual dialog exposes the shared website-style dismissal controls", () => {
  const dialog = html.match(/<section id="skillBookConfirmPanel"[\s\S]*?<\/section>/)?.[0] || "";
  assert.match(dialog, /id="skillBookConfirmCloseButton"/);
  assert.match(dialog, /data-modal-dismiss="skill-book-confirm"/);
  assert.match(dialog, /data-modal-backdrop-dismiss="skill-book-confirm"/);
  assert.match(dialog, /aria-label="關閉技能書視窗"/);
  assert.match(dialog, /id="skillBookCancelButton"[^>]*>取消<\/button>/);
  assert.doesNotMatch(dialog, /保留技能書/);
  assert.match(css, /\.skill-book-confirm-panel \.modal-actions > button\s*\{[\s\S]*?border-radius:\s*\.82rem/);
  assert.match(game, /skillBookConfirmCloseButton"\)\.addEventListener\("click", closeSkillManualConfirm\)/);
  assert.match(game, /event\.target === skillBookConfirmPanel/);
  assert.match(game, /actionLabel:[^\n]*:\s*"學習"/);
});

test("battle starts immediately and hides every enemy route or danger-cell preview", () => {
  assert.match(game, /battleEncounterIntro\.hidden = true;[\s\S]*?beginPlayerRound\(\);/);
  assert.doesNotMatch(game, /const danger = new Set\(battle\.enemyPlans/);
  assert.doesNotMatch(game, /ctx\.setLineDash\(\[4, 5\]\)/);
  assert.match(game, /const skillRange = new Set/);
  assert.match(game, /const attackableEnemies = new Set/);
  assert.match(game, /const nameY = artBox\?\.nameAnchorY/);
  assert.match(game, /const barY = \(artBox\?\.bottom/);
});

