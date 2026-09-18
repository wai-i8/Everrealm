(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(null);
  else root.EverrealmServerApi = factory(root.EverrealmFirebase);
})(typeof globalThis !== "undefined" ? globalThis : this, function (defaultFirebase) {
  "use strict";

  const REGION = "europe-west2";
  const COMMAND_VERSION = 1;

  function create(options = {}) {
    const firebase = options.firebase || defaultFirebase;
    const positionProvider = typeof options.positionProvider === "function" ? options.positionProvider : null;

    function commandPosition() {
      if (!positionProvider) return null;
      try {
        const position = positionProvider();
        const x = Number(position?.x);
        const y = Number(position?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return { mapId: String(position?.mapId || "").trim(), x, y };
      } catch (_) {
        return null;
      }
    }

    function withCommandPosition(payload = {}) {
      const position = commandPosition();
      return position ? { ...payload, position } : payload;
    }

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

    async function recoverPlayer(action, options = {}) {
      const command = String(action || "").trim();
      if (!command) return { ok: false, reason: "invalid-action" };
      return callable("recoverPlayer", withCommandPosition({
        version: COMMAND_VERSION,
        action: command,
      }));
    }

    async function economy(action, payload = {}) {
      const command = String(action || "").trim();
      if (!command) return { ok: false, reason: "invalid-action" };
      return callable("economyCommand", withCommandPosition({ version: COMMAND_VERSION, action: command, ...payload }));
    }

    async function quest(action, payload = {}) {
      const command = String(action || "").trim();
      if (!command) return { ok: false, reason: "invalid-action" };
      return callable("questCommand", withCommandPosition({ version: COMMAND_VERSION, action: command, ...payload }));
    }

    async function battle(action, payload = {}) {
      const command = String(action || "").trim();
      if (!command) return { ok: false, reason: "invalid-action" };
      return callable("battleCommand", withCommandPosition({ version: COMMAND_VERSION, action: command, ...payload }));
    }

    async function map(action, payload = {}) {
      const command = String(action || "").trim();
      if (!command) return { ok: false, reason: "invalid-action" };
      return callable("mapCommand", { version: COMMAND_VERSION, action: command, ...payload });
    }

    async function social(action, payload = {}) {
      const command = String(action || "").trim();
      if (!command) return { ok: false, reason: "invalid-action" };
      return callable("socialCommand", { version: COMMAND_VERSION, action: command, ...payload });
    }

    return Object.freeze({
      REGION,
      COMMAND_VERSION,
      useItem,
      recoverPlayer,
      economy,
      quest,
      battle,
      map,
      social,
    });
  }

  return Object.freeze({ REGION, COMMAND_VERSION, create });
});
