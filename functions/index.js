"use strict";

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
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

initializeApp();

const db = getFirestore();
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
      const next = PlayerState.canonicalInitialSave(payload, { nowMs });
      transaction.set(playerRef, { ...next, updatedAt: FieldValue.serverTimestamp() });
      return { ok: true, created: true, data: next };
    }

    if (action === "migrate") {
      if (existing) return { ok: true, created: false, data: existing };
      const next = PlayerState.sanitizeLegacySave(payload, { nowMs });
      transaction.set(playerRef, { ...next, updatedAt: FieldValue.serverTimestamp() });
      return { ok: true, created: true, migrated: true, data: next };
    }

    if (action === "reset") {
      const next = PlayerState.canonicalInitialSave(payload, { nowMs });
      transaction.set(playerRef, { ...next, updatedAt: FieldValue.serverTimestamp() });
      return { ok: true, created: !existing, reset: true, data: next };
    }

    if (!existing) {
      const next = PlayerState.canonicalInitialSave(payload, { nowMs });
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
    const result = reviveResult(save, { returnToTown });
    if (!result.ok) return result;

    const updates = {
      "player.hp": result.player.hp,
      "player.level": result.player.level,
      "player.xp": result.player.xp,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (returnToTown) {
      // Step 9B: respawning in town is itself an authoritative map change.
      // Keep the canonical map, coordinates and trusted anchor in sync so the
      // next legitimate doorway/exit transition is not rejected as stale.
      const respawn = ServerGame.respawnTownStatePatch(save, { nowMs: Date.now() });
      updates["player.x"] = respawn.x;
      updates["player.y"] = respawn.y;
      updates["expansion.currentMapId"] = respawn.mapId;
      updates["expansion.positionAuthority"] = respawn.positionAuthority;
      transaction.update(playerRef, updates);
      return { ...result, respawn: { mapId: respawn.mapId, x: respawn.x, y: respawn.y } };
    }

    transaction.update(playerRef, updates);
    return result;
  });
});


async function runAuthoritativeCommand(request, command) {
  const uid = authenticatedUid(request);
  assertCommandVersion(request);
  return withPlayerTransaction(uid, ({ transaction, playerRef, save }) => {
    const result = command(save, request.data || {}, { nowMs: Date.now() });
    if (!result?.ok || !result.state) return result;
    const payload = result.state;
    const expansion = { ...(save.expansion || {}), ...(payload.expansion || {}) };
    delete expansion.checkpoint;
    delete expansion.dungeonClears;
    delete expansion.defeatedDungeonBosses;
    transaction.update(playerRef, {
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
