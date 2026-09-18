"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const ServerApi = require("./server-api.js");

test("Step 9C server API attaches the current exploration position to protected commands", async () => {
  const calls = [];
  const firebase = {
    async functions() {
      return {
        functions: {},
        sdk: {
          httpsCallable(_functions, name) {
            return async (payload) => {
              calls.push({ name, payload });
              return { data: { ok: true } };
            };
          },
        },
      };
    },
  };
  const api = ServerApi.create({
    firebase,
    positionProvider: () => ({ mapId: "guild", x: 1666, y: 700 }),
  });

  await api.quest("accept", { commissionId: "guild_hunt_chick_1star" });
  await api.economy("buy-equipment", { itemId: "example" });
  await api.battle("start", { monsterType: "chick" });
  await api.recoverPlayer("clinic");

  assert.equal(calls.length, 4);
  for (const call of calls) {
    assert.deepEqual(call.payload.position, { mapId: "guild", x: 1666, y: 700 });
  }
});

test("social commands use the dedicated callable without leaking exploration position", async () => {
  const calls = [];
  const firebase = {
    async functions() {
      return {
        functions: {},
        sdk: {
          httpsCallable(_functions, name) {
            return async (payload) => {
              calls.push({ name, payload });
              return { data: { ok: true } };
            };
          },
        },
      };
    },
  };
  const api = ServerApi.create({
    firebase,
    positionProvider: () => ({ mapId: "guild", x: 1, y: 2 }),
  });

  await api.social("send-friend-request", { targetUid: "friend-b" });
  assert.deepEqual(calls, [{
    name: "socialCommand",
    payload: { version: 1, action: "send-friend-request", targetUid: "friend-b" },
  }]);
});
