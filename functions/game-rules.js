"use strict";

const LEVEL_CAP = 45;
const HP_SCALE = 5;
const HEALING_POTION_ID = "healing_potion";
const WEAK_POTION_ID = "weak_potion";
const HEALING_POTION_BASE_HEAL = 30;
const HEALING_POTION_HEAL = HEALING_POTION_BASE_HEAL * HP_SCALE;
const WEAK_POTION_TOTAL_STEPS = 500;
const WEAK_POTION_WORLD_UNITS_PER_STEP = 32;
const CLASS_IDS = new Set(["fighter", "elementalist"]);
const LEVEL_EXP_REQUIREMENTS = Object.freeze({
  1: 250, 2: 260, 3: 270, 4: 290, 5: 310,
  6: 340, 7: 370, 8: 410, 9: 450, 10: 500,
  11: 550, 12: 610, 13: 670, 14: 2000, 15: 2050,
  16: 2100, 17: 2150, 18: 2200, 19: 4000, 20: 4050,
  21: 4100, 22: 4150, 23: 4200, 24: 6000, 25: 6050,
  26: 6100, 27: 6150, 28: 6200, 29: 8000, 30: 8050,
  31: 8100, 32: 8150, 33: 8200, 34: 10000, 35: 12000,
  36: 14500, 37: 17000, 38: 19000, 39: 20500, 40: 21500,
  41: 22200, 42: 22900, 43: 23600, 44: 24300, 45: 25000,
});

function whole(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeClassId(value) {
  const id = String(value || "").trim();
  if (id === "warrior") return "fighter";
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

function xpRequired(level) {
  const safeLevel = clamp(whole(level, 1), 1, LEVEL_CAP);
  return LEVEL_EXP_REQUIREMENTS[safeLevel] || LEVEL_EXP_REQUIREMENTS[LEVEL_CAP];
}

function loseExperience(level, xp, amount) {
  let nextLevel = clamp(whole(level, 1), 1, LEVEL_CAP);
  let nextXp = Math.max(0, whole(xp, 0));
  let remaining = Math.max(0, whole(amount, 0));
  let deducted = 0;
  let levelsLost = 0;

  while (remaining > 0) {
    if (nextXp >= remaining) {
      nextXp -= remaining;
      deducted += remaining;
      remaining = 0;
      break;
    }

    deducted += nextXp;
    remaining -= nextXp;
    nextXp = 0;

    if (nextLevel <= 1) break;

    nextLevel -= 1;
    levelsLost += 1;
    const previousLevelRequirement = xpRequired(nextLevel);
    const fromPreviousLevel = Math.min(previousLevelRequirement, remaining);
    nextXp = previousLevelRequirement - fromPreviousLevel;
    deducted += fromPreviousLevel;
    remaining -= fromPreviousLevel;
  }

  return {
    level: nextLevel,
    xp: nextXp,
    deducted,
    levelsLost,
    requested: Math.max(0, whole(amount, 0)),
    floored: remaining > 0 && nextLevel <= 1 && nextXp <= 0,
  };
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

function weakPotionResult(save) {
  const expansion = save?.expansion || {};
  const inventory = expansion.inventory && typeof expansion.inventory === "object" ? expansion.inventory : {};
  const quantity = Math.max(0, whole(inventory[WEAK_POTION_ID], 0));
  if (quantity <= 0) {
    return {
      ok: false,
      reason: "empty",
      itemId: WEAK_POTION_ID,
      inventory: { quantity: 0 },
      weakPotion: { stepsRemaining: 0, distanceRemainder: 0 },
    };
  }

  return {
    ok: true,
    reason: null,
    itemId: WEAK_POTION_ID,
    inventory: { quantity: quantity - 1 },
    weakPotion: {
      stepsRemaining: WEAK_POTION_TOTAL_STEPS,
      distanceRemainder: 0,
      worldUnitsPerStep: WEAK_POTION_WORLD_UNITS_PER_STEP,
    },
  };
}

function clinicHealResult(save) {
  const player = save?.player || {};
  const expansion = save?.expansion || {};
  const currentMapId = String(expansion.currentMapId || "");
  if (currentMapId !== "clinic") return { ok: false, reason: "wrong-map" };

  const level = clamp(whole(player.level, 1), 1, LEVEL_CAP);
  const maxHp = classMaxHp(expansion.classId, level);
  return {
    ok: true,
    reason: null,
    player: { hp: maxHp, maxHp },
  };
}

function reviveResult(save, { returnToTown = false } = {}) {
  const player = save?.player || {};
  const expansion = save?.expansion || {};
  const currentHp = Number(player.hp);
  if (!Number.isFinite(currentHp) || currentHp > 0) return { ok: false, reason: "not-dead" };

  const level = clamp(whole(player.level, 1), 1, LEVEL_CAP);
  const xp = Math.max(0, whole(player.xp, 0));
  const penalty = Math.max(1, Math.round(xpRequired(level) * 0.05));
  const loss = loseExperience(level, xp, penalty);
  const maxHp = classMaxHp(expansion.classId, loss.level);

  return {
    ok: true,
    reason: null,
    returnToTown: Boolean(returnToTown),
    penalty,
    deducted: loss.deducted,
    levelsLost: loss.levelsLost,
    player: {
      level: loss.level,
      xp: loss.level >= LEVEL_CAP ? 0 : loss.xp,
      hp: returnToTown ? maxHp : 1,
      maxHp,
    },
  };
}

module.exports = Object.freeze({
  LEVEL_CAP,
  HP_SCALE,
  HEALING_POTION_ID,
  WEAK_POTION_ID,
  HEALING_POTION_HEAL,
  WEAK_POTION_TOTAL_STEPS,
  WEAK_POTION_WORLD_UNITS_PER_STEP,
  normalizeClassId,
  classMaxHp,
  xpRequired,
  loseExperience,
  healingPotionResult,
  weakPotionResult,
  clinicHealResult,
  reviveResult,
});
