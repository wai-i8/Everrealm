const test = require("node:test");
const assert = require("node:assert/strict");
const WorldTime = require("../world-time.js");

const config = {
  version: 1,
  epochRealTime: "2026-09-16T00:00:00.000Z",
  epochGameDay: 1,
  epochGameHour: 0,
  epochGameMinute: 0,
  realSecondsPerGameHour: 150,
};

test("WorldTime derives the confirmed minute/hour/day cadence from an epoch", () => {
  const epoch = Date.parse(config.epochRealTime);
  assert.equal(WorldTime.calculateTime(config, epoch).display, "Day 1   00:00");
  assert.equal(WorldTime.calculateTime(config, epoch + 2500).display, "Day 1   00:01");
  assert.equal(WorldTime.calculateTime(config, epoch + 150000).display, "Day 1   01:00");
  assert.equal(WorldTime.calculateTime(config, epoch + 3600000).display, "Day 2   00:00");
});

test("WorldTime exposes normalized day/hour/minute fields without a night rule", () => {
  const time = WorldTime.calculateTime(config, Date.parse(config.epochRealTime) + 2 * 2500 + 60 * 2500);
  assert.deepEqual({ day: time.day, hour: time.hour, minute: time.minute }, { day: 1, hour: 1, minute: 2 });
  assert.equal(typeof WorldTime.create({ firebase: null }).getTime, "function");
  assert.equal("isNight" in WorldTime, false);
});
