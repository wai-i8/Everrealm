const test = require("node:test");
const assert = require("node:assert/strict");
const SavePersistence = require("../save-persistence.js");

function storageWith(values = {}) {
  const data = new Map(Object.entries(values));
  return {
    data,
    get length() { return data.size; },
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

const save = (level) => ({ version: 1, player: { level }, expansion: { currentMapId: "world" } });
const sanitize = (value) => value?.version === 1 ? value : null;

function fakeCloud({ remote = null, createResult = null, saveResult = null, failCreate = null, failSave = null } = {}) {
  const calls = [];
  return {
    calls,
    load: async (uid) => {
      calls.push(["load", uid]);
      return remote ? { exists: true, data: remote } : { exists: false, data: null };
    },
    createIfAbsent: async (uid, payload) => {
      calls.push(["createIfAbsent", uid, payload]);
      if (failCreate) throw failCreate;
      return createResult || { created: true, data: payload };
    },
    save: async (uid, payload) => {
      calls.push(["save", uid, payload]);
      if (failSave) throw failSave;
      return saveResult || { saved: true, data: payload };
    },
  };
}

test("signed-out persistence refuses saves and never writes gameplay localStorage", async () => {
  const storage = storageWith();
  const cloud = fakeCloud();
  const persistence = SavePersistence.create({ storage, cloud, sanitize });

  const result = persistence.save(save(1));
  assert.equal(result.ok, false);
  assert.equal((await persistence.flushCloud()).idle, true);
  assert.equal(storage.data.size, 0);
  assert.equal(cloud.calls.length, 0);
});

test("new authenticated account saves directly to players/{uid} without a local mirror", async () => {
  const storage = storageWith({ "everrealm-sound": "0.5", "everrealm-zoom": "mid" });
  const cloud = fakeCloud();
  const persistence = SavePersistence.create({ storage, cloud, sanitize });

  assert.equal((await persistence.resolveUser("USER_A")).status, "new-account");
  const queued = persistence.save(save(2), { uid: "USER_A" });
  assert.equal(queued.ok, true);
  const flushed = await persistence.flushCloud();
  assert.equal(flushed.created, true);
  assert.deepEqual(cloud.calls[1].slice(0, 2), ["createIfAbsent", "USER_A"]);
  assert.equal(cloud.calls[1][2].player.level, 2);
  assert.equal(persistence.hasCloudSave(), true);
  assert.equal(storage.getItem(SavePersistence.KEYS.save), null);
  assert.equal(storage.getItem("everrealm-sound"), "0.5");
  assert.equal(storage.getItem("everrealm-zoom"), "mid");
});

test("existing cloud data wins over legacy local data on account resolution", async () => {
  const storage = storageWith({ [SavePersistence.KEYS.save]: JSON.stringify(save(2)) });
  const cloud = fakeCloud({ remote: save(8) });
  const applied = [];
  const persistence = SavePersistence.create({ storage, cloud, sanitize, applySaveData: (data) => applied.push(data) });

  const result = await persistence.resolveUser("USER_A");
  assert.equal(result.status, "cloud-loaded");
  assert.equal(applied.at(-1).player.level, 8);
  assert.equal(persistence.getCloudData().player.level, 8);
  assert.equal(storage.getItem(SavePersistence.KEYS.save) !== null, true);
  assert.equal(cloud.calls.some(([name]) => name === "createIfAbsent"), false);
});

test("legacy local save requires an explicit migration choice", async () => {
  const storage = storageWith({ [SavePersistence.KEYS.save]: JSON.stringify(save(3)) });
  const cloud = fakeCloud();
  const applied = [];
  const persistence = SavePersistence.create({ storage, cloud, sanitize, applySaveData: (data) => applied.push(data) });

  const resolved = await persistence.resolveUser("USER_A");
  assert.equal(resolved.status, "legacy-claim");
  assert.equal(applied.length, 0);
  assert.equal(cloud.calls.some(([name]) => name === "createIfAbsent"), false);
  assert.equal(persistence.declineLegacySave().status, "new-account");
  assert.equal(storage.getItem(SavePersistence.KEYS.save) !== null, true);
});

test("successful legacy migration sanitizes, creates only if absent, and deletes gameplay keys", async () => {
  const storage = storageWith({
    [SavePersistence.KEYS.save]: JSON.stringify(save(4)),
    [SavePersistence.KEYS.legacy[0]]: JSON.stringify(save(5)),
    [SavePersistence.KEYS.owner]: "old-user",
    [`${SavePersistence.KEYS.cachePrefix}old-user`]: JSON.stringify(save(6)),
    "everrealm-sound": "0.7",
    "everrealm-zoom": "near",
  });
  const cloud = fakeCloud();
  const applied = [];
  const persistence = SavePersistence.create({ storage, cloud, sanitize, applySaveData: (data) => applied.push(data) });

  assert.equal((await persistence.resolveUser("USER_A")).status, "legacy-claim");
  const result = await persistence.claimLegacySave("USER_A");
  assert.equal(result.status, "local-migrated");
  assert.equal(applied.at(-1).player.level, 4);
  assert.equal(cloud.calls[1][0], "createIfAbsent");
  for (const key of [SavePersistence.KEYS.save, ...SavePersistence.KEYS.legacy, SavePersistence.KEYS.owner, `${SavePersistence.KEYS.cachePrefix}old-user`]) {
    assert.equal(storage.getItem(key), null, `${key} should be removed after migration`);
  }
  assert.equal(storage.getItem("everrealm-sound"), "0.7");
  assert.equal(storage.getItem("everrealm-zoom"), "near");
});

test("failed legacy migration preserves the old save and allows retry", async () => {
  const storage = storageWith({ [SavePersistence.KEYS.save]: JSON.stringify(save(7)) });
  const cloud = fakeCloud({ failCreate: new Error("Firestore unavailable") });
  const persistence = SavePersistence.create({ storage, cloud, sanitize });

  await persistence.resolveUser("USER_A");
  await assert.rejects(() => persistence.claimLegacySave("USER_A"), /Firestore unavailable/);
  assert.equal(storage.getItem(SavePersistence.KEYS.save) !== null, true);
  assert.equal(persistence.getCloudStatus(), "cloud-error");
});

test("Firestore write failure keeps the payload retryable in memory without local fallback", async () => {
  const storage = storageWith();
  const cloud = fakeCloud({ failCreate: new Error("write blocked") });
  const statuses = [];
  const persistence = SavePersistence.create({ storage, cloud, sanitize, onStatus: (status) => statuses.push(status) });

  await persistence.resolveUser("USER_A");
  assert.equal(persistence.save(save(9), { uid: "USER_A" }).ok, true);
  const result = await persistence.flushCloud();
  assert.equal(result.saved, false);
  assert.equal(statuses.at(-1), "cloud-error");
  assert.equal(storage.getItem(SavePersistence.KEYS.save), null);
  assert.equal(storage.getItem(`${SavePersistence.KEYS.cachePrefix}USER_A`), null);
});

test("a stale UID cannot queue a save for another authenticated account", async () => {
  const persistence = SavePersistence.create({ storage: storageWith(), cloud: fakeCloud(), sanitize });
  await persistence.resolveUser("USER_A");
  assert.equal(persistence.save(save(1), { uid: "USER_B" }).ok, false);
});
