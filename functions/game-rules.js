"use strict";

const LEVEL_CAP = 45;
const HP_SCALE = 5;
const HEALING_POTION_ID = "healing_potion";
const HEALING_POTION_BASE_HEAL = 30;
const HEALING_POTION_HEAL = HEALING_POTION_BASE_HEAL * HP_SCALE;
const CLASS_IDS = new Set(["warrior", "fighter", "elementalist"]);

function whole(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeClassId(value) {
  const id = String(value || "").trim();
  return CLASS_IDS.has(id) ? id : "fighter";
}

function classMaxHp(classId, level) {
  const id = normalizeClassId(classId);
  const safeLevel = clamp(whole(level, 1), 1, LEVEL_CAP);
  const steps = safeLevel - 1;
  const fighter = id === "fighter";
  const elementalist = id === "elementalist";
  const perLevel = fighter ? 7 : elementalist ? 6 : 8;
  const perFive = fighter ? 3 : elementalist ? 2 : 4;
  return (88 + steps * perLevel + Math.floor(steps / 5) * perFive) * HP_SCALE;
}

function healingPotionResult(save) {
  const player = save?.player || {};
  const expansion = save?.expansion || {};
  const level = clamp(whole(player.level, 1), 1, LEVEL_CAP);
  const maxHp = classMaxHp(expansion.classId, level);
  const hp = clamp(Number(player.hp) || 0, 0, maxHp);
  const potions = clamp(whole(player.potions, 0), 0, 9);

  if (potions <= 0) {
    return { ok: false, reason: "empty", player: { hp, potions, maxHp } };
  }
  if (hp >= maxHp) {
    return { ok: false, reason: "full", player: { hp, potions, maxHp } };
  }

  const healed = Math.min(maxHp - hp, HEALING_POTION_HEAL);
  return {
    ok: true,
    reason: null,
    itemId: HEALING_POTION_ID,
    healed,
    player: {
      hp: hp + healed,
      potions: potions - 1,
      maxHp,
    },
  };
}

module.exports = Object.freeze({
  LEVEL_CAP,
  HP_SCALE,
  HEALING_POTION_ID,
  HEALING_POTION_HEAL,
  normalizeClassId,
  classMaxHp,
  healingPotionResult,
});
