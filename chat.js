(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmChat = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const WORLD_MESSAGES_PATH = "chat/world/messages";
  const DEFAULT_HISTORY_LIMIT = 500;
  const DEFAULT_MAX_MESSAGE_LENGTH = 200;
  const DEFAULT_SEND_COOLDOWN_MS = 650;

  function safeName(value) {
    return String(value || "冒險者").trim().slice(0, 24) || "冒險者";
  }

  function normalizeMessage(id, raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const uid = String(source.uid || "").trim();
    const name = safeName(source.name);
    const text = String(source.text || "").trim();
    const createdAt = Number(source.createdAt);
    if (!id || !uid || !text || !Number.isFinite(createdAt)) return null;
    return { id: String(id), uid, name, text, createdAt };
  }

  function create(options = {}) {
    const firebase = options.firebase;
    const historyLimit = Math.max(1, Math.min(500, Math.floor(Number(options.historyLimit) || DEFAULT_HISTORY_LIMIT)));
    const maxMessageLength = Math.max(1, Math.min(500, Math.floor(Number(options.maxMessageLength) || DEFAULT_MAX_MESSAGE_LENGTH)));
    const sendCooldownMs = Math.max(0, Math.floor(Number(options.sendCooldownMs) || DEFAULT_SEND_COOLDOWN_MS));
    const onMessage = typeof options.onMessage === "function" ? options.onMessage : () => {};
    const onError = typeof options.onError === "function" ? options.onError : () => {};

    let active = false;
    let startToken = 0;
    let uid = "";
    let name = "";
    let sessionStartedAt = 0;
    let lastSendAt = -Infinity;
    let context = null;
    let messagesRef = null;
    let unsubscribe = () => {};
    const seenMessageIds = new Set();

    function stop() {
      startToken += 1;
      active = false;
      uid = "";
      name = "";
      sessionStartedAt = 0;
      lastSendAt = -Infinity;
      context = null;
      messagesRef = null;
      seenMessageIds.clear();
      try { unsubscribe(); } catch (_) {}
      unsubscribe = () => {};
    }

    async function estimateServerNow(database, sdk) {
      try {
        const snapshot = await sdk.get(sdk.ref(database, ".info/serverTimeOffset"));
        const offset = Number(snapshot.val());
        return Date.now() + (Number.isFinite(offset) ? offset : 0);
      } catch (_) {
        return Date.now();
      }
    }

    async function start(settings = {}) {
      stop();
      const safeUid = String(settings.uid || "").trim();
      if (!safeUid || !firebase?.realtime) return false;
      const token = ++startToken;

      try {
        const nextContext = await firebase.realtime();
        if (token !== startToken) return false;
        const { database, sdk } = nextContext;
        const startedAt = await estimateServerNow(database, sdk);
        if (token !== startToken) return false;

        uid = safeUid;
        name = safeName(settings.name);
        sessionStartedAt = startedAt;
        context = nextContext;
        messagesRef = sdk.ref(database, WORLD_MESSAGES_PATH);

        const worldQuery = sdk.query(
          messagesRef,
          sdk.orderByChild("createdAt"),
          sdk.startAt(sessionStartedAt),
          sdk.limitToLast(historyLimit),
        );

        unsubscribe = sdk.onChildAdded(worldQuery, (snapshot) => {
          if (token !== startToken) return;
          const message = normalizeMessage(snapshot.key, snapshot.val());
          if (!message || message.createdAt < sessionStartedAt || seenMessageIds.has(message.id)) return;
          seenMessageIds.add(message.id);
          if (seenMessageIds.size > historyLimit * 2) {
            const oldest = seenMessageIds.values().next().value;
            if (oldest) seenMessageIds.delete(oldest);
          }
          onMessage(message);
        }, (error) => {
          if (token === startToken) onError(error);
        });

        active = true;
        return true;
      } catch (error) {
        if (token === startToken) {
          stop();
          onError(error);
        }
        return false;
      }
    }

    async function send(rawText) {
      const text = String(rawText || "").trim();
      if (!text) return { ok: false, reason: "empty" };
      if (text.length > maxMessageLength) return { ok: false, reason: "too-long", maxLength: maxMessageLength };
      if (!active || !context || !messagesRef || !uid) return { ok: false, reason: "inactive" };

      const now = Date.now();
      if (now - lastSendAt < sendCooldownMs) {
        return { ok: false, reason: "cooldown", retryAfterMs: Math.max(0, sendCooldownMs - (now - lastSendAt)) };
      }
      lastSendAt = now;

      try {
        const ref = context.sdk.push(messagesRef);
        await context.sdk.set(ref, {
          uid,
          name,
          text,
          createdAt: context.sdk.serverTimestamp(),
        });
        return { ok: true, id: ref.key || "" };
      } catch (error) {
        onError(error);
        return { ok: false, reason: "write-failed", error };
      }
    }

    return Object.freeze({
      start,
      stop,
      send,
      isActive: () => active,
      getSessionStartedAt: () => sessionStartedAt,
      maxMessageLength,
      historyLimit,
    });
  }

  return Object.freeze({
    WORLD_MESSAGES_PATH,
    DEFAULT_HISTORY_LIMIT,
    DEFAULT_MAX_MESSAGE_LENGTH,
    DEFAULT_SEND_COOLDOWN_MS,
    normalizeMessage,
    create,
  });
});
