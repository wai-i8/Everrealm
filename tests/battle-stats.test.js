const test = require("node:test");
const assert = require("node:assert/strict");
const Tactics = require("../tactics-core.js");
const Skills = require("../skill-core.js");
const Effects = require("../fighter-effects.js");
const Expansion = require("../expansion-core.js");

test("canonical hit chance keeps accuracy above 100 until final clamp", () => {
  assert.equal(Tactics.calculateHitChance({ accuracy: 100, evasion: 0 }), 1);
  assert.equal(Tactics.calculateHitChance({ accuracy: 70, evasion: 0 }), .7);
  assert.equal(Tactics.calculateHitChance({ accuracy: 70, evasion: 10 }), .63);
  assert.equal(Tactics.calculateHitChance({ accuracy: 120, evasion: 20 }), .96);
  const over = Tactics.resolveHitChance({ accuracy: 150, evasion: 30 });
  assert.ok(Math.abs(over.rawHitChance - 1.05) < 1e-12);
  assert.equal(over.hitChance, 1);
  assert.equal(Tactics.calculateHitChance({ accuracy: -20, evasion: 0 }), 0);
  assert.equal(Tactics.resolveHitChance({ accuracyBonuses: [20], accuracyPenalties: [30], evasionBonuses: [10] }).effectiveAccuracy, 90);
});

test("battle RNG is deterministic and rollHit is injectable", () => {
  const first = Tactics.createSeededRng("battle:test");
  const second = Tactics.createSeededRng("battle:test");
  assert.deepEqual([first(), first(), first()], [second(), second(), second()]);
  assert.equal(Tactics.rollHit({ accuracy: 70 }, () => .69).hit, true);
  assert.equal(Tactics.rollHit({ accuracy: 70 }, () => .70).hit, false);
});

test("PSVs preserve accuracy/evasion and convert category defense to generic DEF", () => {
  const passives = [
    "psv_tesshin", "psv_ukimi", "psv_koushin", "psv_shintou_mekkyaku", "psv_seishin_touitsu",
    "psv_soshin_sokutai", "psv_hishin_jutai", "psv_koushin_gekitai", "psv_boushin_goutai", "psv_sokushin_keitai",
  ].map((id) => Skills.getSkill(id));
  const modifiers = Effects.passiveModifiers(passives);
  assert.equal(modifiers.typedDefence, undefined);
  assert.ok(modifiers.defenceMultiplier > 1);
  assert.ok(modifiers.accuracy > 0);
  assert.ok(modifiers.evasion > 0);
  assert.ok(modifiers.attackMultiplier > 1);
  assert.ok(modifiers.speedBonus > 0);
  for (const id of ["psv_tesshin", "psv_ukimi", "psv_koushin", "psv_shintou_mekkyaku", "psv_seishin_touitsu"]) {
    assert.equal(Skills.getSkill(id).effects[0].stat, "defence");
  }
});

test("weight and Skill Speed both affect canonical action order", () => {
  const sameSkill = Skills.orderActionsBySpeed([
    { actorId: "heavy", speedGrade: "B", weight: 8, initiative: 10 },
    { actorId: "light", speedGrade: "B", weight: 2, initiative: 10 },
  ]);
  assert.deepEqual(sameSkill.map((entry) => entry.actorId), ["light", "heavy"]);
  const speed = Skills.orderActionsBySpeed([
    { actorId: "slow", speedGrade: "D", weight: 0, initiative: 99 },
    { actorId: "fast", speedGrade: "B", weight: 0, initiative: 1 },
  ]);
  assert.deepEqual(speed.map((entry) => entry.actorId), ["fast", "slow"]);
  const accelerated = Skills.orderActionsBySpeed([
    { actorId: "base", speedGrade: "C", actionSpeedBonus: 0 },
    { actorId: "psv", speedGrade: "C", actionSpeedBonus: 1 },
  ]);
  assert.deepEqual(accelerated.map((entry) => entry.actorId), ["psv", "base"]);
});

test("equipment stats include Weight, Accuracy, Evasion and one explicit Move owner", () => {
  const catalog = Expansion.normalizeEquipmentCatalog([
    { id: "full", slot: "upperBody", occupiesSlots: ["upperBody", "lowerBody"], stats: { attack: 4, defense: 3, accuracy: 5, evasion: 2, weight: 7, moveRange: 1 } },
    { id: "boots", slot: "feet", stats: { weight: 1, moveRange: 1 } },
  ]);
  const totals = Expansion.equipmentStats({ upperBody: "full", lowerBody: "full", feet: "boots" }, catalog);
  assert.deepEqual(totals, { attack: 4, defense: 3, maxHp: 0, speed: 0, critChance: 0, moveRange: 2, accuracy: 5, evasion: 2, weight: 8 });
  assert.equal(Expansion.classStatsAtLevel("fighter", 1).moveRange, 5);
  assert.equal(Expansion.classStatsAtLevel("fighter", 40).attack, 14);
  assert.equal(Expansion.classStatsAtLevel("fighter", 40).defence, 2);
  assert.ok(Expansion.classStatsAtLevel("fighter", 40).maxHp > 88);
});

test("pending actions accumulate Interrupt against Skill Durability", () => {
  const action = Tactics.createPendingAction({ actorId: "b", skillDurability: 10 });
  Tactics.applyInterrupt(action, 6);
  assert.equal(action.accumulatedInterrupt, 6);
  assert.equal(action.remainingSkillDurability, 4);
  assert.equal(Tactics.isPendingActionInterrupted(action), false);
  Tactics.applyInterrupt(action, 6);
  assert.equal(Tactics.isPendingActionInterrupted(action), true);
  const immediate = Tactics.createPendingAction({ actorId: "c", skillDurability: 6 });
  Tactics.applyInterrupt(immediate, 6);
  assert.equal(immediate.status, "interrupted");
});

test("pending actions without durability remain executable", () => {
  const action = Tactics.createPendingAction({ actorId: "hero", skillId: "quick_slash", skillDurability: null });
  assert.equal(action.skillDurability, null);
  assert.equal(Tactics.isPendingActionInterrupted(action), false);
  assert.equal(Tactics.revalidatePendingAction(action, {
    actor: { id: "hero", alive: true, hp: 10 },
  }).ok, true);
});

test("pending action revalidation cancels stale adjacent attacks but preserves legal displacement", () => {
  const actor = { id: "b", alive: true, hp: 10, cell: { x: 1, y: 0 }, facing: "right" };
  const target = { id: "a", alive: true, hp: 10, cell: { x: 2, y: 0 } };
  const range = ({ actor: currentActor, target: currentTarget }) => Tactics.manhattan(currentActor.cell, currentTarget.cell) <= 1;
  const adjacent = Tactics.createPendingAction({ actorId: "b", targetId: "a", targetCell: target.cell, deliveryMode: "linear", skillDurability: 10 });
  Tactics.applyInterrupt(adjacent, 6);
  actor.cell = { x: 0, y: 0 };
  const invalid = Tactics.revalidatePendingAction(adjacent, { actor, target, units: [actor, target], rangeResolver: range });
  assert.equal(adjacent.interrupted, false);
  assert.equal(invalid.reason, "out-of-range");
  const legal = Tactics.createPendingAction({ actorId: "b", targetId: "a", targetCell: target.cell, skillDurability: 10 });
  const stillLegal = Tactics.revalidatePendingAction(legal, { actor, target, rangeResolver: ({ actor: currentActor, target: currentTarget }) => Tactics.manhattan(currentActor.cell, currentTarget.cell) <= 2 });
  assert.equal(stillLegal.ok, true);

  actor.cell = { x: 1, y: 1 };
  actor.facing = "right";
  target.cell = { x: 1, y: 0 };
  const sideAlias = Tactics.createPendingAction({ actorId: "b", targetId: "a", targetCell: target.cell, rangeMax: 1, rangeMin: 1, targetArc: ["front", "left", "right"] });
  const sideResult = Tactics.revalidatePendingAction(sideAlias, {
    actor,
    target,
    rangeResolver: ({ action, actor: currentActor, target: currentTarget }) => {
      if (!Tactics.isInAttackRange(currentActor.cell, currentTarget.cell, action.rangeMax, action.rangeMin)) return false;
      const relative = Tactics.relativePosition(currentActor.cell, currentActor.facing, currentTarget.cell);
      return action.targetArc.includes(relative) || (relative === "side" && action.targetArc.some((value) => ["side", "left", "right"].includes(value)));
    },
  });
  assert.equal(sideResult.ok, true);
});

test("knockback revalidates a queued Fighter skill from the actor's current cell", () => {
  const grid = Tactics.createGrid(8, 8);
  const skill = Skills.getSkill("sunkei");
  const target = { id: "a", side: "ally", alive: true, hp: 40, cell: { x: 1, y: 2 } };
  const actor = { id: "b", side: "enemy", alive: true, hp: 40, cell: { x: 2, y: 2 }, facing: "left" };
  const validate = (action) => Tactics.revalidatePendingAction(action, {
    actor,
    target,
    units: [actor, target],
    grid,
    rangeResolver: ({ actor: currentActor, target: currentTarget }) => Skills.validateSkillTarget(skill, currentActor.cell, currentTarget.cell, {
      grid,
      facing: currentActor.facing,
      actorTeam: currentActor.side,
      actorId: currentActor.id,
      targetUnit: currentTarget,
    }).ok,
  });

  const pending = Tactics.createPendingAction({
    actorId: actor.id,
    targetId: target.id,
    targetCell: target.cell,
    skillId: skill.id,
    deliveryMode: skill.deliveryMode,
    skillDurability: skill.durability,
  });
  Tactics.applyInterrupt(pending, 1);
  assert.equal(pending.interrupted, false, "the queued action survives below its Durability threshold");

  // A resolves first with knockback; B must not use the old adjacent cell.
  actor.cell = { x: 3, y: 2 };
  assert.equal(validate(pending).reason, "out-of-range");
  assert.equal(pending.interrupted, false);

  // Displacement alone is not a blanket cancellation: a new position that
  // still has the target in 寸勁's current legal geometry remains executable.
  actor.cell = { x: 3, y: 3 };
  actor.facing = "left";
  target.cell = { x: 2, y: 3 };
  const stillLegal = Tactics.createPendingAction({
    actorId: actor.id,
    targetId: target.id,
    targetCell: target.cell,
    skillId: skill.id,
    deliveryMode: skill.deliveryMode,
    skillDurability: skill.durability,
  });
  assert.equal(validate(stillLegal).ok, true);
});

test("generic ATK/DEF damage ignores obsolete category fields", () => {
  const skill = Skills.getSkill("kentotsu");
  const multiplier = Skills.calculateSkillDamageMultiplier(skill);
  const plain = Tactics.calculateDamage({ attack: 20 }, { defence: 4 }, { multiplier });
  const legacy = Tactics.calculateDamage({ attack: 20, slashAttack: 999, magicAttack: 999 }, { defence: 4, slashDefense: 999, elementalDefense: 999 }, { multiplier });
  assert.equal(plain, legacy);
});
