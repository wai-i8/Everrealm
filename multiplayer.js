(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(null, null);
  else root.EverrealmMultiplayer = factory(root.EverrealmFirebase, root.LanternLocomotion);
})(typeof globalThis !== "undefined" ? globalThis : this, function (defaultFirebase, defaultLocomotion) {
  "use strict";

  const PLAYER_STATES = Object.freeze(["exploring", "battle"]);
  const VALID_FACING = Object.freeze(["up", "right", "down", "left"]);
  const POSITION_EPSILON = 1;
  const EXPLORATION_WRITE_INTERVAL_MS = 125;
  const BATTLE_HEARTBEAT_INTERVAL_MS = 15000;
  const PRESENCE_HEARTBEAT_INTERVAL_MS = 15000;
  const REMOTE_INTERPOLATION_SPEED = 12;
  const REMOTE_SNAP_DISTANCE = 180;

  function validState(value) {
    return PLAYER_STATES.includes(value) ? value : "exploring";
  }

  function validFacing(value) {
    return VALID_FACING.includes(value) ? value : "down";
  }

  function safeName(value) {
    return String(value || "冒險者").trim().slice(0, 24) || "冒險者";
  }

  function normalizePlayerRecord(uid, raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const safeUid = String(uid || source.uid || "").trim();
    if (!safeUid) return null;
    const x = Number(source.x);
    const y = Number(source.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return {
      uid: safeUid,
      name: safeName(source.name),
      classId: String(source.classId || "warrior").trim() || "warrior",
      x,
      y,
      facing: validFacing(source.facing),
      state: validState(source.state),
      updatedAt: Number.isFinite(Number(source.updatedAt)) ? Number(source.updatedAt) : 0,
    };
  }

  function snapshotChanged(previous, next) {
    if (!previous) return true;
    return previous.mapId !== next.mapId
      || previous.name !== next.name
      || previous.classId !== next.classId
      || previous.facing !== next.facing
      || previous.state !== next.state
      || Math.hypot(previous.x - next.x, previous.y - next.y) >= POSITION_EPSILON;
  }

  function shouldPublishSnapshot(previous, next, { now = 0, lastPublishedAt = -Infinity, force = false } = {}) {
    const stateChanged = !previous || previous.state !== next.state;
    if (force || stateChanged || snapshotChanged(previous, next) && next.state !== "battle") {
      return now - lastPublishedAt >= EXPLORATION_WRITE_INTERVAL_MS || force || !previous || stateChanged;
    }
    return next.state === "battle" && now - lastPublishedAt >= BATTLE_HEARTBEAT_INTERVAL_MS;
  }

  function interpolateRemotePlayer(entry, dt, locomotion = defaultLocomotion) {
    const seconds = Math.max(0, Number(dt) || 0);
    const dx = entry.targetX - entry.renderX;
    const dy = entry.targetY - entry.renderY;
    const distance = Math.hypot(dx, dy);
    if (!entry.initialized || distance > REMOTE_SNAP_DISTANCE) {
      entry.renderX = entry.targetX;
      entry.renderY = entry.targetY;
      entry.initialized = true;
    } else {
      const amount = 1 - Math.exp(-REMOTE_INTERPOLATION_SPEED * seconds);
      entry.renderX += dx * amount;
      entry.renderY += dy * amount;
    }
    const moving = Math.hypot(entry.targetX - entry.renderX, entry.targetY - entry.renderY) > .35;
    if (locomotion?.update) {
      entry.locomotion = locomotion.update(entry.locomotion, {
        moving,
        facing: entry.facing,
        dt: seconds,
      });
    } else {
      entry.locomotion = {
        state: moving ? "walk" : "idle",
        facing: entry.facing,
        time: moving ? (entry.locomotion?.time || 0) + seconds : 0,
      };
    }
    entry.moving = moving;
    entry.x = entry.renderX;
    entry.y = entry.renderY;
    return entry;
  }

  function create(options = {}) {
    const firebase = options.firebase || defaultFirebase;
    const locomotion = options.locomotion || defaultLocomotion;
    let active = false;
    let uid = null;
    let connectionId = null;
    let context = null;
    let mapId = null;
    let mapRef = null;
    let presenceRef = null;
    let mapUnsubscribe = () => {};
    let connectedUnsubscribe = () => {};
    let remotePlayers = new Map();
    let getLocalPlayer = () => null;
    let localSnapshot = null;
    let lastPublishedSnapshot = null;
    let lastPublishedAt = -Infinity;
    let lastPresenceAt = -Infinity;
    let operationToken = 0;
    let writeChain = Promise.resolve();

    function logError(label, error) {
      if (error) console.warn(`Everrealm multiplayer ${label} failed.`, error);
    }

    function queueWrite(task) {
      writeChain = writeChain.then(task).catch((error) => {
        logError("write", error);
        return null;
      });
      return writeChain;
    }

    function readLocalSnapshot(overrides = {}) {
      const source = typeof getLocalPlayer === "function" ? getLocalPlayer() : null;
      const value = { ...(source || {}), ...overrides };
      const resolvedMapId = String(value.mapId || mapId || "").trim();
      if (!uid || !resolvedMapId) return null;
      const x = Number(value.x);
      const y = Number(value.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return {
        uid,
        mapId: resolvedMapId,
        name: safeName(value.name),
        classId: String(value.classId || "warrior").trim() || "warrior",
        x,
        y,
        facing: validFacing(value.facing),
        state: validState(value.state),
      };
    }

    function applyRemoteSnapshot(snapshot) {
      const next = new Map();
      snapshot?.forEach?.((child) => {
        if (child.key === uid) return;
        const record = normalizePlayerRecord(child.key, child.val());
        if (!record) return;
        const previous = remotePlayers.get(record.uid);
        next.set(record.uid, {
          ...(previous || {}),
          ...record,
          targetX: record.x,
          targetY: record.y,
          renderX: previous?.renderX ?? record.x,
          renderY: previous?.renderY ?? record.y,
          initialized: previous?.initialized ?? false,
          locomotion: previous?.locomotion || locomotion?.create?.(record.facing) || { state: "idle", facing: record.facing, time: 0 },
        });
      });
      remotePlayers = next;
    }

    async function armDisconnect(ref) {
      if (!ref || !context?.sdk?.onDisconnect) return;
      try {
        await context.sdk.onDisconnect(ref).remove();
      } catch (error) {
        logError("disconnect cleanup", error);
      }
    }

    async function writePresence(force = false) {
      if (!active || !presenceRef || !mapId || !context) return;
      const now = Date.now();
      if (!force && now - lastPresenceAt < PRESENCE_HEARTBEAT_INTERVAL_MS) return;
      lastPresenceAt = now;
      const { sdk } = context;
      const ref = presenceRef;
      const token = operationToken;
      const currentMapId = mapId;
      return queueWrite(() => {
        if (!active || token !== operationToken || ref !== presenceRef) return null;
        return sdk.set(ref, {
        online: true,
        mapId: currentMapId,
        lastSeen: sdk.serverTimestamp(),
        connectionId,
        });
      });
    }

    async function writeLocalSnapshot(snapshot, { force = false } = {}) {
      if (!active || !mapRef || !context || !snapshot) return;
      const now = Date.now();
      if (!shouldPublishSnapshot(lastPublishedSnapshot, snapshot, { now, lastPublishedAt, force })) return;
      lastPublishedSnapshot = { ...snapshot };
      lastPublishedAt = now;
      const { sdk } = context;
      const ref = mapRef;
      const token = operationToken;
      return queueWrite(() => {
        if (!active || token !== operationToken || ref !== mapRef) return null;
        return sdk.set(ref, {
          uid: snapshot.uid,
          name: snapshot.name,
          classId: snapshot.classId,
          x: snapshot.x,
          y: snapshot.y,
          facing: snapshot.facing,
          state: snapshot.state,
          updatedAt: sdk.serverTimestamp(),
        });
      });
    }

    async function setMap(nextMapId) {
      if (!active || !context || !nextMapId) return false;
      const safeMapId = String(nextMapId).trim();
      if (!safeMapId) return false;
      const token = ++operationToken;
      const oldMapRef = mapRef;
      const oldMapUnsubscribe = mapUnsubscribe;
      oldMapUnsubscribe();
      mapUnsubscribe = () => {};
      await writeChain;
      if (oldMapRef) {
        try { await context.sdk.remove(oldMapRef); } catch (error) { logError("old map removal", error); }
      }
      if (!active || token !== operationToken) return false;
      mapId = safeMapId;
      mapRef = context.sdk.ref(context.database, `maps/${mapId}/players/${uid}`);
      presenceRef = context.sdk.ref(context.database, `presence/${uid}`);
      remotePlayers = new Map();
      mapUnsubscribe = context.sdk.onValue(
        context.sdk.ref(context.database, `maps/${mapId}/players`),
        applyRemoteSnapshot,
        (error) => logError("map subscription", error),
      );
      await armDisconnect(mapRef);
      await armDisconnect(presenceRef);
      if (!active || token !== operationToken) return false;
      lastPublishedSnapshot = null;
      lastPublishedAt = -Infinity;
      lastPresenceAt = -Infinity;
      const snapshot = readLocalSnapshot({ mapId, state: "exploring" });
      localSnapshot = snapshot;
      await writePresence(true);
      await writeLocalSnapshot(snapshot, { force: true });
      return true;
    }

    async function start({ uid: nextUid, getPlayer } = {}) {
      await stop();
      const safeUid = String(nextUid || "").trim();
      if (!safeUid || !firebase || typeof firebase.realtime !== "function") return false;
      const nextContext = await firebase.realtime();
      uid = safeUid;
      context = nextContext;
      getLocalPlayer = typeof getPlayer === "function" ? getPlayer : () => null;
      connectionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      active = true;
      connectedUnsubscribe = context.sdk.onValue(
        context.sdk.ref(context.database, ".info/connected"),
        (snapshot) => {
          if (!active || !snapshot.val()) return;
          void armDisconnect(mapRef);
          void armDisconnect(presenceRef);
          void writePresence(true);
        },
        (error) => logError("connection watch", error),
      );
      const initial = readLocalSnapshot();
      if (initial?.mapId) await setMap(initial.mapId);
      return true;
    }

    async function stop() {
      const oldMapRef = mapRef;
      const oldPresenceRef = presenceRef;
      active = false;
      operationToken += 1;
      connectedUnsubscribe();
      mapUnsubscribe();
      connectedUnsubscribe = () => {};
      mapUnsubscribe = () => {};
      mapRef = null;
      presenceRef = null;
      mapId = null;
      remotePlayers = new Map();
      localSnapshot = null;
      lastPublishedSnapshot = null;
      if (context?.sdk) {
        await writeChain;
        await Promise.all([
          oldMapRef ? context.sdk.remove(oldMapRef).catch((error) => logError("map removal", error)) : Promise.resolve(),
          oldPresenceRef ? context.sdk.remove(oldPresenceRef).catch((error) => logError("presence removal", error)) : Promise.resolve(),
        ]);
      }
      uid = null;
      connectionId = null;
      context = null;
      writeChain = Promise.resolve();
    }

    function updateLocal(snapshot = null, options = {}) {
      if (!active) return false;
      const value = snapshot || readLocalSnapshot();
      if (!value) return false;
      if (value.mapId !== mapId) {
        void setMap(value.mapId);
        return true;
      }
      localSnapshot = value;
      void writePresence(false);
      void writeLocalSnapshot(value, options);
      return true;
    }

    function setState(state) {
      const normalized = validState(state);
      return updateLocal(readLocalSnapshot({ state: normalized }), { force: true });
    }

    function tick(dt) {
      for (const player of remotePlayers.values()) interpolateRemotePlayer(player, dt, locomotion);
    }

    function getRenderPlayers(requestedMapId = mapId) {
      if (!active || requestedMapId !== mapId) return [];
      return [...remotePlayers.values()].map((player) => ({
        ...player,
        kind: "remote-player",
        x: player.renderX,
        y: player.renderY,
      }));
    }

    return Object.freeze({
      start,
      stop,
      setMap,
      updateLocal,
      setState,
      tick,
      getRenderPlayers,
      getLocalSnapshot: () => localSnapshot,
      isActive: () => active,
      getMapId: () => mapId,
      normalizePlayerRecord,
      interpolateRemotePlayer,
    });
  }

  return Object.freeze({
    PLAYER_STATES,
    VALID_FACING,
    EXPLORATION_WRITE_INTERVAL_MS,
    BATTLE_HEARTBEAT_INTERVAL_MS,
    normalizePlayerRecord,
    snapshotChanged,
    shouldPublishSnapshot,
    interpolateRemotePlayer,
    create,
  });
});
