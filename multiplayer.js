(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(null, null);
  else root.EverrealmMultiplayer = factory(root.EverrealmFirebase, root.EverrealmLocomotion);
})(typeof globalThis !== "undefined" ? globalThis : this, function (defaultFirebase, defaultLocomotion) {
  "use strict";

  const PLAYER_STATES = Object.freeze(["exploring", "battle"]);
  const VALID_FACING = Object.freeze(["up", "right", "down", "left"]);
  const POSITION_EPSILON = 1;
  const EXPLORATION_WRITE_INTERVAL_MS = 100;
  const BATTLE_HEARTBEAT_INTERVAL_MS = 15000;
  const PRESENCE_HEARTBEAT_INTERVAL_MS = 15000;
  // Render remote exploration on a deliberately delayed 500 ms timeline.
  // Everrealm values stable, faithful motion over twitch responsiveness.
  const REMOTE_INTERPOLATION_DELAY_MS = 500;
  const REMOTE_MAX_EXTRAPOLATION_MS = 0;
  const REMOTE_MAX_SNAPSHOT_BUFFER = 32;
  const REMOTE_DISCONTINUITY_DISTANCE = 640;
  const REMOTE_HOLD_MOVING_GRACE_MS = 180;

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

  function quantizeMotionHeading(dx, dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) <= .001) return null;
    const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    return ((octant % 8) + 8) % 8;
  }

  function facingFromSegment(dx, dy, fallback = "down") {
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) <= .001) {
      return validFacing(fallback);
    }
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
    return dy >= 0 ? "down" : "up";
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
      classId: String(source.classId || "fighter").trim() || "fighter",
      gender: String(source.gender || "").trim().toLowerCase() === "female" ? "female" : "male",
      x,
      y,
      facing: validFacing(source.facing),
      state: validState(source.state),
      moving: Boolean(source.moving),
      seq: Math.max(0, Math.floor(Number(source.seq) || 0)),
      sampledAt: Number.isFinite(Number(source.sampledAt)) ? Number(source.sampledAt) : 0,
      updatedAt: Number.isFinite(Number(source.updatedAt)) ? Number(source.updatedAt) : 0,
    };
  }

  function snapshotChanged(previous, next) {
    if (!previous) return true;
    return previous.mapId !== next.mapId
      || previous.name !== next.name
      || previous.classId !== next.classId
      || previous.gender !== next.gender
      || previous.facing !== next.facing
      || previous.state !== next.state
      || Boolean(previous.moving) !== Boolean(next.moving)
      || Math.hypot(previous.x - next.x, previous.y - next.y) >= POSITION_EPSILON;
  }

  function urgentSnapshotChanged(previous, next) {
    if (!previous) return true;
    return previous.mapId !== next.mapId
      || previous.name !== next.name
      || previous.classId !== next.classId
      || previous.gender !== next.gender
      || previous.facing !== next.facing
      || previous.state !== next.state
      || Boolean(previous.moving) !== Boolean(next.moving)
      || (Boolean(previous.moving) && Boolean(next.moving) && previous.motionHeading !== next.motionHeading);
  }

  function shouldPublishSnapshot(previous, next, { now = 0, lastPublishedAt = -Infinity, force = false } = {}) {
    if (force || !previous || urgentSnapshotChanged(previous, next)) return true;
    if (next.state === "battle") return now - lastPublishedAt >= BATTLE_HEARTBEAT_INTERVAL_MS;
    const moved = Math.hypot(previous.x - next.x, previous.y - next.y) >= POSITION_EPSILON;
    return moved && now - lastPublishedAt >= EXPLORATION_WRITE_INTERVAL_MS;
  }

  function snapshotRecordChanged(previous, next) {
    if (!previous) return true;
    return previous.x !== next.x
      || previous.y !== next.y
      || previous.gender !== next.gender
      || previous.facing !== next.facing
      || previous.state !== next.state
      || Boolean(previous.moving) !== Boolean(next.moving)
      || previous.seq !== next.seq
      || previous.sampledAt !== next.sampledAt
      || previous.updatedAt !== next.updatedAt;
  }

  function snapshotFromRecord(record, time) {
    return {
      time,
      x: record.x,
      y: record.y,
      facing: record.facing,
      state: record.state,
      moving: Boolean(record.moving),
      seq: record.seq || 0,
      sampledAt: record.sampledAt || 0,
      updatedAt: record.updatedAt,
    };
  }

  function appendRemoteSnapshot(entry, record, receivedAt = Date.now()) {
    const snapshots = Array.isArray(entry.snapshots) ? entry.snapshots : [];
    const previous = snapshots[snapshots.length - 1] || null;

    // Interpolate using the time at which the sender actually sampled x/y.
    // `updatedAt` is still useful for stale-write ordering, but it is assigned
    // when Firebase commits the write and can be delayed by the write queue.
    // Using commit time as movement time makes old positions appear to take a
    // long time, then newer positions appear to cover distance impossibly fast.
    // Sequence is the primary ordering key. Movement writes are intentionally
    // allowed to be in flight concurrently, so never let an older sequence
    // rewind an already accepted remote player even if callbacks/ACK timing
    // happens to vary. Fall back to commit time only for legacy records that
    // do not carry a sequence number.
    if (previous && record.seq > 0 && previous.seq > 0 && record.seq <= previous.seq) {
      return { changed: false, stale: true, discontinuity: false };
    }
    if (previous && !(record.seq > 0 && previous.seq > 0)
        && record.updatedAt > 0 && previous.updatedAt > 0
        && record.updatedAt < previous.updatedAt) {
      return { changed: false, stale: true, discontinuity: false };
    }
    if (previous && !snapshotRecordChanged(previous, record)) {
      return { changed: false, stale: false, discontinuity: false };
    }

    const fallbackTime = Number.isFinite(Number(receivedAt)) ? Number(receivedAt) : Date.now();
    const rawTime = record.sampledAt > 0
      ? record.sampledAt
      : (record.updatedAt > 0 ? record.updatedAt : fallbackTime);
    const time = Math.max(rawTime, (Number(previous?.time) || 0) + 1);
    const snapshot = snapshotFromRecord(record, time);
    const distance = previous ? Math.hypot(snapshot.x - previous.x, snapshot.y - previous.y) : 0;
    const discontinuity = Boolean(previous && distance > REMOTE_DISCONTINUITY_DISTANCE);
    if (discontinuity) {
      entry.snapshots = [snapshot];
      entry.renderX = snapshot.x;
      entry.renderY = snapshot.y;
      entry.renderTime = undefined;
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
        // We are intentionally holding before the buffered timeline begins.
        // Do not play a walk cycle while the world position is stationary.
        moving: false,
        sourceA: first,
        sourceB: null,
        alpha: 0,
        extrapolated: false,
        held: true,
        holdReason: "prebuffer",
      };
    }

    // Never predict past the newest authoritative sample during ordinary
    // exploration. With a buffered interpolation timeline, a short hold is far
    // less noticeable than overshooting a turn and then sliding backwards.
    if (renderTime >= last.time) {
      return {
        x: last.x,
        y: last.y,
        facing: last.facing,
        // No future authoritative point exists yet, so hold both position and
        // locomotion instead of running in place while waiting for more data.
        moving: false,
        sourceA: snapshots[snapshots.length - 2] || last,
        sourceB: last,
        alpha: 1,
        extrapolated: false,
        held: true,
        holdReason: "tail",
      };
    }

    for (let index = 1; index < snapshots.length; index += 1) {
      const next = snapshots[index];
      const previous = snapshots[index - 1];
      if (renderTime >= next.time) continue;
      const span = Math.max(1, next.time - previous.time);
      const dx = next.x - previous.x;
      const dy = next.y - previous.y;
      const distance = Math.hypot(dx, dy);

      // A stationary player does not publish 10 Hz movement samples, so the
      // previous idle sample can be several seconds older than the first
      // moving sample. Never stretch that whole idle gap into a walking
      // segment. Hold the old idle pose until the delayed timeline actually
      // reaches the first moving sample; then the following 100 ms samples
      // carry the real movement path.
      const idleToMovingGap = !Boolean(previous.moving)
        && Boolean(next.moving)
        && span > EXPLORATION_WRITE_INTERVAL_MS * 2;
      if (idleToMovingGap && renderTime < next.time) {
        return {
          x: previous.x,
          y: previous.y,
          facing: previous.facing,
          moving: false,
          sourceA: previous,
          sourceB: next,
          alpha: 0,
          extrapolated: false,
          held: true,
          holdReason: "idle-gap",
        };
      }

      // Direction-change snapshots can legitimately have the same coordinate
      // on both sides of the turn. They are path markers, not an authoritative
      // stop. Keep the character in its walking state and freeze cadence for
      // this zero-distance marker instead of resetting to idle/frame 1.
      const turnMarker = distance <= .35 && Boolean(previous.moving) && Boolean(next.moving);
      if (turnMarker) {
        return {
          x: previous.x,
          y: previous.y,
          facing: previous.facing,
          moving: false,
          sourceA: previous,
          sourceB: next,
          alpha: 0,
          extrapolated: false,
          held: true,
          holdReason: "turn-marker",
        };
      }

      const amount = Math.max(0, Math.min(1, (renderTime - previous.time) / span));
      const segmentMoving = distance > .35;
      // Position is continuous between ordinary adjacent movement samples,
      // while facing/moving are derived from that SAME delayed segment.
      const segmentFacing = segmentMoving
        ? facingFromSegment(dx, dy, previous.facing)
        : previous.facing;
      return {
        x: previous.x + dx * amount,
        y: previous.y + dy * amount,
        facing: amount >= 1 ? next.facing : segmentFacing,
        moving: amount < 1 && segmentMoving,
        sourceA: previous,
        sourceB: next,
        alpha: amount,
        extrapolated: false,
        held: false,
        holdReason: null,
      };
    }
    return {
      x: last.x,
      y: last.y,
      facing: last.facing,
      moving: Boolean(last.moving),
      sourceA: snapshots[snapshots.length - 2] || last,
      sourceB: last,
      alpha: 1,
      extrapolated: false,
      held: true,
      holdReason: "tail",
    };
  }

  function interpolateRemotePlayer(entry, dt, locomotion = defaultLocomotion, options = {}) {
    const seconds = Math.max(0, Number(dt) || 0);
    if (!Array.isArray(entry.snapshots) || !entry.snapshots.length) {
      entry.renderX = Number.isFinite(Number(entry.renderX)) ? Number(entry.renderX) : Number(entry.x) || 0;
      entry.renderY = Number.isFinite(Number(entry.renderY)) ? Number(entry.renderY) : Number(entry.y) || 0;
      entry.x = entry.renderX;
      entry.y = entry.renderY;
      entry.renderFacing = entry.renderFacing || entry.facing || "down";
      entry.renderMoving = false;
      entry.moving = false;
      return entry;
    }

    const first = entry.snapshots[0];
    const latest = entry.snapshots[entry.snapshots.length - 1];
    const explicitNow = Number(options?.now);
    if (Number.isFinite(explicitNow)) {
      entry.renderTime = explicitNow - REMOTE_INTERPOLATION_DELAY_MS;
    } else if (latest.time > 100000000000) {
      // Runtime fallback for direct callers that do not inject serverNow.
      entry.renderTime = Date.now() - REMOTE_INTERPOLATION_DELAY_MS;
    } else if (!entry.initialized || !Number.isFinite(entry.renderTime)) {
      // Deterministic small-timestamp fallback used by unit tests.
      entry.renderTime = first.time - REMOTE_INTERPOLATION_DELAY_MS;
    } else {
      entry.renderTime += seconds * 1000;
    }

    if (!entry.initialized) {
      entry.renderX = first.x;
      entry.renderY = first.y;
      entry.initialized = true;
      entry.lastSnapReason = entry.lastSnapReason || "initial";
    }

    const pose = sampleRemoteSnapshots(entry, entry.renderTime);
    if (!pose) return entry;

    const previousRenderX = Number.isFinite(Number(entry.renderX)) ? Number(entry.renderX) : pose.x;
    const previousRenderY = Number.isFinite(Number(entry.renderY)) ? Number(entry.renderY) : pose.y;
    const previousLocomotion = entry.locomotion || { state: "idle", facing: pose.facing || "down", time: 0 };

    entry.renderX = pose.x;
    entry.renderY = pose.y;
    entry.renderFacing = pose.facing || entry.renderFacing || entry.facing || "down";

    // Remote walking cadence must follow the delayed visual timeline, not RTDB
    // packet arrival. In particular, a short tail hold caused by network jitter
    // must FREEZE the current foot frame instead of resetting the walk cycle to
    // idle, and a continuous turn must keep the same cadence when facing changes.
    const renderedDistance = Math.hypot(entry.renderX - previousRenderX, entry.renderY - previousRenderY);
    const timelineMoving = entry.state !== "battle" && Boolean(pose.moving);
    const cadenceHoldWhileAuthoritativelyMoving = entry.state !== "battle"
      && (pose.holdReason === "tail" || pose.holdReason === "turn-marker")
      && Boolean(pose.sourceB?.moving);
    const actualIdleHold = pose.holdReason === "prebuffer" || pose.holdReason === "idle-gap";
    const visuallyAdvancing = timelineMoving && renderedDistance > .001;

    if (visuallyAdvancing) {
      // Preserve the walk phase across facing changes. EverrealmLocomotion.update()
      // intentionally resets on a facing change, which is correct for local
      // authored movement but looks like repeated left/right-foot frames for
      // jittery remote snapshots.
      entry.remoteWalkTime = Math.max(0, Number(entry.remoteWalkTime ?? previousLocomotion.time) || 0) + seconds;
      entry.locomotion = {
        state: "walk",
        facing: entry.renderFacing,
        time: entry.remoteWalkTime,
      };
      entry.renderMoving = true;
    } else if ((cadenceHoldWhileAuthoritativelyMoving || timelineMoving)
        && previousLocomotion.state === "walk" && !actualIdleHold) {
      // Network tail starvation, a zero-distance turn marker, or the exact
      // first frame of the next moving segment: freeze the current foot frame
      // until the delayed path advances again. Keep renderMoving=true because
      // game.js selects the remote sprite's walk/idle state from that flag;
      // setting it false would visually reset to idle.
      entry.remoteWalkTime = Math.max(0, Number(entry.remoteWalkTime ?? previousLocomotion.time) || 0);
      entry.locomotion = {
        state: "walk",
        facing: entry.renderFacing,
        time: entry.remoteWalkTime,
      };
      entry.renderMoving = true;
    } else {
      // This is a real delayed idle/stop (including the long idle->moving gap).
      // Reset once here so a later genuine movement start begins a fresh cycle.
      entry.remoteWalkTime = 0;
      entry.locomotion = {
        state: "idle",
        facing: entry.renderFacing,
        time: 0,
      };
      entry.renderMoving = false;
    }
    // Keep the latest network-facing/moving values on the entity for diagnostics,
    // but the renderer must only receive the delayed visual pose below.
    entry.x = entry.renderX;
    entry.y = entry.renderY;
    entry.lastRenderSample = {
      timeline: "firebase-server-buffered",
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
      renderFacing: entry.renderFacing,
      renderMoving: entry.renderMoving,
      rawLatestFacing: latest.facing,
      rawLatestMoving: Boolean(latest.moving),
      extrapolated: false,
      held: Boolean(pose.held),
      holdReason: pose.holdReason || null,
      renderedDistance,
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
    let serverTimeOffsetUnsubscribe = () => {};
    let serverTimeOffset = 0;
    let remotePlayers = new Map();
    let getLocalPlayer = () => null;
    let localSnapshot = null;
    let lastPublishedSnapshot = null;
    let lastPublishedAt = -Infinity;
    let lastPresenceAt = -Infinity;
    let localSequence = 0;
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

    function serverTimelineNow() {
      return Date.now() + serverTimeOffset;
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

    function queueSnapshotWrite(task, { urgent = false } = {}) {
      if (urgent) {
        // Direction/start/stop/state changes are path-shaping samples. Never
        // allow a later ordinary movement update to coalesce them away. A
        // pending non-urgent sample can be discarded because this urgent
        // sample is newer and semantically more important.
        pendingSnapshotWrite = null;
        return queueWrite(task);
      }
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
        classId: String(value.classId || "fighter").trim() || "fighter",
        gender: String(value.gender || "").trim().toLowerCase() === "female" ? "female" : "male",
        x,
        y,
        facing: validFacing(value.facing),
        state: validState(value.state),
        moving: Boolean(value.moving) && validState(value.state) !== "battle",
        sampledAt: serverTimelineNow(),
      };
    }

    function applyRemoteSnapshot(snapshot) {
      const receivedAt = serverTimelineNow();
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
          renderFacing: previous?.renderFacing ?? previous?.facing ?? record.facing,
          renderMoving: previous?.renderMoving ?? false,
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
          entry.renderFacing = record.facing;
          entry.renderMoving = false;
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
      const urgent = force || !lastPublishedSnapshot || urgentSnapshotChanged(lastPublishedSnapshot, snapshot);
      if (!shouldPublishSnapshot(lastPublishedSnapshot, snapshot, { now, lastPublishedAt, force })) return;
      lastPublishedSnapshot = { ...snapshot };
      lastPublishedAt = now;
      const sequence = ++localSequence;
      const { sdk } = context;
      const ref = mapRef;
      const token = operationToken;
      // Movement/state snapshots are handed to the Firebase SDK immediately.
      // Do NOT wait for the previous RTDB write ACK before issuing the next
      // sample: doing so collapses an intended ~10 Hz stream into a few uneven
      // points per second whenever network RTT fluctuates. Firebase already
      // preserves the client's write ordering; `seq` protects the receiver
      // from stale callbacks as an additional guard.
      trace("map.write.begin", { mapId: snapshot.mapId, state: snapshot.state, moving: snapshot.moving, seq: sequence, x: snapshot.x, y: snapshot.y, urgent });
      if (!active || token !== operationToken || ref !== mapRef) return;
      let writePromise;
      try {
        writePromise = sdk.set(ref, {
          uid: snapshot.uid,
          name: snapshot.name,
          classId: snapshot.classId,
          gender: snapshot.gender,
          x: snapshot.x,
          y: snapshot.y,
          facing: snapshot.facing,
          state: snapshot.state,
          moving: Boolean(snapshot.moving),
          seq: sequence,
          // Coordinate sample time and Firebase commit time are deliberately
          // separate. Remote interpolation uses sampledAt.
          sampledAt: Number(snapshot.sampledAt) || serverTimelineNow(),
          updatedAt: sdk.serverTimestamp(),
        });
      } catch (error) {
        logError("snapshot write", error);
        return;
      }
      return Promise.resolve(writePromise).then((result) => {
        trace("map.write.complete", { mapId: snapshot.mapId, state: snapshot.state, seq: sequence });
        return result;
      }).catch((error) => {
        logError("snapshot write", error);
        return null;
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
      localSequence = 0;
      active = true;
      serverTimeOffsetUnsubscribe = context.sdk.onValue(
        context.sdk.ref(context.database, ".info/serverTimeOffset"),
        (snapshot) => {
          const nextOffset = Number(snapshot.val());
          if (Number.isFinite(nextOffset)) serverTimeOffset = nextOffset;
        },
        (error) => logError("server time offset watch", error),
      );
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
      serverTimeOffsetUnsubscribe();
      mapUnsubscribe();
      connectedUnsubscribe = () => {};
      serverTimeOffsetUnsubscribe = () => {};
      mapUnsubscribe = () => {};
      serverTimeOffset = 0;
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
      localSequence = 0;
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
      const rawValue = snapshot || readLocalSnapshot();
      if (!rawValue) return false;
      const value = { ...rawValue, sampledAt: serverTimelineNow() };
      const previousLocal = localSnapshot;
      if (value.state === "exploring" && value.moving && previousLocal?.mapId === value.mapId) {
        const heading = quantizeMotionHeading(value.x - previousLocal.x, value.y - previousLocal.y);
        value.motionHeading = heading ?? previousLocal.motionHeading ?? null;
      } else {
        value.motionHeading = null;
      }
      if (value.mapId !== mapId) {
        localSnapshot = value;
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
      const now = serverTimelineNow();
      for (const player of remotePlayers.values()) {
        interpolateRemotePlayer(player, dt, locomotion, { now });
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
        facing: player.renderFacing || player.facing,
        moving: Boolean(player.renderMoving),
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
    REMOTE_HOLD_MOVING_GRACE_MS,
    quantizeMotionHeading,
    normalizePlayerRecord,
    snapshotChanged,
    shouldPublishSnapshot,
    appendRemoteSnapshot,
    interpolateRemotePlayer,
    create,
  });
});
