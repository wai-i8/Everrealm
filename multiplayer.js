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
  const REMOTE_INTERPOLATION_DELAY_MS = 125;
  const REMOTE_MAX_EXTRAPOLATION_MS = 250;
  const REMOTE_MAX_SNAPSHOT_BUFFER = 24;
  const REMOTE_DISCONTINUITY_DISTANCE = 640;
  const REMOTE_MAX_RENDER_BACKLOG_MS = 1000;

  // Snapshot receipt times and the render timeline intentionally use the same
  // local monotonic clock. RTDB's updatedAt is only used to reject stale
  // records; it is never mixed into interpolation timing.
  function localTimelineNow() {
    return typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  }

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

  function snapshotRecordChanged(previous, next) {
    if (!previous) return true;
    return previous.x !== next.x
      || previous.y !== next.y
      || previous.facing !== next.facing
      || previous.state !== next.state
      || previous.updatedAt !== next.updatedAt;
  }

  function snapshotFromRecord(record, time) {
    return {
      time,
      x: record.x,
      y: record.y,
      facing: record.facing,
      state: record.state,
      updatedAt: record.updatedAt,
    };
  }

  function appendRemoteSnapshot(entry, record, receivedAt = localTimelineNow()) {
    const snapshots = Array.isArray(entry.snapshots) ? entry.snapshots : [];
    const previous = snapshots[snapshots.length - 1] || null;
    if (previous && record.updatedAt > 0 && previous.updatedAt > 0 && record.updatedAt < previous.updatedAt) {
      return { changed: false, stale: true, discontinuity: false };
    }
    if (previous && !snapshotRecordChanged(previous, record)) {
      return { changed: false, stale: false, discontinuity: false };
    }

    const receivedTime = Number.isFinite(Number(receivedAt)) ? Number(receivedAt) : localTimelineNow();
    const time = Math.max(receivedTime, (Number(previous?.time) || 0) + 1);
    const snapshot = snapshotFromRecord(record, time);
    const distance = previous ? Math.hypot(snapshot.x - previous.x, snapshot.y - previous.y) : 0;
    const discontinuity = Boolean(previous && distance > REMOTE_DISCONTINUITY_DISTANCE);
    if (discontinuity) {
      entry.snapshots = [snapshot];
      entry.renderX = snapshot.x;
      entry.renderY = snapshot.y;
      entry.renderTime = snapshot.time - REMOTE_INTERPOLATION_DELAY_MS;
      entry.initialized = false;
      entry.snapCount = (entry.snapCount || 0) + 1;
      entry.lastSnapReason = "discontinuity";
    } else {
      entry.snapshots = [...snapshots, snapshot].slice(-REMOTE_MAX_SNAPSHOT_BUFFER);
    }
    return { changed: true, stale: false, discontinuity };
  }

  function sampleRemoteSnapshots(entry, renderTime) {
    const snapshots = entry.snapshots || [];
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    if (!first || !last) return null;
    if (renderTime <= first.time || snapshots.length === 1) {
      return {
        x: first.x,
        y: first.y,
        facing: first.facing,
        sourceA: first,
        sourceB: null,
        alpha: 0,
        extrapolated: false,
        held: true,
      };
    }

    if (renderTime >= last.time) {
      const previous = snapshots[snapshots.length - 2];
      const elapsed = renderTime - last.time;
      if (previous && last.time > previous.time) {
        // Clamp the extrapolation itself. Once the cap is reached, hold the
        // capped pose rather than switching back to the raw latest sample.
        const cappedElapsed = Math.min(elapsed, REMOTE_MAX_EXTRAPOLATION_MS);
        const scale = cappedElapsed / (last.time - previous.time);
        return {
          x: last.x + (last.x - previous.x) * scale,
          y: last.y + (last.y - previous.y) * scale,
          facing: last.facing,
          sourceA: previous,
          sourceB: last,
          alpha: 1 + scale,
          extrapolated: elapsed > 0,
          held: elapsed > REMOTE_MAX_EXTRAPOLATION_MS,
        };
      }
      return {
        x: last.x,
        y: last.y,
        facing: last.facing,
        sourceA: previous || last,
        sourceB: last,
        alpha: 1,
        extrapolated: false,
        held: true,
      };
    }

    for (let index = 1; index < snapshots.length; index += 1) {
      const next = snapshots[index];
      const previous = snapshots[index - 1];
      if (renderTime > next.time) continue;
      const span = Math.max(1, next.time - previous.time);
      const amount = Math.max(0, Math.min(1, (renderTime - previous.time) / span));
      return {
        x: previous.x + (next.x - previous.x) * amount,
        y: previous.y + (next.y - previous.y) * amount,
        facing: amount >= .5 ? next.facing : previous.facing,
        sourceA: previous,
        sourceB: next,
        alpha: amount,
        extrapolated: false,
        held: false,
      };
    }
    return {
      x: last.x,
      y: last.y,
      facing: last.facing,
      sourceA: snapshots[snapshots.length - 2] || last,
      sourceB: last,
      alpha: 1,
      extrapolated: false,
      held: true,
    };
  }

  function interpolateRemotePlayer(entry, dt, locomotion = defaultLocomotion) {
    const seconds = Math.max(0, Number(dt) || 0);
    if (!Array.isArray(entry.snapshots) || !entry.snapshots.length) {
      // A transient underflow holds the last rendered pose. Never substitute
      // the raw latest target here and then resume delayed interpolation.
      entry.renderX = Number.isFinite(Number(entry.renderX)) ? Number(entry.renderX) : Number(entry.x) || 0;
      entry.renderY = Number.isFinite(Number(entry.renderY)) ? Number(entry.renderY) : Number(entry.y) || 0;
      entry.x = entry.renderX;
      entry.y = entry.renderY;
      entry.moving = false;
      entry.lastRenderSample = {
        timeline: "buffer-underflow-hold",
        renderTime: Number.isFinite(entry.renderTime) ? entry.renderTime : null,
        snapshotA: null,
        snapshotB: null,
        alpha: null,
        bufferedX: entry.renderX,
        bufferedY: entry.renderY,
        rawLatestX: null,
        rawLatestY: null,
        finalX: entry.renderX,
        finalY: entry.renderY,
        extrapolated: false,
        held: false,
      };
      return entry;
    }

    const first = entry.snapshots[0];
    if (!entry.initialized) {
      entry.renderTime = Number.isFinite(entry.renderTime)
        ? entry.renderTime
        : first.time - REMOTE_INTERPOLATION_DELAY_MS;
      entry.renderX = first.x;
      entry.renderY = first.y;
      entry.initialized = true;
      entry.lastSnapReason = entry.lastSnapReason || "initial";
    } else {
      entry.renderTime += seconds * 1000;
    }

    const latest = entry.snapshots[entry.snapshots.length - 1];
    const backlog = latest.time - entry.renderTime;
    if (backlog > REMOTE_MAX_RENDER_BACKLOG_MS) {
      entry.renderTime = latest.time - REMOTE_INTERPOLATION_DELAY_MS;
    }
    const pose = sampleRemoteSnapshots(entry, entry.renderTime);
    if (!pose) return entry;
    entry.renderX = pose.x;
    entry.renderY = pose.y;
    const previous = entry.snapshots[entry.snapshots.length - 2];
    const hasRecentMovement = previous
      && Math.hypot(latest.x - previous.x, latest.y - previous.y) > .35
      && entry.renderTime <= latest.time + REMOTE_MAX_EXTRAPOLATION_MS;
    const moving = entry.state !== "battle" && Boolean(hasRecentMovement);
    if (locomotion?.update) {
      entry.locomotion = locomotion.update(entry.locomotion, {
        moving,
        facing: pose.facing || entry.facing,
        dt: seconds,
      });
    } else {
      entry.locomotion = {
        state: moving ? "walk" : "idle",
        facing: pose.facing || entry.facing,
        time: moving ? (entry.locomotion?.time || 0) + seconds : 0,
      };
    }
    entry.moving = moving;
    entry.x = entry.renderX;
    entry.y = entry.renderY;
    entry.lastRenderSample = {
      timeline: "local-monotonic-receive-render",
      renderTime: entry.renderTime,
      snapshotA: pose.sourceA ? { time: pose.sourceA.time, x: pose.sourceA.x, y: pose.sourceA.y } : null,
      snapshotB: pose.sourceB ? { time: pose.sourceB.time, x: pose.sourceB.x, y: pose.sourceB.y } : null,
      alpha: pose.alpha,
      bufferedX: pose.x,
      bufferedY: pose.y,
      rawLatestX: latest.x,
      rawLatestY: latest.y,
      finalX: entry.renderX,
      finalY: entry.renderY,
      extrapolated: Boolean(pose.extrapolated),
      held: Boolean(pose.held),
    };
    return entry;
  }

  function create(options = {}) {
    const firebase = options.firebase || defaultFirebase;
    const locomotion = options.locomotion || defaultLocomotion;
    const debug = typeof options.debug === "function" ? options.debug : null;
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
    let pendingSnapshotWrite = null;
    let snapshotDrainPromise = null;
    const renderedRemotePlayers = new Set();
    const firstRenderedRemotePlayers = new Set();
    const renderedBattleIcons = new Set();

    function trace(event, details = {}) {
      if (!debug) return;
      try {
        debug({ event, timestamp: Date.now(), timelineTime: localTimelineNow(), mapId, uid, ...details });
      } catch (_) {
        // Optional diagnostics must never affect multiplayer state handling.
      }
    }

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

    function ensureSnapshotDrain() {
      if (snapshotDrainPromise) return snapshotDrainPromise;
      snapshotDrainPromise = (async () => {
        while (pendingSnapshotWrite) {
          const task = pendingSnapshotWrite;
          pendingSnapshotWrite = null;
          await queueWrite(task);
        }
      })().finally(() => {
        snapshotDrainPromise = null;
        if (pendingSnapshotWrite) ensureSnapshotDrain();
      });
      return snapshotDrainPromise;
    }

    function queueLatestSnapshotWrite(task) {
      pendingSnapshotWrite = task;
      return ensureSnapshotDrain();
    }

    async function waitForWrites() {
      while (snapshotDrainPromise || pendingSnapshotWrite) {
        const drain = snapshotDrainPromise || ensureSnapshotDrain();
        await drain;
      }
      await writeChain;
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
      const receivedAt = localTimelineNow();
      trace("remote.listener.received", { receivedAt });
      const next = new Map();
      snapshot?.forEach?.((child) => {
        if (child.key === uid) return;
        const record = normalizePlayerRecord(child.key, child.val());
        if (!record) return;
        const previous = remotePlayers.get(record.uid);
        const stateChanged = Boolean(previous && previous.state !== record.state);
        const entry = {
          ...(previous || {}),
          ...record,
          targetX: record.x,
          targetY: record.y,
          renderX: previous?.renderX ?? record.x,
          renderY: previous?.renderY ?? record.y,
          initialized: previous?.initialized ?? false,
          renderTime: previous?.renderTime,
          snapshots: previous?.snapshots || [],
          snapCount: previous?.snapCount || 0,
          locomotion: previous?.locomotion || locomotion?.create?.(record.facing) || { state: "idle", facing: record.facing, time: 0 },
        };
        if (stateChanged) {
          // Battle entry/exit and nearby respawn returns are explicit lifecycle
          // boundaries. Do not blend their positions with the prior timeline.
          entry.snapshots = [];
          entry.renderTime = undefined;
          entry.renderX = record.x;
          entry.renderY = record.y;
          entry.initialized = false;
          entry.lastSnapReason = "state-transition";
        }
        const result = appendRemoteSnapshot(entry, record, receivedAt);
        if (result.stale) {
          // onValue delivers a complete map snapshot. Retain the last accepted
          // entity instead of deleting it just because this child is stale.
          if (previous) next.set(record.uid, previous);
          return;
        }
        if (result.changed) {
          trace(previous ? "remote.record.processed" : "remote.entity.created", {
            remoteUid: record.uid,
            state: record.state,
            x: record.x,
            y: record.y,
            discontinuity: result.discontinuity,
          });
        }
        if (stateChanged) {
          trace("remote.entity.state-updated", { remoteUid: record.uid, state: record.state });
          if (record.state !== "battle") renderedBattleIcons.delete(record.uid);
        }
        next.set(record.uid, entry);
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
        trace("presence.write.begin", { mapId: currentMapId });
        return sdk.set(ref, {
        online: true,
        mapId: currentMapId,
        lastSeen: sdk.serverTimestamp(),
        connectionId,
        }).then((result) => {
          trace("presence.write.complete", { mapId: currentMapId });
          return result;
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
      return queueLatestSnapshotWrite(() => {
        trace("map.write.begin", { mapId: snapshot.mapId, state: snapshot.state, x: snapshot.x, y: snapshot.y });
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
        }).then((result) => {
          trace("map.write.complete", { mapId: snapshot.mapId, state: snapshot.state });
          return result;
        });
      });
    }

    async function setMap(nextMapId) {
      if (!active || !context || !nextMapId) return false;
      const safeMapId = String(nextMapId).trim();
      if (!safeMapId) return false;
      if (safeMapId === mapId && mapRef) return true;
      const token = ++operationToken;
      const oldMapRef = mapRef;
      const oldMapId = mapId;
      const oldMapUnsubscribe = mapUnsubscribe;
      trace("map.leave.begin", { fromMapId: oldMapId, toMapId: safeMapId });
      oldMapUnsubscribe();
      mapUnsubscribe = () => {};
      const oldWriteDrain = waitForWrites();
      pendingSnapshotWrite = null;

      mapId = safeMapId;
      mapRef = context.sdk.ref(context.database, `maps/${mapId}/players/${uid}`);
      presenceRef = context.sdk.ref(context.database, `presence/${uid}`);
      remotePlayers = new Map();
      renderedRemotePlayers.clear();
      firstRenderedRemotePlayers.clear();
      renderedBattleIcons.clear();
      trace("map.join.begin", { fromMapId: oldMapId, toMapId: safeMapId });
      mapUnsubscribe = context.sdk.onValue(
        context.sdk.ref(context.database, `maps/${mapId}/players`),
        applyRemoteSnapshot,
        (error) => logError("map subscription", error),
      );
      trace("map.listener.attached", { mapId: safeMapId });

      const disconnectSetup = Promise.all([armDisconnect(mapRef), armDisconnect(presenceRef)]);
      const oldMapRemoval = oldWriteDrain.then(async () => {
        if (!oldMapRef || oldMapRef === mapRef) return;
        try {
          await context.sdk.remove(oldMapRef);
          trace("map.leave.complete", { mapId: oldMapId });
        } catch (error) {
          logError("old map removal", error);
        }
      });

      if (!active || token !== operationToken) return false;
      lastPublishedSnapshot = null;
      lastPublishedAt = -Infinity;
      lastPresenceAt = -Infinity;
      const snapshot = readLocalSnapshot({ mapId, state: "exploring" });
      localSnapshot = snapshot;
      await Promise.all([
        disconnectSetup,
        writePresence(true),
        writeLocalSnapshot(snapshot, { force: true }),
        oldMapRemoval,
      ]);
      if (!active || token !== operationToken) return false;
      trace("map.join.complete", { mapId: safeMapId });
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
      renderedRemotePlayers.clear();
      firstRenderedRemotePlayers.clear();
      renderedBattleIcons.clear();
      localSnapshot = null;
      lastPublishedSnapshot = null;
      pendingSnapshotWrite = null;
      if (context?.sdk) {
        await waitForWrites();
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
      for (const player of remotePlayers.values()) {
        interpolateRemotePlayer(player, dt, locomotion);
        if (debug) trace("remote.render.sample", { remoteUid: player.uid, ...player.lastRenderSample });
      }
    }

    function getRenderPlayers(requestedMapId = mapId) {
      if (!active || requestedMapId !== mapId) return [];
      return [...remotePlayers.values()].map((player) => {
        if (!renderedRemotePlayers.has(player.uid)) {
          renderedRemotePlayers.add(player.uid);
          trace("remote.entity.inserted", { remoteUid: player.uid });
        }
        return {
        ...player,
        kind: "remote-player",
        x: player.renderX,
        y: player.renderY,
        };
      });
    }

    function markRemoteRendered(remoteUid) {
      if (!remoteUid || firstRenderedRemotePlayers.has(remoteUid)) return;
      firstRenderedRemotePlayers.add(remoteUid);
      trace("remote.entity.first-rendered", { remoteUid });
    }

    function markRemoteBattleIconRendered(remoteUid) {
      if (!remoteUid || renderedBattleIcons.has(remoteUid)) return;
      renderedBattleIcons.add(remoteUid);
      trace("remote.battle-icon.rendered", { remoteUid });
    }

    return Object.freeze({
      start,
      stop,
      setMap,
      updateLocal,
      setState,
      tick,
      getRenderPlayers,
      markRemoteRendered,
      markRemoteBattleIconRendered,
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
    REMOTE_INTERPOLATION_DELAY_MS,
    REMOTE_MAX_EXTRAPOLATION_MS,
    REMOTE_MAX_SNAPSHOT_BUFFER,
    REMOTE_DISCONTINUITY_DISTANCE,
    normalizePlayerRecord,
    snapshotChanged,
    shouldPublishSnapshot,
    appendRemoteSnapshot,
    interpolateRemotePlayer,
    create,
  });
});
