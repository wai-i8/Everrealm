"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const ClassData = require("../data/classes.js");
const Expansion = require("../expansion-core.js");
const {
  classMaxHp,
  xpRequired,
  loseExperience,
  healingPotionResult,
  weakPotionResult,
  clinicHealResult,
  reviveResult,
  HEALING_POTION_HEAL,
  WEAK_POTION_TOTAL_STEPS,
} = require("./game-rules");

test("server HP formula matches current class table anchors", () => {
  assert.equal(classMaxHp("fighter", 1), 440);
  assert.equal(classMaxHp("elementalist", 1), 440);
  assert.equal(classMaxHp("fighter", 6), (88 + 5 * 7 + 3) * 5);
  assert.equal(classMaxHp("elementalist", 6), (88 + 5 * 6 + 2) * 5);
});

test("retired Warrior saves use the Fighter HP table during migration", () => {
  assert.equal(classMaxHp("warrior", 6), classMaxHp("fighter", 6));
});

test("server HP formula stays identical to browser class data", () => {
  for (const classId of ClassData.CLASS_IDS) {
    for (let level = 1; level <= ClassData.LEVEL_CAP; level += 1) {
      assert.equal(classMaxHp(classId, level), ClassData.classStatsAtLevel(classId, level).maxHp, `${classId} lv${level}`);
    }
  }
});

test("server XP requirements and loss stay identical to browser rules", () => {
  for (let level = 1; level <= ClassData.LEVEL_CAP; level += 1) {
    assert.equal(xpRequired(level), Expansion.xpRequired(level), `xpRequired lv${level}`);
    for (const xp of [0, Math.floor(xpRequired(level) / 2), Math.max(0, xpRequired(level) - 1)]) {
      const amount = Math.max(1, Math.round(xpRequired(level) * 0.05));
      assert.deepEqual(loseExperience(level, xp, amount), Expansion.loseExperience(level, xp, amount), `loseExperience lv${level} xp${xp}`);
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

test("weak potion consumes exactly one and resets its server-side travel budget", () => {
  const result = weakPotionResult({
    expansion: {
      inventory: { weak_potion: 2 },
      weakPotion: { stepsRemaining: 13, distanceRemainder: 8 },
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.inventory.quantity, 1);
  assert.equal(result.weakPotion.stepsRemaining, WEAK_POTION_TOTAL_STEPS);
  assert.equal(result.weakPotion.distanceRemainder, 0);
});

test("weak potion is rejected when inventory is empty", () => {
  const result = weakPotionResult({ expansion: { inventory: {} } });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "empty");
});

test("clinic healing only succeeds while the save is in the clinic", () => {
  const ok = clinicHealResult({
    player: { level: 8, hp: 12 },
    expansion: { classId: "fighter", currentMapId: "clinic" },
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.player.hp, classMaxHp("fighter", 8));

  const rejected = clinicHealResult({
    player: { level: 8, hp: 12 },
    expansion: { classId: "fighter", currentMapId: "world" },
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "wrong-map");
});

test("revive applies the server XP penalty and chooses the correct HP", () => {
  const save = {
    player: { level: 10, xp: 100, hp: 0 },
    expansion: { classId: "fighter" },
  };
  const here = reviveResult(save, { returnToTown: false });
  const town = reviveResult(save, { returnToTown: true });
  const expectedLoss = Expansion.loseExperience(10, 100, Math.max(1, Math.round(Expansion.xpRequired(10) * 0.05)));

  assert.equal(here.ok, true);
  assert.equal(here.player.hp, 1);
  assert.equal(here.player.level, expectedLoss.level);
  assert.equal(here.player.xp, expectedLoss.xp);
  assert.equal(town.player.hp, classMaxHp("fighter", expectedLoss.level));
});

test("revive rejects a player whose saved HP is still above zero", () => {
  const result = reviveResult({
    player: { level: 5, xp: 0, hp: 1 },
    expansion: { classId: "fighter" },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "not-dead");
});
