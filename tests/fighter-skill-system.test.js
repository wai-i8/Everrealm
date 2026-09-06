const test = require("node:test");
const assert = require("node:assert/strict");
const Skills = require("../skill-core.js");
const FighterData = require("../fighter-skill-data.js");
const Tactics = require("../tactics-core.js");
const Effects = require("../fighter-effects.js");

const FACINGS = ["down", "right", "up", "left"];
const origin = { x: 5, y: 5 };

function worldFromRelative(relative, facing) {
  const [lateral, depth] = relative;
  if (facing === "right") return { x: origin.x + depth, y: origin.y + lateral };
  if (facing === "up") return { x: origin.x - lateral, y: origin.y - depth };
  if (facing === "left") return { x: origin.x - depth, y: origin.y - lateral };
  return { x: origin.x + lateral, y: origin.y + depth };
}

test("canonical Fighter catalog is the complete 65-skill source with explicit graph data", () => {
  const fighterSkills = Skills.getSkillsByClass("fighter");
  assert.equal(fighterSkills.length, 65);
  assert.deepEqual(fighterSkills.map((skill) => skill.id), FighterData.skills.map((skill) => skill.id));
  assert.equal(Skills.CLASS_STARTER_SKILLS.fighter[0], "kentotsu");
  assert.equal(Skills.getSkill("kentotsu").prerequisites.length, 0);
  assert.equal(Skills.getSkill("jinken").prerequisites[0], "kentotsu");
  assert.deepEqual(Skills.getSkill("jisa_kentotsu").prerequisites, ["rendan"]);
  assert.deepEqual(Skills.getSkill("choudankyaku").prerequisites, ["sen_no_sen", "tenpoukyaku"]);
  assert.deepEqual(Skills.getSkill("fuujin_kikoukyaku").prerequisites, ["gouhoukyaku", "kikoudan"]);
  assert.deepEqual(Skills.getSkill("lusedes_tan").prerequisites, ["byakkorendan", "gouhoukyaku"]);
  assert.deepEqual(Skills.getSkill("shuuki_hijutsu").prerequisites, ["shuukijutsu"]);
  assert.deepEqual(Skills.getSkill("kikouhou").prerequisites, ["kikoudan"]);
  assert.deepEqual(Skills.getSkill("kikou_sakuretsudan").prerequisites, ["gekikoudan"]);
  assert.deepEqual(Skills.getSkill("fudoushibari").prerequisites, ["mutouki"]);

  const positions = Object.fromEntries(fighterSkills.map((skill) => [skill.id, skill]));
  assert.deepEqual(
    [positions.kentotsu.treeColumn, positions.kentotsu.treeRow],
    [positions.jinken.treeColumn, positions.jinken.treeRow - 1],
  );
  assert.equal(Skills.validateSkillCatalog().ok, true);
});

test("all canonical range cells rotate exactly across the four facings", () => {
  for (const skill of Skills.getSkillsByClass("fighter")) {
    for (const facing of FACINGS) {
      for (const relative of skill.rangeCellsRelative || []) {
        const target = worldFromRelative(relative, facing);
        assert.equal(
          Skills.isTargetInRange(skill, origin, target, { facing }),
          true,
          `${skill.id} should accept ${JSON.stringify(relative)} while facing ${facing}`,
        );
      }
    }
  }
  assert.equal(Skills.isTargetInRange("kentotsu", origin, { x: 5, y: 3 }, { facing: "down" }), false);
  assert.equal(Skills.isTargetInRange("shincha_tenketsu", origin, origin, { facing: "down" }), false, "unknown source range stays unselectable");
});

test("height validation enforces finite limits, preserves uncertainty, and keeps down-unlimited true", () => {
  const heights = { "5,5": 0, "5,6": 1, "5,7": 2, "5,4": -1, "5,3": -100 };
  const context = { heightMap: heights };
  assert.equal(Skills.isSkillHeightValid("kentotsu", origin, { x: 5, y: 6 }, context), true);
  assert.equal(Skills.isSkillHeightValid("kentotsu", origin, { x: 5, y: 7 }, context), false);
  assert.equal(Skills.isSkillHeightValid("kentotsu", origin, { x: 5, y: 4 }, context), true);
  assert.equal(Skills.isSkillHeightValid("kentotsu", origin, { x: 5, y: 3 }, context), false);

  const ranged = Skills.getSkill("kikoudan");
  assert.equal(ranged.heightDifference.down, "unlimited");
  assert.equal(Skills.isSkillHeightValid(ranged, origin, { x: 5, y: 4 }, context), true);
  assert.equal(Skills.isSkillHeightValid(ranged, origin, { x: 5, y: 3 }, context), true);
  assert.equal(Skills.isSkillHeightValid(ranged, origin, { x: 5, y: 7 }, context), false);

  const uncertain = Skills.getSkill("fuujin_kikoukyaku");
  assert.equal(uncertain.heightDifference.down, "unlimited");
  assert.equal(Skills.isSkillHeightValid(uncertain, origin, { x: 5, y: 4 }, context), true);
  assert.equal(Skills.isSkillHeightValid(uncertain, origin, { x: 5, y: 6 }, context), false);
});

test("Fighter damage metadata uses AP totals, qualifying utility adjustment, and fixed exceptions", () => {
  const normal = Skills.getSkill("jinken");
  assert.ok(Math.abs(Skills.calculateSkillDamageMultiplier(normal) - Math.sqrt(6 / 3)) < 1e-4);
  assert.equal(Skills.calculateSkillDamageMultiplier("sunkei"), 1.9596);
  assert.equal(Skills.calculateSkillDamageMultiplier("jisa_kentotsu"), 1.222);
  assert.equal(Skills.calculateSkillDamageMultiplier("ruka_hanki_ken"), 0);
  assert.equal(Skills.getSkill("ruka_hanki_ken").damage.model.type, "set_remaining_hp_fraction");
  assert.equal(Skills.getSkill("ruka_kouitsu_ken").damage.model.type, "set_remaining_hp_value");
  assert.deepEqual(Skills.splitDamageLaterHits(5, 2), [2, 3]);
  assert.deepEqual(Skills.splitDamageLaterHits(8, 3), [2, 3, 3]);
  assert.deepEqual(Skills.splitDamageLaterHits(0, 5), [0, 0, 0, 0, 0]);
  for (const id of ["rendan", "korendan", "byakkorendan"]) {
    const skill = Skills.getSkill(id);
    assert.equal(skill.hitResolution.hit_judgement_mode, "each_hit");
    assert.equal(skill.hitResolution.recheck_attack_path_each_hit, true);
    assert.equal(skill.hitResolution.rounding_remainder_priority, "later_hits");
  }
  for (const id of ["lusedes_da", "lusedes_koku", "lusedes_tan"]) {
    assert.equal(Skills.getSkill(id).hitResolution.hit_judgement_mode, "initial_only");
    assert.equal(Skills.getSkill(id).hitResolution.recheck_attack_path_each_hit, false);
  }
});

test("shared facingOrthogonalPriority and traceAttackPath control real linear impact", () => {
  const expected = {
    down: [{ x: 5, y: 6 }, { x: 5, y: 7 }, { x: 6, y: 7 }],
    right: [{ x: 6, y: 5 }, { x: 7, y: 5 }, { x: 7, y: 6 }],
    up: [{ x: 5, y: 4 }, { x: 5, y: 3 }, { x: 4, y: 3 }],
    left: [{ x: 4, y: 5 }, { x: 3, y: 5 }, { x: 3, y: 4 }],
  };
  for (const facing of FACINGS) {
    assert.deepEqual(Tactics.facingOrthogonalPriority(origin, worldFromRelative([1, 2], facing), facing), expected[facing]);
  }

  const blocker = { id: "blocker", cell: { x: 5, y: 6 }, hp: 20, alive: true };
  const target = { id: "target", cell: { x: 6, y: 7 }, hp: 20, alive: true };
  const traced = Tactics.traceAttackPath({
    origin,
    target: target.cell,
    facing: "down",
    grid: Tactics.createGrid(10, 10),
    units: [blocker, target],
    actorId: "hero",
    deliveryMode: "linear",
  });
  assert.equal(traced.stoppedReason, "unit");
  assert.equal(traced.actualTarget.id, "blocker");
  assert.deepEqual(traced.firstImpactCell, blocker.cell);
  const pathless = Tactics.traceAttackPath({
    origin,
    target: target.cell,
    grid: Tactics.createGrid(10, 10, ["5,6"]),
    units: [blocker, target],
    actorId: "hero",
    deliveryMode: "pathless",
  });
  assert.equal(pathless.blocked, false);
  assert.equal(pathless.actualTarget, null);
});

test("canonical learning requires every parent and legacy saves remain readable", () => {
  const empty = Skills.createSkillState({ classId: "fighter", starterSkills: false, ensureStarter: false });
  assert.equal(Skills.skillLearnability(empty, "kentotsu", { starterSkills: false, ensureStarter: false }).status, "canLearn");
  assert.equal(Skills.skillLearnability(empty, "jinken", { starterSkills: false, ensureStarter: false }).status, "missingPrereq");
  const oneParent = Skills.normalizeSkillState({ classId: "fighter", starterSkills: false, unlockedSkillIds: ["sen_no_sen"] });
  assert.deepEqual(Skills.skillLearnability(oneParent, "choudankyaku").missingPrerequisites, ["tenpoukyaku"]);
  const bothParents = Skills.normalizeSkillState({ classId: "fighter", starterSkills: false, unlockedSkillIds: ["sen_no_sen", "tenpoukyaku"] });
  assert.equal(Skills.skillLearnability(bothParents, "choudankyaku").status, "canLearn");
  const legacy = Skills.normalizeSkillState({ classId: "fighter", unlockedSkillIds: ["straight_punch"], equippedSkillIds: ["straight_punch"] });
  assert.equal(Skills.skillLearnability(legacy, "jinken").status, "canLearn");
  assert.equal(legacy.equippedSkillIds[0], "straight_punch");
  assert.equal(Skills.getSkill("straight_punch").id, "straight_punch");
});

test("canonical utility effects execute status, feint, cleanse, poison and passive behavior", () => {
  const caster = { id: "hero", cell: { x: 1, y: 1 }, hp: 100, maxHp: 100, statusEffects: {} };
  const target = { id: "enemy", cell: { x: 2, y: 1 }, hp: 100, maxHp: 100, statusEffects: { guard: { untilRound: 1, amount: .4 } } };
  let outcome = Effects.applySkillEffects({
    skill: Skills.getSkill("jisa_kentotsu"), caster, targets: [target], units: [caster, target],
    grid: Tactics.createGrid(5, 5), round: 1, random: () => 0,
  });
  assert.equal(outcome.applied > 0, true);
  assert.equal(target.statusEffects.guard, undefined);

  outcome = Effects.applySkillEffects({
    skill: Skills.getSkill("dokushuken"), caster, targets: [target], units: [caster, target],
    grid: Tactics.createGrid(5, 5), round: 1, random: () => 0,
  });
  assert.equal(target.statusEffects.poison.untilRound, 6);
  assert.equal(caster.statusEffects.poison.untilRound, 2);
  assert.equal(Effects.isDisabled(target, 1), false);
  assert.equal(Effects.isDisabled(target, 7), false);

  target.statusEffects.paralysis = { untilRound: 3 };
  outcome = Effects.applySkillEffects({
    skill: Skills.getSkill("hijo_tenketsu"), caster, targets: [target], units: [caster, target],
    grid: Tactics.createGrid(5, 5), round: 1, random: () => 0,
  });
  assert.equal(outcome.applied > 0, true);
  assert.equal(target.statusEffects.paralysis, undefined);
  assert.equal(Effects.passiveModifiers([Skills.getSkill("psv_koushin_gekitai")]).attackMultiplier, 1.06);
});
