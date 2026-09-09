const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const game = fs.readFileSync(path.resolve(__dirname, "..", "game.js"), "utf8");
const mountainField = fs.readFileSync(path.resolve(__dirname, "..", "maps", "mountain-field.js"), "utf8");
const characterArt = fs.readFileSync(path.resolve(__dirname, "..", "character-art.js"), "utf8");
const styles = fs.readFileSync(path.resolve(__dirname, "..", "styles.css"), "utf8");

test("battle movement uses facing-aware timed simultaneous resolution", () => {
  assert.match(game, /Tactics\.movementCommandEvents\(start,[\s\S]{0,220}?turnCost:\s*BATTLE_TURN_COST,[\s\S]{0,100}?initialFacing:\s*battle\.hero\.facing/);
  assert.match(game, /resolveSimultaneousMovement\(\{[\s\S]*?timed:\s*true,[\s\S]*?turnCost:\s*BATTLE_TURN_COST/);
  assert.match(game, /movement\.timeline/);
  assert.match(game, /movement\.frameTimes/);
  assert.match(game, /movement\.unitResults/);
});

test("resolved facing and STOP feedback come from actual collision results", () => {
  assert.doesNotMatch(game, /enemy\.facing\s*=\s*Tactics\.facingFromStep\(enemy\.cell,\s*battle\.hero\.cell/);
  assert.doesNotMatch(game, /battle\.hero\.facing\s*=\s*movement\.finalHeroFacing/);
  assert.match(game, /if \(result\?\.facing\) unit\.facing = result\.facing/);
  assert.match(game, /text:\s*"STOP!"/);
  assert.match(game, /stoppedUnits\.some\(\(unit\) => unit\.id === battle\.hero\.id\)/);
  assert.match(game, /unit\.stopFlash = \.48/);
  assert.match(game, /const visualState = hurt \? "hurt" : stopped \? "stop" : acting \? "attack"/);
});

test("battle action artwork advances over the existing resolution timeline", () => {
  assert.match(game, /const actionProgress = battle\.phase === "resolving_action"/);
  assert.match(game, /battle\.actionResolution\?\.elapsed/);
  assert.match(game, /progress: actionProgress/);
  assert.doesNotMatch(game, /progress: \.55/);
});

test("movement planning appends waypoint segments without rewriting route history", () => {
  assert.match(game, /A click may target ANY tile reachable from the CURRENT endpoint/);
  assert.match(game, /Tactics\.reachableTiles\(battle\.grid, draft\.endpoint, remaining/);
  assert.match(game, /segment\.map\(\(to\) => \(\{ type: "move", to \}\)\)/);
  assert.match(game, /route = battleReachableTiles\(\)\.find\(\(tile\) => tile\.nextStep/);
  assert.match(game, /Only 「重新移動」 clears prior history/);
  assert.match(game, /data-battle-action="reset-move"/);
  assert.match(game, /data-battle-action="end-move"/);
  assert.doesNotMatch(game, /請逐格排移動路線/);
  assert.doesNotMatch(game, /destination-first/);
});

test("planning keeps the hero sprite on current facing until movement resolves", () => {
  assert.match(game, /function battleUnitRenderFacing\(unit\)/);
  assert.doesNotMatch(game, /battleMoveDraftState\(\)\.facing \|\| unit\.facing/);
  assert.match(game, /Planning is a non-destructive preview/);
  assert.match(game, /battleFacingScreenVector\(renderFacing, layout\)/);
});

test("projected facing UI follows the actual battlefield projection basis", () => {
  assert.match(game, /const vector = battleFacingScreenVector\(facing, layout\)/);
  assert.match(game, /Math\.atan2\(vector\.y, vector\.x\)/);
  assert.match(game, /--battle-facing-angle/);
  assert.match(styles, /scaleY\(\.78\)/);
  assert.match(styles, /rotate\(var\(--battle-facing-angle/);
});


test("opening mountain battle keeps the 8x3 structure with thicker visual depth", () => {
  assert.match(mountainField, /width:\s*8,[\s\S]*?height:\s*3/);
  assert.match(mountainField, /ally:\s*\[\{ x: 1, y: 1 \}/);
  assert.match(mountainField, /enemy:\s*\[\{ x: 6, y: 1 \}/);
  assert.match(mountainField, /"3,0"[\s\S]*?kind:\s*"tree"[\s\S]*?blocksArc:\s*true/);
  assert.match(mountainField, /"5,2"[\s\S]*?kind:\s*"scrub"[\s\S]*?blocksArc:\s*false/);
  assert.match(mountainField, /xAxis:\s*\{\s*x:\s*\.78,\s*y:\s*-\.50\s*\}/);
  assert.match(mountainField, /yAxis:\s*\{\s*x:\s*\.78,\s*y:\s*\.50\s*\}/);
  assert.match(mountainField, /baseThickness:\s*\.28/);
});

test("battle renderer keeps logical cells separate from projected 2.5D presentation", () => {
  assert.match(game, /function battleProjectCorner\(/);
  assert.match(game, /function battleCellCorners\(/);
  assert.match(game, /function battlePointInPolygon\(/);
  assert.match(game, /drawBattleGroundProjected/);
  assert.match(game, /battleCellSideFaces/);
  assert.match(game, /battleCellPaintOrder\(layout\)\.reverse\(\)/);
  assert.doesNotMatch(game, /Math\.floor\(\(x - layout\.x\) \/ layout\.cell\)/);
});

test("floating battle command menu follows the lower-left outside corner of the hero tile", () => {
  assert.match(game, /const anchor = corners\[3\]/);
  assert.match(game, /anchor\.x - menuWidth - gap/);
  assert.match(game, /anchor\.y \+ gap/);
});

test("battle unit labels use semantic sprite anchors and old AP orbit noise is gone", () => {
  assert.match(game, /artBox = Art\.drawCharacter/);
  assert.match(game, /artBox = Art\.drawEnemy/);
  assert.match(game, /artBox\?\.nameAnchorX/);
  assert.match(game, /artBox\?\.nameAnchorY/);
  assert.doesNotMatch(game, /Math\.min\(battle\.ap,\s*10\)/);
  assert.match(game, /selected:\s*false/);
});

test("hero projectile integration sends Linear and Arc skills through the shared attack trace", () => {
  assert.match(game, /\["linear", "arc"\]\.includes\(skill\?\.deliveryMode\)/);
  assert.match(game, /arcHeight:\s*skill\.arcHeight/);
  assert.match(game, /deliveryMode:\s*resolver\.deliveryMode/);
});


test("battle command UI keeps choices simple and reveals detail only after skill selection", () => {
  assert.match(game, /class="battle-command-skill/);
  assert.match(game, /selectedBattleSkillDetail/);
  assert.match(game, /class="battle-command-utility-row"/);
  assert.doesNotMatch(game, /keyLabels\[index\]/);
  assert.doesNotMatch(game, /id="battlePotionButton"/);
  assert.doesNotMatch(game, /保留 AP · 無減傷/);
  assert.doesNotMatch(game, /返回探索/);
});

test("movement command UI shows numeric remaining movement power", () => {
  assert.match(game, /function battleMoveRemainingMarkup\(/);
  assert.match(game, /剩餘移動力/);
  assert.match(game, /formatRemainingMove\(remaining\)/);
  assert.doesNotMatch(game, /battleMovePipsMarkup/);
});

test("projected battle layout normalizes both screen axes to equal length", () => {
  assert.match(game, /const projectedAxisLength = \(xLength \+ yLength\) \* \.5/);
  assert.match(game, /const xAxis = \{ x: .*?projectedAxisLength/);
  assert.match(game, /const yAxis = \{ x: .*?projectedAxisLength/);
});


test("fighter uses a true battle-only four-diagonal atlas", () => {
  assert.doesNotMatch(game, /battleUnitArtFacing/);
  assert.match(game, /battleDiagonal: layout\.projected/);
  assert.match(characterArt, /fighterBattleDiagonal/);
  assert.match(characterArt, /fighter-battle-diagonal-v1\.png/);
  assert.match(characterArt, /\{ right: 0, down: 1, left: 2, up: 3 \}/);
  assert.match(characterArt, /column = 1 \+ \(Math\.floor/);
  assert.match(characterArt, /state === "attack"\) column = 3/);
  assert.match(characterArt, /state === "hurt"\) column = 4/);
  assert.equal(fs.existsSync(path.resolve(__dirname, "..", "assets", "battle", "fighter", "fighter-battle-diagonal-v1.png")), true);
});

test("battle skill rows are visually centred", () => {
  assert.match(styles, /\.battle-command-skill \{[\s\S]*?text-align: center/);
  assert.match(styles, /\.battle-command-skill b \{[\s\S]*?text-align: center/);
  assert.doesNotMatch(styles, /\.battle-command-skill \{[\s\S]{0,260}?text-align: left/);
});


test("fighter route planning reserves one movement point for final facing", () => {
  assert.match(game, /BATTLE_FINAL_FACING_RESERVE = 1/);
  assert.match(game, /stats\.moveRange \+ BATTLE_FINAL_FACING_RESERVE/);
  assert.match(game, /battleRouteBudgetRemaining/);
  assert.match(game, /battle\.hero\.moveRange - battleFacingReserve\(\)/);
});

test("facing buttons dim when the planned turn is unaffordable", () => {
  assert.match(game, /button\.disabled = !affordable/);
  assert.match(game, /button\.classList\.toggle\("is-unaffordable", !affordable\)/);
  assert.match(styles, /battle-facing-picker button:disabled/);
});

test("battle UI uses AP bar and omits sequential turn-order panel", () => {
  assert.match(game, /selectedUnitApFill/);
  assert.match(game, /battleUi\.apFill\.style\.width/);
  assert.doesNotMatch(game, /battleTurnOrderList/);
  assert.doesNotMatch(game, /buildTurnOrder\(livingBattleEnemies\(\)\)/);
});

test("battle BGM loops from the supplied seamless mp3", () => {
  assert.match(game, /everrealm_battle_bgm_v2_seamless_loop\.mp3/);
  assert.match(game, /battleBgmAudio\.loop = true/);
  assert.equal(fs.existsSync(path.resolve(__dirname, "..", "assets", "audio", "everrealm_battle_bgm_v2_seamless_loop.mp3")), true);
});

test("battle base terrain has no permanent grid outlines and obstacle art uses alpha assets", () => {
  assert.doesNotMatch(game, /showGridLines = \["planning_move", "planning_action"\]\.includes/);
  assert.match(game, /Do not outline every logical cell/);
  assert.match(characterArt, /battleHighTree/);
  assert.match(characterArt, /battleLowScrub/);
  assert.equal(fs.existsSync(path.resolve(__dirname, "..", "assets", "battle", "mountain", "battle-tree-high-v1.png")), true);
  assert.equal(fs.existsSync(path.resolve(__dirname, "..", "assets", "battle", "mountain", "battle-scrub-low-v1.png")), true);
});

test("battle fighter keeps one physical scale for idle attack and hurt", () => {
  assert.match(game, /const actorCell = layout\.actorCell \|\| layout\.cell/);
  assert.match(game, /scale: heroScale/);
  assert.doesNotMatch(game, /\["attack", "hurt"\]\.includes\(visualState\) \? layout\.cell \/ 43/);
});

test("skill panel uses subtle proximity glow and custom exploration cursors", () => {
  assert.match(game, /prop\.boardId === "deck-loadout"/);
  assert.match(game, /function drawSkillPanelGlow/);
  assert.match(game, /nearestInteraction\?\.id === prop\.id/);
  assert.match(game, /exploreHoverEntityId === prop\.id/);
  assert.match(game, /board\.render === false/);
  assert.match(game, /canvas\.dataset\.exploreCursor = entity && !entity\.type \? "interact" : "default"/);
  assert.match(styles, /cursor-feather-v1\.png/);
  assert.match(styles, /cursor-interact-v1\.png/);
  assert.equal(fs.existsSync(path.resolve(__dirname, "..", "assets", "ui", "cursor-feather-v1.png")), true);
  assert.equal(fs.existsSync(path.resolve(__dirname, "..", "assets", "ui", "cursor-interact-v1.png")), true);
});
