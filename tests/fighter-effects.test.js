const test = require("node:test");
const assert = require("node:assert/strict");
const Effects = require("../fighter-effects.js");
const Skills = require("../skill-core.js");

function unit(id, x, y, extra = {}) { return { id, cell: { x, y }, hp: 100, maxHp: 100, ...extra }; }
function cast(id, caster, targets, extra = {}) {
  return Effects.applySkillEffects({ skill: Skills.getSkill(id), caster, targets, grid: { width: 9, height: 7, blocked: new Set() }, round: 1, random: () => 0, ...extra });
}

test("learned passive skills apply independently and duplicates cannot stack", () => {
  const skills = ["iron_body", "floating_body", "striking_body", "guarded_body", "body_targeting", "supple_body", "light_body", "poison_recovery", "sleep_recovery"].map(Skills.getSkill);
  const modifiers = Effects.passiveModifiers([...skills, skills[2]]);
  assert.equal(modifiers.attackMultiplier, 1.06);
  assert.equal(modifiers.defenceMultiplier, 1.06);
  assert.equal(modifiers.evasion, .06);
  assert.equal(modifiers.accuracy, .06);
  assert.equal(modifiers.speedBonus, 1);
  assert.equal(modifiers.typedDefence.slash, .06);
  assert.equal(modifiers.typedDefence.impact, .06);
  assert.deepEqual(modifiers.immunities.sort(), ["poison", "sleep"]);
});

test("knockback moves only through available cells, preserves facing, and emits STOP at blockers", () => {
  const caster = unit("hero", 1, 2);
  const target = unit("target", 2, 2, { facing: "left", renderCell: { x: 2, y: 2 } });
  const blocker = unit("blocker", 4, 2);
  const outcome = cast("fist_cannon", caster, [target], { units: [caster, target, blocker] });
  assert.deepEqual(target.cell, { x: 3, y: 2 });
  assert.deepEqual(target.renderCell, target.cell);
  assert.equal(target.facing, "left");
  assert.equal(target.hp, 100, "ordinary damage belongs to battle resolution");
  assert.equal(outcome.moved.length, 1);
  assert.ok(outcome.events.some((event) => event.text === "STOP!"));
  cast("sky_rend", caster, [target], { grid: { width: 5, height: 5, blocked: new Set(["4,2"]) } });
  assert.deepEqual(target.cell, { x: 3, y: 2 });
  cast("sky_rend", caster, [target], { grid: { width: 5, height: 5, blocked: new Set() } });
  assert.deepEqual(target.cell, { x: 4, y: 2 });
});

test("poison has five enemy ticks and one self tick, with repeated round ticks idempotent", () => {
  const caster = unit("hero", 1, 2);
  const target = unit("target", 2, 2);
  cast("poison_hand_fist", caster, [target]);
  Effects.tickStatuses(target, 1);
  assert.equal(target.hp, 100);
  for (let round = 2; round <= 6; round++) {
    Effects.tickStatuses(target, round);
    Effects.tickStatuses(target, round);
    Effects.tickStatuses(caster, round);
  }
  assert.equal(target.hp, 75);
  assert.equal(caster.hp, 95);
  Effects.tickStatuses(target, 7);
  assert.equal(target.statusEffects.poison, undefined);
});

test("debuffs affect subsequent rounds and each cleanse removes only its authored statuses", () => {
  const caster = unit("hero", 1, 2);
  const target = unit("target", 2, 2);
  cast("immobility_bind", caster, [target]);
  cast("rending_flash", caster, [target]);
  assert.equal(Effects.isDisabled(target, 2), true);
  assert.equal(Effects.isDisabled(target, 3), true);
  assert.equal(Effects.isDisabled(target, 4), false);
  assert.equal(Effects.accuracyPenalty(target, 4), .55);
  cast("paralysis_release", caster, [target]);
  assert.equal(Effects.isDisabled(target, 2), false);
  assert.equal(Effects.accuracyPenalty(target, 2), .55);
  cast("sight_release", caster, [target]);
  assert.equal(Effects.accuracyPenalty(target, 2), 0);
  cast("horizon_kick", caster, [target]);
  assert.equal(Effects.isDisabled(target, 2, "move"), true);
});

test("stance guard and evasion last the current round, typed defence combines without double-stat reduction", () => {
  const caster = unit("hero", 1, 2);
  cast("defense_stance", caster, [caster]);
  cast("dancing_leaf", caster, [caster]);
  const passives = Effects.passiveModifiers([Skills.getSkill("floating_body"), Skills.getSkill("supple_body")]);
  assert.ok(Math.abs(Effects.damageMultiplier(caster, 1, passives, "impact") - .62 * .94) < 1e-8);
  assert.ok(Math.abs(Effects.statusEvasion(caster, 1, passives) - .61) < 1e-8);
  assert.equal(Effects.statusEvasion(caster, 2, passives), .06);
  assert.equal(Effects.damageMultiplier(caster, 2, passives, "slash"), 1);
});

test("counter hits adjacent attacker once and projectile stance reflects a ranged attack", () => {
  const caster = unit("hero", 1, 2);
  const target = unit("target", 2, 2);
  cast("preemptive_counter", caster, [caster]);
  let outcome = Effects.resolveCounter({ defender: caster, attacker: target, damage: 20, round: 1 });
  assert.equal(outcome.damage, 20);
  assert.equal(outcome.reflectedDamage, 18);
  assert.equal(target.hp, 82);
  assert.equal(Effects.resolveCounter({ defender: caster, attacker: target, damage: 20, round: 1 }).reflectedDamage, 0);
  cast("projectile_counter_kick", caster, [caster]);
  target.cell = { x: 5, y: 2 };
  outcome = Effects.resolveCounter({ defender: caster, attacker: target, damage: 30, isProjectile: true, round: 1 });
  assert.equal(outcome.damage, 0);
  assert.equal(target.hp, 52);
});

test("special HP punches respect success chance, never heal, and cap boss damage", () => {
  const caster = unit("hero", 1, 2);
  const target = unit("target", 2, 2);
  assert.equal(cast("halving_fist", caster, [target]).hpChanges[0].amount, -50);
  cast("one_hp_fist", caster, [target], { random: () => .99 });
  assert.equal(target.hp, 50);
  cast("one_hp_fist", caster, [target]);
  assert.equal(target.hp, 1);
  const boss = unit("boss", 3, 2, { boss: true, hp: 1000, maxHp: 1000 });
  cast("one_hp_fist", caster, [boss]);
  assert.equal(boss.hp, 850);
  cast("halving_fist", caster, [boss]);
  assert.equal(boss.hp, 700);
});

test("healing, movement reduction, stealth, poison and sleep recovery have executable effects", () => {
  const caster = unit("hero", 1, 2, { hp: 20 });
  cast("chi_gathering", caster, [caster]);
  assert.equal(caster.hp, 44);
  cast("secret_chi_gathering", caster, [caster]);
  assert.equal(caster.hp, 94);
  cast("secret_chi_gathering", caster, [caster]);
  assert.equal(caster.hp, 100);
  cast("roar", caster, [caster]);
  assert.equal(Effects.movementPenalty(caster, 2), 2);
  cast("vanishing_aura", caster, [caster]);
  assert.equal(Effects.statusEvasion(caster, 2), .35);
  caster.statusEffects.poison = { untilRound: 9, amount: 0, appliedRound: 1 };
  caster.statusEffects.sleep = { untilRound: 9 };
  Effects.tickStatuses(caster, 2, Effects.passiveModifiers([Skills.getSkill("poison_recovery"), Skills.getSkill("sleep_recovery")]));
  assert.equal(caster.hp, 100);
  assert.equal(caster.statusEffects.poison, undefined);
  assert.equal(caster.statusEffects.sleep, undefined);
});
