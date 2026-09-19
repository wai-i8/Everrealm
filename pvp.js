(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmPvp = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function text(value, fallback = "") { return String(value == null ? fallback : value).trim(); }
  function safeName(value) { return text(value, "冒險者").slice(0, 24) || "冒險者"; }
  function normalizeInvite(id, raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const inviteId = text(source.inviteId || id);
    const fromUid = text(source.fromUid);
    if (!inviteId || !fromUid) return null;
    return { inviteId, fromUid, fromName: safeName(source.fromName), createdAtMs: Number(source.createdAtMs) || 0 };
  }


  function mirrorCell(value) {
    if (!value || !Number.isFinite(Number(value.x)) || !Number.isFinite(Number(value.y))) return value;
    return { ...value, x: 11 - Math.trunc(Number(value.x)), y: 2 - Math.trunc(Number(value.y)) };
  }
  function mirrorFacing(value) { return ({ up: "down", down: "up", left: "right", right: "left" })[String(value || "")] || value; }
  function mirrorCellMap(map) {
    return Object.fromEntries(Object.entries(map && typeof map === "object" ? map : {}).map(([key, value]) => [key, mirrorCell(value)]));
  }
  function mirrorReplay(replay) {
    if (!replay || typeof replay !== "object") return replay;
    return { ...replay,
      frames: Array.isArray(replay.frames) ? replay.frames.map(mirrorCellMap) : replay.frames,
      timeline: Array.isArray(replay.timeline) ? replay.timeline.map((frame) => ({ ...frame, renderCells: mirrorCellMap(frame?.renderCells), facings: Object.fromEntries(Object.entries(frame?.facings || {}).map(([key, value]) => [key, mirrorFacing(value)])) })) : replay.timeline,
      unitResults: Object.fromEntries(Object.entries(replay.unitResults || {}).map(([key, result]) => [key, { ...result, start: mirrorCell(result?.start), cell: mirrorCell(result?.cell), completedPath: Array.isArray(result?.completedPath) ? result.completedPath.map(mirrorCell) : result?.completedPath }]))
    };
  }
  function localizeBattle(raw, ownUid) {
    if (!raw || raw.pvp !== true || String(raw.initiatorUid || "") === String(ownUid || "")) return raw;
    const next = JSON.parse(JSON.stringify(raw));
    for (const member of Object.values(next.members || {})) { member.cell = mirrorCell(member.cell); member.facing = mirrorFacing(member.facing); }
    next.movementReplay = mirrorReplay(next.movementReplay);
    next.presentations = (next.presentations || []).map((item) => ({ ...item, movementReplay: mirrorReplay(item.movementReplay), events: (item.events || []).map((event) => ({ ...event, targetCell: mirrorCell(event.targetCell), fromCell: mirrorCell(event.fromCell) })) }));
    return next;
  }

  function create(options = {}) {
    const firebase = options.firebase;
    const serverApi = options.serverApi;
    const onState = typeof options.onState === "function" ? options.onState : () => {};
    const onInvite = typeof options.onInvite === "function" ? options.onInvite : () => {};
    const onBattle = typeof options.onBattle === "function" ? options.onBattle : () => {};
    const onError = typeof options.onError === "function" ? options.onError : () => {};
    let active = false;
    let uid = "";
    let token = 0;
    let firestoreContext = null;
    let unsubs = [];
    let battleUnsub = null;
    let battleId = "";
    let battle = null;
    let pointer = null;
    let invites = new Map();
    const seenInvites = new Set();

    function state() { return Object.freeze({ active, uid, pointer, battle, invites: [...invites.values()].sort((a,b)=>(b.createdAtMs||0)-(a.createdAtMs||0)) }); }
    function emitState() { try { onState(state()); } catch (_) {} }
    function clearBattle() { try { battleUnsub?.(); } catch (_) {} battleUnsub = null; battleId = ""; battle = null; }
    function stop() {
      token += 1; active = false; uid = ""; pointer = null;
      for (const unsub of unsubs) { try { unsub?.(); } catch (_) {} }
      unsubs = []; clearBattle(); invites = new Map(); seenInvites.clear(); firestoreContext = null; emitState();
    }
    async function command(action, payload = {}) {
      if (!active || !serverApi?.pvp) return { ok: false, reason: "inactive" };
      try { return await serverApi.pvp(action, payload); }
      catch (error) { onError(error); return { ok: false, reason: "command-failed", error }; }
    }
    function watchBattle(nextBattleId, localToken) {
      const id = text(nextBattleId);
      if (!id || !firestoreContext || localToken !== token) { clearBattle(); emitState(); return; }
      if (battleId === id && battleUnsub) return;
      clearBattle(); battleId = id;
      const { db, sdk } = firestoreContext;
      battleUnsub = sdk.onSnapshot(sdk.doc(db, `pvpBattles/${id}`), (snapshot) => {
        if (!active || localToken !== token || battleId !== id) return;
        battle = snapshot.exists() ? localizeBattle({ id: snapshot.id, ...snapshot.data() }, uid) : null;
        emitState();
        try { onBattle(battle); } catch (_) {}
      }, onError);
    }
    async function start(settings = {}) {
      stop();
      const nextUid = text(settings.uid);
      if (!nextUid || !firebase?.firestore) return false;
      const localToken = ++token;
      try {
        firestoreContext = await firebase.firestore();
        if (localToken !== token) return false;
        uid = nextUid; active = true;
        const { db, sdk } = firestoreContext;
        unsubs.push(sdk.onSnapshot(sdk.collection(db, `players/${uid}/pvpInvites`), (snapshot) => {
          if (!active || localToken !== token) return;
          const next = new Map();
          for (const doc of snapshot.docs || []) {
            const invite = normalizeInvite(doc.id, doc.data?.());
            if (!invite) continue;
            next.set(invite.inviteId, invite);
            if (!seenInvites.has(invite.inviteId)) { seenInvites.add(invite.inviteId); try { onInvite(invite); } catch (_) {} }
          }
          invites = next; emitState();
        }, onError));
        unsubs.push(sdk.onSnapshot(sdk.doc(db, `players/${uid}/pvpState/current`), (snapshot) => {
          if (!active || localToken !== token) return;
          pointer = snapshot.exists() ? { ...snapshot.data() } : null;
          watchBattle(pointer?.battleId || (battle?.status === "finished" && battle?.finishReleased !== true ? battleId : ""), localToken);
          emitState();
        }, onError));
        emitState(); return true;
      } catch (error) { if (localToken === token) onError(error); stop(); return false; }
    }

    return Object.freeze({
      start, stop, isActive: () => active, getState: state,
      invite: (targetUid) => command("invite", { targetUid: text(targetUid) }),
      respondInvite: (inviteId, accept) => command(accept ? "accept" : "reject", { inviteId: text(inviteId) }),
      battleReady: (id) => command("battle-ready", { battleId: text(id) }),
      submitMove: (id, round, commands, facing) => {
        const mirrored = pointer?.initiatorUid && String(pointer.initiatorUid) !== String(uid);
        const outgoing = mirrored ? (commands || []).map((entry) => entry?.type === "move" ? { ...entry, to: mirrorCell(entry.to) } : entry?.type === "face" ? { ...entry, facing: mirrorFacing(entry.facing) } : entry) : commands;
        return command("battle-move", { battleId: text(id), round, commands: outgoing, facing: mirrored ? mirrorFacing(facing) : facing });
      },
      submitAction: (id, round, battleAction) => {
        const mirrored = pointer?.initiatorUid && String(pointer.initiatorUid) !== String(uid);
        const outgoing = mirrored && battleAction?.targetCell ? { ...battleAction, targetCell: mirrorCell(battleAction.targetCell) } : battleAction;
        return command("battle-action", { battleId: text(id), round, battleAction: outgoing });
      },
      advanceBattle: (id) => command("battle-advance", { battleId: text(id) }),
      finishReady: (id, presentationSerial = 0) => command("battle-finish-ready", { battleId: text(id), presentationSerial }),
      exitBattle: (id) => command("battle-exit", { battleId: text(id) }),
      retreat: (id) => command("battle-retreat", { battleId: text(id) }),
    });
  }
  return Object.freeze({ create, normalizeInvite });
});
