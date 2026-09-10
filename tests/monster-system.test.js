const test = require('node:test');
const assert = require('node:assert/strict');

const MonsterData = require('../data/monsters.js');
const MonsterSkills = require('../data/skills/monster.js');
const Blueprints = require('../map/monster-blueprints.js');
const MonsterAI = require('../monster-ai.js');
const Tactics = require('../tactics-core.js');
const Skills = require('../skill-core.js');
const Field = require('../maps/mountain-field.js');
const Mine = require('../maps/mine.js');

const EXPECTED = [
  ['chick', 1, 1, 5],
  ['fox', 5, 2, 6],
  ['raccoon', 10, 1, 4],
  ['wild_boar', 15, 3, 4],
  ['frog', 21, 1, 4],
  ['coyote', 27, 3, 5],
  ['turtle', 33, 1, 2],
  ['snake', 39, 2, 5],
  ['bear', 45, 1, 3],
];

function unit(id, side, x, y, options = {}) {
  return {
    id, side, team: side, cell: { x, y }, alive: true, hp: options.hp ?? 100,
    facing: options.facing || (side === 'enemy' ? 'right' : 'left'),
    moveRange: options.moveRange ?? 5, turnCost: .5, ap: options.ap ?? 10,
  };
}

test('canonical monster progression is exactly the agreed Lv1-45 ladder', () => {
  assert.equal(MonsterData.MONSTER_LEVEL_CAP, 45);
  assert.deepEqual(Object.keys(MonsterData.MONSTERS), EXPECTED.map(([id]) => id));
  for (const [id, level, count, moveRange] of EXPECTED) {
    const monster = MonsterData.MONSTERS[id];
    assert.equal(monster.progression.level, level, `${id} level`);
    assert.equal(monster.progression.rank, EXPECTED.findIndex(([candidate]) => candidate === id) + 1, `${id} rank`);
    assert.equal(monster.encounter.count, count, `${id} encounter count`);
    assert.equal(monster.combat.moveRange, moveRange, `${id} move range`);
  }
  assert.deepEqual(Blueprints.validateMonsterCatalog(), { ok: true, errors: [] });
});

test('monster skill AP, speed and explicit geometry match the battle design', () => {
  const expected = {
    peck: [4, 'C', 5],
    quick_bite: [5, 'B', 5],
    fox_pounce: [12, 'C', 6],
    raccoon_claw: [5, 'C', 5],
    flurry_claw: [11, 'D', 5],
    tusk_strike: [6, 'D', 5],
    boar_charge: [14, 'E', 3],
    tongue_strike: [7, 'C', 2],
    slime_shot: [15, 'D', 3],
    coyote_bite: [6, 'B', 5],
    hunting_pounce: [13, 'C', 6],
    shell_ram: [6, 'D', 5],
    spinning_shell: [16, 'E', 8],
    venom_fang: [8, 'B', 5],
    venom_spit: [18, 'D', 8],
    heavy_palm: [7, 'C', 5],
    quake_palm: [18, 'E', 4],
  };
  for (const [id, [ap, speed, cells]] of Object.entries(expected)) {
    const skill = MonsterSkills.getSkill(id);
    assert.ok(skill, id);
    assert.equal(skill.apCost, ap, `${id} AP`);
    assert.equal(skill.speedGrade, speed, `${id} speed`);
    assert.equal(skill.rangeCellsRelative.length, cells, `${id} authored cells`);
    assert.ok(skill.range.sourcePattern, `${id} sourcePattern`);
    assert.ok(skill.range.rangeDescription, `${id} rangeDescription`);
  }
});

test('turtle spinning shell is an 8-cell self-centred AOE with one-cell knockback', () => {
  const skill = MonsterSkills.getSkill('spinning_shell');
  assert.deepEqual(new Set(skill.rangeCellsRelative.map(([x, y]) => `${x},${y}`)), new Set([
    '-1,-1', '0,-1', '1,-1', '-1,0', '1,0', '-1,1', '0,1', '1,1',
  ]));
  assert.equal(skill.area.shape, 'relative_cells');
  assert.deepEqual(skill.effects, [{ type: 'knockback', amount: 1 }]);
});

test('maps author only canonical ordinary monsters at their canonical species levels', () => {
  const all = [...Field.createMountainFieldMap().enemySpawns, ...Mine.createMineMap().enemySpawns];
  const canonical = new Set(EXPECTED.map(([id]) => id));
  for (const spawn of all) {
    assert.ok(canonical.has(spawn.type), `canonical type for ${spawn.id}`);
    assert.equal(spawn.level, MonsterData.MONSTERS[spawn.type].progression.level, `${spawn.id} level`);
    assert.equal(Object.hasOwn(spawn, 'boss'), false, `${spawn.id} has no boss flag`);
    assert.equal(Object.hasOwn(spawn, 'elite'), false, `${spawn.id} has no elite flag`);
    assert.equal(Object.hasOwn(spawn, 'encounterParty'), false, `${spawn.id} has no mixed party`);
  }
});

test('melee AI can route around another monster instead of targeting one fixed adjacent tile', () => {
  const grid = Tactics.createGrid(7, 5, []);
  const enemy = unit('chick-a', 'enemy', 0, 2, { moveRange: 5, ap: 10 });
  const blocker = unit('chick-b', 'enemy', 3, 2, { moveRange: 5, ap: 10 });
  const hero = unit('hero', 'ally', 4, 2);
  const plan = MonsterAI.planEnemyAction({
    grid, enemy, targets: [hero], units: [enemy, blocker, hero],
    skills: Blueprints.monsterBlueprint('chick').skills, apGain: 10,
  });
  assert.equal(plan.attackTargetId, 'hero');
  assert.equal(plan.skill.id, 'peck');
  assert.notDeepEqual(plan.move, blocker.cell);
  assert.notDeepEqual(plan.move, hero.cell);
  assert.ok(Tactics.manhattan(plan.move, hero.cell) <= 2);
});

test('high-AP ranged upgrade can stage instead of needlessly committing to cheap melee', () => {
  const grid = Tactics.createGrid(9, 7, []);
  const hero = unit('hero', 'ally', 7, 3);

  const fox = unit('fox', 'enemy', 0, 3, { moveRange: 6, ap: 10 });
  const foxPlan = MonsterAI.planEnemyAction({ grid, enemy: fox, targets: [hero], units: [fox, hero], skills: Blueprints.monsterBlueprint('fox').skills, apGain: 10 });
  assert.equal(foxPlan.attackTargetId, null);
  assert.equal(foxPlan.setupSkill.id, 'fox_pounce');
  assert.ok(Tactics.manhattan(foxPlan.move, hero.cell) >= 2);

  const snake = unit('snake', 'enemy', 0, 3, { moveRange: 5, ap: 10 });
  const snakeHero = unit('hero-2', 'ally', 6, 3);
  const snakePlan = MonsterAI.planEnemyAction({ grid, enemy: snake, targets: [snakeHero], units: [snake, snakeHero], skills: Blueprints.monsterBlueprint('snake').skills, apGain: 10 });
  assert.equal(snakePlan.attackTargetId, null);
  assert.equal(snakePlan.setupSkill.id, 'venom_spit');
  assert.ok(Tactics.manhattan(snakePlan.move, snakeHero.cell) >= 3);
});

test('ranged skill is used once AP and exact authored geometry are legal', () => {
  const grid = Tactics.createGrid(9, 7, []);
  const snake = unit('snake', 'enemy', 1, 3, { moveRange: 5, ap: 20, facing: 'right' });
  const hero = unit('hero', 'ally', 5, 3);
  const plan = MonsterAI.planEnemyAction({ grid, enemy: snake, targets: [hero], units: [snake, hero], skills: Blueprints.monsterBlueprint('snake').skills, apGain: 10 });
  assert.equal(plan.type, 'attack');
  assert.equal(plan.skill.id, 'venom_spit');
  assert.deepEqual(plan.move, snake.cell);
});

test('turtle prefers the approved spinning AOE when adjacent and AP is sufficient', () => {
  const grid = Tactics.createGrid(5, 5, []);
  const turtle = unit('turtle', 'enemy', 2, 2, { moveRange: 2, ap: 20, facing: 'right' });
  const hero = unit('hero', 'ally', 3, 2);
  const plan = MonsterAI.planEnemyAction({ grid, enemy: turtle, targets: [hero], units: [turtle, hero], skills: Blueprints.monsterBlueprint('turtle').skills, apGain: 10 });
  assert.equal(plan.type, 'attack');
  assert.equal(plan.skill.id, 'spinning_shell');
});

test('existing battle speed resolver orders player and monster actions together', () => {
  const order = Skills.orderActionsBySpeed([
    { actorId: 'turtle', speedGrade: 'E', initiative: 99, weight: 0 },
    { actorId: 'player', speedGrade: 'B', initiative: 1, weight: 0 },
    { actorId: 'snake', speedGrade: 'D', initiative: 50, weight: 0 },
  ]);
  assert.deepEqual(order.map((action) => action.actorId), ['player', 'snake', 'turtle']);
});

test('boar charge uses the shared linear blocker resolver', () => {
  const grid = Tactics.createGrid(7, 5, []);
  const boar = unit('boar', 'enemy', 1, 2, { moveRange: 4, ap: 20, facing: 'right' });
  const blocker = unit('boar-blocker', 'enemy', 2, 2, { moveRange: 4, ap: 0, facing: 'right' });
  const hero = unit('hero', 'ally', 4, 2);
  const charge = MonsterSkills.getSkill('boar_charge');
  assert.equal(MonsterAI.validateSkillFrom(charge, boar, boar.cell, boar.facing, hero, grid, [boar, blocker, hero]), false);
});
