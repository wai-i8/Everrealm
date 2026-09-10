const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Skills = require("../skill-core.js");

const root = path.resolve(__dirname, "..");
const gameSource = fs.readFileSync(path.join(root, "game.js"), "utf8");
const responsiveCss = fs.readFileSync(path.join(root, "responsive-ui-redesign.css"), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("explicitly empty deck remains empty after normalization", () => {
  const learned = Skills.getSkillsByClass("fighter").filter((skill) => !skill.tags.includes("passive")).slice(0, 4).map((skill) => skill.id);
  const state = Skills.normalizeSkillState({
    classId: "fighter",
    unlockedSkillIds: learned,
    deckCapacity: 6,
    deckSlots: [null, null, null, null, null, null],
  });
  assert.deepEqual(state.deckSlots, [null, null, null, null, null, null]);
  assert.deepEqual(state.equippedSkillIds, []);
});

test("slot-targeted equip replaces occupants and moves an already configured skill", () => {
  const learned = Skills.getSkillsByClass("fighter").filter((skill) => !skill.tags.includes("passive")).slice(0, 3).map((skill) => skill.id);
  let state = Skills.normalizeSkillState({
    classId: "fighter",
    unlockedSkillIds: learned,
    deckCapacity: 6,
    deckSlots: [learned[0], learned[1], null, null, null, null],
  });
  let result = Skills.equipSkill(state, learned[2], 1);
  assert.equal(result.ok, true);
  state = result.state;
  assert.equal(state.deckSlots[1], learned[2]);
  assert.equal(state.equippedSkillIds.includes(learned[1]), false);

  result = Skills.equipSkill(state, learned[2], 4);
  assert.equal(result.ok, true);
  assert.equal(result.state.deckSlots[1], null);
  assert.equal(result.state.deckSlots[4], learned[2]);
});

test("deck UI is a persistent learned-skill library with pointer drag/drop", () => {
  const renderSource = extractFunction(gameSource, "renderDeckFacility");
  assert.match(renderSource, /id="deckLearnedHeading">技能<\/h3>/);
  assert.match(renderSource, /id="deckCurrentHeading">面板<\/h3>/);
  assert.match(renderSource, /data-deck-drag-source="library"/);
  assert.match(renderSource, /data-deck-drag-source="slot"/);
  assert.doesNotMatch(renderSource, /deck-slot-number|deck-capacity|裝入|卸下|已裝/);
  assert.doesNotMatch(renderSource, /filter\(\(skill\) => !equipped\.has/);

  assert.match(gameSource, /facilityContent\.addEventListener\("pointerdown", beginDeckDrag\)/);
  assert.match(gameSource, /facilityContent\.addEventListener\("pointermove", moveDeckDrag\)/);
  assert.match(gameSource, /facilityContent\.addEventListener\("pointerup", finishDeckDrag\)/);
  assert.match(gameSource, /Skills\.equipSkill\(skillState, skillId, slotIndex\)/);
  assert.match(gameSource, /source === "slot" && !droppedInsideCurrentPanel/);
});

test("deck layout stays two-column, centered, compact, and scrolls only when needed", () => {
  assert.match(responsiveCss, /data-facility-tab="deck"[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(responsiveCss, /\.deck-region-heading h3\s*\{[\s\S]*?text-align:\s*center/);
  assert.match(responsiveCss, /\.deck-skill-list\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(responsiveCss, /data-facility-tab="deck"[^\n]*#facilityHelpButton/);
  assert.match(responsiveCss, /\.deck-skill-choice,[\s\S]*?\.deck-slot\s*\{[\s\S]*?height:\s*3\.05rem/);
  assert.match(responsiveCss, /\.skill-kind-badge b\s*\{[\s\S]*?\.9rem\/1/);
});

test("deck skill cards are edge-to-edge compact rows", () => {
  const finalRuleStart = responsiveCss.lastIndexOf('.facility-overlay[data-facility-tab="deck"] .deck-skill-choice,');
  const finalRuleEnd = responsiveCss.indexOf("\n}", finalRuleStart) + 2;
  const finalRule = responsiveCss.slice(finalRuleStart, finalRuleEnd);
  assert.match(finalRule, /min-height:\s*1\.42rem !important/);
  assert.match(finalRule, /height:\s*1\.42rem !important/);
  assert.match(finalRule, /padding:\s*0 !important/);
  assert.match(responsiveCss, /\.facility-overlay\[data-facility-tab="deck"\] \.deck-skill-list,[\s\S]*?\.deck-slot-list\s*\{[\s\S]*?gap:\s*0 !important/);
});
