"use strict";

const Expansion = require("./shared/expansion-core.js");
const Guild = require("./shared/guild-commission-core.js");
const Skills = require("./shared/skill-core.js");
const ItemData = require("./shared/data/items.js");
const { classMaxHp } = require("./game-rules.js");

const SAVE_VERSION = 1;
const COMBAT_SCALE_VERSION = 2;
const MAX_COINS = 99999;
const MAX_POTIONS = 9;
const MAX_PLAY_TIME = 100000000;
const MAX_POSITION = 100000;
const MAX_WEAK_POTION_STEPS = 500;
const MAX_WEAK_POTION_REMAINDER = 999999;

function clone(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function whole(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function finite(value, fallback = 0, min = -MAX_POSITION, max = MAX_POSITION) {
  const number = Number(value);
  return Number.isFinite(number) ? clamp(number, min, max) : fallback;
}

function playerName(value, fallback = "阿巡") {
  const text = String(value || "").trim().slice(0, 24);
  return text || fallback;
}

function normalizeGender(value, fallback = "male") {
  const gender = String(value || "").trim().toLowerCase();
  return gender === "female" || gender === "male" ? gender : fallback;
}

function normalizeClassId(value) {
  const id = String(value || "").trim();
  return Skills.CLASS_IDS?.includes(id) ? id : (Skills.DEFAULT_CLASS_ID || "fighter");
}

function canonicalInitialSave(payload = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const sourcePlayer = source.player && typeof source.player === "object" ? source.player : {};
  const sourceExpansion = source.expansion && typeof source.expansion === "object" ? source.expansion : {};
  const classId = normalizeClassId(sourceExpansion.classId);
  const gear = Expansion.starterEquipmentForClass(classId);
  const x = finite(sourcePlayer.x, 0);
  const y = finite(sourcePlayer.y, 0);
  const maxHp = classMaxHp(classId, 1);

  return {
    version: SAVE_VERSION,
    combatScaleVersion: COMBAT_SCALE_VERSION,
    player: {
      name: playerName(sourcePlayer.name),
      gender: normalizeGender(sourcePlayer.gender),
      x,
      y,
      hp: maxHp,
      level: 1,
      xp: 0,
      coins: 12,
      potions: 2,
      weaponLevel: 1,
      upgrades: { vigor: 0, edge: 0, swift: 0 },
    },
    pendingLevelUps: 0,
    openedChests: [],
    playTime: 0,
    expansion: {
      currentMapId: "world",
      classId,
      ownedEquipment: [gear.weapon, gear.upperBody],
      equipped: {
        head: null,
        weapon: gear.weapon,
        upperBody: gear.upperBody,
        lowerBody: null,
        hands: null,
        feet: null,
        charm: null,
      },
      guildCommission: Guild.emptyState(),
      guildMarks: 0,
      guildRenown: 0,
      inventory: {},
      weakPotion: { stepsRemaining: 0, distanceRemainder: 0 },
      monsterKills: {},
      dungeonClears: 0,
      defeatedDungeonBosses: [],
      skills: Skills.createSkillState({ classId }),
      checkpoint: { mapId: "world", x, y },
    },
  };
}

function clientOwnedPatch(existingSave, payload = {}) {
  const existing = existingSave && typeof existingSave === "object" ? existingSave : {};
  const source = payload && typeof payload === "object" ? payload : {};
  const player = source.player && typeof source.player === "object" ? source.player : {};
  const expansion = source.expansion && typeof source.expansion === "object" ? source.expansion : {};
  const previousWeak = existing.expansion?.weakPotion && typeof existing.expansion.weakPotion === "object"
    ? existing.expansion.weakPotion
    : { stepsRemaining: 0, distanceRemainder: 0 };

  const currentSteps = clamp(whole(previousWeak.stepsRemaining, 0), 0, MAX_WEAK_POTION_STEPS);
  const requestedSteps = clamp(whole(expansion.weakPotion?.stepsRemaining, currentSteps), 0, MAX_WEAK_POTION_STEPS);
  const nextSteps = Math.min(currentSteps, requestedSteps);
  const nextRemainder = nextSteps > 0
    ? finite(expansion.weakPotion?.distanceRemainder, Number(previousWeak.distanceRemainder) || 0, 0, MAX_WEAK_POTION_REMAINDER)
    : 0;

  const previousPlayTime = clamp(Number(existing.playTime) || 0, 0, MAX_PLAY_TIME);
  const requestedPlayTime = clamp(Number(source.playTime) || 0, 0, MAX_PLAY_TIME);

  return {
    "player.x": finite(player.x, Number(existing.player?.x) || 0),
    "player.y": finite(player.y, Number(existing.player?.y) || 0),
    playTime: Math.max(previousPlayTime, requestedPlayTime),
    "expansion.weakPotion.stepsRemaining": nextSteps,
    "expansion.weakPotion.distanceRemainder": nextRemainder,
  };
}

function mergeClientOwnedState(existingSave, patch) {
  const next = clone(existingSave) || {};
  next.player = next.player && typeof next.player === "object" ? next.player : {};
  next.expansion = next.expansion && typeof next.expansion === "object" ? next.expansion : {};
  next.expansion.weakPotion = next.expansion.weakPotion && typeof next.expansion.weakPotion === "object"
    ? next.expansion.weakPotion
    : {};
  next.player.x = patch["player.x"];
  next.player.y = patch["player.y"];
  next.playTime = patch.playTime;
  next.expansion.weakPotion.stepsRemaining = patch["expansion.weakPotion.stepsRemaining"];
  next.expansion.weakPotion.distanceRemainder = patch["expansion.weakPotion.distanceRemainder"];
  return next;
}

function sanitizeLegacySave(payload = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const sourcePlayer = source.player && typeof source.player === "object" ? source.player : {};
  const sourceExpansion = source.expansion && typeof source.expansion === "object" ? source.expansion : {};
  const classId = normalizeClassId(sourceExpansion.classId || sourceExpansion.skills?.classId);
  const level = clamp(whole(sourcePlayer.level, 1), 1, Expansion.LEVEL_CAP || 45);
  const maxHp = classMaxHp(classId, level);
  const normalizedInventory = ItemData.normalizeInventory(sourceExpansion.inventory || {});
  const monsterKills = {};
  if (sourceExpansion.monsterKills && typeof sourceExpansion.monsterKills === "object") {
    for (const [id, count] of Object.entries(sourceExpansion.monsterKills).slice(0, 60)) {
      const key = String(id || "").trim();
      if (key) monsterKills[key] = clamp(whole(count, 0), 0, 99999);
    }
  }
  const x = finite(sourcePlayer.x, 0);
  const y = finite(sourcePlayer.y, 0);
  const checkpoint = sourceExpansion.checkpoint && typeof sourceExpansion.checkpoint === "object"
    ? {
      mapId: String(sourceExpansion.checkpoint.mapId || "world").slice(0, 64),
      x: finite(sourceExpansion.checkpoint.x, x),
      y: finite(sourceExpansion.checkpoint.y, y),
    }
    : { mapId: "world", x, y };

  return {
    version: SAVE_VERSION,
    combatScaleVersion: COMBAT_SCALE_VERSION,
    player: {
      name: playerName(sourcePlayer.name),
      gender: normalizeGender(sourcePlayer.gender),
      x,
      y,
      hp: clamp(whole(sourcePlayer.hp, maxHp), 1, maxHp),
      level,
      xp: Math.max(0, whole(sourcePlayer.xp, 0)),
      coins: clamp(whole(sourcePlayer.coins, 0), 0, MAX_COINS),
      potions: clamp(whole(sourcePlayer.potions, 0), 0, MAX_POTIONS),
      weaponLevel: clamp(whole(sourcePlayer.weaponLevel, 1), 1, 4),
      upgrades: {
        vigor: clamp(whole(sourcePlayer.upgrades?.vigor, 0), 0, 40),
        edge: clamp(whole(sourcePlayer.upgrades?.edge, 0), 0, 40),
        swift: clamp(whole(sourcePlayer.upgrades?.swift, 0), 0, 40),
      },
    },
    pendingLevelUps: 0,
    openedChests: Array.isArray(source.openedChests)
      ? [...new Set(source.openedChests.map(String).filter(Boolean))].slice(0, 50)
      : [],
    playTime: clamp(Number(source.playTime) || 0, 0, MAX_PLAY_TIME),
    expansion: {
      currentMapId: String(sourceExpansion.currentMapId || "world").slice(0, 64),
      classId,
      ownedEquipment: Array.isArray(sourceExpansion.ownedEquipment)
        ? [...new Set(sourceExpansion.ownedEquipment.filter((id) => id == null || typeof id === "string"))].slice(0, 120)
        : [],
      equipped: sourceExpansion.equipped && typeof sourceExpansion.equipped === "object" ? clone(sourceExpansion.equipped) : {},
      guildCommission: Guild.normalizeState(sourceExpansion.guildCommission),
      guildMarks: clamp(whole(sourceExpansion.guildMarks, 0), 0, 99999),
      guildRenown: clamp(whole(sourceExpansion.guildRenown, 0), 0, 999999),
      inventory: normalizedInventory,
      weakPotion: {
        stepsRemaining: clamp(whole(sourceExpansion.weakPotion?.stepsRemaining, 0), 0, MAX_WEAK_POTION_STEPS),
        distanceRemainder: finite(sourceExpansion.weakPotion?.distanceRemainder, 0, 0, MAX_WEAK_POTION_REMAINDER),
      },
      monsterKills,
      dungeonClears: clamp(whole(sourceExpansion.dungeonClears, 0), 0, 9999),
      defeatedDungeonBosses: Array.isArray(sourceExpansion.defeatedDungeonBosses)
        ? [...new Set(sourceExpansion.defeatedDungeonBosses.map(String).filter(Boolean))].slice(0, 50)
        : [],
      skills: Skills.normalizeSkillState(sourceExpansion.skills, { classId }),
      checkpoint,
    },
  };
}

module.exports = Object.freeze({
  SAVE_VERSION,
  COMBAT_SCALE_VERSION,
  canonicalInitialSave,
  clientOwnedPatch,
  mergeClientOwnedState,
  sanitizeLegacySave,
});
