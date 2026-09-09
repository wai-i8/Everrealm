const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const game = fs.readFileSync(path.resolve(__dirname, "..", "game.js"), "utf8");
const mountainField = fs.readFileSync(path.resolve(__dirname, "..", "maps", "mountain-field.js"), "utf8");

test("battle movement uses facing-aware timed simultaneous resolution", () => {
  assert.match(game, /Tactics\.movementPathCost\(path\?\.length[\s\S]{0,320}?turnCost:\s*BATTLE_TURN_COST,[\s\S]{0,100}?initialFacing:\s*battle\?\.hero\?\.facing/);
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

test("clicking an old route cell appends or confirms and only reset clears the draft", () => {
  assert.doesNotMatch(game, /path\.slice\(0,\s*existingIndex \+ 1\)/);
  assert.match(game, /sameBattleCell\(endpoint, cell\)/);
  assert.match(game, /只有下面「重畫路線」先會清除已排路線/);
  assert.match(game, /function resetBattleMoveDraft\(\)[\s\S]*?heroMoveDraft = \[copyBattleCell\(battle\.hero\.cell\)\]/);
});


test("opening mountain battle uses the compact oblique teaching battlefield", () => {
  assert.match(mountainField, /width:\s*8,\s*\n\s*height:\s*3/);
  assert.match(mountainField, /projection:\s*\{/);
  assert.match(mountainField, /deploymentZones:[\s\S]*?ally:[\s\S]*?enemy:/);
  assert.match(mountainField, /"2,1"[\s\S]*?kind:\s*"tree"[\s\S]*?blocksLinear:\s*true[\s\S]*?blocksArc:\s*true/);
  assert.match(mountainField, /"4,1"[\s\S]*?kind:\s*"scrub"[\s\S]*?blocksLinear:\s*true[\s\S]*?blocksArc:\s*false/);
  assert.match(mountainField, /"6,0":\s*2/);
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
