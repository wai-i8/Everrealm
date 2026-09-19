"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Party = require("./party.js");

test("party presentation anchors remote members around the local player without mutating true coordinates", () => {
  const party = { id: "p1", state: "idle", transition: null, battleId: "", memberUids: ["a", "b", "c"] };
  const local = { x: 100, y: 100, facing: "right", moving: true };
  const leaderTrue = { uid: "a", x: 12, y: 30, facing: "up", moving: false, kind: "remote-player" };
  const tailTrue = { uid: "c", x: 800, y: 700, facing: "left", moving: false, kind: "remote-player" };
  const leaderShown = Party.presentationRemote(leaderTrue, party, "b", local, 44);
  const tailShown = Party.presentationRemote(tailTrue, party, "b", local, 44);
  assert.equal(leaderShown.x, 144);
  assert.equal(leaderShown.y, 100);
  assert.equal(tailShown.x, 56);
  assert.equal(tailShown.y, 100);
  assert.equal(leaderShown.moving, true);
  assert.equal(leaderTrue.x, 12);
  assert.equal(tailTrue.x, 800);
});

test("party presentation makes every displayed teammate follow the local facing", () => {
  const party = { id: "p1", state: "idle", transition: null, battleId: "", memberUids: ["a", "b", "c"] };
  const local = { x: 200, y: 300, facing: "up", moving: false };
  const remote = { uid: "a", x: 10, y: 20, facing: "left", moving: true, kind: "remote-player" };
  const shown = Party.presentationRemote(remote, party, "b", local, 40);
  assert.equal(shown.facing, "up");
  assert.equal(shown.moving, false);
  assert.equal(remote.facing, "left");
});
