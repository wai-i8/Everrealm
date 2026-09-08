const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Core = require("../rpg-core.js");
const Tactics = require("../tactics-core.js");
const ExpansionWorld = require("../expansion-world.js");

const root = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");

function fieldBlocked(map, point) {
  const radius = 12;
  if (point.x - radius < 0 || point.y - radius < 0 || point.x + radius > map.pixelWidth || point.y + radius > map.pixelHeight) return true;
  const left = Math.floor((point.x - radius) / map.tileSize);
  const right = Math.floor((point.x + radius) / map.tileSize);
  const top = Math.floor((point.y - radius) / map.tileSize);
  const bottom = Math.floor((point.y + radius) / map.tileSize);
  for (let ty = top; ty <= bottom; ty += 1) {
    for (let tx = left; tx <= right; tx += 1) {
      if (!ExpansionWorld.isTileSolid(ExpansionWorld.tileAt(map, tx, ty))) continue;
      if (Core.circleRectOverlap({ ...point, radius }, { x: tx * map.tileSize, y: ty * map.tileSize, w: map.tileSize, h: map.tileSize })) return true;
    }
  }
  return false;
}

test("exploration camera hard-locks the player to centre without changing battle layout", () => {
  const cameraUpdate = game.match(/function updateCamera\(dt\) \{[\s\S]*?\n  \}/)?.[0] || "";
  assert.match(cameraUpdate, /camera\.x = player\.x/);
  assert.match(cameraUpdate, /camera\.y = player\.y/);
  assert.doesNotMatch(cameraUpdate, /Core\.clamp\(player\.[xy]/);
  assert.match(game, /if \(battle && mode === "battle"\)/);
  assert.match(game, /ctx\.fillStyle = "#000";\s*ctx\.fillRect\(0, 0, width, height\)/);
  assert.match(game, /function drawAtmosphere\(\) \{[\s\S]*?ctx\.clip\(\)/);
});

test("exploration monster facing uses travelled direction, diagonal hysteresis, and a turn cooldown", () => {
  assert.doesNotMatch(game, /if \(dist > \.1\) setFacingFromVector\(enemy, toward\)/);
  assert.match(game, /function stableEnemyFacingFromVector/);
  assert.match(game, /ENEMY_FACING_HORIZONTAL_HYSTERESIS = \.82/);
  assert.match(game, /ENEMY_FACING_CHANGE_COOLDOWN_SECONDS = \.34/);
  assert.match(game, /enemy\.facingTurnCooldown = ENEMY_FACING_CHANGE_COOLDOWN_SECONDS/);
  assert.match(game, /const travelled = \{ x: enemy\.x - before\.x, y: enemy\.y - before\.y \}/);
  assert.match(game, /collision\.hitX[\s\S]{0,180}?wanderAngle/);
});

test("battle position bonus and damage use separate vertical lanes", () => {
  assert.match(game, /text: "背擊 \+35%"[^\n]*kind: "positionBonus", offsetY: -\.4/);
  const hitRenderer = game.match(/function applyBattleHit\([^)]*\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(hitRenderer, "damage feedback must be emitted by the shared hit renderer");
  const battle = { effects: [] };
  const context = vm.createContext({ Tactics, battle });
  vm.runInContext(hitRenderer, context);
  const unit = { hp: 100, cell: { x: 2, y: 2 } };
  for (let hitIndex = 0; hitIndex < 4; hitIndex += 1) context.applyBattleHit(unit, 5, "#ffffff", hitIndex, 4);
  assert.equal(battle.effects.length, 4);
  assert.ok(battle.effects.every((effect) => effect.kind === "damage" && effect.offsetY >= .16), "all damage labels must remain below the -0.4 position-bonus lane");
  assert.equal(new Set(battle.effects.map((effect) => `${effect.offsetX}:${effect.offsetY}`)).size, 4, "combo hit numbers must each have their own position");
  assert.match(game, /const textY = point\.y \+ layout\.cell \* \(Number\(effect\.offsetY\) \|\| 0\)/);
});

test("guild board uses the fixed five-rank commission catalog and envelope rewards", () => {
  const offers = game.match(/function currentContractOffers\(\) \{[\s\S]*?\n  \}/)?.[0] || "";
  assert.match(offers, /Guild\.listAvailable\(guildCommissionState\)/);
  assert.match(game, /skill_envelope_star/);
  assert.match(game, /技能書信封/);
  assert.doesNotMatch(game, /offer\.locked/);
});

test("all user-facing source copy uses the renamed city", () => {
  const files = ["game.js", "index.html", "world.js", "expansion-world.js", "expansion-core.js", "README.md", "GAME_DESIGN.md"];
  for (const file of files) assert.doesNotMatch(fs.readFileSync(path.join(root, file), "utf8"), /霧港/, file);
  assert.match(fs.readFileSync(path.join(root, "index.html"), "utf8"), /永恆國度/);
});

test("dungeon passage stays reachable without a story seal", () => {
  assert.doesNotMatch(game, /currentFieldGateInteraction|isGateOpen|mainBoss|questStage/);
  const field = ExpansionWorld.createFieldMap();
  const start = ExpansionWorld.point(37, 12);
  const portal = field.portals.find((candidate) => candidate.id === "field-to-dungeon");
  const options = {
    bounds: { x: 0, y: 0, w: field.pixelWidth, h: field.pixelHeight },
    cellSize: Math.max(20, field.tileSize * .6),
    radius: 12,
    directions: 8,
    maxVisited: 14000,
    nearestReachable: true,
    isWalkable: (point) => !fieldBlocked(field, point),
  };
  const route = Core.findOverworldPath(start, portal, options);
  assert.ok(route.length, "the dungeon passage should be reachable from the mountain road");
  assert.ok(Core.distance(route.at(-1), portal) < 1, "the route must terminate on field-to-dungeon");
});

test("exploration enemies never draw HP bars while tactical units retain theirs", () => {
  const explorationEnemyRenderer = game.match(/function drawEnemy\(enemy, shakeX, shakeY\) \{[\s\S]*?\n  function drawDrop\(/)?.[0] || "";
  const battleUnitRenderer = game.match(/function drawBattleUnit\(unit, layout\) \{[\s\S]*?\n  \}/)?.[0] || "";
  assert.doesNotMatch(explorationEnemyRenderer, /drawEnemyHealth|enemy\.hp \/ enemy\.maxHp/);
  assert.doesNotMatch(game, /function drawEnemyHealth\(/);
  assert.match(battleUnitRenderer, /unit\.hp \/ unit\.maxHp/);
});

