const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const game = fs.readFileSync(path.resolve(__dirname, "..", "game.js"), "utf8");

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
