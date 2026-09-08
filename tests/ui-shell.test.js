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
  assert.match(mainTownSource, /navigationRegion:\s*deck\.region_id/);
  assert.match(mainTownSource, /canonicalSource:\s*AUTHORING_IMAGE/);
  assert.match(mainTownSource, /render:\s*false/);
  assert.match(mainTownSource, /ART_BACKGROUND = "assets\/main-town\/maintown\.jpg"/);
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
  assert.match(game, /<strong>空<\/strong>/);
  assert.match(game, /openFacility\("deck", "deck-view"\)/);
  assert.match(game, /facilityContext === "deck" && currentMapId === "world"/);
  assert.match(html, /id="facilityHelpButton"/);
  assert.match(html, /id="facilityHelpPopover"/);
  assert.match(html, /assets\/ui\/ui-close-v2\.png/);
  assert.doesNotMatch(html, /ui-close-glyph/);
  assert.doesNotMatch(html, /id="facilitySubtitle"/);
  assert.match(game, /function returnToTitle\(\)/);
  assert.doesNotMatch(html, /facilityReturnTitleButton|data-facility-footer-action="return-title"/);
  assert.match(game, /facilityFooter\.hidden = true/);
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
  assert.doesNotMatch(viewer, /已學技能|AP|速度|射程|範圍/);
  assert.match(deck, /class="deck-view-shell is-readonly"/);
  assert.match(deck, /class="deck-capacity"/);
  assert.match(deck, /data-facility-action="unequip-skill"/);
  assert.doesNotMatch(deck, /skill\.apCost|skillRangeText\(skill\)/);
  assert.match(uiCssForTest(), /\.deck-manage-layout\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,.9fr\) minmax\(0,1.1fr\)/);
  assert.match(uiCssForTest(), /\.deck-skill-list\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.doesNotMatch(uiCssForTest(), /\.deck-skill-list\s*\{[^}]*auto-fit|\.deck-skill-list\s*\{[^}]*repeat\(/);
  assert.match(uiCssForTest(), /@media \(max-width: 900px\)[\s\S]*?\.deck-manage-layout\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(uiCssForTest(), /\.deck-slot-list\s*\{[\s\S]*grid-template-columns:\s*1fr/);
});

test("Deck sizing and shared badge readability are content-driven", () => {
  const uiCss = fs.readFileSync(path.join(rpgRoot, "ui-system.css"), "utf8");
  assert.match(uiCss, /--ui-panel-compact-max:\s*34rem/);
  assert.match(uiCss, /--ui-panel-medium-max:\s*48rem/);
  assert.match(uiCss, /--ui-panel-wide-max:\s*66rem/);
  assert.match(uiCss, /data-panel-size="compact"/);
  assert.match(uiCss, /data-panel-size="wide"\]\[data-facility-tab="deck"\][\s\S]*min-height:\s*0/);
  assert.match(game, /facilityPanel\.dataset\.panelSize = facilityTab === "deck"/);
  assert.match(uiCss, /--ui-skill-badge-width/);
  assert.match(uiCssForTest(), /\.skill-kind-badge\s*\{[\s\S]*var\(--ui-skill-badge-width\)/);
  assert.match(uiCssForTest(), /\.skill-kind-badge\s*\{[\s\S]*var\(--ui-skill-badge-height\)/);
  assert.doesNotMatch(game, /return skill\.tags\.includes\("passive"\) \? "✦" : "◆"/);
});

test("Dialogue is a shared anchored overlay with integrated role and vertical choices", () => {
  assert.match(html, /id="dialoguePanel" class="dialogue-panel"/);
  assert.match(html, /id="dialoguePortrait"/);
  assert.match(html, /id="speakerRole" class="speaker-role"/);
  assert.match(html, /id="speakerName" class="speaker-name"/);
  assert.match(html, /id="dialogueText"/);
  assert.match(html, /id="dialogueChoices" class="dialogue-choices" role="list"/);
  assert.match(game, /speakerRole: config\.speakerRole \|\| speakerNpc\?\.displayName/);
  assert.match(game, /backgroundEnd: "#0b1224",[\s\S]*frame: false/);
  assert.match(game, /button\.setAttribute\("aria-pressed"/);
  assert.match(css, /\.dialogue-panel\s*\{[\s\S]*border-image: var\(--ui-frame-image\)/);
  assert.match(css, /\.dialogue-panel\s*\{[\s\S]*max-height: min\(17rem/);
  assert.match(css, /\.dialogue-choices\s*\{[\s\S]*display: grid[\s\S]*grid-template-columns: 1fr/);
  assert.match(css, /\.dialogue-choice\s*\{[\s\S]*border-image: var\(--ui-button-image\)/);
  assert.doesNotMatch(css, /\.dialogue-choices\s*\{[^}]*flex-wrap/);
  assert.doesNotMatch(css, /\.dialogue-choice\.selected, \.dialogue-choice:hover\s*\{[^}]*background: var\(--gold\)/);
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

