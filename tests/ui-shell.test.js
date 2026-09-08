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

test("flattened building entrances keep semantic doors without painted markers", () => {
  assert.doesNotMatch(game, /function drawObjective\(/);
  assert.doesNotMatch(game, /drawObjective\(shakeX, shakeY\)/);
  assert.match(game, /function drawDoorway\(portal, shakeX, shakeY\)[\s\S]*?return undefined;/);
  assert.match(game, /function drawPortal\(portal, shakeX, shakeY\)[\s\S]*?return undefined;/);
  assert.match(game, /function drawPhysicalPassage\(portal, shakeX, shakeY\)[\s\S]*?return undefined;/);
  assert.match(transitionsSource, /transitionType: TRANSITION_TYPES\.PHYSICAL_DOOR/);
  assert.match(mainTownSource, /mapLabel: "公會"/);
  assert.match(mainTownSource, /mapLabel: "裝備店"/);
  assert.match(game, /interactionPrompt\.hidden = true/);
});

test("click-only exploration plans a collision-aware path and carries no mobile d-pad binder", () => {
  assert.match(game, /Core\.findOverworldPath\(player, goal/);
  assert.match(game, /nearestReachable:\s*true/);
  assert.match(game, /isWalkable:\s*\(point\)\s*=>\s*!isBlocked/);
  assert.doesNotMatch(html, /id="mobileControls"|data-direction=/);
  assert.doesNotMatch(game, /bindMobileControls|virtualDirections|KeyK/);
  assert.doesNotMatch(css, /\.dpad\s*\{|\.mobile-dash\s*\{/);
});

test("flattened town art, exact east passage and DECK console are wired", () => {
  assert.match(mainTownSource, /harbour-gate-deck-console/);
  assert.match(mainTownSource, /id:\s*"harbour-gate-deck-console"[\s\S]*?x:\s*1110,\s*y:\s*598/);
  assert.match(mainTownSource, /authoredAnchor\("East exit"\)/);
  assert.match(mainTownSource, /rendering:\s*"flattened"/);
  assert.match(mainTownSource, /navigationPackageId/);
  assert.match(mainTownSource, /transitionType: TRANSITION_TYPES\.PHYSICAL_PASSAGE/);
  assert.doesNotMatch(mainTownSource, /townGateEast|east-city-gate/);
  assert.match(game, /Art\.drawTerrainTile\(miniCtx/);
  assert.match(game, /Art\.drawEnvironmentSprite\(miniCtx/);
  assert.match(game, /awardDeckCapacityMilestone/);
});

test("facility modals keep one focused topic without summary or cross-panel tab rows", () => {
  assert.doesNotMatch(html, /id="facilitySummary"|id="facilityTabs"/);
  assert.match(game, /<strong>沒有技能<\/strong>/);
  assert.match(game, /openFacility\("deck", "deck-view"\)/);
  assert.match(game, /facilityContext === "deck" && currentMapId === "world"/);
  assert.match(html, /id="facilityHelpButton"/);
  assert.match(html, /id="facilityHelpPopover"/);
  assert.match(html, /assets\/ui\/ui-close-v2\.png/);
  assert.doesNotMatch(html, /ui-close-glyph/);
  assert.doesNotMatch(html, /id="facilitySubtitle"/);
  assert.match(game, /function returnToTitle\(\)/);
  assert.match(game, /data-facility-footer-action="return-title"/);
  for (const filename of ["ui-close-v2.png", "ui-info-v1.png", "ui-badge-cmd-v1.png", "ui-badge-psv-v1.png"]) {
    const assetPath = path.join(rpgRoot, "assets", "ui", filename);
    assert.equal(fs.existsSync(assetPath), true, `${filename} should exist`);
    assert.ok(fs.statSync(assetPath).size > 1000, `${filename} should contain bitmap art`);
  }
});

test("shared controls keep the info secondary and all modal close visuals bitmap-backed", () => {
  const uiCss = fs.readFileSync(path.join(rpgRoot, "ui-system.css"), "utf8");
  assert.match(uiCss, /\.ui-info-button\s*\{[\s\S]*?width:\s*2\.7rem[\s\S]*?height:\s*2\.7rem/);
  assert.match(uiCss, /\.ui-info-button img\s*\{[\s\S]*?width:\s*1\.75rem[\s\S]*?height:\s*1\.75rem/);
  assert.match(uiCss, /\.facility-close-button\.ui-close-button\s*\{[\s\S]*?width:\s*2\.7rem/);
  assert.match(uiCss, /border-image:\s*var\(--ui-frame-image\)/);
  assert.doesNotMatch(uiCss, /ui-close-glyph/);
  assert.doesNotMatch(uiCss, /background-size:\s*100%\s+100%/);
  for (const id of ["skillBookConfirmCloseButton", "skillDetailCloseButton", "abandonCommissionCloseButton"]) {
    const close = html.match(new RegExp(`<button[^>]*id="${id}"[\\s\\S]*?</button>`))?.[0] || "";
    assert.match(close, /assets\/ui\/ui-close-v2\.png/);
    assert.doesNotMatch(close, /ESC|ui-close-glyph/);
  }
  assert.match(game, /if \(code === "Escape" \|\| code === "KeyE"\) closeSkillDetail\(\)/);
  assert.doesNotMatch(game, /function setFacilityFooter\(message, hint/);
});

test("Status and normal Deck are summary-first and keep management at the station", () => {
  const status = game.match(/function renderStatusFacility\(\)\s*\{([\s\S]*?)\r?\n  \}/)?.[1] || "";
  const deck = game.match(/function renderDeckFacility\(\)\s*\{([\s\S]*?)\r?\n  \}\r?\n\r?\n  function openGuildSkillBook/)?.[1] || "";
  const viewer = deck.split("const management")[0];
  assert.doesNotMatch(status, /戰鬥規則/);
  assert.match(game, /status:\s*\["STATUS"[\s\S]*?開場 10 AP/);
  assert.match(deck, /class="deck-slot-list"/);
  assert.match(deck, /class="deck-manage-layout"/);
  assert.match(deck, /class="deck-management-column"/);
  assert.match(deck, /class="deck-current-column"/);
  assert.match(deck, /facilityContext === "deck" && currentMapId === "world"/);
  assert.match(deck, /class="deck-skill-list"/);
  assert.match(deck, /data-facility-action="equip-skill"/);
  assert.doesNotMatch(viewer, /skill\.apCost \} AP · 速度/);
  assert.doesNotMatch(viewer, /skillRangeText\(skill\)/);
  assert.doesNotMatch(deck, /skill\.apCost|skillRangeText\(skill\)/);
  assert.match(uiCssForTest(), /\.deck-manage-layout\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(uiCssForTest(), /@media \(max-width: 900px\)[\s\S]*?\.deck-manage-layout\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(uiCssForTest(), /\.deck-slot-list\s*\{[\s\S]*grid-template-columns:\s*1fr/);
});

function uiCssForTest() {
  return fs.readFileSync(path.join(rpgRoot, "inventory-overhaul.css"), "utf8");
}

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

