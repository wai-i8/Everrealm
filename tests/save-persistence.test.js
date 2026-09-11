const test = require("node:test");
const assert = require("node:assert/strict");
const SavePersistence = require("../save-persistence.js");

function storageWith(values = {}, failOn = null) {
  const data = new Map(Object.entries(values));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      if (key === failOn) throw new Error(`write blocked: ${key}`);
      data.set(key, String(value));
    },
    removeItem: (key) => data.delete(key),
  };
}

const save = (level) => ({ version: 1, player: { level }, expansion: { currentMapId: "world" } });
const sanitize = (value) => value?.version === 1 ? value : null;

test("legacy claim archives the old primary before ownership metadata and scopes the save", async () => {
  const storage = storageWith({ [SavePersistence.KEYS.save]: JSON.stringify(save(3)) });
  const calls = [];
  const cloud = {
    load: async () => ({ exists: false, data: null }),
    createIfAbsent: async (uid, payload) => {
      calls.push(["create", uid, payload.player.level]);
      return { created: true, data: payload };
    },
    save: async () => { throw new Error("unexpected update"); },
  };
  const applied = [];
  const persistence = SavePersistence.create({ storage, cloud, sanitize, applySaveData: (data) => applied.push(data) });

  const resolved = await persistence.resolveUser("u1");
  assert.equal(resolved.status, "legacy-claim");
  const claimed = await persistence.claimLegacySave("u1");
  assert.equal(claimed.status, "local-migrated");
  assert.equal(storage.getItem(SavePersistence.KEYS.owner), "u1");
  assert.equal(JSON.parse(storage.getItem(`${SavePersistence.KEYS.cachePrefix}u1`)).player.level, 3);
  assert.equal(JSON.parse(storage.getItem(SavePersistence.KEYS.save)).player.level, 3);
  assert.equal(JSON.parse(storage.getItem(SavePersistence.KEYS.legacyCache)).player.level, 3);
  assert.deepEqual(calls, [["create", "u1", 3]]);
  assert.equal(applied.at(-1).player.level, 3);
});

test("existing cloud data wins over an old local owner without uploading stale progress", async () => {
  const storage = storageWith({
    [SavePersistence.KEYS.save]: JSON.stringify(save(2)),
    [SavePersistence.KEYS.owner]: "old-user",
  });
  const cloud = {
    load: async (uid) => ({ exists: uid === "new-user", data: uid === "new-user" ? save(8) : null }),
    createIfAbsent: async () => { throw new Error("stale local must not create"); },
    save: async () => { throw new Error("stale local must not update"); },
  };
  const applied = [];
  const persistence = SavePersistence.create({ storage, cloud, sanitize, applySaveData: (data) => applied.push(data) });
  const result = await persistence.resolveUser("new-user");
  assert.equal(result.status, "cloud-loaded");
  assert.equal(applied.at(-1).player.level, 8);
  assert.equal(storage.getItem(SavePersistence.KEYS.owner), "new-user");
  assert.equal(JSON.parse(storage.getItem(`${SavePersistence.KEYS.cachePrefix}old-user`)).player.level, 2);
  assert.equal(JSON.parse(storage.getItem(SavePersistence.KEYS.save)).player.level, 8);
});

test("ownership write failure rolls back every earlier promotion write", async () => {
  const storage = storageWith({ [SavePersistence.KEYS.save]: JSON.stringify(save(4)) }, SavePersistence.KEYS.owner);
  const cloud = {
    load: async () => ({ exists: false, data: null }),
    createIfAbsent: async (_uid, payload) => ({ created: true, data: payload }),
    save: async () => { throw new Error("unexpected update"); },
  };
  const persistence = SavePersistence.create({ storage, cloud, sanitize });
  await persistence.resolveUser("u1");
  const result = await persistence.claimLegacySave("u1");
  assert.equal(result.localResult.ok, false);
  assert.equal(storage.getItem(SavePersistence.KEYS.owner), null);
  assert.equal(storage.getItem(`${SavePersistence.KEYS.cachePrefix}u1`), null);
  assert.equal(storage.getItem(SavePersistence.KEYS.legacyCache), null);
  assert.equal(JSON.parse(storage.getItem(SavePersistence.KEYS.save)).player.level, 4);
});

test("a new account saves only to its scoped local cache until cloud ownership succeeds", async () => {
  const storage = storageWith({
    [SavePersistence.KEYS.save]: JSON.stringify(save(2)),
    [SavePersistence.KEYS.owner]: "old-user",
  });
  let cloudPayload = null;
  const cloud = {
    load: async () => ({ exists: false, data: null }),
    createIfAbsent: async (_uid, payload) => { cloudPayload = payload; return { created: true, data: payload }; },
    save: async () => { throw new Error("not needed"); },
  };
  const persistence = SavePersistence.create({ storage, cloud, sanitize });
  await persistence.resolveUser("new-user");
  const result = persistence.save(save(7), { uid: "new-user" });
  assert.equal(result.ok, true);
  assert.equal(storage.getItem(SavePersistence.KEYS.owner), "old-user");
  assert.equal(JSON.parse(storage.getItem(SavePersistence.KEYS.save)).player.level, 2);
  await persistence.flushCloud();
  assert.equal(cloudPayload.player.level, 7);
  assert.equal(storage.getItem(SavePersistence.KEYS.owner), "new-user");
  assert.equal(JSON.parse(storage.getItem(SavePersistence.KEYS.save)).player.level, 7);
});
