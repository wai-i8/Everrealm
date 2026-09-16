"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const ClassData = require("../data/classes.js");
const {
  classMaxHp,
  healingPotionResult,
  HEALING_POTION_HEAL,
} = require("./game-rules");

test("server HP formula matches current class table anchors", () => {
  assert.equal(classMaxHp("fighter", 1), 440);
  assert.equal(classMaxHp("warrior", 1), 440);
  assert.equal(classMaxHp("elementalist", 1), 440);
  assert.equal(classMaxHp("fighter", 6), (88 + 5 * 7 + 3) * 5);
  assert.equal(classMaxHp("warrior", 6), (88 + 5 * 8 + 4) * 5);
  assert.equal(classMaxHp("elementalist", 6), (88 + 5 * 6 + 2) * 5);
});

test("server HP formula stays identical to browser class data", () => {
  for (const classId of ClassData.CLASS_IDS) {
    for (let level = 1; level <= ClassData.LEVEL_CAP; level += 1) {
      assert.equal(classMaxHp(classId, level), ClassData.classStatsAtLevel(classId, level).maxHp, `${classId} lv${level}`);
    }
  }
});

test("healing potion consumes one and heals by the server rule", () => {
  const result = healingPotionResult({
    player: { level: 1, hp: 100, potions: 2 },
    expansion: { classId: "fighter" },
  });
  assert.equal(result.ok, true);
  assert.equal(result.healed, HEALING_POTION_HEAL);
  assert.deepEqual(result.player, { hp: 250, potions: 1, maxHp: 440 });
});

test("healing potion does not consume at full HP", () => {
  const result = healingPotionResult({
    player: { level: 1, hp: 440, potions: 2 },
    expansion: { classId: "fighter" },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "full");
  assert.equal(result.player.potions, 2);
});

test("healing potion does not consume when empty", () => {
  const result = healingPotionResult({
    player: { level: 1, hp: 100, potions: 0 },
    expansion: { classId: "fighter" },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "empty");
});
