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
const PartySystem = require("./party-system");
const PartyBattle = require("./party-battle-system");

initializeApp();

const db = getFirestore();
const realtimeDb = getDatabase();
const REGION = "europe-west2";
const COMMAND_VERSION = 1;
const LEGACY_MIGRATION_ACCOUNT_CUTOFF_MS = Date.parse("2026-09-17T12:00:00.000Z");

function whole(value, fallback = 0) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? number : fallback;
}

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

function whisperPeerRef(ownerUid, peerUid) {
  return db.doc(`players/${ownerUid}/whisperPeers/${peerUid}`);
}

function outgoingInviteRef(ownerUid) {
  return db.doc(`players/${ownerUid}/outgoingInvite/current`);
}

function outgoingInvitePayload(type, targetUid, targetName, referenceId, nowMs) {
  return {
    type: String(type || "").trim(),
    targetUid: safeSocialUid(targetUid),
    targetName: safeSocialName(targetName),
    referenceId: String(referenceId || "").trim(),
    createdAtMs: Number(nowMs) || Date.now(),
  };
}

function outgoingInviteMatches(snapshot, type, targetUid, referenceId = "") {
  if (!snapshot?.exists) return false;
  const data = snapshot.data() || {};
  if (String(data.type || "") !== String(type || "")) return false;
  if (safeSocialUid(data.targetUid) !== safeSocialUid(targetUid)) return false;
  const wantedReference = String(referenceId || "").trim();
  return !wantedReference || String(data.referenceId || "").trim() === wantedReference;
}

function partyRef(partyId) { return db.doc(`parties/${String(partyId || "").trim()}`); }
function partyPointerRef(uid) { return db.doc(`players/${uid}/partyState/current`); }
function partyInviteRef(uid, inviteId) { return db.doc(`players/${uid}/partyInvites/${String(inviteId || "").trim()}`); }
function partyBattleRef(battleId) { return db.doc(`partyBattles/${String(battleId || "").trim()}`); }
function partyId() { return `party-${crypto.randomBytes(10).toString("hex")}`; }
function partyInviteId() { return `pinv-${crypto.randomBytes(10).toString("hex")}`; }
function partyBattleId() { return `pb-${crypto.randomBytes(10).toString("hex")}`; }
function partyTransitionId() { return `pt-${crypto.randomBytes(8).toString("hex")}`; }
function partyPointerPayload(id, leaderUid, nowMs) { return { partyId: id, leaderUid, updatedAtMs: nowMs }; }
function partyPlayerWrite(transaction, playerRef, originalSave, nextSave) {
  const nextRevision = Math.max(0, Math.floor(Number(originalSave?.stateRevision) || 0)) + 1;
  tradePlayerWrite(transaction, playerRef, originalSave, { ...nextSave, stateRevision: nextRevision }, nextRevision);
  return nextRevision;
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
    const inviteLockRef = outgoingInviteRef(uid);

    return db.runTransaction(async (transaction) => {
      const [senderPlayer, targetPlayer, existingFriend, existingOutgoing, reverseIncoming, inviteLock] = await Promise.all([
        transaction.get(senderPlayerRef),
        transaction.get(targetPlayerRef),
        transaction.get(senderFriendRef),
        transaction.get(senderOutgoingRef),
        transaction.get(senderIncomingRef),
        transaction.get(inviteLockRef),
      ]);
      if (!senderPlayer.exists) throw new HttpsError("failed-precondition", "Player save is not ready.");
      if (!targetPlayer.exists) return { ok: false, reason: "player-not-found" };
      if (existingFriend.exists) return { ok: false, reason: "already-friends" };
      if (reverseIncoming.exists) return { ok: false, reason: "incoming-request-exists" };
      if (inviteLock.exists) {
        if (outgoingInviteMatches(inviteLock, "friend", targetUid, targetUid) && existingOutgoing.exists) {
          return { ok: true, pending: true, duplicate: true, targetUid, targetName: socialNameFromSave(targetPlayer.data()) };
        }
        return { ok: false, reason: "outgoing-invite-pending" };
      }

      const senderName = socialNameFromSave(senderPlayer.data());
      const targetName = socialNameFromSave(targetPlayer.data());
      transaction.set(targetIncomingRef, { uid, name: senderName, createdAt: FieldValue.serverTimestamp() });
      transaction.set(senderOutgoingRef, { uid: targetUid, name: targetName, createdAt: FieldValue.serverTimestamp() });
      transaction.set(inviteLockRef, outgoingInvitePayload("friend", targetUid, targetName, targetUid, Date.now()));
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
      const requesterInviteLockRef = outgoingInviteRef(requesterUid);
      const [requestSnapshot, callerPlayer, requesterPlayer, requesterInviteLock] = await Promise.all([
        transaction.get(requestRef),
        transaction.get(callerPlayerRef),
        transaction.get(requesterPlayerRef),
        transaction.get(requesterInviteLockRef),
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
      if (outgoingInviteMatches(requesterInviteLock, "friend", uid, uid)) transaction.delete(requesterInviteLockRef);
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
    const requesterInviteLockRef = outgoingInviteRef(requesterUid);
    return db.runTransaction(async (transaction) => {
      const [requestSnapshot, requesterInviteLock] = await Promise.all([
        transaction.get(requestRef),
        transaction.get(requesterInviteLockRef),
      ]);
      if (!requestSnapshot.exists) return { ok: false, reason: "request-not-found" };
      transaction.delete(requestRef);
      transaction.delete(outgoingFriendRequestRef(requesterUid, uid));
      if (outgoingInviteMatches(requesterInviteLock, "friend", uid, uid)) transaction.delete(requesterInviteLockRef);
      return { ok: true, rejected: true, requesterUid };
    });
  }

  if (action === "cancel-friend-request") {
    const targetUid = safeSocialUid(request.data?.targetUid);
    if (!targetUid || targetUid === uid) return { ok: false, reason: "invalid-target" };
    const sentRef = outgoingFriendRequestRef(uid, targetUid);
    const inviteLockRef = outgoingInviteRef(uid);
    return db.runTransaction(async (transaction) => {
      const [sentSnapshot, inviteLock] = await Promise.all([transaction.get(sentRef), transaction.get(inviteLockRef)]);
      if (!sentSnapshot.exists) return { ok: false, reason: "request-not-found" };
      transaction.delete(sentRef);
      transaction.delete(incomingFriendRequestRef(targetUid, uid));
      if (outgoingInviteMatches(inviteLock, "friend", targetUid, targetUid)) transaction.delete(inviteLockRef);
      return { ok: true, cancelled: true, targetUid };
    });
  }

  if (action === "cancel-outgoing-invite") {
    const lockRef = outgoingInviteRef(uid);
    return db.runTransaction(async (transaction) => {
      const lockSnapshot = await transaction.get(lockRef);
      if (!lockSnapshot.exists) return { ok: true, alreadyClosed: true };
      const pending = lockSnapshot.data() || {};
      const type = String(pending.type || "").trim();
      const targetUid = safeSocialUid(pending.targetUid);
      const referenceId = String(pending.referenceId || "").trim();
      if (type === "trade" && referenceId) {
        const sessionRef = tradeSessionRef(referenceId);
        const legacyPointerRef = tradePointerRef(uid);
        const [sessionSnapshot, legacyPointer] = await Promise.all([
          transaction.get(sessionRef),
          transaction.get(legacyPointerRef),
        ]);
        if (sessionSnapshot.exists && sessionSnapshot.data()?.status === "pending") {
          transaction.update(sessionRef, { status: "cancelled", cancelledBy: uid, updatedAtMs: Date.now() });
        }
        if (targetUid) transaction.delete(tradeInviteRef(targetUid, referenceId));
        if (legacyPointer.exists && legacyPointer.data()?.tradeId === referenceId) transaction.delete(legacyPointerRef);
      } else if (type === "party" && targetUid && referenceId) {
        transaction.delete(partyInviteRef(targetUid, referenceId));
      } else if (type === "friend" && targetUid) {
        transaction.delete(outgoingFriendRequestRef(uid, targetUid));
        transaction.delete(incomingFriendRequestRef(targetUid, uid));
      }
      transaction.delete(lockRef);
      return { ok: true, cancelled: true, type, targetUid, referenceId };
    });
  }

  if (action === "remove-friend") {
    const targetUid = safeSocialUid(request.data?.targetUid);
    if (!targetUid || targetUid === uid) return { ok: false, reason: "invalid-target" };
    const ownerFriendRef = friendRef(uid, targetUid);
    const friendship = await ownerFriendRef.get();
    if (!friendship.exists) return { ok: false, reason: "not-friends" };
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
    const [ownerPlayer, targetPlayer] = await Promise.all([
      db.doc(`players/${uid}`).get(),
      db.doc(`players/${targetUid}`).get(),
    ]);
    if (!ownerPlayer.exists || !targetPlayer.exists) return { ok: false, reason: "player-not-found" };
    const ownerName = socialNameFromSave(ownerPlayer.data());
    const targetName = socialNameFromSave(targetPlayer.data());
    const threadId = socialThreadId(uid, targetUid);
    const nowMs = Date.now();
    const batch = db.batch();
    batch.set(whisperPeerRef(uid, targetUid), { uid: targetUid, name: targetName, threadId, updatedAtMs: nowMs }, { merge: true });
    batch.set(whisperPeerRef(targetUid, uid), { uid, name: ownerName, threadId, updatedAtMs: nowMs }, { merge: true });
    await batch.commit();
    await realtimeDb.ref(`chat/whispers/${threadId}`).update({
      members: { [uid]: true, [targetUid]: true },
      names: { [uid]: ownerName, [targetUid]: targetName },
      updatedAt: nowMs,
    });
    return { ok: true, threadId, targetName };
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
    const inviteLockRef = outgoingInviteRef(uid);

    return db.runTransaction(async (transaction) => {
      const [senderPlayer, targetPlayer, senderPointer, targetPointer, inviteLock] = await Promise.all([
        transaction.get(senderPlayerRef),
        transaction.get(targetPlayerRef),
        transaction.get(senderPointerRef),
        transaction.get(targetPointerRef),
        transaction.get(inviteLockRef),
      ]);
      if (!senderPlayer.exists) throw new HttpsError("failed-precondition", "Player save is not ready.");
      if (!targetPlayer.exists) return { ok: false, reason: "player-not-found" };
      if (!playerCanTrade(senderPlayer.data())) return { ok: false, reason: "caller-unavailable" };
      if (!playerCanTrade(targetPlayer.data())) return { ok: false, reason: "target-unavailable" };
      if (inviteLock.exists) return { ok: false, reason: "outgoing-invite-pending" };
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
      transaction.set(tradeInviteRef(targetUid, tradeId), { tradeId, fromUid: uid, fromName: senderName, createdAtMs: nowMs });
      transaction.set(inviteLockRef, outgoingInvitePayload("trade", targetUid, targetName, tradeId, nowMs));
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
      const initiatorInviteLockRef = outgoingInviteRef(initiatorUid);
      const [targetPointer, initiatorPointer, targetPlayer, initiatorPlayer, initiatorInviteLock] = await Promise.all([
        transaction.get(targetPointerRef),
        transaction.get(initiatorPointerRef),
        transaction.get(db.doc(`players/${uid}`)),
        transaction.get(db.doc(`players/${initiatorUid}`)),
        transaction.get(initiatorInviteLockRef),
      ]);

      if (action === "reject" || tradeSessionExpired(session, nowMs)) {
        transaction.update(sessionRef, { status: action === "reject" ? "rejected" : "cancelled", updatedAtMs: nowMs });
        transaction.delete(tradeInviteRef(uid, tradeId));
        if (initiatorPointer.exists && initiatorPointer.data()?.tradeId === tradeId) transaction.delete(initiatorPointerRef);
        if (outgoingInviteMatches(initiatorInviteLock, "trade", uid, tradeId)) transaction.delete(initiatorInviteLockRef);
        return { ok: true, rejected: action === "reject", expired: action !== "reject", tradeId };
      }

      if (!targetPlayer.exists || !initiatorPlayer.exists) return { ok: false, reason: "player-not-found" };
      if (!playerCanTrade(targetPlayer.data()) || !playerCanTrade(initiatorPlayer.data())) return { ok: false, reason: "player-unavailable" };
      if (targetPointer.exists && !tradePointerIsStale(targetPointer, nowMs)) return { ok: false, reason: "busy" };
      if (initiatorPointer.exists && !tradePointerIsStale(initiatorPointer, nowMs) && initiatorPointer.data()?.tradeId !== tradeId) {
        return { ok: false, reason: "trade-closed" };
      }
      if (!outgoingInviteMatches(initiatorInviteLock, "trade", uid, tradeId)) return { ok: false, reason: "trade-closed" };
      if (targetPointer.exists) transaction.delete(targetPointerRef);
      if (initiatorPointer.exists && initiatorPointer.data()?.tradeId !== tradeId) transaction.delete(initiatorPointerRef);

      const initiatorName = safeSocialName(session.participants?.a?.name);
      const targetName = safeSocialName(session.participants?.b?.name);
      transaction.update(sessionRef, { status: "active", updatedAtMs: nowMs });
      transaction.set(targetPointerRef, tradePointerPayload(tradeId, "active", initiatorUid, initiatorName, nowMs));
      transaction.set(initiatorPointerRef, tradePointerPayload(tradeId, "active", uid, targetName, nowMs));
      transaction.delete(tradeInviteRef(uid, tradeId));
      transaction.delete(initiatorInviteLockRef);
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
      const initiatorInviteLockRef = outgoingInviteRef(aUid);
      const [aPointer, bPointer, initiatorInviteLock] = await Promise.all([
        transaction.get(tradePointerRef(aUid)),
        transaction.get(tradePointerRef(bUid)),
        transaction.get(initiatorInviteLockRef),
      ]);
      transaction.update(sessionRef, { status: "cancelled", cancelledBy: uid, updatedAtMs: nowMs });
      if (aPointer.exists && aPointer.data()?.tradeId === tradeId) transaction.delete(tradePointerRef(aUid));
      if (bPointer.exists && bPointer.data()?.tradeId === tradeId) transaction.delete(tradePointerRef(bUid));
      if (outgoingInviteMatches(initiatorInviteLock, "trade", bUid, tradeId)) transaction.delete(initiatorInviteLockRef);
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


exports.partyCommand = onCall({ region: REGION, maxInstances: 30 }, async (request) => {
  const uid = authenticatedUid(request);
  assertCommandVersion(request);
  const action = String(request.data?.action || "").trim();
  const nowMs = Date.now();

  if (action === "invite") {
    const targetUid = PartySystem.safeUid(request.data?.targetUid);
    if (!targetUid || targetUid === uid) return { ok: false, reason: "invalid-target" };
    const callerRef = db.doc(`players/${uid}`);
    const targetRef = db.doc(`players/${targetUid}`);
    const callerPointer = partyPointerRef(uid);
    const targetPointer = partyPointerRef(targetUid);
    const inviteLockRef = outgoingInviteRef(uid);
    return db.runTransaction(async (transaction) => {
      const [callerSnap, targetSnap, callerPointerSnap, targetPointerSnap, inviteLockSnap] = await Promise.all([
        transaction.get(callerRef), transaction.get(targetRef), transaction.get(callerPointer), transaction.get(targetPointer), transaction.get(inviteLockRef),
      ]);
      if (!callerSnap.exists) throw new HttpsError("failed-precondition", "Player save is not ready.");
      if (!targetSnap.exists) return { ok: false, reason: "player-not-found" };
      if (inviteLockSnap.exists) return { ok: false, reason: "outgoing-invite-pending" };
      if (!(Number(callerSnap.data()?.player?.hp) > 0)) return { ok: false, reason: "caller-unavailable" };
      if (!(Number(targetSnap.data()?.player?.hp) > 0)) return { ok: false, reason: "target-unavailable" };
      if (targetPointerSnap.exists) return { ok: false, reason: "target-in-party" };
      let currentPartyId = "";
      if (callerPointerSnap.exists) currentPartyId = PartySystem.safeUid(callerPointerSnap.data()?.partyId);
      if (currentPartyId) {
        const currentPartySnap = await transaction.get(partyRef(currentPartyId));
        if (!currentPartySnap.exists) return { ok: false, reason: "party-not-found" };
        const currentParty = currentPartySnap.data();
        if (currentParty.leaderUid !== uid) return { ok: false, reason: "not-leader" };
        if (!PartySystem.partyHasCapacity(currentParty)) return { ok: false, reason: "party-full" };
        if (currentParty.state !== "idle" || currentParty.battleId || currentParty.transition) return { ok: false, reason: "party-busy" };
      }
      const inviteId = partyInviteId();
      const targetName = socialNameFromSave(targetSnap.data());
      transaction.set(partyInviteRef(targetUid, inviteId), {
        inviteId,
        partyId: currentPartyId,
        fromUid: uid,
        fromName: socialNameFromSave(callerSnap.data()),
        createdAtMs: nowMs,
      });
      transaction.set(inviteLockRef, outgoingInvitePayload("party", targetUid, targetName, inviteId, nowMs));
      return { ok: true, inviteId, targetUid, targetName, partyId: currentPartyId || null };
    });
  }

  if (action === "accept" || action === "reject") {
    const inviteId = String(request.data?.inviteId || "").trim();
    if (!inviteId) return { ok: false, reason: "invalid-invite" };
    const inviteRef = partyInviteRef(uid, inviteId);
    if (action === "reject") {
      return db.runTransaction(async (transaction) => {
        const inviteSnap = await transaction.get(inviteRef);
        if (!inviteSnap.exists) return { ok: false, reason: "invite-not-found" };
        const invite = inviteSnap.data() || {};
        const inviterUid = PartySystem.safeUid(invite.fromUid);
        const inviterLockRef = inviterUid ? outgoingInviteRef(inviterUid) : null;
        const inviterLockSnap = inviterLockRef ? await transaction.get(inviterLockRef) : null;
        transaction.delete(inviteRef);
        if (inviterLockSnap?.exists && outgoingInviteMatches(inviterLockSnap, "party", uid, inviteId)) transaction.delete(inviterLockRef);
        return { ok: true, rejected: true, inviteId };
      });
    }
    return db.runTransaction(async (transaction) => {
      const inviteSnap = await transaction.get(inviteRef);
      if (!inviteSnap.exists) return { ok: false, reason: "invite-not-found" };
      const invite = inviteSnap.data() || {};
      const inviterUid = PartySystem.safeUid(invite.fromUid);
      if (!inviterUid || inviterUid === uid) return { ok: false, reason: "invalid-invite" };
      const inviterRef = db.doc(`players/${inviterUid}`);
      const accepterRef = db.doc(`players/${uid}`);
      const inviterPointerRef = partyPointerRef(inviterUid);
      const accepterPointerRef = partyPointerRef(uid);
      const inviterLockRef = outgoingInviteRef(inviterUid);
      const [inviterSnap, accepterSnap, inviterPointerSnap, accepterPointerSnap, inviterLockSnap] = await Promise.all([
        transaction.get(inviterRef), transaction.get(accepterRef), transaction.get(inviterPointerRef), transaction.get(accepterPointerRef), transaction.get(inviterLockRef),
      ]);
      if (!inviterSnap.exists || !accepterSnap.exists) return { ok: false, reason: "player-not-found" };
      if (accepterPointerSnap.exists) return { ok: false, reason: "already-in-party" };
      if (!(Number(accepterSnap.data()?.player?.hp) > 0) || !(Number(inviterSnap.data()?.player?.hp) > 0)) return { ok: false, reason: "player-unavailable" };
      let activePartyId = PartySystem.safeUid(inviterPointerSnap.data()?.partyId);
      let activePartyRef = activePartyId ? partyRef(activePartyId) : null;
      let activeParty = null;
      if (activePartyRef) {
        const activePartySnap = await transaction.get(activePartyRef);
        if (!activePartySnap.exists) return { ok: false, reason: "party-not-found" };
        activeParty = activePartySnap.data();
        if (activeParty.leaderUid !== inviterUid) return { ok: false, reason: "inviter-not-leader" };
        if (!PartySystem.partyHasCapacity(activeParty)) return { ok: false, reason: "party-full" };
        if (activeParty.state !== "idle" || activeParty.battleId || activeParty.transition) return { ok: false, reason: "party-busy" };
      } else {
        activePartyId = partyId();
        activePartyRef = partyRef(activePartyId);
        const inviterMember = PartySystem.memberFromSave(inviterUid, inviterSnap.data());
        activeParty = {
          id: activePartyId,
          version: 1,
          leaderUid: inviterUid,
          memberUids: [inviterUid],
          members: { [inviterUid]: inviterMember },
          state: "idle",
          transition: null,
          battleId: "",
          createdAtMs: nowMs,
          updatedAtMs: nowMs,
        };
      }
      const accepterMember = PartySystem.memberFromSave(uid, accepterSnap.data());
      const memberUids = [...new Set([...(activeParty.memberUids || []), uid])].slice(0, PartySystem.MAX_MEMBERS);
      activeParty = {
        ...activeParty,
        id: activePartyId,
        memberUids,
        members: { ...(activeParty.members || {}), [uid]: accepterMember },
        updatedAtMs: nowMs,
      };
      transaction.set(activePartyRef, activeParty);
      transaction.set(inviterPointerRef, partyPointerPayload(activePartyId, activeParty.leaderUid, nowMs));
      transaction.set(accepterPointerRef, partyPointerPayload(activePartyId, activeParty.leaderUid, nowMs));
      transaction.delete(inviteRef);
      if (inviterLockSnap.exists && outgoingInviteMatches(inviterLockSnap, "party", uid, inviteId)) transaction.delete(inviterLockRef);
      return { ok: true, accepted: true, partyId: activePartyId, leaderUid: activeParty.leaderUid };
    });
  }

  if (action === "leave" || action === "kick") {
    const callerPointerRef = partyPointerRef(uid);
    return db.runTransaction(async (transaction) => {
      const callerPointerSnap = await transaction.get(callerPointerRef);
      if (!callerPointerSnap.exists) return { ok: true, alreadyLeft: true };
      const currentPartyId = PartySystem.safeUid(callerPointerSnap.data()?.partyId);
      if (!currentPartyId) return { ok: false, reason: "party-not-found" };
      const currentPartyRef = partyRef(currentPartyId);
      const currentPartySnap = await transaction.get(currentPartyRef);
      if (!currentPartySnap.exists) {
        transaction.delete(callerPointerRef);
        return { ok: true, alreadyLeft: true };
      }
      const currentParty = currentPartySnap.data();
      if (currentParty.battleId || ["battle_loading", "in_battle"].includes(currentParty.state)) return { ok: false, reason: "battle-active" };
      let targetUid = uid;
      if (action === "kick") {
        if (currentParty.leaderUid !== uid) return { ok: false, reason: "not-leader" };
        targetUid = PartySystem.safeUid(request.data?.targetUid);
        if (!targetUid || targetUid === uid || !(currentParty.memberUids || []).includes(targetUid)) return { ok: false, reason: "invalid-target" };
      }
      const nextParty = PartySystem.removeMember(currentParty, targetUid);
      const targetPointerRef = partyPointerRef(targetUid);
      const targetPointerSnap = targetUid === uid ? callerPointerSnap : await transaction.get(targetPointerRef);
      const remainingUid = nextParty.memberUids.length <= 1 ? nextParty.memberUids[0] : "";
      const remainingPointerRef = remainingUid ? partyPointerRef(remainingUid) : null;
      const remainingPointerSnap = remainingPointerRef ? await transaction.get(remainingPointerRef) : null;
      if (targetPointerSnap.exists && targetPointerSnap.data()?.partyId === currentPartyId) transaction.delete(targetPointerRef);
      if (nextParty.memberUids.length <= 1) {
        if (remainingPointerSnap?.exists && remainingPointerSnap.data()?.partyId === currentPartyId) transaction.delete(remainingPointerRef);
        transaction.delete(currentPartyRef);
      } else {
        nextParty.state = "idle";
        nextParty.transition = null;
        nextParty.updatedAtMs = nowMs;
        transaction.set(currentPartyRef, nextParty);
        for (const memberUid of nextParty.memberUids) transaction.set(partyPointerRef(memberUid), partyPointerPayload(currentPartyId, nextParty.leaderUid, nowMs));
      }
      return { ok: true, partyId: currentPartyId, removedUid: targetUid, leaderUid: nextParty.leaderUid || null };
    });
  }

  if (action === "transition-start") {
    const targetMapId = String(request.data?.targetMapId || "").trim();
    if (!targetMapId) return { ok: false, reason: "invalid-transition" };
    return db.runTransaction(async (transaction) => {
      const pointerSnap = await transaction.get(partyPointerRef(uid));
      if (!pointerSnap.exists) return { ok: false, reason: "not-in-party" };
      const currentPartyId = PartySystem.safeUid(pointerSnap.data()?.partyId);
      const currentPartyRef = partyRef(currentPartyId);
      const currentPartySnap = await transaction.get(currentPartyRef);
      if (!currentPartySnap.exists) return { ok: false, reason: "party-not-found" };
      const currentParty = currentPartySnap.data();
      if (currentParty.leaderUid !== uid) return { ok: false, reason: "not-leader" };
      if (currentParty.state !== "idle" || currentParty.battleId) return { ok: false, reason: "party-busy" };
      const memberRefs = currentParty.memberUids.map((memberUid) => db.doc(`players/${memberUid}`));
      const memberSnaps = await Promise.all(memberRefs.map((ref) => transaction.get(ref)));
      if (memberSnaps.some((snap) => !snap.exists)) return { ok: false, reason: "player-not-found" };
      const leaderIndex = currentParty.memberUids.indexOf(uid);
      const leaderSave = memberSnaps[leaderIndex].data();
      const transitionResult = ServerGame.mapCommand(leaderSave, { action: "transition", targetMapId }, { nowMs });
      if (!transitionResult?.ok || !transitionResult.state) return transitionResult;
      const fromMapId = String(leaderSave?.expansion?.currentMapId || "");
      const arrival = {
        x: Number(transitionResult.state.player.x) || 0,
        y: Number(transitionResult.state.player.y) || 0,
        facing: "",
      };
      for (let index = 0; index < memberSnaps.length; index += 1) {
        const original = memberSnaps[index].data();
        const shadow = JSON.parse(JSON.stringify(original));
        shadow.player.x = leaderSave.player.x;
        shadow.player.y = leaderSave.player.y;
        shadow.expansion.currentMapId = fromMapId;
        shadow.expansion.positionAuthority = JSON.parse(JSON.stringify(leaderSave.expansion?.positionAuthority || null));
        const moved = ServerGame.mapCommand(shadow, { action: "transition", targetMapId }, { nowMs });
        if (!moved?.ok || !moved.state) return moved;
        partyPlayerWrite(transaction, memberRefs[index], original, moved.state);
      }
      const transitionId = partyTransitionId();
      const nextParty = {
        ...currentParty,
        state: "transitioning",
        transition: { id: transitionId, fromMapId, targetMapId, arrival, status: "loading", readyUids: [], startedAtMs: nowMs },
        updatedAtMs: nowMs,
      };
      transaction.set(currentPartyRef, nextParty);
      return { ok: true, partyId: currentPartyId, transition: nextParty.transition };
    });
  }

  if (action === "transition-ready") {
    const transitionId = String(request.data?.transitionId || "").trim();
    return db.runTransaction(async (transaction) => {
      const pointerSnap = await transaction.get(partyPointerRef(uid));
      if (!pointerSnap.exists) return { ok: false, reason: "not-in-party" };
      const currentPartyId = PartySystem.safeUid(pointerSnap.data()?.partyId);
      const currentPartyRef = partyRef(currentPartyId);
      const partySnap = await transaction.get(currentPartyRef);
      if (!partySnap.exists) return { ok: false, reason: "party-not-found" };
      const party = partySnap.data();
      if (!party.transition || party.transition.id !== transitionId) return { ok: false, reason: "transition-not-found" };
      const readyUids = [...new Set([...(party.transition.readyUids || []), uid])];
      const complete = PartySystem.allReady(party.memberUids, readyUids);
      transaction.update(currentPartyRef, complete
        ? { state: "idle", transition: null, updatedAtMs: nowMs }
        : { "transition.readyUids": readyUids, updatedAtMs: nowMs });
      return { ok: true, complete, readyUids };
    });
  }

  if (action === "battle-start") {
    return db.runTransaction(async (transaction) => {
      const pointerSnap = await transaction.get(partyPointerRef(uid));
      if (!pointerSnap.exists) return { ok: false, reason: "not-in-party" };
      const currentPartyId = PartySystem.safeUid(pointerSnap.data()?.partyId);
      const currentPartyRef = partyRef(currentPartyId);
      const partySnap = await transaction.get(currentPartyRef);
      if (!partySnap.exists) return { ok: false, reason: "party-not-found" };
      const party = partySnap.data();
      if (party.leaderUid !== uid) return { ok: false, reason: "not-leader" };
      if (party.state !== "idle" || party.battleId || party.transition) return { ok: false, reason: "party-busy" };
      const memberRefs = party.memberUids.map((memberUid) => db.doc(`players/${memberUid}`));
      const memberSnaps = await Promise.all(memberRefs.map((ref) => transaction.get(ref)));
      if (memberSnaps.some((snap) => !snap.exists)) return { ok: false, reason: "player-not-found" };
      const saves = Object.fromEntries(party.memberUids.map((memberUid, index) => [memberUid, memberSnaps[index].data()]));
      const leaderSave = saves[uid];
      const mapId = String(leaderSave?.expansion?.currentMapId || "");
      if (party.memberUids.some((memberUid) => String(saves[memberUid]?.expansion?.currentMapId || "") !== mapId)) return { ok: false, reason: "party-map-mismatch" };
      if (party.memberUids.some((memberUid) => !(Number(saves[memberUid]?.player?.hp) > 0))) return { ok: false, reason: "party-member-dead" };
      if (party.memberUids.some((memberUid) => saves[memberUid]?.expansion?.serverBattle?.status === "active")) return { ok: false, reason: "party-member-busy" };
      const canonical = ServerGame.battleCommand(leaderSave, {
        action: "start",
        monsterType: request.data?.monsterType,
        level: request.data?.level,
        encounterId: request.data?.encounterId,
        position: request.data?.position,
      }, { nowMs });
      if (!canonical?.ok || !canonical.state?.expansion?.serverBattle) return canonical;
      const battleId = partyBattleId();
      const canonicalBattle = canonical.state.expansion.serverBattle;
      const shared = PartyBattle.createBattle({ id: battleId, party, saves, canonicalBattle, nowMs });
      transaction.set(partyBattleRef(battleId), shared);
      transaction.update(currentPartyRef, { state: "battle_loading", battleId, transition: null, updatedAtMs: nowMs });
      return { ok: true, partyId: currentPartyId, battleId };
    });
  }

  if (["battle-ready", "battle-move", "battle-action", "battle-advance", "battle-finish-ready", "battle-exit"].includes(action)) {
    const battleId = String(request.data?.battleId || "").trim();
    if (!battleId) return { ok: false, reason: "invalid-battle" };
    return db.runTransaction(async (transaction) => {
      const battleRef = partyBattleRef(battleId);
      const battleSnap = await transaction.get(battleRef);
      if (!battleSnap.exists) return { ok: false, reason: "battle-not-found" };
      let battle = battleSnap.data();
      if (!(battle.memberUids || []).includes(uid) || !battle.members?.[uid]) return { ok: false, reason: "not-participant" };
      const currentPartyRef = partyRef(battle.partyId);
      const partySnap = await transaction.get(currentPartyRef);
      const party = partySnap.exists ? partySnap.data() : null;
      if (!party) return { ok: false, reason: "party-not-found" };

      if (action === "battle-ready") {
        if (battle.status !== "loading") return { ok: true, alreadyReady: true, battleId };
        const readyUids = [...new Set([...(battle.readyUids || []), uid])];
        battle = { ...battle, readyUids, updatedAtMs: nowMs };
        const expected = (party.memberUids || []).filter((memberUid) => battle.memberUids.includes(memberUid));
        if (PartySystem.allReady(expected, readyUids)) {
          battle.status = "active";
          PartyBattle.beginMovePhase(battle, nowMs);
          transaction.update(currentPartyRef, { state: "in_battle", updatedAtMs: nowMs });
        }
        transaction.set(battleRef, battle);
        return { ok: true, battleId, started: battle.status === "active" };
      }

      if (action === "battle-finish-ready") {
        if (battle.status !== "finished") return { ok: false, reason: "battle-not-finished" };
        const expected = (Array.isArray(battle.finishParticipantUids) && battle.finishParticipantUids.length
          ? battle.finishParticipantUids
          : (battle.memberUids || []).filter((memberUid) => {
              const member = battle.members?.[memberUid];
              return member && member.retreated !== true && member.disconnected !== true;
            }));
        const finishReadyUids = [...new Set([...(battle.finishReadyUids || []), uid])].filter((memberUid) => expected.includes(memberUid));
        battle = { ...battle, finishParticipantUids: expected, finishReadyUids, updatedAtMs: nowMs };
        const release = expected.length === 0 || PartySystem.allReady(expected, finishReadyUids);
        if (release && battle.finishReleased !== true) {
          battle.finishReleased = true;
          battle.finishReleasedAtMs = nowMs;
          const survivingUids = (party.memberUids || []).filter((memberUid) => battle.members?.[memberUid]?.retreated !== true && battle.members?.[memberUid]?.disconnected !== true);
          let leaderUid = party.leaderUid;
          if (!survivingUids.includes(leaderUid) || Number(battle.members?.[leaderUid]?.hp) <= 0) {
            leaderUid = survivingUids.find((memberUid) => Number(battle.members?.[memberUid]?.hp) > 0) || survivingUids[0] || "";
          }
          if (battle.result === "victory" && survivingUids.length > 0) {
            // Keep the battle attached while the shared victory screen is open.
            // The leader releases the whole party together with battle-exit.
            transaction.update(currentPartyRef, { state: "battle_victory", battleId, leaderUid, memberUids: survivingUids, updatedAtMs: nowMs });
            for (const memberUid of survivingUids) transaction.set(partyPointerRef(memberUid), partyPointerPayload(party.id, leaderUid, nowMs));
          } else if (survivingUids.length <= 1) {
            battle.exitReleased = battle.result === "victory";
            if (battle.exitReleased) battle.exitReleasedAtMs = nowMs;
            for (const memberUid of survivingUids) transaction.delete(partyPointerRef(memberUid));
            transaction.delete(currentPartyRef);
          } else {
            battle.exitReleased = battle.result === "victory";
            if (battle.exitReleased) battle.exitReleasedAtMs = nowMs;
            transaction.update(currentPartyRef, { state: "idle", battleId: "", leaderUid, memberUids: survivingUids, updatedAtMs: nowMs });
            for (const memberUid of survivingUids) transaction.set(partyPointerRef(memberUid), partyPointerPayload(party.id, leaderUid, nowMs));
          }
        }
        transaction.set(battleRef, battle);
        return { ok: true, battleId, released: battle.finishReleased === true, readyCount: finishReadyUids.length, expectedCount: expected.length };
      }

      if (action === "battle-exit") {
        if (battle.status !== "finished" || battle.result !== "victory" || battle.finishReleased !== true) return { ok: false, reason: "battle-not-released" };
        if (battle.exitReleased === true) return { ok: true, battleId, released: true };
        if (party.leaderUid !== uid) return { ok: false, reason: "leader-only" };
        const survivingUids = (party.memberUids || []).filter((memberUid) => battle.members?.[memberUid]?.retreated !== true && battle.members?.[memberUid]?.disconnected !== true);
        let leaderUid = party.leaderUid;
        if (!survivingUids.includes(leaderUid) || Number(battle.members?.[leaderUid]?.hp) <= 0) {
          leaderUid = survivingUids.find((memberUid) => Number(battle.members?.[memberUid]?.hp) > 0) || survivingUids[0] || "";
        }
        battle.exitReleased = true;
        battle.exitReleasedAtMs = nowMs;
        battle.updatedAtMs = nowMs;
        if (survivingUids.length <= 1) {
          for (const memberUid of survivingUids) transaction.delete(partyPointerRef(memberUid));
          transaction.delete(currentPartyRef);
        } else {
          transaction.update(currentPartyRef, { state: "idle", battleId: "", leaderUid, memberUids: survivingUids, updatedAtMs: nowMs });
          for (const memberUid of survivingUids) transaction.set(partyPointerRef(memberUid), partyPointerPayload(party.id, leaderUid, nowMs));
        }
        transaction.set(battleRef, battle);
        return { ok: true, battleId, released: true };
      }

      if (battle.status !== "active") return { ok: false, reason: "battle-closed" };
      if (action !== "battle-advance" && whole(request.data?.round, -1) !== whole(battle.round, 1)) return { ok: false, reason: "round" };
      const saveRefs = Object.fromEntries((battle.memberUids || []).map((memberUid) => [memberUid, db.doc(`players/${memberUid}`)]));
      const saveSnaps = {};
      for (const memberUid of battle.memberUids || []) saveSnaps[memberUid] = await transaction.get(saveRefs[memberUid]);
      const saves = Object.fromEntries(Object.entries(saveSnaps).filter(([, snap]) => snap.exists).map(([memberUid, snap]) => [memberUid, snap.data()]));

      let shouldResolve = false;
      let resolving = battle.phase;
      if (action === "battle-move") {
        const validation = PartyBattle.validateMoveSubmission(battle, uid, saves[uid], request.data?.commands || [], request.data?.facing);
        if (!validation.ok) return { ...validation };
        battle.movePlans = { ...(battle.movePlans || {}), [uid]: { commands: validation.commands, facing: validation.finalFacing, submittedAtMs: nowMs } };
        shouldResolve = PartySystem.allActiveSubmitted(battle, "movePlans");
      } else if (action === "battle-action") {
        const validation = PartyBattle.validatePlayerAction(battle, uid, saves[uid], request.data?.battleAction || {});
        if (!validation.ok) return { ...validation };
        battle.actions = { ...(battle.actions || {}), [uid]: { ...validation.action, submittedAtMs: nowMs } };
        shouldResolve = PartySystem.allActiveSubmitted(battle, "actions");
      } else {
        if (nowMs < Number(battle.phaseEndsAtMs || 0)) return { ok: true, early: true, battleId, phase: battle.phase };
        if (battle.phase === "planning_move") {
          battle.movePlans = { ...(battle.movePlans || {}) };
          for (const memberUid of PartySystem.activeBattleMemberUids(battle)) {
            if (!battle.movePlans[memberUid]) battle.movePlans[memberUid] = { commands: [], facing: battle.members?.[memberUid]?.facing || "right", timedOut: true, submittedAtMs: nowMs };
          }
          shouldResolve = true;
          resolving = "planning_move";
        } else if (battle.phase === "planning_action") {
          battle.actions = { ...(battle.actions || {}) };
          for (const memberUid of PartySystem.activeBattleMemberUids(battle)) {
            if (!battle.actions[memberUid]) battle.actions[memberUid] = { type: "wait", timedOut: true, submittedAtMs: nowMs };
          }
          shouldResolve = true;
          resolving = "planning_action";
        } else return { ok: false, reason: "phase" };
      }

      if (!shouldResolve) {
        battle.updatedAtMs = nowMs;
        transaction.set(battleRef, battle);
        return { ok: true, submitted: true, battleId, phase: battle.phase };
      }

      if (resolving === "planning_move") {
        const result = PartyBattle.resolveMovement(battle, saves, nowMs);
        if (!result.ok) return { ...result };
        battle = result.battle;
        transaction.set(battleRef, battle);
        return { ok: true, resolved: true, battleId, phase: battle.phase };
      }

      const result = PartyBattle.resolveActions(battle, saves, nowMs);
      if (!result.ok) return { ...result };
      battle = result.battle;
      let nextSaves = result.saves;
      if (battle.status === "finished" && battle.result === "victory") {
        const rewarded = PartyBattle.grantVictoryRewards(battle, nextSaves);
        battle = rewarded.battle;
        nextSaves = rewarded.saves;
      }
      for (const memberUid of Object.keys(nextSaves)) {
        if (!saveSnaps[memberUid]?.exists) continue;
        const original = saveSnaps[memberUid].data();
        const nextSave = nextSaves[memberUid];
        if (JSON.stringify(original.player) !== JSON.stringify(nextSave.player) || JSON.stringify(original.expansion) !== JSON.stringify(nextSave.expansion)) {
          partyPlayerWrite(transaction, saveRefs[memberUid], original, nextSave);
        }
      }
      if (battle.status === "finished") {
        // Keep every client attached to the same Firestore battle document until
        // each participant has drained the authoritative presentation queue.
        // The party is released only by battle-finish-ready acknowledgements.
        transaction.update(currentPartyRef, { state: "battle_finishing", battleId, updatedAtMs: nowMs });
      } else if (Number(battle.members?.[party.leaderUid]?.hp) <= 0) {
        const nextLeader = PartySystem.activeBattleMemberUids(battle)[0] || party.leaderUid;
        if (nextLeader !== party.leaderUid) {
          transaction.update(currentPartyRef, { leaderUid: nextLeader, updatedAtMs: nowMs });
          for (const memberUid of party.memberUids || []) transaction.set(partyPointerRef(memberUid), partyPointerPayload(party.id, nextLeader, nowMs));
          battle.leaderUid = nextLeader;
        }
      }
      transaction.set(battleRef, battle);
      return { ok: true, resolved: true, finished: battle.status === "finished", result: battle.result || null, battleId, phase: battle.phase };
    });
  }

  if (action === "battle-retreat") {
    const battleId = String(request.data?.battleId || "").trim();
    if (!battleId) return { ok: false, reason: "invalid-battle" };
    return db.runTransaction(async (transaction) => {
      const battleRef = partyBattleRef(battleId);
      const battleSnap = await transaction.get(battleRef);
      if (!battleSnap.exists) return { ok: false, reason: "battle-not-found" };
      const battle = battleSnap.data();
      if (battle.status !== "active" || !battle.members?.[uid] || battle.members[uid].retreated || battle.members[uid].disconnected) return { ok: false, reason: "battle-closed" };
      const chance = PartyBattle.retreatChance(battle, uid);
      const success = Math.random() < chance;
      if (!success) return { ok: true, success: false, chance };
      const currentPartyRef = partyRef(battle.partyId);
      const partySnap = await transaction.get(currentPartyRef);
      const party = partySnap.exists ? partySnap.data() : null;
      battle.members[uid] = { ...battle.members[uid], retreated: true, alive: false, offlineSinceMs: 0 };
      appendPartyBattleRetreatEvent(battle, uid, false);
      if (party) {
        const nextParty = PartySystem.removeMember(party, uid);
        transaction.delete(partyPointerRef(uid));
        battle.leaderUid = nextParty.leaderUid || battle.leaderUid;
        if (!PartySystem.activeBattleMemberUids(battle).length) {
          const anyDeath = (battle.memberUids || []).some((memberUid) => battle.members?.[memberUid]?.disconnected || (battle.members?.[memberUid]?.retreated !== true && Number(battle.members?.[memberUid]?.hp) <= 0));
          battle.status = "finished";
          battle.phase = "finished";
          battle.result = anyDeath ? "defeat" : "retreat";
          battle.phaseEndsAtMs = 0;
        }
        if (battle.status === "finished" && nextParty.memberUids.length <= 1) {
          for (const memberUid of nextParty.memberUids) transaction.delete(partyPointerRef(memberUid));
          transaction.delete(currentPartyRef);
        } else {
          transaction.set(currentPartyRef, { ...nextParty, state: battle.status === "finished" ? "idle" : "in_battle", battleId: battle.status === "finished" ? "" : battleId, updatedAtMs: nowMs });
          for (const memberUid of nextParty.memberUids) transaction.set(partyPointerRef(memberUid), partyPointerPayload(nextParty.id, nextParty.leaderUid, nowMs));
        }
      }
      battle.updatedAtMs = nowMs;
      transaction.set(battleRef, battle);
      return { ok: true, success: true, chance, leftParty: true };
    });
  }

  if (action === "member-offline" || action === "member-reconnected") {
    const targetUid = PartySystem.safeUid(request.data?.targetUid);
    if (!targetUid) return { ok: false, reason: "invalid-target" };
    return db.runTransaction(async (transaction) => {
      const [callerPointer, targetPointer] = await Promise.all([transaction.get(partyPointerRef(uid)), transaction.get(partyPointerRef(targetUid))]);
      const callerPartyId = PartySystem.safeUid(callerPointer.data()?.partyId);
      const targetPartyId = PartySystem.safeUid(targetPointer.data()?.partyId);
      if (!callerPointer.exists || !targetPointer.exists || !callerPartyId || callerPartyId !== targetPartyId) return { ok: false, reason: "not-same-party" };
      const currentPartyRef = partyRef(callerPartyId);
      const partySnap = await transaction.get(currentPartyRef);
      if (!partySnap.exists) return { ok: false, reason: "party-not-found" };
      const party = partySnap.data();
      if (!(party.memberUids || []).includes(targetUid)) return { ok: false, reason: "not-same-party" };
      const existingPartyOfflineSince = Number(party.members?.[targetUid]?.offlineSinceMs) || 0;
      const offlineSinceMs = action === "member-offline" ? (existingPartyOfflineSince || nowMs) : 0;
      const battleRef = party.battleId ? partyBattleRef(party.battleId) : null;
      const battleSnap = battleRef ? await transaction.get(battleRef) : null;
      transaction.update(currentPartyRef, { [`members.${targetUid}.offlineSinceMs`]: offlineSinceMs, updatedAtMs: nowMs });
      if (battleRef && battleSnap?.exists && battleSnap.data()?.members?.[targetUid]) {
        const battleData = battleSnap.data();
        const existingBattleOfflineSince = Number(battleData.members?.[targetUid]?.offlineSinceMs) || 0;
        transaction.update(battleRef, { [`members.${targetUid}.offlineSinceMs`]: action === "member-offline" ? (existingBattleOfflineSince || offlineSinceMs) : 0, updatedAtMs: nowMs });
      }
      return { ok: true, targetUid, offline: action === "member-offline" };
    });
  }

  if (action === "disconnect-timeout") {
    const targetUid = PartySystem.safeUid(request.data?.targetUid);
    if (!targetUid) return { ok: false, reason: "invalid-target" };
    const presence = await realtimeDb.ref(`presence/${targetUid}`).get();
    if (presence.exists() && presence.val()?.online !== false) return { ok: true, skipped: true, reason: "still-online" };
    return db.runTransaction(async (transaction) => {
      const [callerPointer, targetPointer] = await Promise.all([transaction.get(partyPointerRef(uid)), transaction.get(partyPointerRef(targetUid))]);
      if (!callerPointer.exists || !targetPointer.exists) return { ok: true, skipped: true, reason: "already-left" };
      const currentPartyId = PartySystem.safeUid(callerPointer.data()?.partyId);
      if (!currentPartyId || currentPartyId !== PartySystem.safeUid(targetPointer.data()?.partyId)) return { ok: false, reason: "not-same-party" };
      const currentPartyRef = partyRef(currentPartyId);
      const partySnap = await transaction.get(currentPartyRef);
      if (!partySnap.exists) return { ok: true, skipped: true, reason: "party-gone" };
      const party = partySnap.data();
      const offlineSinceMs = Number(party.members?.[targetUid]?.offlineSinceMs) || 0;
      if (!offlineSinceMs || nowMs - offlineSinceMs < PartySystem.DISCONNECT_GRACE_MS) return { ok: true, skipped: true, reason: "grace" };
      const nextParty = PartySystem.removeMember(party, targetUid);
      let penalty = null;
      let battle = null;
      const battleRef = party.battleId ? partyBattleRef(party.battleId) : null;
      const battleSnap = battleRef ? await transaction.get(battleRef) : null;
      let targetPlayerRef = null;
      let targetPlayerSnap = null;
      if (battleSnap?.exists) {
        battle = battleSnap.data();
        const battleOfflineSince = Number(battle.members?.[targetUid]?.offlineSinceMs) || offlineSinceMs;
        if (nowMs - battleOfflineSince < PartySystem.DISCONNECT_GRACE_MS) return { ok: true, skipped: true, reason: "battle-grace" };
        targetPlayerRef = db.doc(`players/${targetUid}`);
        targetPlayerSnap = await transaction.get(targetPlayerRef);
      }

      // All reads are complete before the transaction starts mutating docs.
      transaction.delete(partyPointerRef(targetUid));
      if (battle && battleRef) {
        if (targetPlayerSnap?.exists) {
          penalty = PartySystem.applyForcedWildernessDeath(targetPlayerSnap.data());
          if (penalty.ok) partyPlayerWrite(transaction, targetPlayerRef, targetPlayerSnap.data(), penalty.state);
        }
        if (battle.members?.[targetUid]) battle.members[targetUid] = { ...battle.members[targetUid], hp: 0, alive: false, retreated: true, disconnected: true, offlineSinceMs };
        appendPartyBattleRetreatEvent(battle, targetUid, true);
        battle.leaderUid = nextParty.leaderUid || battle.leaderUid;
        const activeBattleUids = PartySystem.activeBattleMemberUids(battle);
        if (!activeBattleUids.length) {
          battle.status = "finished";
          battle.phase = "finished";
          battle.result = "defeat";
          battle.phaseEndsAtMs = 0;
        } else if (battle.status === "loading" && PartySystem.allReady(activeBattleUids, battle.readyUids || [])) {
          battle.status = "active";
          PartyBattle.beginMovePhase(battle, nowMs);
        }
        battle.updatedAtMs = nowMs;
        transaction.set(battleRef, battle);
      }
      const remaining = nextParty.memberUids;
      if ((!party.battleId || battle?.status === "finished") && remaining.length <= 1) {
        for (const memberUid of remaining) transaction.delete(partyPointerRef(memberUid));
        transaction.delete(currentPartyRef);
      } else {
        let transition = nextParty.transition;
        let state = nextParty.state;
        if (transition && PartySystem.allReady(remaining, transition.readyUids || [])) { transition = null; state = "idle"; }
        const nextState = battle?.status === "finished" ? "idle"
          : battle?.status === "active" ? "in_battle"
          : state;
        transaction.set(currentPartyRef, { ...nextParty, transition, state: nextState, battleId: battle?.status === "finished" ? "" : (nextParty.battleId || ""), updatedAtMs: nowMs });
        for (const memberUid of remaining) transaction.set(partyPointerRef(memberUid), partyPointerPayload(currentPartyId, nextParty.leaderUid, nowMs));
      }
      return { ok: true, removed: true, targetUid, penalty: penalty?.ok ? { penalty: penalty.penalty, deducted: penalty.deducted, levelsLost: penalty.levelsLost } : null };
    });
  }

  return { ok: false, reason: "unsupported-action", action };
});

function appendPartyBattleRetreatEvent(battle, uid, disconnected) {
  const member = battle?.members?.[uid];
  battle.eventSerial = Math.max(0, Math.floor(Number(battle.eventSerial) || 0)) + 1;
  battle.events = [...(Array.isArray(battle.events) ? battle.events : []), {
    serial: battle.eventSerial,
    type: disconnected ? "disconnect" : "retreat",
    actorUid: uid,
    actorName: member?.name || "冒險者",
    text: disconnected ? `${member?.name || "冒險者"} 斷線超時，已撤退離隊` : `${member?.name || "冒險者"} 成功撤退並離開隊伍`,
  }].slice(-40);
}


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
