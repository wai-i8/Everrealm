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
    let cloudReady = !cloud;
    let cloudExists = false;
    let cloudStatus = cloud ? "signed-out" : "offline";
    let resolutionToken = 0;
    let generation = 0;
    let pendingPayload = null;
    let pendingTimer = null;
    let cloudWrite = Promise.resolve();

    function setStatus(status, detail = null) {
      cloudStatus = status;
      onStatus(status, detail);
    }

    function getItem(key) {
      try { return storage?.getItem(key) ?? null; } catch (_) { return null; }
    }

    function setItem(key, value) {
      if (!storage) throw new Error("localStorage is unavailable.");
      storage.setItem(key, value);
    }

    function removeItem(key) {
      try { storage?.removeItem(key); } catch (_) {}
    }

    function parseValid(key) {
      const raw = getItem(key);
      if (!raw) return null;
      try {
        const data = JSON.parse(raw);
        return sanitize(data) ? data : null;
      } catch (_) {
        return null;
      }
    }

    function ownerUid() {
      const owner = getItem(KEYS.owner);
      return owner && owner.trim() ? owner.trim() : null;
    }

    function cacheKey(uid) {
      const safeUid = String(uid || "").trim();
      if (!safeUid) throw new Error("A UID is required for a scoped local save.");
      return `${KEYS.cachePrefix}${safeUid}`;
    }

    function readPrimary() {
      const primary = parseValid(KEYS.save);
      if (primary) return { data: primary, key: KEYS.save };
      for (const key of KEYS.legacy) {
        const legacy = parseValid(key);
        if (legacy) return { data: legacy, key };
      }
      return null;
    }

    function readLocal({ uid = null } = {}) {
      const owner = ownerUid();
      const primary = readPrimary();
      if (!uid) {
        if (owner) {
          const scoped = parseValid(cacheKey(owner));
          if (scoped) return { data: scoped, source: "scoped", ownerUid: owner, key: cacheKey(owner) };
        }
        return primary ? { ...primary, source: primary.key === KEYS.save ? "primary" : "legacy", ownerUid: owner } : null;
      }

      const safeUid = String(uid).trim();
      if (!safeUid) return null;
      if (owner && owner !== safeUid) {
        const scoped = parseValid(cacheKey(safeUid));
        return scoped ? { data: scoped, source: "scoped", ownerUid: safeUid, key: cacheKey(safeUid) } : null;
      }
      if (owner === safeUid) {
        const scoped = parseValid(cacheKey(safeUid));
        if (scoped) return { data: scoped, source: "scoped", ownerUid: safeUid, key: cacheKey(safeUid) };
        return primary ? { ...primary, source: primary.key === KEYS.save ? "primary" : "legacy", ownerUid: owner } : null;
      }
      return primary ? { ...primary, source: primary.key === KEYS.save ? "legacy" : "legacy", ownerUid: null } : null;
    }

    function hasLocalSave(uid = null) {
      return Boolean(readLocal({ uid })?.data);
    }

    function serialized(data) {
      return JSON.stringify(clone(data));
    }

    function restoreKey(key, value) {
      if (value == null) removeItem(key);
      else {
        try { setItem(key, value); } catch (_) {}
      }
    }

    function promotePrimary(data, uid) {
      const safeUid = String(uid || "").trim();
      if (!safeUid) return { ok: false, error: new Error("A UID is required to promote a local save.") };
      const payload = clone(data);
      const payloadString = serialized(payload);
      const previous = new Map([
        [KEYS.save, getItem(KEYS.save)],
        [KEYS.owner, getItem(KEYS.owner)],
        [cacheKey(safeUid), getItem(cacheKey(safeUid))],
        [KEYS.legacyCache, getItem(KEYS.legacyCache)],
      ]);
      const previousOwner = ownerUid();
      if (previousOwner && previousOwner !== safeUid) previous.set(cacheKey(previousOwner), getItem(cacheKey(previousOwner)));
      const written = [];
      try {
        if (previousOwner && previousOwner !== safeUid) {
          const oldPrimary = previous.get(KEYS.save);
          if (oldPrimary) {
            setItem(cacheKey(previousOwner), oldPrimary);
            written.push(cacheKey(previousOwner));
          }
        } else if (!previousOwner && previous.get(KEYS.save)) {
          setItem(KEYS.legacyCache, previous.get(KEYS.save));
          written.push(KEYS.legacyCache);
        }
        setItem(cacheKey(safeUid), payloadString);
        written.push(cacheKey(safeUid));
        setItem(KEYS.save, payloadString);
        written.push(KEYS.save);
        // Ownership is deliberately the final write.  If it fails, rollback
        // earlier writes and leave the prior owner metadata untouched.
        setItem(KEYS.owner, safeUid);
        written.push(KEYS.owner);
        return { ok: true, ownerUid: safeUid };
      } catch (error) {
        for (const key of written.reverse()) restoreKey(key, previous.get(key));
        return { ok: false, error };
      }
    }

    function writeScoped(uid, data) {
      try {
        setItem(cacheKey(uid), serialized(data));
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
      }
    }

    function writeUnauthenticated(data) {
      const owner = ownerUid();
      if (owner) return writeScoped(owner, data);
      try {
        setItem(KEYS.save, serialized(data));
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
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
        if (!activeUid || activeUid !== uid || !cloudReady) return { skipped: true };
        let result;
        if (!cloudExists) {
          result = await cloud.createIfAbsent(uid, payload);
          cloudExists = true;
          if (!result.created && result.data) {
            applySaveData(result.data, { silent: true, source: "cloud" });
            promotePrimary(result.data, uid);
            return { ...result, authoritative: true };
          }
        } else {
          result = await cloud.save(uid, payload);
        }
        const localResult = promotePrimary(result.data || payload, uid);
        if (!localResult.ok) onStatus("local-error", localResult.error);
        setStatus("cloud-ready");
        return result;
      }).catch((error) => {
        pendingPayload = clone(payload);
        setStatus("cloud-error", error);
        return { saved: false, error };
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
      if (!payload || !activeUid || !cloudReady) return cloudWrite;
      return writeCloudPayload(activeUid, payload);
    }

    async function resolveUser(uid) {
      const safeUid = String(uid || "").trim();
      if (!safeUid) throw new Error("A Firebase UID is required.");
      const token = ++resolutionToken;
      activeUid = safeUid;
      cloudReady = false;
      cloudExists = false;
      pendingPayload = null;
      setStatus("syncing");
      if (!cloud) {
        cloudReady = true;
        setStatus("offline");
        return { status: "offline" };
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
        applySaveData(remote.data, { silent: true, source: "cloud" });
        cloudExists = true;
        cloudReady = true;
        const localResult = promotePrimary(remote.data, safeUid);
        if (!localResult.ok) setStatus("local-error", localResult.error);
        else setStatus("cloud-ready");
        return { status: "cloud-loaded", data: remote.data, localResult };
      }

      const local = readLocal({ uid: safeUid });
      if (local?.data && local.source === "legacy" && !local.ownerUid) {
        cloudReady = false;
        setStatus("legacy-claim");
        return { status: "legacy-claim", data: local.data };
      }

      if (local?.data && ["primary", "scoped"].includes(local.source)) {
        try {
          const migration = await cloud.createIfAbsent(safeUid, local.data);
          if (token !== resolutionToken || activeUid !== safeUid) return { status: "stale" };
          if (!migration.created && migration.data) {
            applySaveData(migration.data, { silent: true, source: "cloud" });
            cloudExists = true;
            const localResult = promotePrimary(migration.data, safeUid);
            cloudReady = true;
            setStatus(localResult.ok ? "cloud-ready" : "local-error", localResult.error);
            return { status: "cloud-loaded", data: migration.data, localResult };
          }
          applySaveData(local.data, { silent: true, source: "migration" });
          cloudExists = true;
          const localResult = promotePrimary(local.data, safeUid);
          cloudReady = true;
          setStatus(localResult.ok ? "cloud-ready" : "local-error", localResult.error);
          return { status: "local-migrated", data: local.data, localResult };
        } catch (error) {
          cloudReady = false;
          setStatus("cloud-error", error);
          return { status: "error", error };
        }
      }

      cloudReady = true;
      setStatus("cloud-ready");
      return { status: "new-account" };
    }

    async function claimLegacySave(uid) {
      const safeUid = String(uid || activeUid || "").trim();
      if (!safeUid || activeUid !== safeUid) throw new Error("The authenticated account changed before migration.");
      const local = readLocal();
      if (!local?.data || local.ownerUid) throw new Error("The legacy local save is no longer available to claim.");
      const migration = await cloud.createIfAbsent(safeUid, local.data);
      if (migration.created) applySaveData(local.data, { silent: true, source: "migration" });
      else if (migration.data) applySaveData(migration.data, { silent: true, source: "cloud" });
      const data = migration.data || local.data;
      cloudExists = true;
      cloudReady = true;
      const localResult = promotePrimary(data, safeUid);
      setStatus(localResult.ok ? "cloud-ready" : "local-error", localResult.error);
      return { status: migration.created ? "local-migrated" : "cloud-loaded", data, localResult };
    }

    function declineLegacySave() {
      cloudReady = true;
      setStatus("cloud-ready");
      return { status: "new-account" };
    }

    function save(data, { uid = activeUid } = {}) {
      generation += 1;
      const payload = clone(data);
      const safeUid = String(uid || "").trim();
      let localResult;
      if (safeUid) {
        const owner = ownerUid();
        const preserveOtherOwner = Boolean(owner && owner !== safeUid);
        const preserveLegacy = !owner && Boolean(readPrimary()?.data);
        localResult = preserveOtherOwner || preserveLegacy
          ? writeScoped(safeUid, payload)
          : promotePrimary(payload, safeUid);
      } else {
        localResult = writeUnauthenticated(payload);
      }
      if (!localResult.ok) return { ok: false, localResult };
      if (safeUid && cloud && cloudReady) {
        pendingPayload = payload;
        scheduleCloudWrite();
      }
      return { ok: true, localResult, generation };
    }

    function deactivateUser() {
      ++resolutionToken;
      activeUid = null;
      cloudReady = !cloud;
      cloudExists = false;
      pendingPayload = null;
      if (pendingTimer != null) clearTimeout(pendingTimer);
      pendingTimer = null;
      setStatus(cloud ? "signed-out" : "offline");
    }

    return Object.freeze({
      KEYS,
      readLocal,
      hasLocalSave,
      save,
      resolveUser,
      claimLegacySave,
      declineLegacySave,
      flushCloud,
      deactivateUser,
      ownerUid,
      getActiveUid: () => activeUid,
      getCloudStatus: () => cloudStatus,
      isCloudReady: () => cloudReady,
      getGeneration: () => generation,
    });
  }

  return Object.freeze({ KEYS, create });
});
