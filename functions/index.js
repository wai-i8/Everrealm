"use strict";

const crypto = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getDatabase } = require("firebase-admin/database");
const { getAuth } = require("firebase-admin/auth");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  HEALING_POTION_ID,
  WEAK_POTION_ID,
  healingPotionResult,
  weakPotionResult,
  clinicHealResult,
  reviveResult,
} = require("./game-rules");
const ServerGame = require("./server-game");
const PlayerState = require("./player-state");
const TradeSystem = require("./trade-system");

initializeApp();

const db = getFirestore();
const realtimeDb = getDatabase();
const REGION = "europe-west2";
const COMMAND_VERSION = 1;
const LEGACY_MIGRATION_ACCOUNT_CUTOFF_MS = Date.parse("2026-09-17T12:00:00.000Z");

function authenticatedUid(request) {
  const uid = String(request.auth?.uid || "").trim();
  if (!uid) throw new HttpsError("unauthenticated", "Authentication is required.");
  return uid;
}

function assertCommandVersion(request) {
  const version = Number(request.data?.version) || 0;
  if (version !== COMMAND_VERSION) {
    throw new HttpsError("failed-precondition", "Unsupported command version.");
  }
}

async function withPlayerTransaction(uid, callback) {
  const playerRef = db.doc(`players/${uid}`);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(playerRef);
    if (!snapshot.exists) {
      throw new HttpsError("failed-precondition", "Player save is not ready.");
    }
    return callback({ transaction, playerRef, save: snapshot.data() });
  });
}

function safeSocialUid(value) {
  return String(value || "").trim();
}

function safeSocialName(value) {
  return String(value || "冒險者").trim().slice(0, 24) || "冒險者";
}

function socialNameFromSave(save) {
  return safeSocialName(save?.player?.name);
}

function socialThreadId(uidA, uidB) {
  const pair = [safeSocialUid(uidA), safeSocialUid(uidB)].sort().join(":");
  return crypto.createHash("sha256").update(pair).digest("hex").slice(0, 32);
}

function friendRef(ownerUid, friendUid) {
  return db.doc(`players/${ownerUid}/friends/${friendUid}`);
}

function incomingFriendRequestRef(ownerUid, requesterUid) {
  return db.doc(`players/${ownerUid}/friendRequests/${requesterUid}`);
}

function outgoingFriendRequestRef(ownerUid, targetUid) {
  return db.doc(`players/${ownerUid}/friendRequestsSent/${targetUid}`);
}



const TRADE_SESSION_TTL_MS = 15 * 60 * 1000;

function safeTradeId(value) {
  return String(value || "").trim().slice(0, 160);
}

function tradeSessionRef(tradeId) {
  return db.doc(`tradeSessions/${tradeId}`);
}

function tradePointerRef(uid) {
  return db.doc(`players/${uid}/tradeState/current`);
}

function tradeInviteRef(uid, tradeId) {
  return db.doc(`players/${uid}/tradeInvites/${tradeId}`);
}

function tradeSide(session, uid) {
  if (session?.participants?.a?.uid === uid) return "a";
  if (session?.participants?.b?.uid === uid) return "b";
  return null;
}

function otherTradeSide(side) {
  return side === "a" ? "b" : side === "b" ? "a" : null;
}

function tradePointerIsStale(snapshot, nowMs = Date.now()) {
  if (!snapshot?.exists) return false;
  const updatedAtMs = Number(snapshot.data()?.updatedAtMs) || 0;
  return !updatedAtMs || nowMs - updatedAtMs > TRADE_SESSION_TTL_MS;
}

function playerCanTrade(save) {
  if (!(Number(save?.player?.hp) > 0)) return false;
  const activeBattle = save?.expansion?.serverBattle && typeof save.expansion.serverBattle === "object"
    ? save.expansion.serverBattle
    : null;
  return activeBattle?.status !== "active";
}

function tradeSessionExpired(session, nowMs = Date.now()) {
  const updatedAtMs = Number(session?.updatedAtMs || session?.createdAtMs) || 0;
  return !updatedAtMs || nowMs - updatedAtMs > TRADE_SESSION_TTL_MS;
}

function tradePointerPayload(tradeId, status, peerUid, peerName, nowMs) {
  return { tradeId, status, peerUid, peerName, updatedAtMs: nowMs };
}

function nextTradeOffer(session, side, patch = {}) {
  const offers = session?.offers && typeof session.offers === "object" ? session.offers : {};
  const own = offers[side] && typeof offers[side] === "object" ? offers[side] : TradeSystem.emptyOffer();
  const otherSide = otherTradeSide(side);
  const other = offers[otherSide] && typeof offers[otherSide] === "object" ? offers[otherSide] : TradeSystem.emptyOffer();
  return {
    ...offers,
    [side]: { ...TradeSystem.emptyOffer(), ...own, ...patch },
    [otherSide]: { ...TradeSystem.emptyOffer(), ...other },
  };
}

function tradePlayerWrite(transaction, playerRef, originalSave, nextSave, nextRevision) {
  const expansion = { ...(originalSave?.expansion || {}), ...(nextSave?.expansion || {}) };
  delete expansion.checkpoint;
  delete expansion.dungeonClears;
  delete expansion.defeatedDungeonBosses;
  transaction.update(playerRef, {
    stateRevision: nextRevision,
    player: { ...(originalSave?.player || {}), ...(nextSave?.player || {}) },
    expansion,
    openedChests: Array.isArray(nextSave?.openedChests) ? nextSave.openedChests : (originalSave?.openedChests || []),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

function playerDataWithoutMetadata(data) {
  const source = data && typeof data === "object" ? data : {};
  const { updatedAt, ...rest } = source;
  return rest;
}

exports.playerStateCommand = onCall({ region: REGION, maxInstances: 20 }, async (request) => {
  const uid = authenticatedUid(request);
  assertCommandVersion(request);
  const action = String(request.data?.action || "").trim();
  const payload = request.data?.payload && typeof request.data.payload === "object" ? request.data.payload : {};
  if (!["create", "save", "reset", "migrate"].includes(action)) {
    return { ok: false, reason: "unsupported-action", action };
  }

  if (action === "migrate") {
    const account = await getAuth().getUser(uid);
    const createdAt = Date.parse(account.metadata?.creationTime || "");
    if (!Number.isFinite(createdAt) || createdAt > LEGACY_MIGRATION_ACCOUNT_CUTOFF_MS) {
      return { ok: false, reason: "legacy-migration-closed" };
    }
  }

  const playerRef = db.doc(`players/${uid}`);
  const nowMs = Date.now();
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(playerRef);
    const existing = snapshot.exists ? playerDataWithoutMetadata(snapshot.data()) : null;

    if (action === "create") {
      if (existing) return { ok: true, created: false, data: existing };
      const next = { ...PlayerState.canonicalInitialSave(payload, { nowMs }), stateRevision: 0 };
      transaction.set(playerRef, { ...next, updatedAt: FieldValue.serverTimestamp() });
      return { ok: true, created: true, data: next };
    }

    if (action === "migrate") {
      if (existing) return { ok: true, created: false, data: existing };
      const next = { ...PlayerState.sanitizeLegacySave(payload, { nowMs }), stateRevision: 0 };
      transaction.set(playerRef, { ...next, updatedAt: FieldValue.serverTimestamp() });
      return { ok: true, created: true, migrated: true, data: next };
    }

    if (action === "reset") {
      const nextRevision = Math.max(0, Math.floor(Number(existing?.stateRevision) || 0)) + 1;
      const next = { ...PlayerState.canonicalInitialSave(payload, { nowMs }), stateRevision: nextRevision };
      transaction.set(playerRef, { ...next, updatedAt: FieldValue.serverTimestamp() });
      return { ok: true, created: !existing, reset: true, data: next };
    }

    if (!existing) {
      const next = { ...PlayerState.canonicalInitialSave(payload, { nowMs }), stateRevision: 0 };
      transaction.set(playerRef, { ...next, updatedAt: FieldValue.serverTimestamp() });
      return { ok: true, created: true, data: next };
    }

    const patch = PlayerState.clientOwnedPatch(existing, payload, { nowMs });
    transaction.update(playerRef, {
      ...patch,
      "expansion.checkpoint": FieldValue.delete(),
      "expansion.dungeonClears": FieldValue.delete(),
      "expansion.defeatedDungeonBosses": FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, saved: true, data: PlayerState.mergeClientOwnedState(existing, patch) };
  });
});

exports.useItem = onCall({ region: REGION, maxInstances: 10 }, async (request) => {
  const uid = authenticatedUid(request);
  assertCommandVersion(request);

  const itemId = String(request.data?.itemId || "").trim();
  if (![HEALING_POTION_ID, WEAK_POTION_ID].includes(itemId)) {
    return { ok: false, reason: "unsupported-item", itemId };
  }

  return withPlayerTransaction(uid, ({ transaction, playerRef, save }) => {
    if (itemId === HEALING_POTION_ID) {
      const result = healingPotionResult(save);
      if (!result.ok) return result;
      transaction.update(playerRef, {
        "player.hp": result.player.hp,
        "player.potions": result.player.potions,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return result;
    }

    const result = weakPotionResult(save);
    if (!result.ok) return result;
    const updates = {
      "expansion.weakPotion.stepsRemaining": result.weakPotion.stepsRemaining,
      "expansion.weakPotion.distanceRemainder": result.weakPotion.distanceRemainder,
      updatedAt: FieldValue.serverTimestamp(),
    };
    updates["expansion.inventory.weak_potion"] = result.inventory.quantity > 0
      ? result.inventory.quantity
      : FieldValue.delete();
    transaction.update(playerRef, updates);
    return result;
  });
});

exports.recoverPlayer = onCall({ region: REGION, maxInstances: 10 }, async (request) => {
  const uid = authenticatedUid(request);
  assertCommandVersion(request);

  const action = String(request.data?.action || "").trim();
  if (!["clinic", "revive_here", "respawn_town"].includes(action)) {
    return { ok: false, reason: "unsupported-action", action };
  }

  return withPlayerTransaction(uid, ({ transaction, playerRef, save }) => {
    if (action === "clinic") {
      const positionCheck = ServerGame.validateGameplayInteraction(
        save,
        request.data || {},
        "clinic-heal",
        { nowMs: Date.now() },
      );
      if (!positionCheck.ok) return positionCheck;
      const validatedSave = positionCheck.state;
      const result = clinicHealResult(validatedSave);
      if (!result.ok) return result;
      transaction.update(playerRef, {
        "player.hp": result.player.hp,
        "player.x": validatedSave.player.x,
        "player.y": validatedSave.player.y,
        "expansion.positionAuthority": validatedSave.expansion.positionAuthority,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { ...result, positionValidated: positionCheck.positionValidated };
    }


    const returnToTown = action === "respawn_town";
    const currentHp = Number(save?.player?.hp);
    const activeBattle = save?.expansion?.serverBattle && typeof save.expansion.serverBattle === "object"
      ? save.expansion.serverBattle
      : null;

    // A timed-out client may retry after the first recovery already committed.
    // Treat that retry as an idempotent state resync instead of charging the
    // EXP penalty twice or leaving the client stuck on the death screen.
    if (Number.isFinite(currentHp) && currentHp > 0) {
      if (activeBattle?.status === "active") return { ok: false, reason: "defeat-not-settled" };
      const state = ServerGame.statePayload(save);
      return {
        ok: true,
        reason: null,
        alreadyRecovered: true,
        player: state.player,
        state,
        respawn: {
          mapId: state.expansion.currentMapId,
          x: state.player.x,
          y: state.player.y,
        },
      };
    }

    const result = reviveResult(save, { returnToTown });
    if (!result.ok) return result;

    const nextRevision = Math.max(0, Math.floor(Number(save.stateRevision) || 0)) + 1;
    const nextState = {
      ...save,
      stateRevision: nextRevision,
      player: {
        ...(save.player || {}),
        hp: result.player.hp,
        level: result.player.level,
        xp: result.player.xp,
      },
      expansion: { ...(save.expansion || {}) },
    };
    const updates = {
      stateRevision: nextRevision,
      "player.hp": result.player.hp,
      "player.level": result.player.level,
      "player.xp": result.player.xp,
      updatedAt: FieldValue.serverTimestamp(),
    };

    let respawn = null;
    if (returnToTown) {
      // Respawning in town is itself an authoritative map change. Keep the
      // canonical map, coordinates and trusted anchor in sync.
      respawn = ServerGame.respawnTownStatePatch(nextState, { nowMs: Date.now() });
      nextState.player.x = respawn.x;
      nextState.player.y = respawn.y;
      nextState.expansion.currentMapId = respawn.mapId;
      nextState.expansion.positionAuthority = respawn.positionAuthority;
      updates["player.x"] = respawn.x;
      updates["player.y"] = respawn.y;
      updates["expansion.currentMapId"] = respawn.mapId;
      updates["expansion.positionAuthority"] = respawn.positionAuthority;
    }

    transaction.update(playerRef, updates);
    return {
      ...result,
      state: ServerGame.statePayload(nextState),
      ...(respawn ? { respawn: { mapId: respawn.mapId, x: respawn.x, y: respawn.y } } : {}),
    };
  });
});


exports.socialCommand = onCall({ region: REGION, maxInstances: 20 }, async (request) => {
  const uid = authenticatedUid(request);
  assertCommandVersion(request);
  const action = String(request.data?.action || "").trim();

  if (action === "send-friend-request") {
    const targetUid = safeSocialUid(request.data?.targetUid);
    if (!targetUid || targetUid === uid) return { ok: false, reason: "invalid-target" };
    const senderPlayerRef = db.doc(`players/${uid}`);
    const targetPlayerRef = db.doc(`players/${targetUid}`);
    const senderFriendRef = friendRef(uid, targetUid);
    const targetIncomingRef = incomingFriendRequestRef(targetUid, uid);
    const senderOutgoingRef = outgoingFriendRequestRef(uid, targetUid);
    const senderIncomingRef = incomingFriendRequestRef(uid, targetUid);

    return db.runTransaction(async (transaction) => {
      const [senderPlayer, targetPlayer, existingFriend, existingOutgoing, reverseIncoming] = await Promise.all([
        transaction.get(senderPlayerRef),
        transaction.get(targetPlayerRef),
        transaction.get(senderFriendRef),
        transaction.get(senderOutgoingRef),
        transaction.get(senderIncomingRef),
      ]);
      if (!senderPlayer.exists) throw new HttpsError("failed-precondition", "Player save is not ready.");
      if (!targetPlayer.exists) return { ok: false, reason: "player-not-found" };
      if (existingFriend.exists) return { ok: false, reason: "already-friends" };
      if (reverseIncoming.exists) return { ok: false, reason: "incoming-request-exists" };
      if (existingOutgoing.exists) return { ok: true, pending: true, duplicate: true };

      const senderName = socialNameFromSave(senderPlayer.data());
      const targetName = socialNameFromSave(targetPlayer.data());
      transaction.set(targetIncomingRef, { uid, name: senderName, createdAt: FieldValue.serverTimestamp() });
      transaction.set(senderOutgoingRef, { uid: targetUid, name: targetName, createdAt: FieldValue.serverTimestamp() });
      return { ok: true, pending: true, targetUid, targetName };
    });
  }

  if (action === "accept-friend-request") {
    const requesterUid = safeSocialUid(request.data?.requesterUid);
    if (!requesterUid || requesterUid === uid) return { ok: false, reason: "invalid-target" };
    const requestRef = incomingFriendRequestRef(uid, requesterUid);
    const requesterSentRef = outgoingFriendRequestRef(requesterUid, uid);
    const reverseRequestRef = incomingFriendRequestRef(requesterUid, uid);
    const reverseSentRef = outgoingFriendRequestRef(uid, requesterUid);
    const callerPlayerRef = db.doc(`players/${uid}`);
    const requesterPlayerRef = db.doc(`players/${requesterUid}`);
    const threadId = socialThreadId(uid, requesterUid);

    const result = await db.runTransaction(async (transaction) => {
      const [requestSnapshot, callerPlayer, requesterPlayer] = await Promise.all([
        transaction.get(requestRef),
        transaction.get(callerPlayerRef),
        transaction.get(requesterPlayerRef),
      ]);
      if (!requestSnapshot.exists) return { ok: false, reason: "request-not-found" };
      if (!callerPlayer.exists || !requesterPlayer.exists) return { ok: false, reason: "player-not-found" };

      const callerName = socialNameFromSave(callerPlayer.data());
      const requesterName = socialNameFromSave(requesterPlayer.data());
      const since = FieldValue.serverTimestamp();
      transaction.set(friendRef(uid, requesterUid), { uid: requesterUid, name: requesterName, threadId, since });
      transaction.set(friendRef(requesterUid, uid), { uid, name: callerName, threadId, since });
      transaction.delete(requestRef);
      transaction.delete(requesterSentRef);
      transaction.delete(reverseRequestRef);
      transaction.delete(reverseSentRef);
      return { ok: true, accepted: true, friend: { uid: requesterUid, name: requesterName, threadId }, callerName, requesterName };
    });

    if (result?.ok && result.accepted) {
      await realtimeDb.ref(`chat/whispers/${threadId}`).update({
        members: { [uid]: true, [requesterUid]: true },
        names: { [uid]: result.callerName, [requesterUid]: result.requesterName },
        updatedAt: Date.now(),
      });
      delete result.callerName;
      delete result.requesterName;
    }
    return result;
  }

  if (action === "reject-friend-request") {
    const requesterUid = safeSocialUid(request.data?.requesterUid);
    if (!requesterUid || requesterUid === uid) return { ok: false, reason: "invalid-target" };
    const requestRef = incomingFriendRequestRef(uid, requesterUid);
    const requestSnapshot = await requestRef.get();
    if (!requestSnapshot.exists) return { ok: false, reason: "request-not-found" };
    const batch = db.batch();
    batch.delete(requestRef);
    batch.delete(outgoingFriendRequestRef(requesterUid, uid));
    await batch.commit();
    return { ok: true, rejected: true, requesterUid };
  }

  if (action === "cancel-friend-request") {
    const targetUid = safeSocialUid(request.data?.targetUid);
    if (!targetUid || targetUid === uid) return { ok: false, reason: "invalid-target" };
    const sentRef = outgoingFriendRequestRef(uid, targetUid);
    const sentSnapshot = await sentRef.get();
    if (!sentSnapshot.exists) return { ok: false, reason: "request-not-found" };
    const batch = db.batch();
    batch.delete(sentRef);
    batch.delete(incomingFriendRequestRef(targetUid, uid));
    await batch.commit();
    return { ok: true, cancelled: true, targetUid };
  }

  if (action === "remove-friend") {
    const targetUid = safeSocialUid(request.data?.targetUid);
    if (!targetUid || targetUid === uid) return { ok: false, reason: "invalid-target" };
    const ownerFriendRef = friendRef(uid, targetUid);
    const friendship = await ownerFriendRef.get();
    if (!friendship.exists) return { ok: false, reason: "not-friends" };
    const threadId = String(friendship.data()?.threadId || socialThreadId(uid, targetUid));

    // Revoke the realtime private channel before removing the permanent friend
    // records. If the second step has to be retried, the safe failure mode is
    // that friends temporarily cannot whisper rather than ex-friends retaining
    // access to the old thread.
    await realtimeDb.ref(`chat/whispers/${threadId}`).remove();
    const batch = db.batch();
    batch.delete(ownerFriendRef);
    batch.delete(friendRef(targetUid, uid));
    batch.delete(incomingFriendRequestRef(uid, targetUid));
    batch.delete(incomingFriendRequestRef(targetUid, uid));
    batch.delete(outgoingFriendRequestRef(uid, targetUid));
    batch.delete(outgoingFriendRequestRef(targetUid, uid));
    await batch.commit();
    return { ok: true, removed: true, targetUid };
  }

  if (action === "ensure-whisper") {
    const targetUid = safeSocialUid(request.data?.targetUid);
    if (!targetUid || targetUid === uid) return { ok: false, reason: "invalid-target" };
    const [ownerFriend, targetFriend, ownerPlayer, targetPlayer] = await Promise.all([
      friendRef(uid, targetUid).get(),
      friendRef(targetUid, uid).get(),
      db.doc(`players/${uid}`).get(),
      db.doc(`players/${targetUid}`).get(),
    ]);
    if (!ownerFriend.exists || !targetFriend.exists) return { ok: false, reason: "not-friends" };
    const threadId = String(ownerFriend.data()?.threadId || socialThreadId(uid, targetUid));
    await realtimeDb.ref(`chat/whispers/${threadId}`).update({
      members: { [uid]: true, [targetUid]: true },
      names: { [uid]: socialNameFromSave(ownerPlayer.data()), [targetUid]: socialNameFromSave(targetPlayer.data()) },
      updatedAt: Date.now(),
    });
    return { ok: true, threadId };
  }

  return { ok: false, reason: "unsupported-action", action };
});


exports.tradeCommand = onCall({ region: REGION, maxInstances: 20 }, async (request) => {
  const uid = authenticatedUid(request);
  assertCommandVersion(request);
  const action = String(request.data?.action || "").trim();
  const nowMs = Date.now();

  if (action === "create") {
    const targetUid = safeSocialUid(request.data?.targetUid);
    if (!targetUid || targetUid === uid) return { ok: false, reason: "invalid-target" };
    const sessionRef = db.collection("tradeSessions").doc();
    const tradeId = sessionRef.id;
    const senderPlayerRef = db.doc(`players/${uid}`);
    const targetPlayerRef = db.doc(`players/${targetUid}`);
    const senderPointerRef = tradePointerRef(uid);
    const targetPointerRef = tradePointerRef(targetUid);

    return db.runTransaction(async (transaction) => {
      const [senderPlayer, targetPlayer, senderPointer, targetPointer] = await Promise.all([
        transaction.get(senderPlayerRef),
        transaction.get(targetPlayerRef),
        transaction.get(senderPointerRef),
        transaction.get(targetPointerRef),
      ]);
      if (!senderPlayer.exists) throw new HttpsError("failed-precondition", "Player save is not ready.");
      if (!targetPlayer.exists) return { ok: false, reason: "player-not-found" };
      if (!playerCanTrade(senderPlayer.data())) return { ok: false, reason: "caller-unavailable" };
      if (!playerCanTrade(targetPlayer.data())) return { ok: false, reason: "target-unavailable" };
      if (senderPointer.exists && !tradePointerIsStale(senderPointer, nowMs)) return { ok: false, reason: "busy" };
      if (targetPointer.exists && !tradePointerIsStale(targetPointer, nowMs)) return { ok: false, reason: "target-busy" };
      if (senderPointer.exists) transaction.delete(senderPointerRef);
      if (targetPointer.exists) transaction.delete(targetPointerRef);

      const senderName = socialNameFromSave(senderPlayer.data());
      const targetName = socialNameFromSave(targetPlayer.data());
      const session = {
        version: 1,
        status: "pending",
        initiatorUid: uid,
        targetUid,
        participants: {
          a: { uid, name: senderName },
          b: { uid: targetUid, name: targetName },
        },
        offers: {
          a: TradeSystem.emptyOffer(),
          b: TradeSystem.emptyOffer(),
        },
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
      };
      transaction.set(sessionRef, session);
      transaction.set(senderPointerRef, tradePointerPayload(tradeId, "pending", targetUid, targetName, nowMs));
      transaction.set(tradeInviteRef(targetUid, tradeId), { tradeId, fromUid: uid, fromName: senderName, createdAtMs: nowMs });
      return { ok: true, pending: true, tradeId, peer: { uid: targetUid, name: targetName } };
    });
  }

  if (action === "accept" || action === "reject") {
    const tradeId = safeTradeId(request.data?.tradeId);
    if (!tradeId) return { ok: false, reason: "invalid-trade" };
    const sessionRef = tradeSessionRef(tradeId);
    const targetPointerRef = tradePointerRef(uid);
    return db.runTransaction(async (transaction) => {
      const sessionSnapshot = await transaction.get(sessionRef);
      if (!sessionSnapshot.exists) return { ok: false, reason: "trade-not-found" };
      const session = sessionSnapshot.data();
      if (session.targetUid !== uid || tradeSide(session, uid) !== "b") return { ok: false, reason: "not-participant" };
      if (session.status !== "pending") return { ok: false, reason: "not-pending" };
      const initiatorUid = safeSocialUid(session.initiatorUid);
      const initiatorPointerRef = tradePointerRef(initiatorUid);
      const [targetPointer, initiatorPointer, targetPlayer, initiatorPlayer] = await Promise.all([
        transaction.get(targetPointerRef),
        transaction.get(initiatorPointerRef),
        transaction.get(db.doc(`players/${uid}`)),
        transaction.get(db.doc(`players/${initiatorUid}`)),
      ]);

      if (action === "reject" || tradeSessionExpired(session, nowMs)) {
        transaction.update(sessionRef, { status: action === "reject" ? "rejected" : "cancelled", updatedAtMs: nowMs });
        transaction.delete(tradeInviteRef(uid, tradeId));
        if (initiatorPointer.exists && initiatorPointer.data()?.tradeId === tradeId) transaction.delete(initiatorPointerRef);
        return { ok: true, rejected: action === "reject", expired: action !== "reject", tradeId };
      }

      if (!targetPlayer.exists || !initiatorPlayer.exists) return { ok: false, reason: "player-not-found" };
      if (!playerCanTrade(targetPlayer.data()) || !playerCanTrade(initiatorPlayer.data())) return { ok: false, reason: "player-unavailable" };
      if (targetPointer.exists && !tradePointerIsStale(targetPointer, nowMs)) return { ok: false, reason: "busy" };
      if (!initiatorPointer.exists || initiatorPointer.data()?.tradeId !== tradeId || tradePointerIsStale(initiatorPointer, nowMs)) {
        return { ok: false, reason: "trade-closed" };
      }
      if (targetPointer.exists) transaction.delete(targetPointerRef);

      const initiatorName = safeSocialName(session.participants?.a?.name);
      const targetName = safeSocialName(session.participants?.b?.name);
      transaction.update(sessionRef, { status: "active", updatedAtMs: nowMs });
      transaction.set(targetPointerRef, tradePointerPayload(tradeId, "active", initiatorUid, initiatorName, nowMs));
      transaction.set(initiatorPointerRef, tradePointerPayload(tradeId, "active", uid, targetName, nowMs));
      transaction.delete(tradeInviteRef(uid, tradeId));
      return { ok: true, accepted: true, tradeId };
    });
  }

  if (action === "cancel") {
    const tradeId = safeTradeId(request.data?.tradeId);
    if (!tradeId) return { ok: false, reason: "invalid-trade" };
    const sessionRef = tradeSessionRef(tradeId);
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(sessionRef);
      if (!snapshot.exists) return { ok: false, reason: "trade-not-found" };
      const session = snapshot.data();
      const side = tradeSide(session, uid);
      if (!side) return { ok: false, reason: "not-participant" };
      if (["completed", "cancelled", "rejected"].includes(session.status)) return { ok: true, tradeId, alreadyClosed: true };
      const aUid = safeSocialUid(session.participants?.a?.uid);
      const bUid = safeSocialUid(session.participants?.b?.uid);
      const [aPointer, bPointer] = await Promise.all([
        transaction.get(tradePointerRef(aUid)),
        transaction.get(tradePointerRef(bUid)),
      ]);
      transaction.update(sessionRef, { status: "cancelled", cancelledBy: uid, updatedAtMs: nowMs });
      if (aPointer.exists && aPointer.data()?.tradeId === tradeId) transaction.delete(tradePointerRef(aUid));
      if (bPointer.exists && bPointer.data()?.tradeId === tradeId) transaction.delete(tradePointerRef(bUid));
      transaction.delete(tradeInviteRef(session.targetUid, tradeId));
      return { ok: true, cancelled: true, tradeId };
    });
  }

  if (["set-offer", "lock", "unlock"].includes(action)) {
    const tradeId = safeTradeId(request.data?.tradeId);
    if (!tradeId) return { ok: false, reason: "invalid-trade" };
    const sessionRef = tradeSessionRef(tradeId);
    const playerRef = db.doc(`players/${uid}`);
    return db.runTransaction(async (transaction) => {
      const [sessionSnapshot, playerSnapshot] = await Promise.all([
        transaction.get(sessionRef),
        transaction.get(playerRef),
      ]);
      if (!sessionSnapshot.exists) return { ok: false, reason: "trade-not-found" };
      if (!playerSnapshot.exists) return { ok: false, reason: "player-not-found" };
      const session = sessionSnapshot.data();
      const side = tradeSide(session, uid);
      if (!side) return { ok: false, reason: "not-participant" };
      if (session.status !== "active" || tradeSessionExpired(session, nowMs)) return { ok: false, reason: "trade-closed" };
      const otherSide = otherTradeSide(side);
      const offers = nextTradeOffer(session, side);
      const own = offers[side];
      const other = offers[otherSide];

      if (action === "set-offer") {
        if (own.locked || own.confirmed) return { ok: false, reason: "locked" };
        const validation = TradeSystem.validateOffer(playerSnapshot.data(), request.data?.offer || {});
        if (!validation.ok) return { ok: false, reason: validation.reason, entry: validation.entry || null };
        offers[side] = { ...validation.offer, locked: false, confirmed: false };
        offers[otherSide] = { ...other, confirmed: false };
      } else if (action === "lock") {
        if (own.locked) return { ok: true, locked: true, duplicate: true, tradeId };
        const validation = TradeSystem.validateOffer(playerSnapshot.data(), own);
        if (!validation.ok) return { ok: false, reason: validation.reason, entry: validation.entry || null };
        offers[side] = { ...validation.offer, locked: true, confirmed: false };
        offers[otherSide] = { ...other, confirmed: false };
      } else {
        if (own.confirmed) return { ok: false, reason: "already-confirmed" };
        offers[side] = { ...own, locked: false, confirmed: false };
        offers[otherSide] = { ...other, confirmed: false };
      }

      transaction.update(sessionRef, { offers, updatedAtMs: nowMs });
      transaction.set(tradePointerRef(uid), tradePointerPayload(
        tradeId,
        "active",
        safeSocialUid(session.participants?.[otherSide]?.uid),
        safeSocialName(session.participants?.[otherSide]?.name),
        nowMs,
      ));
      return { ok: true, tradeId, offers };
    });
  }

  if (action === "confirm") {
    const tradeId = safeTradeId(request.data?.tradeId);
    if (!tradeId) return { ok: false, reason: "invalid-trade" };
    const sessionRef = tradeSessionRef(tradeId);
    return db.runTransaction(async (transaction) => {
      const sessionSnapshot = await transaction.get(sessionRef);
      if (!sessionSnapshot.exists) return { ok: false, reason: "trade-not-found" };
      const session = sessionSnapshot.data();
      const side = tradeSide(session, uid);
      if (!side) return { ok: false, reason: "not-participant" };
      if (session.status !== "active" || tradeSessionExpired(session, nowMs)) return { ok: false, reason: "trade-closed" };
      const otherSide = otherTradeSide(side);
      const offers = nextTradeOffer(session, side);
      const own = offers[side];
      const other = offers[otherSide];
      if (!own.locked || !other.locked) return { ok: false, reason: "not-locked" };
      if (own.confirmed) return { ok: true, confirmed: true, duplicate: true, tradeId };

      offers[side] = { ...own, confirmed: true };
      if (!other.confirmed) {
        transaction.update(sessionRef, { offers, updatedAtMs: nowMs });
        return { ok: true, confirmed: true, completed: false, tradeId };
      }

      const aUid = safeSocialUid(session.participants?.a?.uid);
      const bUid = safeSocialUid(session.participants?.b?.uid);
      const aPlayerRef = db.doc(`players/${aUid}`);
      const bPlayerRef = db.doc(`players/${bUid}`);
      const aPointerRef = tradePointerRef(aUid);
      const bPointerRef = tradePointerRef(bUid);
      const [aPlayer, bPlayer, aPointer, bPointer] = await Promise.all([
        transaction.get(aPlayerRef),
        transaction.get(bPlayerRef),
        transaction.get(aPointerRef),
        transaction.get(bPointerRef),
      ]);
      if (!aPlayer.exists || !bPlayer.exists) return { ok: false, reason: "player-not-found" };
      if (!playerCanTrade(aPlayer.data()) || !playerCanTrade(bPlayer.data())) return { ok: false, reason: "player-unavailable" };

      const exchange = TradeSystem.prepareExchange(aPlayer.data(), offers.a, bPlayer.data(), offers.b);
      if (!exchange.ok) return { ok: false, reason: exchange.reason, side: exchange.side || null, entry: exchange.entry || null };

      const aRevision = Math.max(0, Math.floor(Number(aPlayer.data()?.stateRevision) || 0)) + 1;
      const bRevision = Math.max(0, Math.floor(Number(bPlayer.data()?.stateRevision) || 0)) + 1;
      exchange.nextA.stateRevision = aRevision;
      exchange.nextB.stateRevision = bRevision;
      tradePlayerWrite(transaction, aPlayerRef, aPlayer.data(), exchange.nextA, aRevision);
      tradePlayerWrite(transaction, bPlayerRef, bPlayer.data(), exchange.nextB, bRevision);
      transaction.update(sessionRef, { status: "completed", offers, completedAtMs: nowMs, updatedAtMs: nowMs });
      if (aPointer.exists && aPointer.data()?.tradeId === tradeId) transaction.delete(aPointerRef);
      if (bPointer.exists && bPointer.data()?.tradeId === tradeId) transaction.delete(bPointerRef);

      const callerState = uid === aUid ? exchange.nextA : exchange.nextB;
      return { ok: true, confirmed: true, completed: true, tradeId, state: ServerGame.statePayload(callerState) };
    });
  }

  return { ok: false, reason: "unsupported-action", action };
});


async function runAuthoritativeCommand(request, command) {
  const uid = authenticatedUid(request);
  assertCommandVersion(request);
  return withPlayerTransaction(uid, ({ transaction, playerRef, save }) => {
    // Firestore retries this transaction on concurrent document writes. By
    // incrementing the revision inside the transaction, the number represents
    // server commit order rather than client request order. Clients can safely
    // ignore an older response that happens to arrive late.
    const nextRevision = Math.max(0, Math.floor(Number(save.stateRevision) || 0)) + 1;
    const commandSave = { ...save, stateRevision: nextRevision };
    const result = command(commandSave, request.data || {}, { nowMs: Date.now() });
    if (!result?.ok || !result.state) return result;
    const payload = { ...result.state, stateRevision: nextRevision };
    result.state = payload;
    const expansion = { ...(save.expansion || {}), ...(payload.expansion || {}) };
    delete expansion.checkpoint;
    delete expansion.dungeonClears;
    delete expansion.defeatedDungeonBosses;
    transaction.update(playerRef, {
      stateRevision: nextRevision,
      player: { ...(save.player || {}), ...(payload.player || {}) },
      expansion,
      openedChests: Array.isArray(payload.openedChests) ? payload.openedChests : (save.openedChests || []),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return result;
  });
}

exports.economyCommand = onCall({ region: REGION, maxInstances: 20 }, async (request) =>
  runAuthoritativeCommand(request, ServerGame.economyCommand));

exports.questCommand = onCall({ region: REGION, maxInstances: 20 }, async (request) =>
  runAuthoritativeCommand(request, ServerGame.questCommand));

exports.battleCommand = onCall({ region: REGION, maxInstances: 20 }, async (request) =>
  runAuthoritativeCommand(request, ServerGame.battleCommand));

exports.mapCommand = onCall({ region: REGION, maxInstances: 20 }, async (request) =>
  runAuthoritativeCommand(request, ServerGame.mapCommand));
