(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmParty = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_MEMBERS = 3;
  const PHASE_MS = 30000;
  const DISCONNECT_GRACE_MS = 15000;

  function text(value, fallback = "") { return String(value == null ? fallback : value).trim(); }
  function uid(value) { return text(value); }
  function name(value) { return text(value, "冒險者").slice(0, 24) || "冒險者"; }
  function whole(value, fallback = 0) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) ? n : fallback;
  }
  function member(raw, fallbackUid = "") {
    const source = raw && typeof raw === "object" ? raw : {};
    const memberUid = uid(source.uid || fallbackUid);
    if (!memberUid) return null;
    return {
      uid: memberUid,
      name: name(source.name),
      classId: text(source.classId, "fighter") || "fighter",
      gender: text(source.gender, "male") === "female" ? "female" : "male",
      level: Math.max(1, whole(source.level, 1)),
      offlineSinceMs: Math.max(0, Number(source.offlineSinceMs) || 0),
    };
  }
  function normalizeInvite(id, raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const inviteId = text(source.inviteId || id);
    const fromUid = uid(source.fromUid);
    if (!inviteId || !fromUid) return null;
    return {
      inviteId,
      partyId: text(source.partyId),
      fromUid,
      fromName: name(source.fromName),
      createdAtMs: Number(source.createdAtMs) || 0,
    };
  }
  function normalizeTransition(raw) {
    const source = raw && typeof raw === "object" ? raw : null;
    if (!source || !text(source.id)) return null;
    return {
      id: text(source.id),
      fromMapId: text(source.fromMapId),
      targetMapId: text(source.targetMapId),
      arrival: {
        x: Number(source.arrival?.x) || 0,
        y: Number(source.arrival?.y) || 0,
        facing: text(source.arrival?.facing),
      },
      status: text(source.status, "loading"),
      readyUids: Array.isArray(source.readyUids) ? source.readyUids.map(uid).filter(Boolean) : [],
      startedAtMs: Number(source.startedAtMs) || 0,
    };
  }
  function normalizeParty(id, raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const partyId = text(source.id || id);
    if (!partyId) return null;
    const memberUids = Array.isArray(source.memberUids) ? source.memberUids.map(uid).filter(Boolean) : [];
    const members = {};
    for (const memberUid of memberUids) {
      const normalized = member(source.members?.[memberUid], memberUid);
      if (normalized) members[memberUid] = normalized;
    }
    return {
      id: partyId,
      leaderUid: uid(source.leaderUid),
      memberUids,
      members,
      state: text(source.state, "idle"),
      transition: normalizeTransition(source.transition),
      battleId: text(source.battleId),
      createdAtMs: Number(source.createdAtMs) || 0,
      updatedAtMs: Number(source.updatedAtMs) || 0,
    };
  }
  function normalizeBattleMember(raw, fallbackUid = "") {
    const base = member(raw, fallbackUid);
    if (!base) return null;
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      ...base,
      hp: Math.max(0, Number(source.hp) || 0),
      maxHp: Math.max(1, Number(source.maxHp) || 1),
      ap: Math.max(0, whole(source.ap, 0)),
      alive: source.alive !== false && Number(source.hp) > 0,
      retreated: source.retreated === true,
      disconnected: source.disconnected === true,
      offlineSinceMs: Math.max(0, Number(source.offlineSinceMs) || 0),
      cell: { x: whole(source.cell?.x, 0), y: whole(source.cell?.y, 0) },
      facing: text(source.facing, "right") || "right",
      statusEffects: source.statusEffects && typeof source.statusEffects === "object" ? { ...source.statusEffects } : {},
    };
  }
  function normalizeBattle(id, raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const battleId = text(source.id || id);
    if (!battleId) return null;
    const memberUids = Array.isArray(source.memberUids) ? source.memberUids.map(uid).filter(Boolean) : [];
    const members = {};
    for (const memberUid of memberUids) {
      const normalized = normalizeBattleMember(source.members?.[memberUid], memberUid);
      if (normalized) members[memberUid] = normalized;
    }
    return {
      id: battleId,
      partyId: text(source.partyId),
      leaderUid: uid(source.leaderUid),
      memberUids,
      members,
      mapId: text(source.mapId),
      monsterType: text(source.monsterType),
      encounterId: text(source.encounterId),
      level: Math.max(1, whole(source.level, 1)),
      status: text(source.status, "loading"),
      result: text(source.result),
      phase: text(source.phase, "loading"),
      round: Math.max(1, whole(source.round, 1)),
      phaseEndsAtMs: Math.max(0, Number(source.phaseEndsAtMs) || 0),
      readyUids: Array.isArray(source.readyUids) ? source.readyUids.map(uid).filter(Boolean) : [],
      movePlans: source.movePlans && typeof source.movePlans === "object" ? { ...source.movePlans } : {},
      actions: source.actions && typeof source.actions === "object" ? { ...source.actions } : {},
      enemies: Array.isArray(source.enemies) ? source.enemies.map((enemy) => ({ ...enemy, cell: { x: whole(enemy?.cell?.x, 0), y: whole(enemy?.cell?.y, 0) } })) : [],
      eventSerial: Math.max(0, whole(source.eventSerial, 0)),
      events: Array.isArray(source.events) ? source.events.map((event) => ({ ...event })) : [],
      rewards: source.rewards && typeof source.rewards === "object" ? { ...source.rewards } : {},
      createdAtMs: Number(source.createdAtMs) || 0,
      updatedAtMs: Number(source.updatedAtMs) || 0,
    };
  }

  function create(options = {}) {
    const firebase = options.firebase;
    const serverApi = options.serverApi;
    const onState = typeof options.onState === "function" ? options.onState : () => {};
    const onInvite = typeof options.onInvite === "function" ? options.onInvite : () => {};
    const onBattle = typeof options.onBattle === "function" ? options.onBattle : () => {};
    const onError = typeof options.onError === "function" ? options.onError : () => {};
    let active = false;
    let ownUid = "";
    let token = 0;
    let firestoreContext = null;
    let realtimeContext = null;
    let unsubs = [];
    let partyUnsub = null;
    let battleUnsub = null;
    let partyId = "";
    let battleId = "";
    let party = null;
    let battle = null;
    let invites = new Map();
    const seenInvites = new Set();
    const presenceUnsubs = new Map();
    const presenceTimers = new Map();

    function snapshotState() {
      return Object.freeze({
        active,
        uid: ownUid,
        party,
        battle,
        invites: [...invites.values()].sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)),
      });
    }
    function emitState() {
      try { onState(snapshotState()); } catch (_) {}
    }
    function emitBattle() {
      try { onBattle(battle); } catch (_) {}
    }
    function clearTimer(memberUid) {
      const timer = presenceTimers.get(memberUid);
      if (timer) clearTimeout(timer);
      presenceTimers.delete(memberUid);
    }
    function clearPresenceWatches() {
      for (const unsub of presenceUnsubs.values()) { try { unsub?.(); } catch (_) {} }
      presenceUnsubs.clear();
      for (const memberUid of [...presenceTimers.keys()]) clearTimer(memberUid);
    }
    function clearBattleWatch() {
      try { battleUnsub?.(); } catch (_) {}
      battleUnsub = null;
      battleId = "";
      battle = null;
    }
    function clearPartyWatch({ keepBattle = false } = {}) {
      try { partyUnsub?.(); } catch (_) {}
      partyUnsub = null;
      partyId = "";
      party = null;
      clearPresenceWatches();
      if (!keepBattle) clearBattleWatch();
    }
    function stop() {
      token += 1;
      active = false;
      ownUid = "";
      for (const unsub of unsubs) { try { unsub?.(); } catch (_) {} }
      unsubs = [];
      clearPartyWatch();
      firestoreContext = null;
      realtimeContext = null;
      invites = new Map();
      seenInvites.clear();
      emitState();
    }
    async function command(action, payload = {}) {
      if (!active || !serverApi?.party) return { ok: false, reason: "inactive" };
      try { return await serverApi.party(action, payload); }
      catch (error) { onError(error); return { ok: false, reason: "command-failed", error }; }
    }
    function watchBattle(nextBattleId, localToken) {
      const id = text(nextBattleId);
      if (!id || !firestoreContext || localToken !== token) {
        clearBattleWatch();
        emitState();
        return;
      }
      if (id === battleId && battleUnsub) return;
      clearBattleWatch();
      battleId = id;
      const { db, sdk } = firestoreContext;
      battleUnsub = sdk.onSnapshot(sdk.doc(db, `partyBattles/${id}`), (snapshot) => {
        if (!active || localToken !== token || battleId !== id) return;
        battle = snapshot.exists() ? normalizeBattle(snapshot.id, snapshot.data()) : null;
        emitState();
        emitBattle();
      }, (error) => {
        if (localToken === token) onError(error);
      });
    }
    function syncPresenceWatches(localToken) {
      if (!party || !realtimeContext || localToken !== token) return clearPresenceWatches();
      const wanted = new Set(party.memberUids.filter((memberUid) => memberUid && memberUid !== ownUid));
      for (const [memberUid, unsub] of presenceUnsubs.entries()) {
        if (wanted.has(memberUid)) continue;
        try { unsub?.(); } catch (_) {}
        presenceUnsubs.delete(memberUid);
        clearTimer(memberUid);
      }
      const { database, sdk } = realtimeContext;
      for (const memberUid of wanted) {
        if (presenceUnsubs.has(memberUid)) continue;
        const ref = sdk.ref(database, `presence/${memberUid}`);
        const unsub = sdk.onValue(ref, (snapshot) => {
          if (!active || localToken !== token || !party?.memberUids.includes(memberUid)) return;
          const online = Boolean(snapshot.exists?.() ? snapshot.val()?.online !== false : snapshot.val?.());
          if (online) {
            clearTimer(memberUid);
            void command("member-reconnected", { targetUid: memberUid });
            return;
          }
          void command("member-offline", { targetUid: memberUid });
          clearTimer(memberUid);
          const timer = setTimeout(() => {
            presenceTimers.delete(memberUid);
            void command("disconnect-timeout", { targetUid: memberUid });
          }, DISCONNECT_GRACE_MS + 250);
          presenceTimers.set(memberUid, timer);
        }, onError);
        presenceUnsubs.set(memberUid, unsub);
      }
    }
    function watchParty(nextPartyId, localToken) {
      const id = text(nextPartyId);
      if (!id || !firestoreContext || localToken !== token) {
        // A finished battle can clear the party pointer in the same transaction.
        // Keep the direct battle listener alive long enough to receive the final
        // result snapshot; otherwise the client can miss victory/defeat entirely.
        clearPartyWatch({ keepBattle: Boolean(battleId && battle?.status !== "finished") });
        emitState();
        return;
      }
      if (id === partyId && partyUnsub) return;
      clearPartyWatch();
      partyId = id;
      const { db, sdk } = firestoreContext;
      partyUnsub = sdk.onSnapshot(sdk.doc(db, `parties/${id}`), (snapshot) => {
        if (!active || localToken !== token || partyId !== id) return;
        party = snapshot.exists() ? normalizeParty(snapshot.id, snapshot.data()) : null;
        if (!party || !party.memberUids.includes(ownUid)) {
          party = null;
          // Do not cancel the battle listener before its terminal snapshot arrives.
          if (!battleId || battle?.status === "finished") watchBattle("", localToken);
          clearPresenceWatches();
        } else {
          watchBattle(party.battleId, localToken);
          syncPresenceWatches(localToken);
        }
        emitState();
      }, (error) => {
        if (localToken === token) onError(error);
      });
    }
    async function start(settings = {}) {
      stop();
      const nextUid = uid(settings.uid);
      if (!nextUid || !firebase?.firestore) return false;
      const localToken = ++token;
      try {
        firestoreContext = await firebase.firestore();
        realtimeContext = firebase?.realtime ? await firebase.realtime() : null;
        if (localToken !== token) return false;
        ownUid = nextUid;
        active = true;
        const { db, sdk } = firestoreContext;
        const inviteRef = sdk.collection(db, `players/${ownUid}/partyInvites`);
        const pointerRef = sdk.doc(db, `players/${ownUid}/partyState/current`);
        unsubs.push(sdk.onSnapshot(inviteRef, (snapshot) => {
          if (!active || localToken !== token) return;
          const next = new Map();
          for (const doc of snapshot.docs || []) {
            const invite = normalizeInvite(doc.id, doc.data?.());
            if (!invite) continue;
            next.set(invite.inviteId, invite);
            if (!seenInvites.has(invite.inviteId)) {
              seenInvites.add(invite.inviteId);
              try { onInvite(invite); } catch (_) {}
            }
          }
          for (const known of [...seenInvites]) if (!next.has(known)) seenInvites.delete(known);
          invites = next;
          emitState();
        }, onError));
        unsubs.push(sdk.onSnapshot(pointerRef, (snapshot) => {
          if (!active || localToken !== token) return;
          const nextPartyId = snapshot.exists() ? text(snapshot.data()?.partyId) : "";
          watchParty(nextPartyId, localToken);
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

    return Object.freeze({
      start,
      stop,
      invite: (targetUid) => command("invite", { targetUid: uid(targetUid) }),
      respondInvite: (inviteId, accept) => command(accept ? "accept" : "reject", { inviteId: text(inviteId) }),
      leave: () => command("leave"),
      kick: (targetUid) => command("kick", { targetUid: uid(targetUid) }),
      startTransition: (targetMapId) => command("transition-start", { targetMapId: text(targetMapId) }),
      transitionReady: (transitionId) => command("transition-ready", { transitionId: text(transitionId) }),
      startBattle: (payload = {}) => command("battle-start", payload),
      battleReady: (battleIdValue) => command("battle-ready", { battleId: text(battleIdValue) }),
      submitMove: (battleIdValue, round, commands, facing) => command("battle-move", { battleId: text(battleIdValue), round: whole(round, 1), commands, facing }),
      submitAction: (battleIdValue, round, action) => command("battle-action", { battleId: text(battleIdValue), round: whole(round, 1), battleAction: action }),
      advanceBattle: (battleIdValue) => command("battle-advance", { battleId: text(battleIdValue) }),
      retreat: (battleIdValue) => command("battle-retreat", { battleId: text(battleIdValue) }),
      getState: snapshotState,
      isActive: () => active,
      isInParty: () => Boolean(party?.id && party.memberUids.includes(ownUid)),
      isLeader: () => Boolean(party?.id && party.leaderUid === ownUid),
      MAX_MEMBERS,
      PHASE_MS,
      DISCONNECT_GRACE_MS,
    });
  }

  return Object.freeze({ MAX_MEMBERS, PHASE_MS, DISCONNECT_GRACE_MS, normalizeInvite, normalizeParty, normalizeBattle, create });
});
