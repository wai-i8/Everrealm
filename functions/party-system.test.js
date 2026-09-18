"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Party = require("./party-system");

test("removeMember transfers leader and removes member record", () => {
  const next = Party.removeMember({ leaderUid: "a", memberUids: ["a", "b", "c"], members: { a: {}, b: {}, c: {} } }, "a");
  assert.deepEqual(next.memberUids, ["b", "c"]);
  assert.equal(next.leaderUid, "b");
  assert.equal(next.members.a, undefined);
});

test("forced wilderness death uses existing 5 percent death penalty and can lose levels", () => {
  const save = { player: { hp: 10, level: 2, xp: 2 }, expansion: { classId: "fighter" } };
  const result = Party.applyForcedWildernessDeath(save);
  assert.equal(result.ok, true);
  assert.equal(result.state.player.hp, 1);
  assert.equal(result.state.player.level, 1);
  assert.ok(result.penalty > 0);
  assert.ok(result.levelsLost >= 1);
});

test("allActiveSubmitted ignores dead and retreated members", () => {
  const battle = {
    memberUids: ["a", "b", "c"],
    members: {
      a: { hp: 10, alive: true },
      b: { hp: 0, alive: false },
      c: { hp: 10, alive: true, retreated: true },
    },
    movePlans: { a: { commands: [] } },
  };
  assert.equal(Party.allActiveSubmitted(battle, "movePlans"), true);
});
