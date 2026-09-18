(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmSocial = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_MAX_MESSAGE_LENGTH = 200;
  const DEFAULT_SEND_COOLDOWN_MS = 650;
  const DEFAULT_HISTORY_LIMIT = 200;

  function safeName(value) {
    return String(value || "冒險者").trim().slice(0, 24) || "冒險者";
  }

  function safeUid(value) {
    return String(value || "").trim();
  }

  function normalizeFriend(id, raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const uid = safeUid(source.uid || id);
    if (!uid) return null;
    return {
      uid,
      name: safeName(source.name),
      threadId: String(source.threadId || "").trim(),
      since: source.since || null,
    };
  }

  function normalizeRequest(id, raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const uid = safeUid(source.uid || id);
    if (!uid) return null;
    return { uid, name: safeName(source.name), createdAt: source.createdAt || null };
  }

  function normalizeWhisper(id, raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const uid = safeUid(source.uid);
    const toUid = safeUid(source.toUid);
    const text = String(source.text || "").trim();
    const createdAt = Number(source.createdAt);
    if (!id || !uid || !toUid || !text || !Number.isFinite(createdAt)) return null;
    return {
      id: String(id),
      uid,
      toUid,
      name: safeName(source.name),
      text,
      createdAt,
    };
  }

  function create(options = {}) {
    const firebase = options.firebase;
    const serverApi = options.serverApi;
    const onState = typeof options.onState === "function" ? options.onState : () => {};
    const onFriendRequest = typeof options.onFriendRequest === "function" ? options.onFriendRequest : () => {};
    const onWhisper = typeof options.onWhisper === "function" ? options.onWhisper : () => {};
    const onError = typeof options.onError === "function" ? options.onError : () => {};
    const maxMessageLength = Math.max(1, Math.min(500, Math.floor(Number(options.maxMessageLength) || DEFAULT_MAX_MESSAGE_LENGTH)));
    const sendCooldownMs = Math.max(0, Math.floor(Number(options.sendCooldownMs) || DEFAULT_SEND_COOLDOWN_MS));
    const historyLimit = Math.max(1, Math.min(500, Math.floor(Number(options.historyLimit) || DEFAULT_HISTORY_LIMIT)));

    let active = false;
    let uid = "";
    let name = "";
    let token = 0;
    let sessionStartedAt = 0;
    let firestoreContext = null;
    let realtimeContext = null;
    let firestoreUnsubs = [];
    let whisperUnsubs = new Map();
    let friends = new Map();
    let incoming = new Map();
    let outgoing = new Map();
    let lastSendAt = -Infinity;
    const seenWhispers = new Set();
    const seenIncoming = new Set();

    function snapshotState() {
      const sortByName = (left, right) => left.name.localeCompare(right.name, "zh-HK");
      return Object.freeze({
        active,
        uid,
        friends: [...friends.values()].sort(sortByName),
        incoming: [...incoming.values()].sort(sortByName),
        outgoing: [...outgoing.values()].sort(sortByName),
      });
    }

    function emitState() {
      try { onState(snapshotState()); } catch (_) {}
    }

    function clearWhisperSubscriptions() {
      for (const unsubscribe of whisperUnsubs.values()) {
        try { unsubscribe(); } catch (_) {}
      }
      whisperUnsubs = new Map();
      seenWhispers.clear();
    }

    function stop() {
      token += 1;
      active = false;
      uid = "";
      name = "";
      sessionStartedAt = 0;
      lastSendAt = -Infinity;
      for (const unsubscribe of firestoreUnsubs) {
        try { unsubscribe(); } catch (_) {}
      }
      firestoreUnsubs = [];
      clearWhisperSubscriptions();
      friends = new Map();
      incoming = new Map();
      outgoing = new Map();
      seenIncoming.clear();
      firestoreContext = null;
      realtimeContext = null;
      emitState();
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

    function mapCollection(snapshot, normalizer) {
      const next = new Map();
      for (const doc of snapshot?.docs || []) {
        const item = normalizer(doc.id, doc.data?.());
        if (item) next.set(item.uid, item);
      }
      return next;
    }

    function syncWhisperSubscriptions(localToken) {
      if (!active || localToken !== token || !realtimeContext) return;
      const wanted = new Map();
      for (const friend of friends.values()) {
        if (friend.threadId) wanted.set(friend.uid, friend.threadId);
      }

      for (const [friendUid, subscription] of whisperUnsubs.entries()) {
        if (wanted.get(friendUid) === subscription.threadId) continue;
        try { subscription.unsubscribe(); } catch (_) {}
        whisperUnsubs.delete(friendUid);
      }

      const { database, sdk } = realtimeContext;
      for (const [friendUid, threadId] of wanted.entries()) {
        if (whisperUnsubs.has(friendUid)) continue;
        const messagesRef = sdk.ref(database, `chat/whispers/${threadId}/messages`);
        const query = sdk.query(
          messagesRef,
          sdk.orderByChild("createdAt"),
          sdk.startAt(sessionStartedAt),
          sdk.limitToLast(historyLimit),
        );
        const unsubscribe = sdk.onChildAdded(query, (snapshot) => {
          if (!active || localToken !== token) return;
          const message = normalizeWhisper(snapshot.key, snapshot.val());
          if (!message || message.createdAt < sessionStartedAt || seenWhispers.has(`${threadId}:${message.id}`)) return;
          if (message.uid !== uid && message.toUid !== uid) return;
          seenWhispers.add(`${threadId}:${message.id}`);
          if (seenWhispers.size > historyLimit * Math.max(4, friends.size * 2)) {
            const oldest = seenWhispers.values().next().value;
            if (oldest) seenWhispers.delete(oldest);
          }
          const peerUid = message.uid === uid ? message.toUid : message.uid;
          const peer = friends.get(peerUid);
          try {
            onWhisper({
              ...message,
              peerUid,
              peerName: peer?.name || (message.uid === uid ? "好友" : message.name),
              direction: message.uid === uid ? "outgoing" : "incoming",
            });
          } catch (_) {}
        }, (error) => {
          if (localToken === token) onError(error);
        });
        whisperUnsubs.set(friendUid, { threadId, unsubscribe });
      }
    }

    function attachFirestoreListeners(localToken) {
      const { db, sdk } = firestoreContext;
      const paths = {
        friends: sdk.collection(db, `players/${uid}/friends`),
        incoming: sdk.collection(db, `players/${uid}/friendRequests`),
        outgoing: sdk.collection(db, `players/${uid}/friendRequestsSent`),
      };

      firestoreUnsubs.push(sdk.onSnapshot(paths.friends, (snapshot) => {
        if (!active || localToken !== token) return;
        friends = mapCollection(snapshot, normalizeFriend);
        syncWhisperSubscriptions(localToken);
        emitState();
      }, onError));

      firestoreUnsubs.push(sdk.onSnapshot(paths.incoming, (snapshot) => {
        if (!active || localToken !== token) return;
        incoming = mapCollection(snapshot, normalizeRequest);
        for (const request of incoming.values()) {
          if (seenIncoming.has(request.uid)) continue;
          seenIncoming.add(request.uid);
          try { onFriendRequest(request); } catch (_) {}
        }
        for (const known of [...seenIncoming]) if (!incoming.has(known)) seenIncoming.delete(known);
        emitState();
      }, onError));

      firestoreUnsubs.push(sdk.onSnapshot(paths.outgoing, (snapshot) => {
        if (!active || localToken !== token) return;
        outgoing = mapCollection(snapshot, normalizeRequest);
        emitState();
      }, onError));
    }

    async function start(settings = {}) {
      stop();
      const nextUid = safeUid(settings.uid);
      if (!nextUid || !firebase?.firestore || !firebase?.realtime) return false;
      const localToken = ++token;
      try {
        const [fs, rt] = await Promise.all([firebase.firestore(), firebase.realtime()]);
        if (localToken !== token) return false;
        uid = nextUid;
        name = safeName(settings.name);
        firestoreContext = fs;
        realtimeContext = rt;
        sessionStartedAt = await estimateServerNow(rt.database, rt.sdk);
        if (localToken !== token) return false;
        active = true;
        attachFirestoreListeners(localToken);
        emitState();
        return true;
      } catch (error) {
        if (localToken === token) {
          stop();
          onError(error);
        }
        return false;
      }
    }

    async function socialCommand(action, payload = {}) {
      if (!active || !uid || !serverApi?.social) return { ok: false, reason: "inactive" };
      try {
        return await serverApi.social(action, payload);
      } catch (error) {
        onError(error);
        return { ok: false, reason: "command-failed", error };
      }
    }

    async function sendFriendRequest(targetUid) {
      const target = safeUid(targetUid);
      if (!target || target === uid) return { ok: false, reason: "invalid-target" };
      return socialCommand("send-friend-request", { targetUid: target });
    }

    async function respondFriendRequest(requesterUid, accept) {
      const requester = safeUid(requesterUid);
      if (!requester) return { ok: false, reason: "invalid-target" };
      return socialCommand(accept ? "accept-friend-request" : "reject-friend-request", { requesterUid: requester });
    }

    async function cancelFriendRequest(targetUid) {
      const target = safeUid(targetUid);
      if (!target) return { ok: false, reason: "invalid-target" };
      return socialCommand("cancel-friend-request", { targetUid: target });
    }

    async function removeFriend(targetUid) {
      const target = safeUid(targetUid);
      if (!target) return { ok: false, reason: "invalid-target" };
      return socialCommand("remove-friend", { targetUid: target });
    }

    async function sendWhisper(targetUid, rawText) {
      const target = safeUid(targetUid);
      const text = String(rawText || "").trim();
      if (!text) return { ok: false, reason: "empty" };
      if (text.length > maxMessageLength) return { ok: false, reason: "too-long", maxLength: maxMessageLength };
      const friend = friends.get(target);
      if (!active || !realtimeContext || !friend?.threadId) return { ok: false, reason: "not-friend" };
      const now = Date.now();
      if (now - lastSendAt < sendCooldownMs) {
        return { ok: false, reason: "cooldown", retryAfterMs: Math.max(0, sendCooldownMs - (now - lastSendAt)) };
      }
      lastSendAt = now;
      const writeMessage = async () => {
        const { database, sdk } = realtimeContext;
        const ref = sdk.push(sdk.ref(database, `chat/whispers/${friend.threadId}/messages`));
        await sdk.set(ref, {
          uid,
          toUid: target,
          name,
          text,
          createdAt: sdk.serverTimestamp(),
        });
        return { ok: true, id: ref.key || "" };
      };
      try {
        return await writeMessage();
      } catch (error) {
        // Old friendships or a brief accept-request race can leave the private
        // RTDB thread metadata absent. The server revalidates the friendship,
        // repairs membership, then one retry is safe.
        const repair = await socialCommand("ensure-whisper", { targetUid: target });
        if (repair?.ok) {
          try { return await writeMessage(); } catch (retryError) {
            onError(retryError);
            return { ok: false, reason: "write-failed", error: retryError };
          }
        }
        onError(error);
        return { ok: false, reason: "write-failed", error };
      }
    }

    return Object.freeze({
      start,
      stop,
      sendFriendRequest,
      respondFriendRequest,
      cancelFriendRequest,
      removeFriend,
      sendWhisper,
      isActive: () => active,
      getState: snapshotState,
      getFriend: (targetUid) => friends.get(safeUid(targetUid)) || null,
      hasFriend: (targetUid) => friends.has(safeUid(targetUid)),
      hasIncomingRequest: (targetUid) => incoming.has(safeUid(targetUid)),
      hasOutgoingRequest: (targetUid) => outgoing.has(safeUid(targetUid)),
      maxMessageLength,
    });
  }

  return Object.freeze({
    DEFAULT_MAX_MESSAGE_LENGTH,
    DEFAULT_SEND_COOLDOWN_MS,
    DEFAULT_HISTORY_LIMIT,
    normalizeFriend,
    normalizeRequest,
    normalizeWhisper,
    create,
  });
});
