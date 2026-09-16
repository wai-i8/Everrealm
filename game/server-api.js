(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(null);
  else root.EverrealmServerApi = factory(root.EverrealmFirebase);
})(typeof globalThis !== "undefined" ? globalThis : this, function (defaultFirebase) {
  "use strict";

  const REGION = "europe-west2";
  const COMMAND_VERSION = 1;

  function create(options = {}) {
    const firebase = options.firebase || defaultFirebase;

    async function callable(name, payload = {}) {
      if (!firebase || typeof firebase.functions !== "function") {
        throw new Error("Firebase callable functions are unavailable.");
      }
      const { sdk, functions } = await firebase.functions();
      const invoke = sdk.httpsCallable(functions, String(name || ""));
      const response = await invoke(payload);
      return response?.data ?? null;
    }

    async function useItem(itemId) {
      const id = String(itemId || "").trim();
      if (!id) return { ok: false, reason: "invalid-item" };
      return callable("useItem", {
        version: COMMAND_VERSION,
        itemId: id,
      });
    }

    return Object.freeze({
      REGION,
      COMMAND_VERSION,
      useItem,
    });
  }

  return Object.freeze({ REGION, COMMAND_VERSION, create });
});
