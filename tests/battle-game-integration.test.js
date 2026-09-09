const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const game = fs.readFileSync(path.resolve(__dirname, "..", "game.js"), "utf8");
const mountainField = fs.readFileSync(path.resolve(__dirname, "..", "maps", "mountain-field.js"), "utf8");

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

test("planning facing is previewed on the hero sprite before movement resolves", () => {
  assert.match(game, /function battleUnitRenderFacing\(unit\)/);
  assert.match(game, /battleMoveDraftState\(\)\.facing \|\| unit\.facing/);
  assert.match(game, /facing: renderFacing/);
  assert.match(game, /battleFacingScreenVector\(renderFacing, layout\)/);
});

test("projected facing UI presents logical cardinal axes as screen diagonals", () => {
  assert.match(game, /up: \["↖", "左上"\]/);
  assert.match(game, /right: \["↗", "右上"\]/);
  assert.match(game, /down: \["↘", "右下"\]/);
  assert.match(game, /left: \["↙", "左下"\]/);
  assert.match(game, /battleFacingDisplayLabel/);
});


test("opening mountain battle uses the compact oblique teaching battlefield", () => {
  assert.match(mountainField, /width:\s*8,\s*\n\s*height:\s*3/);
  assert.match(mountainField, /projection:\s*\{/);
  assert.match(mountainField, /deploymentZones:[\s\S]*?ally:[\s\S]*?enemy:/);
  assert.match(mountainField, /"2,1"[\s\S]*?kind:\s*"tree"[\s\S]*?blocksLinear:\s*true[\s\S]*?blocksArc:\s*true/);
  assert.match(mountainField, /"5,1"[\s\S]*?kind:\s*"scrub"[\s\S]*?blocksLinear:\s*true[\s\S]*?blocksArc:\s*false/);
  assert.match(mountainField, /"6,0":\s*1/);
  assert.doesNotMatch(mountainField, /"6,0":\s*2/);
  assert.match(mountainField, /xAxis:\s*\{\s*x:\s*\.78,\s*y:\s*-\.36\s*\}/);
  assert.match(mountainField, /yAxis:\s*\{\s*x:\s*\.78,\s*y:\s*\.36\s*\}/);
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

test("movement command UI renders full half and empty remaining-step pips", () => {
  assert.match(game, /function battleMovePipsMarkup\(/);
  assert.match(game, /is-\$\{state\}/);
  assert.match(game, /value >= 1 \? "full" : value >= \.5 \? "half" : "empty"/);
  assert.match(game, /剩餘移動 \$\{formatMoveCost\(safeRemaining\)\} 步/);
});

test("projected battle layout normalizes both screen axes to equal length", () => {
  assert.match(game, /const projectedAxisLength = \(xLength \+ yLength\) \* \.5/);
  assert.match(game, /const xAxis = \{ x: .*?projectedAxisLength/);
  assert.match(game, /const yAxis = \{ x: .*?projectedAxisLength/);
});
