"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Social = require("./social.js");

test("social normalizers keep friends, whisper peers and outgoing invite state canonical", () => {
  assert.equal(Social.normalizeFriend("", {}), null);
  assert.deepEqual(Social.normalizeFriend("friend-1", { name: " 阿明 ", threadId: "thread-a" }), {
    uid: "friend-1",
    name: "阿明",
    threadId: "thread-a",
    since: null,
  });
  assert.deepEqual(Social.normalizeWhisperPeer("peer-1", { name: " 路人 ", threadId: "thread-p", updatedAtMs: 9 }), {
    uid: "peer-1",
    name: "路人",
    threadId: "thread-p",
    updatedAtMs: 9,
  });
  assert.deepEqual(Social.normalizeOutgoingInvite({ type: "trade", targetUid: "b", targetName: "乙", referenceId: "t1", createdAtMs: 10 }), {
    type: "trade", targetUid: "b", targetName: "乙", referenceId: "t1", createdAtMs: 10,
  });
  assert.equal(Social.normalizeWhisper("m1", { uid: "a", toUid: "b", text: "", createdAt: 1 }), null);
});

test("whisper can bootstrap a non-friend peer and send immediately", async () => {
  let setCalls = 0;
  const socialCalls = [];
  const firebase = {
    async firestore() {
      const sdk = {
        collection(_db, path) { return { path, kind: "collection" }; },
        doc(_db, path) { return { path, kind: "doc" }; },
        onSnapshot(ref, next) {
          if (ref.kind === "doc") next({ exists: () => false, data: () => null });
          else next({ docs: [] });
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
        onValue() { return () => {}; },
        push(ref) { return { path: `${ref.path}/generated`, key: `m${setCalls + 1}` }; },
        serverTimestamp() { return Date.now(); },
        async set() { setCalls += 1; },
      };
      return { database: {}, sdk };
    },
  };
  const serverApi = {
    async social(action, payload) {
      socialCalls.push({ action, payload });
      if (action === "ensure-whisper") return { ok: true, threadId: "thread-ab", targetName: "陌生人B" };
      return { ok: true };
    },
  };
  const social = Social.create({ firebase, serverApi, sendCooldownMs: 1 });
  assert.equal(await social.start({ uid: "player-a", name: "玩家A" }), true);
  const result = await social.sendWhisper("player-b", "你好");
  assert.equal(result.ok, true);
  assert.equal(setCalls, 1);
  assert.deepEqual(socialCalls, [{ action: "ensure-whisper", payload: { targetUid: "player-b" } }]);
  assert.equal(social.getWhisperPeer("player-b").name, "陌生人B");
  social.stop();
});
