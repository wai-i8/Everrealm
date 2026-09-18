"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Social = require("./social.js");

test("social normalizers reject malformed data and keep canonical friend fields", () => {
  assert.equal(Social.normalizeFriend("", {}), null);
  assert.deepEqual(Social.normalizeFriend("friend-1", { name: " 阿明 ", threadId: "thread-a" }), {
    uid: "friend-1",
    name: "阿明",
    threadId: "thread-a",
    since: null,
  });
  assert.equal(Social.normalizeWhisper("m1", { uid: "a", toUid: "b", text: "", createdAt: 1 }), null);
  assert.deepEqual(Social.normalizeWhisper("m2", { uid: "a", toUid: "b", name: "甲", text: " hi ", createdAt: 10 }), {
    id: "m2",
    uid: "a",
    toUid: "b",
    name: "甲",
    text: "hi",
    createdAt: 10,
  });
});

test("whisper send repairs missing realtime membership once and retries", async () => {
  let setCalls = 0;
  const socialCalls = [];
  const firebase = {
    async firestore() {
      const sdk = {
        collection(_db, path) { return path; },
        onSnapshot(path, next) {
          if (path.endsWith("/friends")) {
            next({ docs: [{ id: "friend-b", data: () => ({ uid: "friend-b", name: "好友B", threadId: "thread-ab" }) }] });
          } else next({ docs: [] });
          return () => {};
        },
      };
      return { db: {}, sdk };
    },
    async realtime() {
      const sdk = {
        ref(_db, path) { return { path }; },
        async get() { return { val: () => 0 }; },
        query(ref) { return ref; },
        orderByChild() { return {}; },
        startAt() { return {}; },
        limitToLast() { return {}; },
        onChildAdded() { return () => {}; },
        push(ref) { return { path: `${ref.path}/generated`, key: `m${setCalls + 1}` }; },
        serverTimestamp() { return Date.now(); },
        async set() {
          setCalls += 1;
          if (setCalls === 1) throw new Error("permission-denied");
        },
      };
      return { database: {}, sdk };
    },
  };
  const serverApi = {
    async social(action, payload) {
      socialCalls.push({ action, payload });
      return { ok: true, threadId: "thread-ab" };
    },
  };
  const social = Social.create({ firebase, serverApi, sendCooldownMs: 1 });
  assert.equal(await social.start({ uid: "player-a", name: "玩家A" }), true);
  const result = await social.sendWhisper("friend-b", "你好");
  assert.equal(result.ok, true);
  assert.equal(setCalls, 2);
  assert.deepEqual(socialCalls, [{ action: "ensure-whisper", payload: { targetUid: "friend-b" } }]);
  social.stop();
});
