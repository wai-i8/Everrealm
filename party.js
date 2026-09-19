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

  function presentationRemote(remote) {
    // Compatibility shim: party members now render from real multiplayer
    // coordinates. The follower path controls spacing instead of fake offsets.
    return remote && typeof remote === "object" ? remote : null;
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
      battleEncounterName: text(source.battleEncounterName),
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
  function normalizeMovementReplay(raw) {
    const source = raw && typeof raw === "object" ? raw : null;
    if (!source || !text(source.id)) return null;
    const normalizeCellMap = (value) => Object.fromEntries(Object.entries(value && typeof value === "object" ? value : {}).map(([key, entry]) => [key, { x: Number(entry?.x) || 0, y: Number(entry?.y) || 0 }]));
    const unitResults = Object.fromEntries(Object.entries(source.unitResults && typeof source.unitResults === "object" ? source.unitResults : {}).map(([key, result]) => [key, {
      ...(result || {}),
      start: result?.start ? { x: Number(result.start.x) || 0, y: Number(result.start.y) || 0 } : null,
      cell: result?.cell ? { x: Number(result.cell.x) || 0, y: Number(result.cell.y) || 0 } : null,
      completedPath: Array.isArray(result?.completedPath) ? result.completedPath.map((entry) => ({ x: Number(entry?.x) || 0, y: Number(entry?.y) || 0 })) : [],
      blockedBy: Array.isArray(result?.blockedBy) ? [...result.blockedBy] : [],
    }]));
    return {
      id: text(source.id),
      round: Math.max(1, whole(source.round, 1)),
      actors: Array.isArray(source.actors) ? source.actors.map(text).filter(Boolean) : [],
      frameTimes: Array.isArray(source.frameTimes) ? source.frameTimes.map((value) => Math.max(0, Number(value) || 0)) : [],
      frames: Array.isArray(source.frames) ? source.frames.map(normalizeCellMap) : [],
      timeline: Array.isArray(source.timeline) ? source.timeline.map((frame) => ({
        time: Math.max(0, Number(frame?.time) || 0),
        renderCells: normalizeCellMap(frame?.renderCells),
        facings: frame?.facings && typeof frame.facings === "object" ? { ...frame.facings } : {},
      })) : [],
      cancelled: Array.isArray(source.cancelled) ? [...source.cancelled] : [],
      unitResults,
    };
  }

  function normalizePresentation(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const serial = Math.max(0, whole(source.serial, 0));
    if (!serial) return null;
    return {
      serial,
      type: text(source.type),
      round: Math.max(1, whole(source.round, 1)),
      result: text(source.result),
      events: Array.isArray(source.events) ? source.events.map((event) => ({ ...event })) : [],
      movementReplay: normalizeMovementReplay(source.movementReplay),
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
      presentationSerial: Math.max(0, whole(source.presentationSerial, 0)),
      presentations: Array.isArray(source.presentations) ? source.presentations.map(normalizePresentation).filter(Boolean) : [],
      movementReplay: normalizeMovementReplay(source.movementReplay),
      finishParticipantUids: Array.isArray(source.finishParticipantUids) ? source.finishParticipantUids.map(uid).filter(Boolean) : [],
      finishReadyUids: Array.isArray(source.finishReadyUids) ? source.finishReadyUids.map(uid).filter(Boolean) : [],
      finishReleased: source.finishReleased === true,
      exitReleased: source.exitReleased === true,
      finishedAtMs: Math.max(0, Number(source.finishedAtMs) || 0),
      finishReleasedAtMs: Math.max(0, Number(source.finishReleasedAtMs) || 0),
      exitReleasedAtMs: Math.max(0, Number(source.exitReleasedAtMs) || 0),
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
    // Track the previous RTDB presence state so a 15-second heartbeat does not
    // invoke the party Cloud Function over and over while a member remains
    // online.  Server commands are only needed on an actual state edge.
    const presenceStates = new Map();

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
      presenceStates.clear();
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
      try {
        const result = await serverApi.party(action, payload);
        if (!result || typeof result !== "object") return result;
        // Firestore is the only authoritative battle-state transport. Callable
        // responses are command acknowledgements only and must never advance
        // local battle presentation ahead of the shared snapshot listener.
        if (action.startsWith("battle-")) {
          const { battle: _ignoredBattle, ...ack } = result;
          return ack;
        }
        return result;
      } catch (error) {
        onError(error);
        return { ok: false, reason: "command-failed", error };
      }
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
        presenceStates.delete(memberUid);
        clearTimer(memberUid);
      }
      const { database, sdk } = realtimeContext;
      for (const memberUid of wanted) {
        if (presenceUnsubs.has(memberUid)) continue;
        const ref = sdk.ref(database, `presence/${memberUid}`);
        const unsub = sdk.onValue(ref, (snapshot) => {
          if (!active || localToken !== token || !party?.memberUids.includes(memberUid)) return;
          const online = Boolean(snapshot.exists?.() ? snapshot.val()?.online !== false : snapshot.val?.());
          const previousOnline = presenceStates.get(memberUid);
          presenceStates.set(memberUid, online);

          if (online) {
            clearTimer(memberUid);
            // Initial online snapshots and normal heartbeat writes do not need
            // a Function call.  Reconnect only when this client actually saw
            // the member go offline, or the authoritative party document still
            // carries an offline marker from before this listener attached.
            const serverMarkedOffline = Number(party?.members?.[memberUid]?.offlineSinceMs) > 0;
            if (previousOnline === false || (previousOnline === undefined && serverMarkedOffline)) {
              void command("member-reconnected", { targetUid: memberUid });
            }
            return;
          }

          // Repeated offline snapshots must not restart the grace timer or call
          // member-offline again.
          if (previousOnline === false) return;
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
    function keepFinishedBattleWatch() {
      return Boolean(battleId && (
        battle?.finishReleased !== true ||
        (battle?.result === "victory" && battle?.exitReleased !== true)
      ));
    }
    function watchParty(nextPartyId, localToken) {
      const id = text(nextPartyId);
      if (!id || !firestoreContext || localToken !== token) {
        // A finished battle can clear the party pointer in the same transaction.
        // Keep the direct battle listener alive long enough to receive the final
        // result snapshot; otherwise the client can miss victory/defeat entirely.
        clearPartyWatch({ keepBattle: keepFinishedBattleWatch() });
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
          if (!keepFinishedBattleWatch()) watchBattle("", localToken);
          clearPresenceWatches();
        } else {
          const watchedBattleId = party.battleId || (keepFinishedBattleWatch() ? battleId : "");
          watchBattle(watchedBattleId, localToken);
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
      finishReady: (battleIdValue, presentationSerial = 0) => command("battle-finish-ready", { battleId: text(battleIdValue), presentationSerial: whole(presentationSerial, 0) }),
      exitBattle: (battleIdValue) => command("battle-exit", { battleId: text(battleIdValue) }),
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

  return Object.freeze({ MAX_MEMBERS, PHASE_MS, DISCONNECT_GRACE_MS, presentationRemote, normalizeInvite, normalizeParty, normalizeBattle, create });
});
