(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmTrade = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function safeUid(value) { return String(value || "").trim(); }
  function safeName(value) { return String(value || "冒險者").trim().slice(0, 24) || "冒險者"; }
  function safeTradeId(value) { return String(value || "").trim(); }
  function whole(value, fallback = 0, min = 0, max = 99999) {
    const numeric = Math.floor(Number(value));
    return Number.isFinite(numeric) ? Math.max(min, Math.min(max, numeric)) : fallback;
  }
  function normalizeItems(items) {
    const result = [];
    const seen = new Map();
    for (const raw of Array.isArray(items) ? items : []) {
      const kind = String(raw?.kind || "").trim();
      const id = String(raw?.id || "").trim();
      const quantity = whole(raw?.quantity, 0, 1, 9999);
      if (!kind || !id || !quantity) continue;
      const key = `${kind}:${id}`;
      if (seen.has(key)) seen.get(key).quantity = Math.min(9999, seen.get(key).quantity + quantity);
      else {
        const entry = { kind, id, quantity };
        seen.set(key, entry);
        result.push(entry);
      }
    }
    return result;
  }
  function normalizeOffer(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      coins: whole(source.coins, 0, 0, 99999),
      items: normalizeItems(source.items),
      locked: source.locked === true,
      confirmed: source.confirmed === true,
    };
  }
  function normalizeSession(id, raw, ownUid) {
    const source = raw && typeof raw === "object" ? raw : {};
    const a = source.participants?.a || {};
    const b = source.participants?.b || {};
    const side = a.uid === ownUid ? "a" : b.uid === ownUid ? "b" : null;
    if (!id || !side) return null;
    const otherSide = side === "a" ? "b" : "a";
    const own = side === "a" ? a : b;
    const peer = side === "a" ? b : a;
    return {
      id: String(id),
      status: String(source.status || "pending"),
      side,
      otherSide,
      own: { uid: safeUid(own.uid), name: safeName(own.name) },
      peer: { uid: safeUid(peer.uid), name: safeName(peer.name) },
      offers: {
        a: normalizeOffer(source.offers?.a),
        b: normalizeOffer(source.offers?.b),
      },
      createdAtMs: Number(source.createdAtMs) || 0,
      updatedAtMs: Number(source.updatedAtMs) || 0,
      completedAtMs: Number(source.completedAtMs) || 0,
      cancelledBy: safeUid(source.cancelledBy),
    };
  }
  function normalizeInvite(id, raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const tradeId = safeTradeId(source.tradeId || id);
    const fromUid = safeUid(source.fromUid);
    if (!tradeId || !fromUid) return null;
    return { tradeId, fromUid, fromName: safeName(source.fromName), createdAtMs: Number(source.createdAtMs) || 0 };
  }

  function create(options = {}) {
    const firebase = options.firebase;
    const serverApi = options.serverApi;
    const onState = typeof options.onState === "function" ? options.onState : () => {};
    const onInvite = typeof options.onInvite === "function" ? options.onInvite : () => {};
    const onError = typeof options.onError === "function" ? options.onError : () => {};
    let active = false;
    let uid = "";
    let token = 0;
    let firestoreContext = null;
    let unsubs = [];
    let sessionUnsub = null;
    let sessionTradeId = "";
    let pointerTradeId = "";
    let session = null;
    let invites = new Map();
    const seenInvites = new Set();

    function snapshotState() {
      return Object.freeze({
        active,
        uid,
        session,
        invites: [...invites.values()].sort((l, r) => (r.createdAtMs || 0) - (l.createdAtMs || 0)),
      });
    }
    function emitState() {
      try { onState(snapshotState()); } catch (_) {}
    }
    function clearSessionWatch() {
      try { sessionUnsub?.(); } catch (_) {}
      sessionUnsub = null;
      sessionTradeId = "";
      session = null;
    }
    function stop() {
      token += 1;
      active = false;
      uid = "";
      for (const unsub of unsubs) { try { unsub(); } catch (_) {} }
      unsubs = [];
      clearSessionWatch();
      pointerTradeId = "";
      firestoreContext = null;
      invites = new Map();
      seenInvites.clear();
      emitState();
    }
    function watchSession(tradeId, localToken) {
      const id = safeTradeId(tradeId);
      if (!id || !firestoreContext || localToken !== token) return;
      if (sessionTradeId === id && sessionUnsub) return;
      clearSessionWatch();
      sessionTradeId = id;
      const { db, sdk } = firestoreContext;
      const ref = sdk.doc(db, `tradeSessions/${id}`);
      sessionUnsub = sdk.onSnapshot(ref, (snapshot) => {
        if (!active || localToken !== token || sessionTradeId !== id) return;
        if (!snapshot.exists()) {
          session = null;
          emitState();
          return;
        }
        session = normalizeSession(snapshot.id, snapshot.data(), uid);
        emitState();
        if (["completed", "cancelled", "rejected"].includes(session?.status) && pointerTradeId !== id) {
          Promise.resolve().then(() => {
            if (!active || localToken !== token || sessionTradeId !== id || pointerTradeId === id) return;
            if (!["completed", "cancelled", "rejected"].includes(session?.status)) return;
            clearSessionWatch();
            emitState();
          });
        }
      }, (error) => {
        if (localToken === token) onError(error);
      });
    }
    async function start(settings = {}) {
      stop();
      const nextUid = safeUid(settings.uid);
      if (!nextUid || !firebase?.firestore) return false;
      const localToken = ++token;
      try {
        firestoreContext = await firebase.firestore();
        if (localToken !== token) return false;
        uid = nextUid;
        active = true;
        const { db, sdk } = firestoreContext;
        const invitesRef = sdk.collection(db, `players/${uid}/tradeInvites`);
        const pointerRef = sdk.doc(db, `players/${uid}/tradeState/current`);
        unsubs.push(sdk.onSnapshot(invitesRef, (snapshot) => {
          if (!active || localToken !== token) return;
          const next = new Map();
          for (const doc of snapshot.docs || []) {
            const invite = normalizeInvite(doc.id, doc.data?.());
            if (!invite) continue;
            next.set(invite.tradeId, invite);
            if (!seenInvites.has(invite.tradeId)) {
              seenInvites.add(invite.tradeId);
              try { onInvite(invite); } catch (_) {}
            }
          }
          for (const known of [...seenInvites]) if (!next.has(known)) seenInvites.delete(known);
          invites = next;
          emitState();
        }, onError));
        unsubs.push(sdk.onSnapshot(pointerRef, (snapshot) => {
          if (!active || localToken !== token) return;
          const nextTradeId = snapshot.exists() ? safeTradeId(snapshot.data()?.tradeId) : "";
          pointerTradeId = nextTradeId;
          if (nextTradeId) watchSession(nextTradeId, localToken);
          // If the pointer disappears while a watched session is still open,
          // keep that direct session listener long enough to receive its final
          // completed/cancelled snapshot.
          else if (!sessionTradeId || ["completed", "cancelled", "rejected"].includes(session?.status)) clearSessionWatch();
          emitState();
        }, onError));
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
    async function command(action, payload = {}) {
      if (!active || !serverApi?.trade) return { ok: false, reason: "inactive" };
      try { return await serverApi.trade(action, payload); }
      catch (error) { onError(error); return { ok: false, reason: "command-failed", error }; }
    }
    async function createTrade(targetUid) {
      const target = safeUid(targetUid);
      if (!target || target === uid) return { ok: false, reason: "invalid-target" };
      // A pending invitation is not an active trade. The initiator stays on the
      // generic waiting-invite UI until the receiver accepts; only then will
      // tradeState/current appear and attach the live trade session listener.
      return command("create", { targetUid: target });
    }
    async function respondInvite(tradeId, accept) {
      const id = safeTradeId(tradeId);
      if (!id) return { ok: false, reason: "invalid-trade" };
      const result = await command(accept ? "accept" : "reject", { tradeId: id });
      if (result?.ok && accept) watchSession(id, token);
      return result;
    }
    async function cancelTrade(tradeId = session?.id) { return command("cancel", { tradeId: safeTradeId(tradeId) }); }
    async function setOffer(offer, tradeId = session?.id) { return command("set-offer", { tradeId: safeTradeId(tradeId), offer: normalizeOffer(offer) }); }
    async function lock(tradeId = session?.id, offer = null) {
      const payload = { tradeId: safeTradeId(tradeId) };
      if (offer) payload.offer = normalizeOffer(offer);
      return command("lock", payload);
    }
    async function unlock(tradeId = session?.id) { return command("unlock", { tradeId: safeTradeId(tradeId) }); }
    async function confirm(tradeId = session?.id) { return command("confirm", { tradeId: safeTradeId(tradeId) }); }

    return Object.freeze({
      start,
      stop,
      createTrade,
      respondInvite,
      cancelTrade,
      setOffer,
      lock,
      unlock,
      confirm,
      getState: snapshotState,
      isActive: () => active,
    });
  }

  return Object.freeze({ normalizeOffer, normalizeSession, normalizeInvite, create });
});
