"use strict";

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  HEALING_POTION_ID,
  healingPotionResult,
} = require("./game-rules");

initializeApp();

const db = getFirestore();
const REGION = "europe-west2";
const COMMAND_VERSION = 1;

exports.useItem = onCall({ region: REGION, maxInstances: 10 }, async (request) => {
  const uid = String(request.auth?.uid || "").trim();
  if (!uid) throw new HttpsError("unauthenticated", "Authentication is required.");

  const version = Number(request.data?.version) || 0;
  const itemId = String(request.data?.itemId || "").trim();
  if (version !== COMMAND_VERSION) {
    throw new HttpsError("failed-precondition", "Unsupported command version.");
  }
  if (itemId !== HEALING_POTION_ID) {
    return { ok: false, reason: "unsupported-item", itemId };
  }

  const playerRef = db.doc(`players/${uid}`);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(playerRef);
    if (!snapshot.exists) {
      throw new HttpsError("failed-precondition", "Player save is not ready.");
    }

    const result = healingPotionResult(snapshot.data());
    if (!result.ok) return result;

    transaction.update(playerRef, {
      "player.hp": result.player.hp,
      "player.potions": result.player.potions,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return result;
  });
});
