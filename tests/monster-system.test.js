const test = require("node:test");
const assert = require("node:assert/strict");

const Monsters = require("../map/monster-blueprints.js");
const World = require("../expansion-world.js");

test("canonical monster catalog has exactly nine stable IDs and complete records", () => {
  assert.deepEqual(Monsters.CANONICAL_MONSTER_IDS, ["chick", "fox", "raccoon", "wild_boar", "bear", "turtle", "coyote", "frog", "snake"]);
  assert.equal(Monsters.validateMonsterCatalog().ok, true);
  for (const id of Monsters.CANONICAL_MONSTER_IDS) {
    const monster = Monsters.monsterBlueprint(id);
    assert.equal(monster.id, id);
    assert.ok(monster.name_zh && monster.name_en && monster.family);
    assert.ok(monster.normalLevelRange[1] >= monster.normalLevelRange[0]);
    assert.ok(monster.habitat.maps.length && monster.habitat.zones.length);
    assert.ok(monster.baseStats.hp > 0 && monster.multipliers.hp > 0);
    assert.ok(monster.skills.length >= 1);
    assert.ok(monster.rewards.baseXp > 0 && monster.rewards.coins > 0);
  }
  assert.notEqual(Monsters.monsterBlueprint("fox").family, "coyote");
  assert.notEqual(Monsters.monsterBlueprint("fox").id, Monsters.monsterBlueprint("coyote").id);
});

test("legacy IDs normalize only through the explicit migration table", () => {
  assert.equal(Monsters.normalizeMonsterId("deepwarden"), "bear");
  assert.equal(Monsters.normalizeMonsterId("lantern-golem"), "turtle");
  assert.equal(Monsters.normalizeMonsterId("not-a-monster"), null);
  assert.equal(Monsters.monsterBlueprint("mossbun").id, "raccoon");
});

test("species multipliers and level scaling are data-driven", () => {
  const turtle = Monsters.monsterStatsAtLevel("turtle", 5);
  const fox = Monsters.monsterStatsAtLevel("fox", 5);
  const bear = Monsters.monsterStatsAtLevel("bear", 8, { elite: true });
  assert.ok(turtle.defense > fox.defense, "turtle must retain its defense identity");
  assert.ok(bear.hp > Monsters.monsterStatsAtLevel("bear", 8).hp, "elite scaling must be explicit");
  assert.equal(turtle.moveRange, Monsters.monsterBlueprint("turtle").moveRange);
});

test("monster skills expose shared range, speed, delivery and effect data", () => {
  const snake = Monsters.monsterBlueprint("snake");
  const bite = snake.skills.find((skill) => skill.id === "snake_bite");
  const spit = snake.skills.find((skill) => skill.id === "poison_spit");
  const cloud = snake.skills.find((skill) => skill.id === "poison_cloud");
  assert.equal(bite.speedGrade, "A");
  assert.equal(bite.pathMode, "facingOrthogonalPriority");
  assert.ok(bite.rangeCellsRelative.length >= 3);
  assert.equal(spit.deliveryMode, "projectile");
  assert.equal(cloud.deliveryMode, "pathless-area");
  assert.ok(cloud.effects.some((effect) => effect.type === "poison"));
  assert.ok(Monsters.monsterBlueprint("turtle").skills.some((skill) => skill.id === "shell_defense"));
});

test("hydration is immutable, levelled and reward-aware", () => {
  const spawn = { id: "snake-test", type: "snake", level: 8, elite: true, x: 100, y: 200 };
  const copy = { ...spawn };
  const hydrated = Monsters.hydrateMonsterSpawn(spawn);
  assert.deepEqual(spawn, copy);
  assert.equal(hydrated.type, "snake");
  assert.deepEqual(hydrated.stats, Monsters.monsterStatsAtLevel("snake", 8, { elite: true }));
  assert.equal(hydrated.skills[0].id, "snake_bite");
  assert.ok(hydrated.reward.xp > 0);
});

test("XP and retreat formulas are level-sensitive and bounded", () => {
  assert.equal(Monsters.xpReward(100, 10, 1), 160);
  assert.equal(Monsters.xpReward(100, 1, 10), 10);
  assert.equal(Monsters.highestLivingEnemyLevel([{ level: 3, alive: true }, { level: 8, alive: false }, { level: 5, hp: 2 }]), 5);
  assert.equal(Monsters.retreatChance(1, [{ level: 20, alive: true }]), .05);
  assert.equal(Monsters.retreatChance(20, [{ level: 1, alive: true }]), 1);
});

test("map spawns and expansion API consume canonical monster data", () => {
  const maps = World.createExpansionMaps();
  const spawned = Object.values(maps).flatMap((map) => map.enemySpawns).map((spawn) => spawn.type);
  assert.ok(spawned.every((id) => Monsters.CANONICAL_MONSTER_IDS.includes(id)));
  assert.ok(spawned.includes("chick") && spawned.includes("snake"));
  assert.equal(World.normalizeMonsterId("cragboar"), "wild_boar");
  assert.equal(World.monsterStatsAtLevel("bear", 8).level, 8);
});
