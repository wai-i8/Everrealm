"use strict";

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  HEALING_POTION_ID,
  WEAK_POTION_ID,
  healingPotionResult,
  weakPotionResult,
  clinicHealResult,
  shrineRestResult,
  reviveResult,
} = require("./game-rules");

initializeApp();

const db = getFirestore();
const REGION = "europe-west2";
const COMMAND_VERSION = 1;

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
  const shrineId = String(request.data?.shrineId || "").trim();
  if (!["clinic", "shrine", "revive_here", "respawn_town"].includes(action)) {
    return { ok: false, reason: "unsupported-action", action };
  }

  return withPlayerTransaction(uid, ({ transaction, playerRef, save }) => {
    if (action === "clinic") {
      const result = clinicHealResult(save);
      if (!result.ok) return result;
      transaction.update(playerRef, {
        "player.hp": result.player.hp,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return result;
    }

    if (action === "shrine") {
      const result = shrineRestResult(save, shrineId);
      if (!result.ok) return result;
      transaction.update(playerRef, {
        "player.hp": result.player.hp,
        "expansion.checkpoint.mapId": result.checkpoint.mapId,
        "expansion.checkpoint.x": result.checkpoint.x,
        "expansion.checkpoint.y": result.checkpoint.y,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return result;
    }

    const result = reviveResult(save, { returnToTown: action === "respawn_town" });
    if (!result.ok) return result;
    transaction.update(playerRef, {
      "player.hp": result.player.hp,
      "player.level": result.player.level,
      "player.xp": result.player.xp,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return result;
  });
});
