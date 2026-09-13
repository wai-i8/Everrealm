const test = require("node:test");
const assert = require("node:assert/strict");
const Skills = require("../skill-core.js");

test("debug helpers grant every current-class manual and build an idempotent god-mode state", () => {
  const base = Skills.createSkillState({ classId: "fighter" });
  const fighterSkills = Skills.getSkillsByClass("fighter");
  const granted = Skills.grantAllSkillManuals(base, 2);

  assert.equal(granted.ok, true);
  assert.equal(granted.skillIds.length, fighterSkills.length);
  assert.equal(Object.keys(granted.state.manualCounts).length, fighterSkills.length);
  assert.equal(granted.state.manualCounts[fighterSkills[0].id], 2);
  assert.equal(granted.state.manualCounts.quick_slash, undefined);

  const god = Skills.createGodModeSkillState(granted.state);
  assert.equal(god.ok, true);
  assert.deepEqual(god.state.unlockedSkillIds, fighterSkills.map((skill) => skill.id));
  assert.equal(god.state.deckCapacity, Skills.MAX_EQUIPPED_SKILLS);
  assert.equal(god.state.deckSlots.length, Skills.MAX_EQUIPPED_SKILLS);
  assert.equal(god.state.manualCounts[fighterSkills[0].id], 2);
  assert.equal(god.state.masteryShards, 999999);
  assert.deepEqual(Skills.createGodModeSkillState(god.state).state, god.state);
});
