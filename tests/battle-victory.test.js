const test = require("node:test");
const assert = require("node:assert/strict");
const Victory = require("../game/battle-victory.js");
const xpRequired = (level) => level === 1 ? 100 : level === 2 ? 150 : 200;

test("same-level XP animates within one segment", () => {
  const segments = Victory.buildXpSegments({ beforeLevel: 1, beforeXp: 20, afterLevel: 1, afterXp: 70, levelCap: 40, xpRequired });
  assert.equal(segments.length, 1);
  assert.equal(segments[0].from, .2);
  assert.equal(segments[0].to, .7);
  const middle = Victory.progressAt(segments, .5);
  assert.equal(middle.level, 1);
  assert.equal(middle.xp, 45);
});

test("level-up XP uses a stable multi-segment timeline", () => {
  const segments = Victory.buildXpSegments({ beforeLevel: 1, beforeXp: 80, afterLevel: 2, afterXp: 45, levelCap: 40, xpRequired });
  assert.equal(segments.length, 2);
  assert.equal(segments[0].toXp, 100);
  assert.equal(segments[1].fromXp, 0);
  assert.equal(segments[1].toXp, 45);
  const end = Victory.progressAt(segments, 1);
  assert.equal(end.level, 2);
  assert.equal(end.xp, 45);
  assert.equal(Math.round(end.bar * 100), 30);
});

test("level cap displays a full bar", () => {
  const segments = Victory.buildXpSegments({ beforeLevel: 40, beforeXp: 0, afterLevel: 40, afterXp: 0, levelCap: 40, xpRequired });
  assert.equal(Victory.progressAt(segments, 1).bar, 1);
});
