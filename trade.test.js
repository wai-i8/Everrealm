"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Trade = require("./trade.js");

test("trade offer normalizer merges duplicate lines and preserves two-step flags", () => {
  assert.deepEqual(Trade.normalizeOffer({
    coins: 120,
    items: [
      { kind: "inventory", id: "bright_feather", quantity: 2 },
      { kind: "inventory", id: "bright_feather", quantity: 3 },
    ],
    locked: true,
    confirmed: false,
  }), {
    coins: 120,
    items: [{ kind: "inventory", id: "bright_feather", quantity: 5 }],
    locked: true,
    confirmed: false,
  });
});

test("trade session normalizer resolves local and peer side", () => {
  const session = Trade.normalizeSession("trade-1", {
    status: "active",
    participants: {
      a: { uid: "a", name: "甲" },
      b: { uid: "b", name: "乙" },
    },
    offers: {
      a: { coins: 10, items: [], locked: true, confirmed: false },
      b: { coins: 20, items: [], locked: true, confirmed: true },
    },
  }, "b");
  assert.equal(session.side, "b");
  assert.equal(session.otherSide, "a");
  assert.deepEqual(session.peer, { uid: "a", name: "甲" });
  assert.equal(session.offers.b.confirmed, true);
});
