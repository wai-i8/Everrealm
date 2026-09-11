const test = require("node:test");
const assert = require("node:assert/strict");
const CloudSave = require("../cloud-save.js");

function fakeFirebase(initial = {}) {
  const documents = new Map(Object.entries(initial));
  const writes = [];
  const sdk = {
    doc: (_db, collection, uid) => ({ path: `${collection}/${uid}` }),
    getDoc: async (ref) => ({
      exists: () => documents.has(ref.path),
      data: () => documents.get(ref.path),
    }),
    serverTimestamp: () => ({ __serverTimestamp: true }),
    setDoc: async (ref, data) => {
      documents.set(ref.path, data);
      writes.push({ path: ref.path, data });
    },
    runTransaction: async (_db, callback) => {
      const pending = [];
      const transaction = {
        get: async (ref) => ({
          exists: () => documents.has(ref.path),
          data: () => documents.get(ref.path),
        }),
        set: (ref, data) => pending.push({ ref, data }),
      };
      const result = await callback(transaction);
      for (const { ref, data } of pending) {
        documents.set(ref.path, data);
        writes.push({ path: ref.path, data });
      }
      return result;
    },
  };
  return {
    firebase: { firestore: async () => ({ db: {}, sdk }) },
    documents,
    writes,
  };
}

test("cloud save reads and writes players/{uid} without persisting metadata as gameplay", async () => {
  const fake = fakeFirebase({
    "players/u1": { version: 1, player: { level: 4 }, updatedAt: "server", saveVersion: 99 },
  });
  const cloud = CloudSave.create({ firebase: fake.firebase });

  const loaded = await cloud.load("u1");
  assert.deepEqual(loaded, { exists: true, data: { version: 1, player: { level: 4 } } });
  const saved = await cloud.save("u1", { version: 1, player: { level: 5 }, updatedAt: "client", saveVersion: 3 });
  assert.deepEqual(saved.data, { version: 1, player: { level: 5 } });
  assert.equal(fake.writes.at(-1).path, "players/u1");
  assert.deepEqual(fake.writes.at(-1).data, {
    version: 1,
    player: { level: 5 },
    updatedAt: { __serverTimestamp: true },
  });
});

test("createIfAbsent is authoritative and does not overwrite an existing player", async () => {
  const fake = fakeFirebase({ "players/u1": { version: 1, player: { level: 9 } } });
  const cloud = CloudSave.create({ firebase: fake.firebase });
  const result = await cloud.createIfAbsent("u1", { version: 1, player: { level: 1 } });
  assert.equal(result.created, false);
  assert.deepEqual(result.data, { version: 1, player: { level: 9 } });
  assert.equal(fake.writes.length, 0);
});
