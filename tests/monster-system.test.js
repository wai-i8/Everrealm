const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
    attack: options.attack ?? 20, defence: options.defence ?? 0,
    facing: options.facing || (side === 'enemy' ? 'right' : 'left'),
    moveRange: options.moveRange ?? 5, turnCost: .5, ap: options.ap ?? 10,
    weight: options.weight ?? 0, initiative: options.initiative ?? 0,
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
    venom_spit: [18, 'D', 4],
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

test('monster projectiles are explicit; long-range body attacks are not projectiles', () => {
  assert.equal(MonsterSkills.getSkill('slime_shot').isProjectile, true);
  assert.equal(MonsterSkills.getSkill('venom_spit').isProjectile, true);
  assert.notEqual(MonsterSkills.getSkill('fox_pounce').isProjectile, true);
  assert.notEqual(MonsterSkills.getSkill('hunting_pounce').isProjectile, true);
  assert.notEqual(MonsterSkills.getSkill('boar_charge').isProjectile, true);
  const gameSource = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
  assert.equal(gameSource.includes('isProjectile: hit.enemy.attackRange > 1'), false);
  assert.equal(gameSource.includes('isProjectile: hit.plan.skill?.isProjectile === true'), true);
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

test('melee AI uses the player occupied cell as the pursuit goal', () => {
  const grid = Tactics.createGrid(7, 5, []);
  const enemy = unit('chick-a', 'enemy', 0, 2, { moveRange: 8, ap: 10 });
  const blocker = unit('chick-b', 'enemy', 3, 2, { moveRange: 5, ap: 10 });
  const hero = unit('hero', 'ally', 4, 2);
  const plan = MonsterAI.planEnemyAction({
    grid, enemy, targets: [hero], units: [enemy, blocker, hero],
    skills: Blueprints.monsterBlueprint('chick').skills, apGain: 10,
  });
  assert.equal(plan.attackTargetId, 'hero');
  assert.equal(plan.skill.id, 'peck');
  assert.deepEqual(plan.move, hero.cell, 'movement intent remains the occupied player cell');
  assert.deepEqual(plan.path.at(-1), hero.cell, 'route itself retains the occupied goal');
  assert.notDeepEqual(plan.previewCell, hero.cell, 'subsequent AI planning uses a legal preview cell');
  assert.notDeepEqual(plan.previewCell, blocker.cell, 'the preview routes around an occupied adjacent side');
});

test('melee AI still pursues the occupied player cell even when already in attack range', () => {
  const grid = Tactics.createGrid(5, 5, []);
  const enemy = unit('chick', 'enemy', 2, 2, { moveRange: 5, ap: 10, facing: 'right' });
  const hero = unit('hero', 'ally', 1, 2);
  const plan = MonsterAI.planEnemyAction({
    grid, enemy, targets: [hero], units: [enemy, hero],
    skills: Blueprints.monsterBlueprint('chick').skills, apGain: 10,
  });
  assert.equal(plan.attackTargetId, 'hero');
  assert.deepEqual(plan.move, hero.cell, 'adjacent melee still intends to enter the player cell');
  assert.deepEqual(plan.path.at(-1), hero.cell, 'occupied player cell remains the route goal');

  const movement = Tactics.resolveSimultaneousMovement({
    timed: true,
    grid,
    units: [enemy, hero],
    routes: new Map([
      ['chick', { path: plan.path, commands: plan.commands }],
      ['hero', { path: [hero.cell] }],
    ]),
  });
  const finalChick = { ...enemy, cell: movement.unitResults.chick.cell, facing: movement.unitResults.chick.facing };
  assert.deepEqual(finalChick.cell, enemy.cell, 'stationary player collision keeps the chick adjacent');
  assert.equal(MonsterAI.validateSkillFrom(plan.skill, finalChick, finalChick.cell, finalChick.facing, hero, grid, [finalChick, hero]), true);
});

test('high-AP ranged upgrade stages on actual authored skill geometry, not a distance-only band', () => {
  const grid = Tactics.createGrid(9, 7, []);

  const fox = unit('fox', 'enemy', 0, 3, { moveRange: 6, ap: 10 });
  const foxHero = unit('hero', 'ally', 7, 3);
  const foxPlan = MonsterAI.planEnemyAction({ grid, enemy: fox, targets: [foxHero], units: [fox, foxHero], skills: Blueprints.monsterBlueprint('fox').skills, apGain: 10 });
  assert.equal(foxPlan.attackTargetId, null);
  assert.equal(foxPlan.setupSkill.id, 'fox_pounce');
  assert.equal(MonsterAI.validateSkillFrom(foxPlan.setupSkill, fox, foxPlan.move, foxPlan.facing, foxHero, grid, [fox, foxHero]), true);

  const boar = unit('boar', 'enemy', 0, 0, { moveRange: 4, ap: 10, facing: 'right' });
  const boarHero = unit('hero-2', 'ally', 3, 3);
  const boarPlan = MonsterAI.planEnemyAction({ grid, enemy: boar, targets: [boarHero], units: [boar, boarHero], skills: Blueprints.monsterBlueprint('wild_boar').skills, apGain: 10 });
  assert.equal(boarPlan.attackTargetId, null);
  assert.equal(boarPlan.setupSkill.id, 'boar_charge');
  assert.equal(MonsterAI.validateSkillFrom(boarPlan.setupSkill, boar, boarPlan.move, boarPlan.facing, boarHero, grid, [boar, boarHero]), true);
});

test('snake stages for venom spit at 10 AP and uses it once AP is sufficient', () => {
  const grid = Tactics.createGrid(9, 7, []);
  const hero = unit('hero', 'ally', 6, 3);
  const snake = unit('snake', 'enemy', 1, 3, { moveRange: 5, ap: 10, facing: 'right', attack: 32 });
  const stage = MonsterAI.planEnemyAction({ grid, enemy: snake, targets: [hero], units: [snake, hero], skills: Blueprints.monsterBlueprint('snake').skills, apGain: 10 });
  assert.equal(stage.attackTargetId, null);
  assert.equal(stage.setupSkill.id, 'venom_spit');
  assert.equal(MonsterAI.validateSkillFrom(stage.setupSkill, snake, stage.move, stage.facing, hero, grid, [snake, hero]), true);

  const ready = unit('snake-ready', 'enemy', 1, 3, { moveRange: 5, ap: 20, facing: 'right', attack: 32 });
  const readyHero = unit('hero-ready', 'ally', 5, 3);
  const attack = MonsterAI.planEnemyAction({ grid, enemy: ready, targets: [readyHero], units: [ready, readyHero], skills: Blueprints.monsterBlueprint('snake').skills, apGain: 10 });
  assert.equal(attack.type, 'attack');
  assert.equal(attack.skill.id, 'venom_spit');
  assert.deepEqual(attack.move, ready.cell);
});

test('AI avoids wasting an expensive skill on a one-HP target when a cheap lethal skill is available', () => {
  const grid = Tactics.createGrid(5, 5, []);
  const snake = unit('snake', 'enemy', 1, 2, { moveRange: 5, ap: 20, facing: 'right', attack: 32 });
  const hero = unit('hero', 'ally', 2, 2, { hp: 1 });
  const plan = MonsterAI.planEnemyAction({ grid, enemy: snake, targets: [hero], units: [snake, hero], skills: Blueprints.monsterBlueprint('snake').skills, apGain: 10 });
  assert.equal(plan.skill.id, 'venom_fang');
  assert.equal(plan.skill.apCost, 8);
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

test('AI scoring gives a real preference to a faster otherwise-equivalent skill', () => {
  const enemy = unit('enemy', 'enemy', 1, 1, { attack: 20 });
  const hero = unit('hero', 'ally', 2, 1, { hp: 100, defence: 0 });
  const base = { dealsDamage: true, apCost: 10, damageModel: { scale: 1 }, effects: [], aiValue: 50 };
  assert.ok(MonsterAI.skillValue({ ...base, speedGrade: 'B' }, enemy, hero) > MonsterAI.skillValue({ ...base, speedGrade: 'E' }, enemy, hero));
});

test('boar charge uses the shared linear blocker resolver', () => {
  const grid = Tactics.createGrid(7, 5, []);
  const boar = unit('boar', 'enemy', 1, 2, { moveRange: 4, ap: 20, facing: 'right' });
  const blocker = unit('boar-blocker', 'enemy', 2, 2, { moveRange: 4, ap: 0, facing: 'right' });
  const hero = unit('hero', 'ally', 4, 2);
  const charge = MonsterSkills.getSkill('boar_charge');
  assert.equal(MonsterAI.validateSkillFrom(charge, boar, boar.cell, boar.facing, hero, grid, [boar, blocker, hero]), false);
});

test('friendly collision yields by weight, retries, and continues the original route', () => {
  const grid = Tactics.createGrid(4, 4, []);
  const light = unit('light', 'enemy', 0, 1, { weight: 1, facing: 'right' });
  const heavy = unit('heavy', 'enemy', 1, 0, { weight: 5, facing: 'down' });
  const movement = Tactics.resolveSimultaneousMovement({
    timed: true,
    grid,
    units: [light, heavy],
    routes: new Map([
      ['light', { path: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] }],
      ['heavy', { path: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }] }],
    ]),
  });
  assert.deepEqual(movement.unitResults.light.cell, { x: 2, y: 1 });
  assert.deepEqual(movement.unitResults.heavy.cell, { x: 1, y: 2 });
  assert.equal(movement.unitResults.light.blocked, false);
  assert.equal(movement.unitResults.heavy.blocked, false);
  assert.equal(movement.unitResults.heavy.friendlyWaits, 1);
  assert.equal(movement.events.some((event) => event.unitId === 'heavy' && event.type === 'friendly-wait'), true);
  assert.deepEqual(movement.unitResults.heavy.completedPath, [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }]);
});

test('a teammate only becomes truly blocked when another teammate finishes on its route', () => {
  const grid = Tactics.createGrid(4, 4, []);
  const light = unit('light', 'enemy', 0, 1, { weight: 1, facing: 'right' });
  const heavy = unit('heavy', 'enemy', 1, 0, { weight: 5, facing: 'down' });
  const movement = Tactics.resolveSimultaneousMovement({
    timed: true,
    grid,
    units: [light, heavy],
    routes: new Map([
      ['light', { path: [{ x: 0, y: 1 }, { x: 1, y: 1 }] }],
      ['heavy', { path: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }] }],
    ]),
  });
  assert.equal(movement.unitResults.heavy.friendlyWaits, 1);
  assert.equal(movement.unitResults.heavy.blocked, true);
  assert.equal(movement.unitResults.heavy.blockReason, 'friendly-route-blocked');
});

test('opposing-team contested movement keeps the existing hard collision behavior', () => {
  const grid = Tactics.createGrid(3, 3, []);
  const hero = unit('hero', 'ally', 0, 1, { facing: 'right' });
  const enemy = unit('enemy', 'enemy', 2, 1, { facing: 'left' });
  const movement = Tactics.resolveSimultaneousMovement({
    timed: true,
    grid,
    units: [hero, enemy],
    priorityUnitId: 'hero',
    routes: new Map([
      ['hero', { path: [{ x: 0, y: 1 }, { x: 1, y: 1 }] }],
      ['enemy', { path: [{ x: 2, y: 1 }, { x: 1, y: 1 }] }],
    ]),
  });
  assert.deepEqual(movement.unitResults.hero.cell, { x: 1, y: 1 });
  assert.equal(movement.unitResults.enemy.blocked, true);
  assert.equal(movement.unitResults.enemy.blockReason, 'contested');
});

test('occupied-goal melee route enters the player old cell if the player moves away', () => {
  const grid = Tactics.createGrid(6, 3, []);
  const chick = unit('chick', 'enemy', 0, 1, { moveRange: 5, ap: 10, facing: 'right' });
  const hero = unit('hero', 'ally', 3, 1, { facing: 'right' });
  const plan = MonsterAI.planEnemyAction({ grid, enemy: chick, targets: [hero], units: [chick, hero], skills: Blueprints.monsterBlueprint('chick').skills, apGain: 10 });
  assert.deepEqual(plan.path.at(-1), hero.cell);
  const movement = Tactics.resolveSimultaneousMovement({
    timed: true,
    grid,
    units: [chick, hero],
    priorityUnitId: 'hero',
    routes: new Map([
      ['chick', { path: plan.path, commands: plan.commands }],
      ['hero', { path: [{ x: 3, y: 1 }, { x: 4, y: 1 }] }],
    ]),
  });
  assert.deepEqual(movement.unitResults.chick.cell, { x: 3, y: 1 });
  assert.equal(movement.unitResults.chick.blocked, false);
});

test('adjacent melee follows into the player old cell instead of standing still after getting in range', () => {
  const grid = Tactics.createGrid(7, 5, []);
  const chick = unit('chick', 'enemy', 2, 2, { moveRange: 5, ap: 10, facing: 'right' });
  const hero = unit('hero', 'ally', 3, 2, { moveRange: 5, facing: 'right' });
  const plan = MonsterAI.planEnemyAction({
    grid,
    enemy: chick,
    targets: [hero],
    units: [chick, hero],
    skills: Blueprints.monsterBlueprint('chick').skills,
    apGain: 10,
  });
  assert.deepEqual(plan.move, hero.cell);
  assert.deepEqual(plan.path.at(-1), hero.cell);

  const movement = Tactics.resolveSimultaneousMovement({
    timed: true,
    grid,
    units: [chick, hero],
    priorityUnitId: 'hero',
    routes: new Map([
      ['chick', { path: plan.path, commands: plan.commands }],
      ['hero', { path: [hero.cell, { x: 4, y: 2 }], commands: [{ type: 'move', to: { x: 4, y: 2 } }] }],
    ]),
  });
  assert.deepEqual(movement.unitResults.chick.cell, { x: 3, y: 2 }, 'chick enters the square the player vacated');
  assert.deepEqual(movement.unitResults.hero.cell, { x: 4, y: 2 });
  assert.equal(movement.unitResults.chick.blocked, false);
});

test('same-team reciprocal head-on routes pass through by priority without cancelling either route', () => {
  const grid = Tactics.createGrid(5, 3, []);
  const light = unit('light', 'enemy', 1, 1, { weight: 1, facing: 'right' });
  const heavy = unit('heavy', 'enemy', 2, 1, { weight: 5, facing: 'left' });
  const movement = Tactics.resolveSimultaneousMovement({
    timed: true,
    grid,
    units: [light, heavy],
    routes: new Map([
      ['light', { path: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }] }],
      ['heavy', { path: [{ x: 2, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 }] }],
    ]),
  });
  assert.deepEqual(movement.unitResults.light.cell, { x: 3, y: 1 });
  assert.deepEqual(movement.unitResults.heavy.cell, { x: 0, y: 1 });
  assert.equal(movement.unitResults.light.blocked, false);
  assert.equal(movement.unitResults.heavy.blocked, false);
  assert.ok(movement.unitResults.heavy.friendlyWaits >= 1);
  assert.equal(movement.events.some((event) => event.unitId === 'heavy' && event.type === 'friendly-wait' && event.afterPass === true), true);
});

test('long same-team corridor crossing cannot enter a friendly wait deadlock', () => {
  const grid = Tactics.createGrid(8, 8, []);
  const light = unit('light', 'enemy', 2, 0, { weight: 0, facing: 'right' });
  const heavy = unit('heavy', 'enemy', 6, 5, { weight: 2, facing: 'left' });
  const movement = Tactics.resolveSimultaneousMovement({
    timed: true,
    grid,
    units: [light, heavy],
    routes: new Map([
      ['light', { path: [
        { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 },
        { x: 6, y: 1 }, { x: 6, y: 2 }, { x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 },
        { x: 6, y: 6 }, { x: 6, y: 7 },
      ] }],
      ['heavy', { path: [
        { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 },
        { x: 6, y: 0 }, { x: 7, y: 0 },
      ] }],
    ]),
  });
  assert.deepEqual(movement.unitResults.light.cell, { x: 6, y: 7 });
  assert.deepEqual(movement.unitResults.heavy.cell, { x: 7, y: 0 });
  assert.equal(movement.unitResults.light.blocked, false);
  assert.equal(movement.unitResults.heavy.blocked, false);
});

test('occupied-goal melee stops adjacent to a stationary opponent and remains able to attack', () => {
  const grid = Tactics.createGrid(6, 3, []);
  const chick = unit('chick', 'enemy', 0, 1, { moveRange: 5, ap: 10, facing: 'right' });
  const hero = unit('hero', 'ally', 3, 1, { facing: 'left' });
  const plan = MonsterAI.planEnemyAction({
    grid,
    enemy: chick,
    targets: [hero],
    units: [chick, hero],
    skills: Blueprints.monsterBlueprint('chick').skills,
    apGain: 10,
  });
  assert.deepEqual(plan.path.at(-1), hero.cell);
  const movement = Tactics.resolveSimultaneousMovement({
    timed: true,
    grid,
    units: [chick, hero],
    routes: new Map([
      ['chick', { path: plan.path, commands: plan.commands }],
      ['hero', { path: [hero.cell] }],
    ]),
  });
  const finalChick = { ...chick, cell: movement.unitResults.chick.cell, facing: movement.unitResults.chick.facing };
  assert.deepEqual(finalChick.cell, { x: 2, y: 1 });
  assert.equal(MonsterAI.validateSkillFrom(plan.skill, finalChick, finalChick.cell, finalChick.facing, hero, grid, [finalChick, hero]), true);
});

test('an opponent contesting one half of a friendly swap propagates safely without overlap', () => {
  const grid = Tactics.createGrid(6, 6, []);
  const hero = unit('hero', 'ally', 4, 3, { weight: 0, facing: 'down' });
  const leftEnemy = unit('left-enemy', 'enemy', 4, 4, { weight: 2, facing: 'left' });
  const rightEnemy = unit('right-enemy', 'enemy', 3, 4, { weight: 3, facing: 'right' });
  const movement = Tactics.resolveSimultaneousMovement({
    timed: true,
    grid,
    units: [hero, leftEnemy, rightEnemy],
    priorityUnitId: 'hero',
    routes: new Map([
      ['hero', { path: [{ x: 4, y: 3 }, { x: 4, y: 4 }] }],
      ['left-enemy', { path: [{ x: 4, y: 4 }, { x: 3, y: 4 }] }],
      ['right-enemy', { path: [{ x: 3, y: 4 }, { x: 4, y: 4 }] }],
    ]),
  });
  const cells = Object.values(movement.unitResults).map((result) => `${result.cell.x},${result.cell.y}`);
  assert.equal(new Set(cells).size, cells.length);
  assert.deepEqual(movement.unitResults.hero.cell, { x: 4, y: 3 });
  assert.deepEqual(movement.unitResults['left-enemy'].cell, { x: 4, y: 4 });
  assert.deepEqual(movement.unitResults['right-enemy'].cell, { x: 3, y: 4 });
});

test('opponent arriving before a later vacate pins both units instead of letting the occupant escape', () => {
  const grid = Tactics.createGrid(5, 3, []);
  const hero = unit('hero', 'ally', 0, 1, { facing: 'right' });
  const chick = unit('chick', 'enemy', 1, 1, { facing: 'up' });
  const movement = Tactics.resolveSimultaneousMovement({
    timed: true,
    grid,
    units: [hero, chick],
    priorityUnitId: 'hero',
    routes: new Map([
      ['hero', { path: [{ x: 0, y: 1 }, { x: 1, y: 1 }], commands: [{ type: 'move', to: { x: 1, y: 1 } }] }],
      ['chick', { path: [{ x: 1, y: 1 }, { x: 2, y: 1 }] }],
    ]),
  });

  assert.deepEqual(movement.unitResults.hero.cell, { x: 0, y: 1 });
  assert.deepEqual(movement.unitResults.chick.cell, { x: 1, y: 1 });
  assert.equal(movement.unitResults.hero.blocked, true);
  assert.equal(movement.unitResults.chick.blocked, true);
  assert.equal(movement.unitResults.chick.blockReason, 'opponent-pin');
  assert.equal(movement.events.some((event) => event.unitId === 'chick' && event.type === 'move'), false,
    'the chick may begin its animation but cannot logically vacate after the hero claims the cell first');
});

test('earlier arrival wins an empty cell, then a later opposing claim pins that winner before its next vacate', () => {
  const grid = Tactics.createGrid(5, 5, []);
  // Chick reaches (2,2) at t=2.0. Hero pays an opening 0.5 turn and would
  // reach the same cell at t=2.5. The chick therefore wins (2,2), but its
  // next step would only vacate at t=3.0, so the hero's t=2.5 claim pins it.
  const hero = unit('hero', 'ally', 0, 2, { facing: 'down' });
  const chick = unit('chick', 'enemy', 2, 0, { facing: 'down' });
  const movement = Tactics.resolveSimultaneousMovement({
    timed: true,
    grid,
    units: [hero, chick],
    priorityUnitId: 'hero',
    routes: new Map([
      ['hero', { path: [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }] }],
      ['chick', { path: [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }] }],
    ]),
  });

  assert.deepEqual(movement.unitResults.chick.cell, { x: 2, y: 2 }, 'chick wins the contested cell by arriving first');
  assert.deepEqual(movement.unitResults.hero.cell, { x: 1, y: 2 }, 'hero stops one cell short');
  assert.equal(movement.unitResults.chick.blocked, true, 'later hero claim prevents the chick from escaping after the win');
  assert.equal(movement.unitResults.hero.blocked, true);
  assert.equal(movement.unitResults.chick.blockReason, 'opponent-pin');
});
