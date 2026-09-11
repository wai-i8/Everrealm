(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(null);
  else root.EverrealmCloudSave = factory(root.EverrealmFirebase);
})(typeof globalThis !== "undefined" ? globalThis : this, function (defaultFirebase) {
  "use strict";

  const PLAYER_COLLECTION = "players";

  function clone(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function validUid(uid) {
    const value = String(uid || "").trim();
    if (!value) throw new Error("A Firebase UID is required for a cloud save.");
    return value;
  }

  function gameplayPayload(data) {
    const payload = clone(data) || {};
    delete payload.updatedAt;
    delete payload.saveVersion;
    return payload;
  }

  function create(options = {}) {
    const firebase = options.firebase || defaultFirebase;

    async function context() {
      if (!firebase || typeof firebase.firestore !== "function") throw new Error("Firebase Firestore is unavailable.");
      return firebase.firestore();
    }

    async function reference(uid) {
      const { db, sdk } = await context();
      const safeUid = validUid(uid);
      return { db, sdk, ref: sdk.doc(db, PLAYER_COLLECTION, safeUid) };
    }

    async function load(uid) {
      const { sdk, ref } = await reference(uid);
      const snapshot = await sdk.getDoc(ref);
      return {
        exists: snapshot.exists(),
        data: snapshot.exists() ? gameplayPayload(snapshot.data()) : null,
      };
    }

    async function createIfAbsent(uid, payload) {
      const { db, sdk, ref } = await reference(uid);
      const cleanPayload = gameplayPayload(payload);
      const result = await sdk.runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (snapshot.exists()) return { created: false, data: gameplayPayload(snapshot.data()) };
        transaction.set(ref, { ...cleanPayload, updatedAt: sdk.serverTimestamp() });
        return { created: true, data: cleanPayload };
      });
      return result;
    }

    async function save(uid, payload) {
      const { sdk, ref } = await reference(uid);
      const cleanPayload = gameplayPayload(payload);
      await sdk.setDoc(ref, { ...cleanPayload, updatedAt: sdk.serverTimestamp() });
      return { saved: true, data: cleanPayload };
    }

    return Object.freeze({ load, createIfAbsent, save, gameplayPayload });
  }

  return Object.freeze({ PLAYER_COLLECTION, gameplayPayload, create });
});
