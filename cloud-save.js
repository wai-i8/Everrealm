(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(null);
  else root.EverrealmCloudSave = factory(root.EverrealmFirebase);
})(typeof globalThis !== "undefined" ? globalThis : this, function (defaultFirebase) {
  "use strict";

  const PLAYER_COLLECTION = "players";
  const COMMAND_VERSION = 1;

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

    async function firestoreContext() {
      if (!firebase || typeof firebase.firestore !== "function") throw new Error("Firebase Firestore is unavailable.");
      return firebase.firestore();
    }

    async function functionsContext() {
      if (!firebase || typeof firebase.functions !== "function") throw new Error("Firebase callable functions are unavailable.");
      return firebase.functions();
    }

    async function reference(uid) {
      const { db, sdk } = await firestoreContext();
      const safeUid = validUid(uid);
      return { db, sdk, ref: sdk.doc(db, PLAYER_COLLECTION, safeUid) };
    }

    async function callPlayerState(action, payload) {
      const { functions, sdk } = await functionsContext();
      const invoke = sdk.httpsCallable(functions, "playerStateCommand");
      const response = await invoke({
        version: COMMAND_VERSION,
        action: String(action || ""),
        payload: gameplayPayload(payload),
      });
      const result = response?.data || null;
      if (!result?.ok) {
        const error = new Error(`Player state command failed: ${result?.reason || action || "unknown"}`);
        error.code = result?.reason || "player-state-command-failed";
        error.result = result;
        throw error;
      }
      return { ...result, data: gameplayPayload(result.data) };
    }

    async function load(uid) {
      const { sdk, ref } = await reference(uid);
      const snapshot = await sdk.getDoc(ref);
      return {
        exists: snapshot.exists(),
        data: snapshot.exists() ? gameplayPayload(snapshot.data()) : null,
      };
    }

    async function createIfAbsent(uid, payload, options = {}) {
      validUid(uid);
      const result = await callPlayerState(options.migration === true ? "migrate" : "create", payload);
      return {
        created: Boolean(result.created),
        migrated: Boolean(result.migrated),
        data: gameplayPayload(result.data),
      };
    }

    async function save(uid, payload) {
      validUid(uid);
      const result = await callPlayerState("save", payload);
      return { saved: true, created: Boolean(result.created), data: gameplayPayload(result.data) };
    }

    async function reset(uid, payload) {
      validUid(uid);
      const result = await callPlayerState("reset", payload);
      return { saved: true, reset: true, created: Boolean(result.created), data: gameplayPayload(result.data) };
    }

    return Object.freeze({ load, createIfAbsent, save, reset, gameplayPayload });
  }

  return Object.freeze({ PLAYER_COLLECTION, gameplayPayload, create });
});
