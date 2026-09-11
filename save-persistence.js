(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EverrealmSavePersistence = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const KEYS = Object.freeze({
    save: "everrealm-save-v1",
    legacy: Object.freeze(["lanternbound-save-v1"]),
    owner: "everrealm-save-owner-v1",
    cachePrefix: "everrealm-save-cache-v1:",
    legacyCache: "everrealm-save-cache-v1:legacy",
  });

  function clone(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function create(options = {}) {
    const storage = options.storage || (typeof localStorage !== "undefined" ? localStorage : null);
    const cloud = options.cloud || null;
    const sanitize = typeof options.sanitize === "function" ? options.sanitize : (value) => value;
    const applySaveData = typeof options.applySaveData === "function" ? options.applySaveData : () => false;
    const onStatus = typeof options.onStatus === "function" ? options.onStatus : () => {};
    let activeUid = null;
    let cloudReady = false;
    let cloudExists = false;
    let cloudData = null;
    let cloudStatus = "signed-out";
    let resolutionToken = 0;
    let pendingPayload = null;
    let pendingTimer = null;
    let cloudWrite = Promise.resolve({ saved: true, idle: true });
    let legacyDeclined = false;

    function setStatus(status, detail = null) {
      cloudStatus = status;
      onStatus(status, detail);
    }

    function getItem(key) {
      try { return storage?.getItem(key) ?? null; } catch (_) { return null; }
    }

    function removeItem(key) {
      try { storage?.removeItem(key); } catch (_) {}
    }

    function parseValid(key) {
      const raw = getItem(key);
      if (!raw) return null;
      try {
        const data = JSON.parse(raw);
        const normalized = sanitize(data);
        return normalized ? normalized : null;
      } catch (_) {
        return null;
      }
    }

    function readLegacySave() {
      for (const key of [KEYS.save, ...KEYS.legacy]) {
        const data = parseValid(key);
        if (data) return { data, key };
      }
      return null;
    }

    function storageKeys() {
      const keys = [];
      try {
        for (let index = 0; index < (storage?.length || 0); index += 1) {
          const key = storage.key(index);
          if (key) keys.push(key);
        }
      } catch (_) {}
      return keys;
    }

    function clearLegacyGameplayKeys() {
      for (const key of [KEYS.save, ...KEYS.legacy, KEYS.owner, KEYS.legacyCache]) removeItem(key);
      for (const key of storageKeys()) {
        if (key.startsWith(KEYS.cachePrefix)) removeItem(key);
      }
    }

    function scheduleCloudWrite() {
      if (pendingTimer != null || !pendingPayload || !activeUid || !cloudReady) return;
      pendingTimer = setTimeout(() => {
        pendingTimer = null;
        void flushCloud();
      }, 180);
    }

    function writeCloudPayload(uid, payload) {
      cloudWrite = cloudWrite.then(async () => {
        if (!activeUid || activeUid !== uid || !cloudReady) return { saved: false, skipped: true };
        try {
          let result;
          if (cloudExists) result = await cloud.save(uid, payload);
          else result = await cloud.createIfAbsent(uid, payload);

          if (!cloudExists && !result.created && result.data) {
            cloudData = clone(result.data);
            cloudExists = true;
            applySaveData(result.data, { silent: true, source: "cloud" });
            setStatus("cloud-ready");
            return { ...result, authoritative: true };
          }

          cloudData = clone(result.data || payload);
          cloudExists = true;
          setStatus("cloud-ready");
          return result;
        } catch (error) {
          pendingPayload = clone(payload);
          setStatus("cloud-error", error);
          return { saved: false, error };
        }
      });
      return cloudWrite;
    }

    async function flushCloud() {
      if (pendingTimer != null) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
      const payload = pendingPayload;
      pendingPayload = null;
      if (!payload) return cloudWrite;
      if (!activeUid || !cloudReady) {
        pendingPayload = payload;
        return { saved: false, error: new Error("An authenticated Firestore session is required to save.") };
      }
      return writeCloudPayload(activeUid, payload);
    }

    async function resolveUser(uid) {
      const safeUid = String(uid || "").trim();
      if (!safeUid) throw new Error("A Firebase UID is required.");
      const token = ++resolutionToken;
      activeUid = safeUid;
      cloudReady = false;
      cloudExists = false;
      cloudData = null;
      pendingPayload = null;
      legacyDeclined = false;
      setStatus("syncing");
      if (!cloud) {
        const error = new Error("Firebase Firestore is unavailable.");
        setStatus("cloud-error", error);
        return { status: "error", error };
      }

      let remote;
      try {
        remote = await cloud.load(safeUid);
      } catch (error) {
        if (token === resolutionToken) setStatus("cloud-error", error);
        return { status: "error", error };
      }
      if (token !== resolutionToken || activeUid !== safeUid) return { status: "stale" };

      if (remote.exists && remote.data) {
        cloudData = clone(remote.data);
        cloudExists = true;
        cloudReady = true;
        applySaveData(remote.data, { silent: true, source: "cloud" });
        setStatus("cloud-ready");
        return { status: "cloud-loaded", data: remote.data };
      }

      const legacy = readLegacySave();
      if (legacy && !legacyDeclined) {
        setStatus("legacy-claim");
        return { status: "legacy-claim", data: legacy.data };
      }

      cloudReady = true;
      setStatus("cloud-ready");
      return { status: "new-account" };
    }

    async function claimLegacySave(uid) {
      const safeUid = String(uid || activeUid || "").trim();
      if (!safeUid || activeUid !== safeUid || !cloud || cloudStatus === "signed-out") {
        throw new Error("The authenticated account changed before migration.");
      }
      const local = readLegacySave();
      if (!local) throw new Error("The legacy local save is no longer available to claim.");
      let migration;
      try {
        migration = await cloud.createIfAbsent(safeUid, local.data);
      } catch (error) {
        setStatus("cloud-error", error);
        throw error;
      }
      if (!migration.created && migration.data) {
        cloudData = clone(migration.data);
        cloudExists = true;
        cloudReady = true;
        applySaveData(migration.data, { silent: true, source: "cloud" });
        setStatus("cloud-ready");
        return { status: "cloud-loaded", data: migration.data, legacyPreserved: true };
      }
      cloudData = clone(migration.data || local.data);
      cloudExists = true;
      cloudReady = true;
      applySaveData(migration.data || local.data, { silent: true, source: "migration" });
      clearLegacyGameplayKeys();
      setStatus("cloud-ready");
      return { status: "local-migrated", data: migration.data || local.data };
    }

    function declineLegacySave() {
      legacyDeclined = true;
      cloudReady = true;
      setStatus("cloud-ready");
      return { status: "new-account" };
    }

    function save(data, { uid = activeUid } = {}) {
      const safeUid = String(uid || "").trim();
      if (!activeUid || !safeUid || safeUid !== activeUid || !cloudReady) {
        return { ok: false, error: new Error("An authenticated Firestore session is required to save.") };
      }
      pendingPayload = clone(data);
      scheduleCloudWrite();
      return { ok: true, queued: true };
    }

    function deactivateUser() {
      ++resolutionToken;
      activeUid = null;
      cloudReady = false;
      cloudExists = false;
      cloudData = null;
      pendingPayload = null;
      legacyDeclined = false;
      if (pendingTimer != null) clearTimeout(pendingTimer);
      pendingTimer = null;
      setStatus("signed-out");
    }

    return Object.freeze({
      KEYS,
      readLegacySave,
      hasLegacySave: () => Boolean(readLegacySave()?.data),
      clearLegacyGameplayKeys,
      save,
      resolveUser,
      claimLegacySave,
      declineLegacySave,
      flushCloud,
      deactivateUser,
      getActiveUid: () => activeUid,
      getCloudData: () => clone(cloudData),
      hasCloudSave: () => cloudExists,
      getCloudStatus: () => cloudStatus,
      isCloudReady: () => cloudReady,
    });
  }

  return Object.freeze({ KEYS, create });
});
