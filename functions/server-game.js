"use strict";

const Expansion = require("./shared/expansion-core.js");
const Guild = require("./shared/guild-commission-core.js");
const Skills = require("./shared/skill-core.js");
const Panels = require("./shared/panel-core.js");
const MainQuest = require("./shared/main-quest-core.js");
const Tactics = require("./shared/tactics-core.js");
const MonsterAI = require("./shared/monster-ai.js");
const FighterEffects = require("./shared/fighter-effects.js");
const ItemData = require("./shared/data/items.js");
const MonsterBlueprints = require("./shared/map/monster-blueprints.js");
const FieldEncounters = require("./shared/map/field-encounters.generated.js");
const { classMaxHp, normalizeClassId } = require("./game-rules.js");
const PlayerState = require("./player-state.js");

const SHOP_SELL_RATE = 1 / 3;
const MAX_COINS = 99999;
const GENERAL_STORE_GOODS = Object.freeze({
  healing_potion: Object.freeze({ id: "healing_potion", price: 30 }),
  weak_potion: Object.freeze({ id: "weak_potion", price: 200 }),
});
const MAP_LINKS = Object.freeze({
  world: new Set(["field", "guild", "shop", "clinic", "general-store", "inn"]),
  field: new Set(["world", "mountain-southeast"]),
  "mountain-southeast": new Set(["field", "mountain-south"]),
  "mountain-south": new Set(["mountain-southeast"]),
  guild: new Set(["world"]),
  shop: new Set(["world"]),
  clinic: new Set(["world"]),
  "general-store": new Set(["world"]),
  inn: new Set(["world"]),
});

// Phase 3 Step 9B: map changes remain one callable per transition, but the
// server now checks that the Step 9A trusted position is actually near the
// authored exit/door. Arrival coordinates are server-owned too, so a modified
// client cannot choose an arbitrary spawn point after a valid transition.
const MAP_TRANSITION_POSITION_MARGIN = 180;
const POSITION_AUTHORITY_VERSION = 1;
const WORLD_RESPAWN = Object.freeze({ mapId: "world", x: 3663, y: 1746 });
const FIELD_ENCOUNTER_LEVEL_VARIANCE = Object.freeze({ minDelta: -2, maxDelta: 3, floor: 1, cap: 45 });

function fieldEncounterLevelWindow(blueprint) {
  const baseLevel = clamp(whole(blueprint?.baseLevel, 1), 1, FIELD_ENCOUNTER_LEVEL_VARIANCE.cap);
  const minLevel = Math.max(FIELD_ENCOUNTER_LEVEL_VARIANCE.floor, baseLevel + FIELD_ENCOUNTER_LEVEL_VARIANCE.minDelta);
  const maxLevel = Math.max(minLevel, Math.min(FIELD_ENCOUNTER_LEVEL_VARIANCE.cap, baseLevel + FIELD_ENCOUNTER_LEVEL_VARIANCE.maxDelta));
  return [minLevel, maxLevel];
}

function validateFieldRandomEncounter(position, blueprint, level) {
  const zone = FieldEncounters?.zoneAtWorldPosition?.(
    Number(position?.x),
    Number(position?.y),
    Number(FieldEncounters?.source?.width) || 4096,
    Number(FieldEncounters?.source?.height) || 4096,
  );
  if (!zone) return { ok: false, reason: "invalid-encounter-zone" };

  const [monsterMinLevel, monsterMaxLevel] = fieldEncounterLevelWindow(blueprint);
  const zoneMinLevel = clamp(whole(zone.minLevel, 1), 1, 45);
  const zoneMaxLevel = clamp(whole(zone.maxLevel, zoneMinLevel), zoneMinLevel, 45);
  if (monsterMaxLevel < zoneMinLevel || monsterMinLevel > zoneMaxLevel) {
    return {
      ok: false,
      reason: "monster-not-in-encounter-zone",
      encounterZone: zone.label || null,
      zoneLevelRange: [zoneMinLevel, zoneMaxLevel],
      monsterLevelRange: [monsterMinLevel, monsterMaxLevel],
    };
  }
  if (level < zoneMinLevel || level > zoneMaxLevel || level < monsterMinLevel || level > monsterMaxLevel) {
    return {
      ok: false,
      reason: "encounter-level-mismatch",
      encounterZone: zone.label || null,
      zoneLevelRange: [zoneMinLevel, zoneMaxLevel],
      monsterLevelRange: [monsterMinLevel, monsterMaxLevel],
      requestedLevel: level,
    };
  }
  return {
    ok: true,
    encounterZone: zone.label || null,
    zoneLevelRange: [zoneMinLevel, zoneMaxLevel],
    monsterLevelRange: [monsterMinLevel, monsterMaxLevel],
  };
}

// Phase 3 Step 9C: important gameplay commands carry the player's current
// exploration position. The server never trusts that point directly: it first
// checks that the claim is physically reachable from the Step 9A trusted
// anchor, advances the anchor only when that movement is plausible, and then
// applies a small authored proximity gate for the requested service/action.
// RTDB movement/interpolation remains untouched.
const GAMEPLAY_INTERACTION_RULES = Object.freeze({
  guild: Object.freeze({
    mapId: "guild",
    targets: Object.freeze([
      // Public commission receptionist (guildmaster-yin).
      Object.freeze({ x: 1666, y: 676, radius: 220 }),
      // West-side commission board.
      Object.freeze({ x: 180, y: 220, radius: 110 }),
    ]),
  }),
  "equipment-shop": Object.freeze({
    mapId: "shop",
    targets: Object.freeze([Object.freeze({ x: 621, y: 444, radius: 210 })]),
  }),
  "general-store": Object.freeze({
    mapId: "general-store",
    targets: Object.freeze([Object.freeze({ x: 622, y: 381, radius: 220 })]),
  }),
  "clinic-heal": Object.freeze({
    mapId: "clinic",
    targets: Object.freeze([Object.freeze({ x: 628, y: 708, radius: 220 })]),
  }),
  "mountain-wish-pool": Object.freeze({
    mapId: "field",
    targets: Object.freeze([Object.freeze({ x: 1770, y: 938, radius: 190 })]),
  }),
  "deck-board": Object.freeze({
    mapId: "world",
    targets: Object.freeze([Object.freeze({ x: 5807, y: 2033, radius: 360 })]),
  }),
});

function transitionRule(sourceRect, arrival) {
  return Object.freeze({
    sourceRect: Object.freeze({ ...sourceRect }),
    arrival: Object.freeze({ ...arrival }),
  });
}

const MAP_TRANSITION_RULES = Object.freeze({
  world: Object.freeze({
    guild: transitionRule({ x: 3514, y: 1472, w: 291, h: 184 }, { x: 1666, y: 1576 }),
    shop: transitionRule({ x: 1943, y: 1759, w: 261, h: 160 }, { x: 628, y: 998 }),
    inn: transitionRule({ x: 5126, y: 2920, w: 273, h: 150 }, { x: 634, y: 1076 }),
    clinic: transitionRule({ x: 5149, y: 1756, w: 267, h: 164 }, { x: 627, y: 1050 }),
    "general-store": transitionRule({ x: 1907, y: 2920, w: 282, h: 154 }, { x: 618, y: 1062 }),
    field: transitionRule({ x: 6167, y: 1963, w: 230, h: 260 }, { x: 721, y: 2650 }),
  }),
  field: Object.freeze({
    world: transitionRule({ x: 567, y: 2545, w: 99, h: 215 }, { x: 6067, y: 2092 }),
    "mountain-southeast": transitionRule({ x: 3320, y: 148, w: 314, h: 207 }, { x: 4716, y: 4383 }),
  }),
  "mountain-southeast": Object.freeze({
    field: transitionRule({ x: 4506, y: 4523, w: 435, h: 493 }, { x: 3477, y: 454 }),
    "mountain-south": transitionRule({ x: 0, y: 872, w: 384, h: 348 }, { x: 4500, y: 1489 }),
  }),
  "mountain-south": Object.freeze({
    "mountain-southeast": transitionRule({ x: 4628, y: 1318, w: 236, h: 317 }, { x: 524, y: 1036 }),
  }),
  guild: Object.freeze({
    world: transitionRule({ x: 1423, y: 1588, w: 492, h: 122 }, { x: 3663, y: 1746 }),
  }),
  shop: Object.freeze({
    world: transitionRule({ x: 556, y: 1010, w: 144, h: 53 }, { x: 2071, y: 2009 }),
  }),
  clinic: Object.freeze({
    world: transitionRule({ x: 501, y: 1070, w: 260, h: 99 }, { x: 5281, y: 2010 }),
  }),
  "general-store": Object.freeze({
    world: transitionRule({ x: 542, y: 1074, w: 155, h: 42 }, { x: 2049, y: 3164 }),
  }),
  inn: Object.freeze({
    world: transitionRule({ x: 535, y: 1088, w: 199, h: 101 }, { x: 5262, y: 3160 }),
  }),
});

function normalizeMapId(value) {
  const id = String(value || "world").trim();
  // One-time compatibility for saves created while this mountain map still
  // used the retired internal id "dungeon".
  return id === "dungeon" ? "mountain-southeast" : id;
}
function clone(value) { return JSON.parse(JSON.stringify(value ?? null)); }
function whole(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function saveCopy(save) {
  const next = clone(save) || {};
  next.player = next.player && typeof next.player === "object" ? next.player : {};
  next.expansion = next.expansion && typeof next.expansion === "object" ? next.expansion : {};
  next.expansion.currentMapId = normalizeMapId(next.expansion.currentMapId);
  next.expansion.classId = normalizeClassId(next.expansion.classId);
  if (next.expansion.positionAuthority && typeof next.expansion.positionAuthority === "object") {
    next.expansion.positionAuthority = { ...next.expansion.positionAuthority, mapId: normalizeMapId(next.expansion.positionAuthority.mapId) };
  }
  next.expansion.inventory = ItemData.normalizeInventory(next.expansion.inventory || {});
  next.expansion.ownedEquipment = Array.isArray(next.expansion.ownedEquipment) ? next.expansion.ownedEquipment.map(String) : [];
  next.expansion.equipped = next.expansion.equipped && typeof next.expansion.equipped === "object" ? next.expansion.equipped : {};
  next.expansion.guildCommission = Guild.normalizeState(next.expansion.guildCommission);
  next.expansion.skills = Skills.normalizeSkillState(next.expansion.skills, { classId: next.expansion.classId });
  next.expansion.panels = Panels.normalizeState(next.expansion.panels, next.expansion.skills);
  next.expansion.skills = Panels.syncSkillState(next.expansion.panels, next.expansion.skills);
  next.expansion.mainQuest = MainQuest.normalizeState(next.expansion.mainQuest);
  next.expansion.weakPotion = next.expansion.weakPotion && typeof next.expansion.weakPotion === "object" ? { ...next.expansion.weakPotion } : { stepsRemaining: 0, distanceRemainder: 0 };
  next.expansion.monsterKills = next.expansion.monsterKills && typeof next.expansion.monsterKills === "object" ? { ...next.expansion.monsterKills } : {};
  next.openedChests = Array.isArray(next.openedChests) ? next.openedChests.map(String) : [];
  return next;
}
function playerSnapshot(state) {
  return {
    x: Number(state.player.x) || 0,
    y: Number(state.player.y) || 0,
    hp: whole(state.player.hp, 0),
    level: clamp(whole(state.player.level, 1), 1, Expansion.LEVEL_CAP),
    xp: Math.max(0, whole(state.player.xp, 0)),
    coins: clamp(whole(state.player.coins, 0), 0, MAX_COINS),
    potions: clamp(whole(state.player.potions, 0), 0, 9),
  };
}
function statePayload(state) {
  return {
    stateRevision: Math.max(0, whole(state.stateRevision, 0)),
    player: playerSnapshot(state),
    expansion: {
      currentMapId: normalizeMapId(state.expansion.currentMapId),
      classId: normalizeClassId(state.expansion.classId),
      inventory: clone(state.expansion.inventory || {}),
      ownedEquipment: [...(state.expansion.ownedEquipment || [])],
      equipped: clone(state.expansion.equipped || {}),
      guildCommission: clone(state.expansion.guildCommission || Guild.emptyState()),
      guildMarks: Math.max(0, whole(state.expansion.guildMarks, 0)),
      guildRenown: Math.max(0, whole(state.expansion.guildRenown, 0)),
      skills: clone(state.expansion.skills || {}),
      panels: clone(state.expansion.panels || Panels.createInitialState(state.expansion.skills)),
      mainQuest: clone(state.expansion.mainQuest || MainQuest.emptyState()),
      weakPotion: clone(state.expansion.weakPotion || { stepsRemaining: 0, distanceRemainder: 0 }),
      monsterKills: clone(state.expansion.monsterKills || {}),
      positionAuthority: clone(state.expansion.positionAuthority || null),
      serverBattle: clone(state.expansion.serverBattle || null),
    },
    openedChests: [...(state.openedChests || [])],
  };
}
function resultWithState(state, result = {}) {
  return { ok: true, ...result, state: statePayload(state) };
}
function wrongMap(state, allowed) {
  return !allowed.includes(normalizeMapId(state.expansion.currentMapId));
}
function pointNearRect(x, y, rect, margin = MAP_TRANSITION_POSITION_MARGIN) {
  if (!rect) return false;
  const px = Number(x);
  const py = Number(y);
  if (!Number.isFinite(px) || !Number.isFinite(py)) return false;
  const left = Number(rect.x) - margin;
  const top = Number(rect.y) - margin;
  const right = Number(rect.x) + Number(rect.w) + margin;
  const bottom = Number(rect.y) + Number(rect.h) + margin;
  return px >= left && px <= right && py >= top && py <= bottom;
}

function trustedPositionForMap(state, mapId) {
  const authority = state?.expansion?.positionAuthority;
  if (!authority || typeof authority !== "object") return null;
  if (Number(authority.version) !== POSITION_AUTHORITY_VERSION) return null;
  if (String(authority.mapId || "") !== String(mapId || "")) return null;
  const x = Number(authority.x);
  const y = Number(authority.y);
  const validatedAtMs = Number(authority.validatedAtMs);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(validatedAtMs) || validatedAtMs <= 0) return null;
  return { x, y, validatedAtMs };
}

function claimedCommandPosition(input = {}) {
  const position = input?.position;
  if (!position || typeof position !== "object") return null;
  const x = Number(position.x);
  const y = Number(position.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    mapId: String(position.mapId || "").trim(),
    x,
    y,
  };
}

function samePoint(a, b, tolerance = 0.01) {
  return Math.abs(Number(a?.x) - Number(b?.x)) <= tolerance
    && Math.abs(Number(a?.y) - Number(b?.y)) <= tolerance;
}

function validateCommandPositionState(state, input = {}, options = {}) {
  const mapId = normalizeMapId(state?.expansion?.currentMapId);
  const trusted = trustedPositionForMap(state, mapId);
  const claimed = claimedCommandPosition(input);

  // Compatibility path for a cached pre-9C client. It may use an already
  // trusted anchor, but cannot advance or invent a position without a claim.
  if (!claimed) {
    return trusted
      ? { ok: true, position: { x: trusted.x, y: trusted.y }, positionValidated: true, usedTrustedFallback: true }
      : { ok: true, position: { x: Number(state.player?.x) || 0, y: Number(state.player?.y) || 0 }, positionValidated: false, usedTrustedFallback: true };
  }

  if (claimed.mapId && claimed.mapId !== mapId) {
    return { ok: false, reason: "position-map-mismatch", mapId, claimedMapId: claimed.mapId };
  }

  // Old saves without a same-map authority get one compatibility bootstrap.
  // Established Step 9A saves must pass the same speed/time test as an ordinary
  // playerStateCommand save before a gameplay command can advance the anchor.
  if (!trusted) {
    const nowMs = Math.max(1, whole(options.nowMs, Date.now()));
    state.player.x = claimed.x;
    state.player.y = claimed.y;
    state.expansion.positionAuthority = {
      version: POSITION_AUTHORITY_VERSION,
      mapId,
      x: claimed.x,
      y: claimed.y,
      validatedAtMs: nowMs,
      anomalyCount: Math.max(0, whole(state.expansion.positionAuthority?.anomalyCount, 0)),
      lastAnomalyAtMs: Math.max(0, whole(state.expansion.positionAuthority?.lastAnomalyAtMs, 0)),
    };
    return { ok: true, position: { x: claimed.x, y: claimed.y }, positionValidated: false, bootstrapped: true };
  }

  const nextAuthority = PlayerState.nextPositionAuthority(state, claimed.x, claimed.y, options.nowMs);
  if (!samePoint(nextAuthority, claimed) || String(nextAuthority.mapId || "") !== mapId) {
    return {
      ok: false,
      reason: "invalid-position",
      mapId,
      trustedPosition: { x: trusted.x, y: trusted.y },
      claimedPosition: { x: claimed.x, y: claimed.y },
    };
  }

  state.player.x = claimed.x;
  state.player.y = claimed.y;
  state.expansion.positionAuthority = nextAuthority;
  return { ok: true, position: { x: claimed.x, y: claimed.y }, positionValidated: true };
}

function validateGameplayInteractionState(state, input = {}, interactionId, options = {}) {
  const positionResult = validateCommandPositionState(state, input, options);
  if (!positionResult.ok) return positionResult;
  if (!interactionId) return positionResult;

  const rule = GAMEPLAY_INTERACTION_RULES[interactionId];
  if (!rule) return { ok: false, reason: "unknown-interaction", interactionId };
  // One-time compatibility for genuinely old saves that have neither a Step
  // 9A anchor nor a 9C position claim. Established saves never take this path.
  if (!positionResult.positionValidated && positionResult.usedTrustedFallback) {
    return { ...positionResult, interactionId, proximityValidated: false };
  }
  const mapId = normalizeMapId(state.expansion.currentMapId);
  if (mapId !== rule.mapId) return { ok: false, reason: "wrong-map", interactionId };

  const position = positionResult.position;
  const nearby = rule.targets.some((target) => Math.hypot(position.x - target.x, position.y - target.y) <= target.radius);
  if (!nearby) {
    return {
      ok: false,
      reason: "interaction-too-far",
      interactionId,
      trustedPosition: { x: position.x, y: position.y },
    };
  }
  return { ...positionResult, interactionId };
}

function validateGameplayInteraction(save, input = {}, interactionId, options = {}) {
  const state = saveCopy(save);
  const result = validateGameplayInteractionState(state, input, interactionId, options);
  return result.ok ? { ...result, state } : result;
}

function reanchorAfterTransition(state, mapId, arrival, nowMs, previousAuthority = null) {
  const previous = previousAuthority && typeof previousAuthority === "object" ? previousAuthority : {};
  const x = Number(arrival?.x);
  const y = Number(arrival?.y);
  state.player.x = Number.isFinite(x) ? x : Number(state.player.x) || 0;
  state.player.y = Number.isFinite(y) ? y : Number(state.player.y) || 0;
  state.expansion.positionAuthority = {
    version: POSITION_AUTHORITY_VERSION,
    mapId: String(mapId || "world"),
    x: state.player.x,
    y: state.player.y,
    validatedAtMs: Math.max(1, whole(nowMs, Date.now())) ,
    anomalyCount: Math.max(0, whole(previous.anomalyCount, 0)),
    lastAnomalyAtMs: Math.max(0, whole(previous.lastAnomalyAtMs, 0)),
  };
}

function respawnTownStatePatch(save, options = {}) {
  const state = saveCopy(save);
  const previousAuthority = state.expansion.positionAuthority;
  state.expansion.currentMapId = WORLD_RESPAWN.mapId;
  reanchorAfterTransition(state, WORLD_RESPAWN.mapId, WORLD_RESPAWN, options.nowMs, previousAuthority);
  return {
    mapId: WORLD_RESPAWN.mapId,
    x: state.player.x,
    y: state.player.y,
    positionAuthority: clone(state.expansion.positionAuthority),
  };
}

function equipmentSellPrice(item) {
  const cost = Math.max(0, whole(item?.cost, 0));
  return cost > 0 ? Math.max(1, Math.floor(cost * SHOP_SELL_RATE)) : 0;
}
function generalStoreSellPrice(itemId) {
  const shopItem = GENERAL_STORE_GOODS[itemId];
  if (shopItem) return Math.max(1, Math.floor(shopItem.price * SHOP_SELL_RATE));
  const item = ItemData.getItem(itemId);
  if (!item || ["ui", "currency", "quest"].includes(item.kind) || item.sellable === false) return 0;
  return 10;
}
function guildDiscountRate(state) {
  const marks = Math.max(0, whole(state.expansion.guildMarks, 0));
  return marks >= 18 ? .15 : marks >= 10 ? .1 : marks >= 4 ? .05 : 0;
}
function setInventoryQuantity(state, itemId, quantity) {
  const next = Math.max(0, whole(quantity, 0));
  if (next > 0) state.expansion.inventory[itemId] = next;
  else delete state.expansion.inventory[itemId];
}

function economyCommand(save, input = {}, options = {}) {
  const state = saveCopy(save);
  const action = String(input.action || "").trim();
  const itemId = String(input.itemId || "").trim();
  const mapId = normalizeMapId(state.expansion.currentMapId);
  const requireInteraction = (interactionId) => validateGameplayInteractionState(state, input, interactionId, options);

  if (action === "buy-store-item") {
    if (mapId !== "general-store") return { ok: false, reason: "wrong-map" };
    const proximity = requireInteraction("general-store");
    if (!proximity.ok) return proximity;
    const item = GENERAL_STORE_GOODS[itemId];
    if (!item) return { ok: false, reason: "not-for-sale" };
    const coins = clamp(whole(state.player.coins, 0), 0, MAX_COINS);
    if (coins < item.price) return { ok: false, reason: "coins" };
    if (itemId === "healing_potion") {
      const count = clamp(whole(state.player.potions, 0), 0, 9);
      if (count >= 9) return { ok: false, reason: "full" };
      state.player.potions = count + 1;
    } else {
      const count = Math.max(0, whole(state.expansion.inventory[itemId], 0));
      if (count >= 999) return { ok: false, reason: "full" };
      setInventoryQuantity(state, itemId, count + 1);
    }
    state.player.coins = coins - item.price;
    return resultWithState(state, { action, itemId, price: item.price });
  }

  if (action === "sell-store-item") {
    if (!['shop', 'general-store'].includes(mapId)) return { ok: false, reason: "wrong-map" };
    const proximity = requireInteraction(mapId === "shop" ? "equipment-shop" : "general-store");
    if (!proximity.ok) return proximity;
    const price = generalStoreSellPrice(itemId);
    if (price <= 0) return { ok: false, reason: "not-sellable" };
    if (itemId === "healing_potion") {
      const count = clamp(whole(state.player.potions, 0), 0, 9);
      if (count <= 0) return { ok: false, reason: "missing" };
      state.player.potions = count - 1;
    } else {
      const count = Math.max(0, whole(state.expansion.inventory[itemId], 0));
      if (count <= 0) return { ok: false, reason: "missing" };
      setInventoryQuantity(state, itemId, count - 1);
    }
    state.player.coins = clamp(whole(state.player.coins, 0) + price, 0, MAX_COINS);
    return resultWithState(state, { action, itemId, price });
  }

  if (action === "buy-equipment") {
    if (mapId !== "shop") return { ok: false, reason: "wrong-map" };
    const proximity = requireInteraction("equipment-shop");
    if (!proximity.ok) return proximity;
    const item = Expansion.getEquipment(Expansion.DEFAULT_EQUIPMENT_CATALOG, itemId);
    if (!item || item.purchasable === false) return { ok: false, reason: "not-for-sale" };
    const classId = String(state.expansion.classId || "fighter");
    if (item.classId && item.classId !== classId) return { ok: false, reason: "class" };
    const discount = guildDiscountRate(state);
    const cost = Math.max(0, Math.floor(item.cost * (1 - discount)));
    const coins = clamp(whole(state.player.coins, 0), 0, MAX_COINS);
    if (coins < cost) return { ok: false, reason: "coins" };
    state.player.coins = coins - cost;
    state.expansion.ownedEquipment.push(item.id);
    return resultWithState(state, { action, itemId: item.id, price: cost, discount });
  }

  if (action === "sell-equipment") {
    if (!['shop', 'general-store'].includes(mapId)) return { ok: false, reason: "wrong-map" };
    const proximity = requireInteraction(mapId === "shop" ? "equipment-shop" : "general-store");
    if (!proximity.ok) return proximity;
    const item = Expansion.getEquipment(Expansion.DEFAULT_EQUIPMENT_CATALOG, itemId);
    if (!item) return { ok: false, reason: "missing" };
    const owned = state.expansion.ownedEquipment;
    const count = owned.filter((id) => id === item.id).length;
    if (count <= 0) return { ok: false, reason: "missing" };
    if (Expansion.isEquipmentEquipped({ equipped: state.expansion.equipped }, item.id) && count <= 1) {
      return { ok: false, reason: "equipped" };
    }
    const price = equipmentSellPrice(item);
    if (price <= 0) return { ok: false, reason: "not-sellable" };
    owned.splice(owned.indexOf(item.id), 1);
    state.player.coins = clamp(whole(state.player.coins, 0) + price, 0, MAX_COINS);
    return resultWithState(state, { action, itemId: item.id, price });
  }

  if (action === "equip") {
    const result = Expansion.equipItem({
      coins: state.player.coins,
      level: state.player.level,
      classId: state.expansion.classId,
      ownedEquipment: state.expansion.ownedEquipment,
      equipped: state.expansion.equipped,
    }, itemId);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.equipped = result.state.equipped;
    const maxHp = classMaxHp(state.expansion.classId, state.player.level) + Math.max(0, whole(Expansion.equipmentStats(state.expansion.equipped).maxHp, 0));
    state.player.hp = Number.isFinite(Number(state.player.hp)) ? clamp(Number(state.player.hp), 0, maxHp) : 1;
    return resultWithState(state, { action, itemId, itemName: result.item?.name || itemId });
  }

  if (action === "unequip") {
    const item = Expansion.getEquipment(Expansion.DEFAULT_EQUIPMENT_CATALOG, itemId);
    if (!item || !Expansion.isEquipmentEquipped({ equipped: state.expansion.equipped }, item.id)) return { ok: false, reason: "not-equipped" };
    const slot = item.occupiesSlots.find((candidate) => state.expansion.equipped[candidate] === item.id);
    const result = Expansion.unequipItem({
      coins: state.player.coins,
      level: state.player.level,
      classId: state.expansion.classId,
      ownedEquipment: state.expansion.ownedEquipment,
      equipped: state.expansion.equipped,
    }, slot);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.equipped = result.state.equipped;
    const maxHp = classMaxHp(state.expansion.classId, state.player.level) + Math.max(0, whole(Expansion.equipmentStats(state.expansion.equipped).maxHp, 0));
    state.player.hp = Number.isFinite(Number(state.player.hp)) ? clamp(Number(state.player.hp), 0, maxHp) : 1;
    return resultWithState(state, { action, itemId, itemName: item.name });
  }

  if (action === "destroy-item") {
    if (!itemId) return { ok: false, reason: "invalid-item" };
    const equipment = Expansion.getEquipment(Expansion.DEFAULT_EQUIPMENT_CATALOG, itemId);
    if (equipment && state.expansion.ownedEquipment.includes(equipment.id)) {
      if (Expansion.isEquipmentEquipped({ equipped: state.expansion.equipped }, equipment.id)) return { ok: false, reason: "equipped" };
      state.expansion.ownedEquipment.splice(state.expansion.ownedEquipment.indexOf(equipment.id), 1);
      return resultWithState(state, { action, itemId, itemName: equipment.name });
    }
    if (itemId === "healing_potion") {
      const count = clamp(whole(state.player.potions, 0), 0, 9);
      if (count <= 0) return { ok: false, reason: "missing" };
      state.player.potions = count - 1;
      return resultWithState(state, { action, itemId, itemName: "小型回復藥" });
    }
    if (itemId === "weak_potion") {
      const count = Math.max(0, whole(state.expansion.inventory.weak_potion, 0));
      if (count <= 0) return { ok: false, reason: "missing" };
      setInventoryQuantity(state, itemId, count - 1);
      return resultWithState(state, { action, itemId, itemName: ItemData.getItem(itemId)?.name || itemId });
    }
    const envelope = /^skill_envelope_(\d+)$/.exec(itemId);
    if (envelope) {
      const star = Number(envelope[1]);
      const commission = Guild.normalizeState(state.expansion.guildCommission);
      if ((commission.envelopes[star] || 0) <= 0) return { ok: false, reason: "missing" };
      commission.envelopes[star] -= 1;
      state.expansion.guildCommission = commission;
      return resultWithState(state, { action, itemId, itemName: `${star}★ 技能書信封` });
    }
    const book = /^skill_book_(\d+)$/.exec(itemId);
    if (book) {
      const star = Number(book[1]);
      const skills = Skills.normalizeSkillState(state.expansion.skills, { classId: state.expansion.classId });
      if ((skills.books[star] || 0) <= 0) return { ok: false, reason: "missing" };
      skills.books[star] -= 1;
      state.expansion.skills = skills;
      return resultWithState(state, { action, itemId, itemName: `${star}★ 技能書` });
    }
    const manual = /^manual_(.+)$/.exec(itemId);
    if (manual) {
      const skillId = manual[1];
      const skills = Skills.normalizeSkillState(state.expansion.skills, { classId: state.expansion.classId });
      const count = Math.max(0, whole(skills.manualCounts?.[skillId], 0));
      if (count <= 0) return { ok: false, reason: "missing" };
      skills.manualCounts = { ...skills.manualCounts, [skillId]: count - 1 };
      if (skills.manualCounts[skillId] <= 0) delete skills.manualCounts[skillId];
      state.expansion.skills = skills;
      return resultWithState(state, { action, itemId, itemName: `技能書：${Skills.getSkill(skillId)?.name || skillId}` });
    }
    const data = ItemData.getItem(itemId);
    const count = Math.max(0, whole(state.expansion.inventory[itemId], 0));
    if (!data || ["ui", "currency", "quest"].includes(data.kind) || data.destroyable === false || count <= 0) return { ok: false, reason: "protected" };
    setInventoryQuantity(state, itemId, count - 1);
    return resultWithState(state, { action, itemId, itemName: data.name || itemId });
  }

  if (action === "open-envelope") {
    const star = clamp(whole(input.star, 0), 0, 99);
    const commission = Guild.normalizeState(state.expansion.guildCommission);
    const skill = Skills.drawFighterGuildSkillBook(star, {
      seed: "everrealm-guild-envelope",
      serial: commission.envelopeDrawSerial,
    });
    if (!skill) return { ok: false, reason: "empty-pool" };
    const consumed = Guild.consumeEnvelope(commission, star);
    if (!consumed.ok) return { ok: false, reason: consumed.reason };
    const granted = Skills.grantSkillManuals(state.expansion.skills, skill.id, 1);
    if (!granted.ok) return { ok: false, reason: granted.reason };
    state.expansion.guildCommission = consumed.state;
    state.expansion.skills = granted.state;
    return resultWithState(state, { action, star, skill: { id: skill.id, name: skill.name } });
  }


  if (action === "open-skill-book") {
    const star = clamp(whole(input.star, 0), 0, 99);
    const result = Skills.openOwnedSkillBook(star, { seed: "everrealm-guild-skills", serial: state.expansion.skills.drawSerial }, state.expansion.skills);
    if (!result.ok) return { ok: false, reason: result.reason || "no-book" };
    state.expansion.skills = result.state;
    return resultWithState(state, { action, star, skill: result.skill ? { id: result.skill.id, name: result.skill.name } : null });
  }

  if (action === "learn-skill-manual") {
    if (state.expansion.serverBattle?.status === "active") return { ok: false, reason: "battle-active" };
    const skillId = String(input.skillId || "").trim();
    const bound = input.bound === true;
    const result = Skills.learnSkillFromManual(state.expansion.skills, skillId, { bound });
    if (!result.ok) return { ok: false, reason: result.reason, missingPrerequisites: result.missingPrerequisites || [] };
    state.expansion.skills = Panels.syncSkillState(state.expansion.panels, result.state);
    return resultWithState(state, { action, bound, skill: { id: result.skill.id, name: result.skill.name } });
  }

  if (action === "equip-panel") {
    const proximity = requireInteraction("deck-board");
    if (!proximity.ok) return proximity;
    const panelId = String(input.panelId || "").trim();
    const result = Panels.equipPanel(state.expansion.panels, panelId, state.expansion.skills);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.panels = result.state;
    state.expansion.skills = result.skills;
    return resultWithState(state, { action, panelId, panel: result.panel });
  }

  if (action === "equip-panel-skill") {
    const proximity = requireInteraction("deck-board");
    if (!proximity.ok) return proximity;
    const panelId = String(input.panelId || "").trim();
    const skillId = String(input.skillId || "").trim();
    const slot = input.slot == null ? undefined : whole(input.slot, -1);
    const result = Panels.configureSkill(state.expansion.panels, state.expansion.skills, panelId, skillId, slot);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.panels = result.state;
    state.expansion.skills = result.skills;
    return resultWithState(state, { action, panelId, skillId, slot: slot ?? null });
  }

  if (action === "unequip-panel-skill") {
    const proximity = requireInteraction("deck-board");
    if (!proximity.ok) return proximity;
    const panelId = String(input.panelId || "").trim();
    const skillId = String(input.skillId || "").trim();
    const result = Panels.removeSkill(state.expansion.panels, state.expansion.skills, panelId, skillId);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.panels = result.state;
    state.expansion.skills = result.skills;
    return resultWithState(state, { action, panelId, skillId });
  }

  if (action === "equip-skill") {
    if (mapId !== "world") return { ok: false, reason: "wrong-map" };
    const skillId = String(input.skillId || "").trim();
    const slot = input.slot == null ? undefined : whole(input.slot, -1);
    const activePanelId = state.expansion.panels.equippedPanelId;
    const result = Panels.configureSkill(state.expansion.panels, state.expansion.skills, activePanelId, skillId, slot);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.panels = result.state;
    state.expansion.skills = result.skills;
    return resultWithState(state, { action, panelId: activePanelId, skillId, slot: slot ?? null });
  }

  if (action === "unequip-skill") {
    if (mapId !== "world") return { ok: false, reason: "wrong-map" };
    const skillId = String(input.skillId || "").trim();
    const activePanelId = state.expansion.panels.equippedPanelId;
    const result = Panels.removeSkill(state.expansion.panels, state.expansion.skills, activePanelId, skillId);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.panels = result.state;
    state.expansion.skills = result.skills;
    return resultWithState(state, { action, panelId: activePanelId, skillId });
  }

  if (["trade", "craft", "loot"].includes(action)) {
    return { ok: false, reason: "feature-not-live", action };
  }
  return { ok: false, reason: "unsupported-action", action };
}

function questCommand(save, input = {}, options = {}) {
  const state = saveCopy(save);
  const action = String(input.action || "").trim();
  const mapId = normalizeMapId(state.expansion.currentMapId);
  const current = Guild.normalizeState(state.expansion.guildCommission);
  const requireInteraction = (interactionId) => validateGameplayInteractionState(state, input, interactionId, options);

  if (action === "accept") {
    if (mapId !== "guild") return { ok: false, reason: "wrong-map" };
    // Accept/report/abandon are guild services rather than world-position
    // interactions. The authoritative map gate is sufficient here; keeping
    // a proximity gate caused legitimate board/receptionist actions to be
    // rejected when the trusted movement anchor lagged behind the client.
    const result = Guild.accept(current, String(input.commissionId || ""));
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.guildCommission = result.state;
    return resultWithState(state, { action, commission: result.commission });
  }
  if (action === "report") {
    if (mapId !== "guild") return { ok: false, reason: "wrong-map" };
    const result = Guild.report(current);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.guildCommission = result.state;
    const mainProgress = MainQuest.recordCommissionReport(state.expansion.mainQuest, result.commission?.star);
    state.expansion.mainQuest = mainProgress.state;
    const rewardCoins = Math.max(0, whole(result.reward?.coins, 0));
    state.player.coins = clamp(whole(state.player.coins, 0) + rewardCoins, 0, MAX_COINS);
    return resultWithState(state, { action, commission: result.commission, reward: result.reward, mainQuestProgressed: mainProgress.changed });
  }
  if (action === "claim-four-star") {
    if (mapId !== "guild") return { ok: false, reason: "wrong-map" };
    const result = Guild.claimFourStarReward(current);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.guildCommission = result.state;
    const recognition = MainQuest.recordGuildmasterRecognition(state.expansion.mainQuest);
    state.expansion.mainQuest = recognition.state;
    return resultWithState(state, { action, reward: result.reward, mainQuestProgressed: recognition.changed });
  }

  if (action === "main-start") {
    if (mapId !== "guild") return { ok: false, reason: "wrong-map" };
    const questId = String(input.questId || "").trim();
    const result = MainQuest.start(state.expansion.mainQuest, questId, state.player.level);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.mainQuest = result.state;
    if (result.quest?.id === "main-3") {
      state.expansion.guildCommission = Guild.normalizeState({
        ...state.expansion.guildCommission,
        fourStarProgress: Object.fromEntries(Guild.FOUR_STAR_PROGRESS_STARS.map((star) => [star, false])),
      });
    }
    return resultWithState(state, { action, quest: result.quest });
  }

  if (action === "main-answer") {
    if (mapId !== "guild") return { ok: false, reason: "wrong-map" };
    const result = MainQuest.answerQuiz(
      state.expansion.mainQuest,
      String(input.questionId || ""),
      input.answerIndex,
      options.currentDay,
    );
    if (!result.ok) return { ok: false, reason: result.reason, nextQuizDay: result.nextQuizDay || 0 };
    state.expansion.mainQuest = result.state;
    return resultWithState(state, {
      action,
      correct: result.correct,
      explanation: result.explanation || "",
      completedObjective: result.completedObjective === true,
      nextQuizDay: result.nextQuizDay || 0,
    });
  }

  if (action === "main-claim") {
    if (mapId !== "guild") return { ok: false, reason: "wrong-map" };
    const claim = MainQuest.claim(state.expansion.mainQuest, state.expansion.skills, String(input.skillId || ""));
    if (!claim.ok) return { ok: false, reason: claim.reason };
    const manual = Skills.grantBoundSkillManuals(state.expansion.skills, claim.skill.id, 1);
    if (!manual.ok) return { ok: false, reason: manual.reason };
    const panel = Panels.grantPanel(state.expansion.panels, claim.reward.panelId, manual.state);
    if (!panel.ok) return { ok: false, reason: panel.reason };
    state.expansion.mainQuest = claim.state;
    state.expansion.panels = panel.state;
    state.expansion.skills = Panels.syncSkillState(state.expansion.panels, manual.state);
    return resultWithState(state, {
      action,
      quest: claim.quest,
      reward: {
        skill: { id: claim.skill.id, name: claim.skill.name, bound: true },
        panel: panel.panel,
      },
    });
  }

  if (action === "abandon") {
    if (mapId !== "guild") return { ok: false, reason: "wrong-map" };
    const result = Guild.abandon(current);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.guildCommission = result.state;
    return resultWithState(state, { action, commission: result.commission });
  }
  if (action === "interaction") {
    const interactionId = String(input.interactionId || "").trim();
    if (interactionId === "mountain-wish-pool") {
      if (mapId !== "field") return { ok: false, reason: "wrong-map" };
      const proximity = requireInteraction("mountain-wish-pool");
      if (!proximity.ok) return proximity;
    }
    const result = Guild.recordInteraction(current, interactionId);
    if (!result.changed) return { ok: false, reason: result.reason };
    state.expansion.guildCommission = result.state;
    return resultWithState(state, { action, commission: result.commission, questReason: result.reason });
  }
  if (action === "delivery") {
    const npcId = String(input.npcId || "").trim();
    const result = Guild.deliver(current, npcId);
    if (!result.changed) return { ok: false, reason: result.reason };
    state.expansion.guildCommission = result.state;
    return resultWithState(state, { action, commission: result.commission, questReason: result.reason });
  }
  return { ok: false, reason: "unsupported-action", action };
}

function recordServerKill(state, monsterType, instanceId) {
  const canonical = MonsterBlueprints.normalizeMonsterId(monsterType) || String(monsterType || "");
  if (!canonical) return null;
  state.expansion.monsterKills = state.expansion.monsterKills && typeof state.expansion.monsterKills === "object" ? state.expansion.monsterKills : {};
  state.expansion.monsterKills[canonical] = Math.max(0, whole(state.expansion.monsterKills[canonical], 0)) + 1;
  state.expansion.guildRenown = Math.max(0, whole(state.expansion.guildRenown, 0)) + 1;
  const progress = Guild.recordHuntKill(state.expansion.guildCommission, { monsterId: canonical, instanceId });
  state.expansion.guildCommission = progress.state;
  return progress;
}


const SERVER_BATTLE_TACTICAL_VERSION = 1;
const SERVER_BATTLE_TURN_COST = .5;
const SERVER_BATTLE_CORPSE_ROUNDS = 3;
const SERVER_BATTLE_FINAL_FACING_RESERVE = 1;
const SERVER_BATTLE_SIDE_DAMAGE_BONUS = .15;
const SERVER_BATTLE_REAR_DAMAGE_BONUS = .35;
const SERVER_BATTLE_DEFAULT_WIDTH = 9;
const SERVER_BATTLE_DEFAULT_HEIGHT = 7;
const SERVER_BATTLE_FIELD_OPENING = Object.freeze({
  id: "mountain-opening-v3",
  width: 8,
  height: 3,
  deploymentZones: Object.freeze({
    ally: Object.freeze([{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 0 }]),
    enemy: Object.freeze([{ x: 6, y: 1 }, { x: 6, y: 0 }, { x: 6, y: 2 }]),
  }),
  heightMap: Object.freeze({ "6,1": 1, "7,1": 1, "6,2": 1, "7,2": 1 }),
  terrainCells: Object.freeze({
    "3,0": Object.freeze({ kind: "tree", obstacleHeight: "high", movementBlocked: true, blocksLinear: true, blocksArc: true, occupiedHeight: 3.2 }),
    "5,2": Object.freeze({ kind: "scrub", obstacleHeight: "low", movementBlocked: true, blocksLinear: false, blocksArc: false, occupiedHeight: .65 }),
  }),
});

function canonicalBattleFacing(value, fallback = "right") {
  const next = String(value || "").toLowerCase();
  return ["up", "right", "down", "left"].includes(next) ? next : fallback;
}

function serverBattlefieldFor(mapId, monsterType) {
  const normalizedMap = normalizeMapId(mapId);
  if (String(mapId || "") === "pvp-plaza") {
    return {
      id: "pvp-plaza-v1",
      width: 12,
      height: 3,
      theme: "plaza",
      deploymentZones: {
        ally: [{ x: 1, y: 1 }],
        enemy: [{ x: 10, y: 1 }],
      },
      heightMap: {},
      terrainCells: {},
    };
  }
  if (normalizedMap === "field" || normalizedMap === "mountain-southeast") {
    return {
      ...SERVER_BATTLE_FIELD_OPENING,
      deploymentZones: {
        ally: SERVER_BATTLE_FIELD_OPENING.deploymentZones.ally.map((cell) => ({ ...cell })),
        enemy: SERVER_BATTLE_FIELD_OPENING.deploymentZones.enemy.map((cell) => ({ ...cell })),
      },
      heightMap: { ...SERVER_BATTLE_FIELD_OPENING.heightMap },
      terrainCells: Object.fromEntries(Object.entries(SERVER_BATTLE_FIELD_OPENING.terrainCells).map(([key, value]) => [key, { ...value }])),
    };
  }
  if (normalizedMap === "mountain-south") {
    return {
      id: "server-mountain-south-v1",
      width: SERVER_BATTLE_DEFAULT_WIDTH,
      height: SERVER_BATTLE_DEFAULT_HEIGHT,
      deploymentZones: {
        ally: [{ x: 1, y: 3 }],
        enemy: [{ x: 7, y: 3 }, { x: 7, y: 1 }, { x: 7, y: 5 }],
      },
      heightMap: {},
      terrainCells: {},
    };
  }
  const layouts = {
    chick: [[3, 1], [3, 5], [5, 2], [5, 4]],
    fox: [[3, 2], [3, 4], [5, 1], [5, 5]],
    raccoon: [[4, 1], [4, 5], [5, 3]],
    frog: [[3, 3], [5, 1], [5, 5]],
    coyote: [[3, 2], [3, 4], [5, 1], [5, 5]],
    turtle: [[3, 2], [3, 4], [5, 1], [5, 5]],
    snake: [[3, 1], [3, 5], [5, 3]],
    bear: [[3, 1], [3, 5], [5, 1], [5, 5]],
  };
  const blocked = layouts[monsterType] || layouts.raccoon;
  return {
    id: `server-${normalizedMap || "battle"}-default-v1`,
    width: SERVER_BATTLE_DEFAULT_WIDTH,
    height: SERVER_BATTLE_DEFAULT_HEIGHT,
    deploymentZones: {
      ally: [{ x: 1, y: 3 }],
      enemy: [{ x: 7, y: 3 }, { x: 7, y: 1 }, { x: 7, y: 5 }],
    },
    heightMap: {},
    terrainCells: Object.fromEntries(blocked.map(([x, y]) => [`${x},${y}`, { movementBlocked: true, obstacleHeight: "high", blocksLinear: true, blocksArc: true }])),
  };
}

function serverBattleGrid(battlefield) {
  const blocked = Object.entries(battlefield?.terrainCells || {})
    .filter(([, terrain]) => terrain?.movementBlocked !== false)
    .map(([key]) => {
      const [x, y] = key.split(",").map(Number);
      return { x, y };
    });
  const grid = Tactics.createGrid(
    Math.max(1, whole(battlefield?.width, SERVER_BATTLE_DEFAULT_WIDTH)),
    Math.max(1, whole(battlefield?.height, SERVER_BATTLE_DEFAULT_HEIGHT)),
    blocked,
  );
  grid.heightMap = { ...(battlefield?.heightMap || {}) };
  grid.terrainCells = { ...(battlefield?.terrainCells || {}) };
  return grid;
}

function serverBattleDeploymentCell(battlefield, side, index = 0) {
  const fallback = side === "enemy"
    ? [{ x: 7, y: 3 }, { x: 7, y: 1 }, { x: 7, y: 5 }]
    : [{ x: 1, y: 3 }];
  const cells = battlefield?.deploymentZones?.[side]?.length ? battlefield.deploymentZones[side] : fallback;
  const chosen = cells[Math.min(Math.max(0, index), cells.length - 1)] || fallback[0];
  return { x: whole(chosen.x, 0), y: whole(chosen.y, 0) };
}

function serverHeroBattleStats(state) {
  const classId = normalizeClassId(state.expansion.classId);
  const level = clamp(whole(state.player.level, 1), 1, Expansion.LEVEL_CAP);
  const base = Expansion.classStatsAtLevel(classId, level);
  const gear = Expansion.equipmentStats(state.expansion.equipped);
  const skillState = Skills.normalizeSkillState(state.expansion.skills, { classId });
  const passives = FighterEffects.passiveModifiers((skillState.unlockedSkillIds || []).map((id) => Skills.getSkill(id)).filter(Boolean));
  const baseMove = clamp((Number(base.moveRange) || 0) + (Number(gear.moveRange) || 0), 2, 7);
  return {
    maxHp: Math.max(1, whole(classMaxHp(classId, level), 1)),
    attack: Math.max(0, Math.round(((Number(base.attack) || 0) + (Number(gear.attack) || 0)) * (passives.attackMultiplier || 1))),
    defence: Math.max(0, Math.round(((Number(base.defence) || 0) + (Number(gear.defense) || 0)) * (passives.defenceMultiplier || 1))),
    accuracy: Math.max(0, 99 + (Number(gear.accuracy) || 0) + (passives.accuracy || 0) * 100),
    evasion: Math.max(0, (Number(gear.evasion) || 0) + (passives.evasion || 0) * 100),
    weight: Math.max(0, Number(gear.weight) || 0),
    critChance: clamp(Number(gear.critChance) || 0, 0, 1),
    initiative: Math.max(5, Math.round(14 + (Number(gear.speed) || 0) * .35 + (passives.speedBonus || 0))),
    baseMoveRange: baseMove,
    facingReserve: classId === "fighter" ? SERVER_BATTLE_FINAL_FACING_RESERVE : 0,
    moveRange: baseMove + (classId === "fighter" ? SERVER_BATTLE_FINAL_FACING_RESERVE : 0),
    passives,
  };
}

function ensureServerBattleTacticalState(state, battle) {
  const mapId = normalizeMapId(battle.mapId || state.expansion.currentMapId);
  const battlefield = serverBattlefieldFor(mapId, battle.monsterType);
  battle.mapId = mapId;
  battle.tacticalVersion = SERVER_BATTLE_TACTICAL_VERSION;
  if (!battle.heroCell || !Tactics.isInside(serverBattleGrid(battlefield), battle.heroCell)) {
    battle.heroCell = serverBattleDeploymentCell(battlefield, "ally", 0);
  } else {
    battle.heroCell = { x: whole(battle.heroCell.x, 0), y: whole(battle.heroCell.y, 0) };
  }
  battle.heroFacing = canonicalBattleFacing(battle.heroFacing, "right");
  battle.heroStatusEffects = battle.heroStatusEffects && typeof battle.heroStatusEffects === "object" ? battle.heroStatusEffects : {};
  for (let index = 0; index < battle.enemies.length; index += 1) {
    const enemy = battle.enemies[index];
    if (!enemy.cell || !Tactics.isInside(serverBattleGrid(battlefield), enemy.cell)) enemy.cell = serverBattleDeploymentCell(battlefield, "enemy", index);
    else enemy.cell = { x: whole(enemy.cell.x, 0), y: whole(enemy.cell.y, 0) };
    enemy.facing = canonicalBattleFacing(enemy.facing, "left");
    enemy.ap = clamp(whole(enemy.ap, 0), 0, Skills.MAX_AP);
    enemy.deathRound = whole(enemy.deathRound, 0) > 0 ? whole(enemy.deathRound, 0) : null;
    enemy.statusEffects = enemy.statusEffects && typeof enemy.statusEffects === "object" ? enemy.statusEffects : {};
    enemy.id = String(enemy.id || (index === 0 ? `battle-${battle.encounterId || battle.id}` : `battle-${battle.encounterId || battle.id}-pack-${index + 1}`));
  }
  return { battlefield, grid: serverBattleGrid(battlefield) };
}

function serverEnemyUnit(battle, enemy, index) {
  const blueprint = MonsterBlueprints.monsterBlueprint(enemy.type || battle.monsterType);
  const stats = MonsterBlueprints.monsterStatsAtLevel(enemy.type || battle.monsterType, enemy.level || battle.level);
  const skills = blueprint?.skills || [];
  const skill = skills[0] || null;
  return {
    id: String(enemy.id || `battle-${battle.encounterId || battle.id}-pack-${index + 1}`),
    side: "enemy",
    type: enemy.type || battle.monsterType,
    name: blueprint?.name_zh || enemy.type || battle.monsterType,
    level: enemy.level || battle.level,
    cell: { ...enemy.cell },
    facing: canonicalBattleFacing(enemy.facing, "left"),
    hp: Math.max(0, Number(enemy.hp) || 0),
    maxHp: Math.max(1, Number(enemy.maxHp) || 1),
    alive: enemy.alive !== false && Number(enemy.hp) > 0,
    deathRound: whole(enemy.deathRound, 0) > 0 ? whole(enemy.deathRound, 0) : null,
    attack: Math.max(1, Number(stats?.attack) || 1),
    defence: Math.max(0, Number(stats?.defense) || 0),
    accuracy: 99,
    evasion: 0,
    weight: 0,
    moveRange: Math.max(0, Number(blueprint?.moveRange ?? stats?.moveRange) || 4),
    attackRange: skill?.range?.max || 1,
    minAttackRange: skill?.range?.min || 1,
    initiative: 8,
    ap: clamp(whole(enemy.ap, 0), 0, Skills.MAX_AP),
    skillCost: skill?.apCost || 0,
    skillId: skill?.id || null,
    skill,
    skills,
    skillName: skill?.name || "普通攻擊",
    speedGrade: skill?.speedGrade || "C",
    targetArc: ["front", "side"],
    statusEffects: clone(enemy.statusEffects || {}),
    defenceDown: Math.max(0, Number(enemy.defenceDown) || 0),
    defenceDownUntilRound: Math.max(0, whole(enemy.defenceDownUntilRound, 0)),
    moveDown: Math.max(0, Number(enemy.moveDown) || 0),
    moveDownUntilRound: Math.max(0, whole(enemy.moveDownUntilRound, 0)),
  };
}

function serverBattleUnits(state, battle) {
  const heroStats = serverHeroBattleStats(state);
  const hero = {
    id: "battle-player",
    side: "ally",
    type: "player",
    cell: { ...battle.heroCell },
    facing: canonicalBattleFacing(battle.heroFacing, "right"),
    hp: Math.max(0, Number(battle.heroHp) || 0),
    maxHp: Math.max(1, Number(battle.heroMaxHp) || heroStats.maxHp),
    alive: Number(battle.heroHp) > 0,
    deathRound: whole(battle.heroDeathRound, 0) > 0 ? whole(battle.heroDeathRound, 0) : null,
    statusEffects: clone(battle.heroStatusEffects || {}),
    ...heroStats,
  };
  const enemies = battle.enemies.map((enemy, index) => serverEnemyUnit(battle, enemy, index));
  return { hero, enemies, units: [hero, ...enemies] };
}

function serverCorpseVisible(unit, round) {
  const deathRound = whole(unit?.deathRound, 0);
  if (unit?.alive !== false || Number(unit?.hp) > 0 || deathRound <= 0) return false;
  return Math.max(1, whole(round, 1)) < deathRound + SERVER_BATTLE_CORPSE_ROUNDS + 1;
}

function serverCorpseBlockers(battle, hero, enemies) {
  return [hero, ...enemies].filter((unit) => serverCorpseVisible(unit, battle?.round)).map((unit) => ({
    id: `corpse:${unit.id}`, side: "corpse", team: "corpse", type: "corpse",
    alive: true, hp: 1, maxHp: 1, cell: { ...unit.cell }, facing: unit.facing || "down",
    weight: 9999, initiative: -9999, moveRange: 0,
  }));
}

function sanitizeServerMoveCommands(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 48).map((command) => {
    const type = String(command?.type || "");
    if (type === "move") return { type, to: { x: whole(command?.to?.x, NaN), y: whole(command?.to?.y, NaN) } };
    if (["face", "turn", "wait"].includes(type)) return { type: "face", facing: canonicalBattleFacing(command?.facing, "down") };
    return { type: "invalid" };
  });
}

function serverEnemyPlans(state, battle, grid, hero, enemies) {
  const simulated = [hero, ...enemies, ...serverCorpseBlockers(battle, hero, enemies)].map((unit) => ({ ...unit, cell: { ...unit.cell } }));
  const plans = [];
  const enemyOrder = Tactics.buildTurnOrder(enemies.filter((unit) => unit.alive));
  for (const actual of enemyOrder) {
    const enemy = simulated.find((unit) => unit.id === actual.id);
    const simulatedHero = simulated.find((unit) => unit.id === hero.id);
    if (!enemy || !simulatedHero) continue;
    if (actual.moveDownUntilRound >= battle.round) enemy.moveRange = Math.max(0, enemy.moveRange - (actual.moveDown || 0));
    enemy.moveRange = Math.max(0, enemy.moveRange - (FighterEffects.movementPenalty(actual, battle.round) || 0));
    if (FighterEffects.isDisabled(actual, battle.round, "move")) {
      plans.push({ enemyId: actual.id, move: { ...actual.cell }, path: [{ ...actual.cell }], commands: [], facing: actual.facing, willAttack: false, targetCells: [], skill: actual.skill, skillId: actual.skillId, apCost: actual.skillCost || 0, speedGrade: actual.speedGrade || "C" });
      continue;
    }
    const action = MonsterAI.planEnemyAction({
      grid,
      enemy,
      targets: [simulatedHero],
      units: simulated,
      skills: actual.skills,
      apGain: Skills.ROUND_AP_GAIN,
      canDirectTarget: (unit) => FighterEffects.isDirectTargetable(unit, battle.round),
    }) || Tactics.chooseEnemyAction({ grid, enemy, targets: [simulatedHero], units: simulated });
    if (!action) continue;
    const selectedSkill = action.skill || action.setupSkill || null;
    enemy.cell = { ...(action.previewCell || action.move || enemy.cell) };
    enemy.facing = canonicalBattleFacing(action.facing, enemy.facing);
    const willAttack = Boolean(action.attackTargetId && action.skill) && (actual.ap || 0) >= (action.skill?.apCost || 0);
    const previewOrigin = action.attackOrigin || action.move || enemy.cell;
    const previewFacing = action.attackFacing || action.facing || actual.facing;
    const targetCells = willAttack
      ? Skills.patternCells(action.skill, previewOrigin, simulatedHero.cell, { grid, heightMap: grid.heightMap, facing: previewFacing })
      : [];
    plans.push({
      enemyId: actual.id,
      move: { ...(action.move || actual.cell) },
      path: (action.path?.length ? action.path : [actual.cell]).map((cell) => ({ ...cell })),
      commands: (action.commands || []).map((command) => ({ ...command, to: command.to ? { ...command.to } : undefined })),
      facing: canonicalBattleFacing(action.facing, actual.facing),
      willAttack,
      targetCells,
      skill: action.skill || selectedSkill || actual.skill,
      skillId: action.skill?.id || selectedSkill?.id || actual.skillId,
      apCost: action.skill?.apCost || selectedSkill?.apCost || actual.skillCost || 0,
      speedGrade: action.skill?.speedGrade || selectedSkill?.speedGrade || actual.speedGrade || "C",
    });
  }
  return plans;
}

function deterministicBattleRng(battle, round, salt = "") {
  return Tactics.createSeededRng(`server:${battle.id}:${round}:${salt}`);
}

function validateServerHeroMovement(state, battle, grid, hero, enemyPlans, enemies, input) {
  const commands = sanitizeServerMoveCommands(input.moveCommands);
  if (commands.some((command) => command.type === "invalid" || (command.type === "move" && (!Number.isFinite(command.to.x) || !Number.isFinite(command.to.y))))) {
    return { ok: false, reason: "invalid-movement-command" };
  }
  const schedule = Tactics.movementCommandEvents(hero.cell, commands, {
    turnCost: SERVER_BATTLE_TURN_COST,
    initialFacing: hero.facing,
  });
  if (!Number.isFinite(schedule.totalCost) || schedule.events.some((event) => event.type === "invalid")) {
    return { ok: false, reason: "invalid-movement-path" };
  }
  const heroMoveLimit = FighterEffects.isDisabled(hero, battle.round, "move")
    ? 0
    : Math.max(0, hero.moveRange - (FighterEffects.movementPenalty(hero, battle.round) || 0));
  if (schedule.totalCost > heroMoveLimit + 1e-7) {
    return { ok: false, reason: "movement-range", cost: schedule.totalCost, limit: heroMoveLimit };
  }
  const routeLimit = Math.max(0, heroMoveLimit - Math.max(0, Number(hero.facingReserve) || 0));
  let prefixCost = 0;
  for (const event of schedule.events) {
    prefixCost += Math.max(0, Number(event.duration) || 0);
    // Fighter's extra point is reserved for final facing/footwork. It cannot be
    // forged into an extra movement cell by editing the client command list.
    if (event.type === "move" && prefixCost > routeLimit + 1e-7) {
      return { ok: false, reason: "movement-route-range", cost: prefixCost, limit: routeLimit };
    }
  }
  for (const event of schedule.events) {
    if (event.type !== "move") continue;
    if (!Tactics.isInside(grid, event.to) || !Tactics.isWalkable(grid, event.to, serverCorpseBlockers(battle, hero, enemies))) {
      return { ok: false, reason: "movement-blocked" };
    }
  }
  const routes = new Map();
  routes.set(hero.id, { path: schedule.path, commands, finalFacing: schedule.finalTravelFacing || hero.facing });
  for (const plan of enemyPlans) {
    const enemy = enemies.find((unit) => unit.id === plan.enemyId);
    if (!enemy?.alive) continue;
    routes.set(enemy.id, {
      path: (plan.path?.length ? plan.path : [enemy.cell]).map((cell) => ({ ...cell })),
      commands: (plan.commands || []).map((command) => ({ ...command, to: command.to ? { ...command.to } : undefined })),
    });
  }
  const movement = Tactics.resolveSimultaneousMovement({
    timed: true,
    grid,
    units: [...[hero, ...enemies].filter((unit) => unit.alive), ...serverCorpseBlockers(battle, hero, enemies)],
    routes,
    turnCost: SERVER_BATTLE_TURN_COST,
    priorityUnitId: hero.id,
  });
  const heroResult = movement.unitResults?.[hero.id];
  if (!heroResult) return { ok: false, reason: "movement-resolution" };
  battle.heroCell = { ...heroResult.cell };
  battle.heroFacing = canonicalBattleFacing(heroResult.facing, hero.facing);
  hero.cell = { ...battle.heroCell };
  hero.facing = battle.heroFacing;
  for (let index = 0; index < battle.enemies.length; index += 1) {
    const enemyState = battle.enemies[index];
    const enemyUnit = enemies[index];
    const result = movement.unitResults?.[enemyUnit.id];
    if (!result) continue;
    enemyState.cell = { ...result.cell };
    enemyState.facing = canonicalBattleFacing(result.facing, enemyState.facing);
    enemyUnit.cell = { ...enemyState.cell };
    enemyUnit.facing = enemyState.facing;
  }
  return { ok: true, movement };
}

function battleTargetUnitAtServer(hero, enemies, cell, preferredTeam = null) {
  const enemy = enemies.find((unit) => unit.alive && Tactics.cellKey(unit.cell) === Tactics.cellKey(cell)) || null;
  const self = Tactics.cellKey(hero.cell) === Tactics.cellKey(cell) ? hero : null;
  if (preferredTeam === "enemy") return enemy;
  if (preferredTeam === "ally" || preferredTeam === "self") return self;
  return enemy || self;
}

function serverSkillTargets(skill, hero, enemies, grid, input) {
  let targetCell = input.targetCell && Number.isFinite(Number(input.targetCell.x)) && Number.isFinite(Number(input.targetCell.y))
    ? { x: whole(input.targetCell.x, 0), y: whole(input.targetCell.y, 0) }
    : null;
  if (!targetCell) {
    const legacyIndex = (Array.isArray(input.targetIndexes) ? input.targetIndexes : [input.targetIndex])
      .map((value) => whole(value, -1)).find((value) => value >= 0 && value < enemies.length);
    if (legacyIndex != null) targetCell = { ...enemies[legacyIndex].cell };
  }
  if (!targetCell) targetCell = { ...hero.cell };
  if (!Tactics.isInside(grid, targetCell)) return { ok: false, reason: "target-outside-grid" };
  const targetUnit = battleTargetUnitAtServer(hero, enemies, targetCell, skill.targeting?.team);
  const validation = Skills.validateSkillTarget(skill, hero.cell, targetCell, {
    grid,
    heightMap: grid.heightMap,
    facing: hero.facing,
    actorTeam: "ally",
    actorId: hero.id,
    targetUnit: targetUnit ? { ...targetUnit, team: targetUnit.side } : null,
    canDirectTarget: (unit) => FighterEffects.isDirectTargetable(unit, Math.max(1, whole(input.round, 1))),
  });
  if (!validation.ok) return { ok: false, reason: `skill-${validation.reason || "target"}` };

  let affected = [];
  const pattern = Skills.patternCells(skill, hero.cell, targetCell, { grid, heightMap: grid.heightMap, facing: hero.facing });
  const patternKeys = new Set(pattern.map((cell) => Tactics.cellKey(cell)));
  affected = enemies.filter((enemy) => enemy.alive && patternKeys.has(Tactics.cellKey(enemy.cell)));
  let attackPath = [];
  if (Tactics.usesAttackPath(skill.deliveryMode)) {
    attackPath = Tactics.facingOrthogonalPriority(hero.cell, targetCell, hero.facing);
    const trace = Tactics.traceAttackPath({
      origin: hero.cell,
      target: targetCell,
      path: attackPath,
      facing: hero.facing,
      grid,
      units: [hero, ...enemies],
      actorId: hero.id,
      deliveryMode: skill.deliveryMode,
      blocksByTerrain: skill.blocksByTerrain,
      blocksByUnits: skill.blocksByUnits,
      arcHeight: skill.arcHeight,
      piercing: skill.piercing,
      maxPierce: skill.maxPierce,
      friendlyFire: Tactics.FRIENDLY_FIRE,
    });
    if (trace.stoppedReason === "terrain") return { ok: false, reason: "skill-blocked-path" };
    affected = trace.piercing ? (trace.impactedUnits || []).filter((unit) => unit.side === "enemy")
      : trace.actualTarget?.side === "enemy" ? [trace.actualTarget] : [];
  }
  const isAllySkill = skill.targeting?.team === "ally" || skill.targeting?.team === "self" || skill.tags?.includes("heal");
  if (!affected.length && !isAllySkill && skill.targeting?.mode !== "ground") return { ok: false, reason: "target" };
  return { ok: true, targetCell, targetUnit, affected, attackPath, pattern };
}

function applyServerHeroAction(state, battle, hero, enemies, grid, input, enemyPlans) {
  const heroAction = String(input.heroAction || "wait");
  let skill = null;
  let targetResult = null;
  let guardReduction = 0;
  let evasionBonus = 0;
  if (heroAction === "potion") {
    const count = clamp(whole(state.player.potions, 0), 0, 9);
    if (count <= 0) return { ok: false, reason: "empty" };
    if (battle.heroHp >= battle.heroMaxHp) return { ok: false, reason: "full" };
  } else if (heroAction === "skill") {
    const skillId = Skills.canonicalSkillId(String(input.skillId || ""));
    skill = Skills.getSkill(skillId);
    const skillState = Skills.normalizeSkillState(state.expansion.skills, { classId: state.expansion.classId });
    if (!skill || !skillState.unlockedSkillIds.some((id) => Skills.canonicalSkillId(id) === skillId) || !skillState.equippedSkillIds.some((id) => Skills.canonicalSkillId(id) === skillId)) {
      return { ok: false, reason: "skill-not-equipped" };
    }
    if (battle.ap < skill.apCost) return { ok: false, reason: "ap" };
    targetResult = serverSkillTargets(skill, hero, enemies, grid, input);
    if (!targetResult.ok) return targetResult;
    for (const effect of skill.effects || []) {
      if (effect.type === "guard") guardReduction = Math.max(guardReduction, Number(effect.amount) || 0);
      if (effect.type === "evasion") evasionBonus = Math.max(evasionBonus, Number(effect.amount) || 0);
    }
  } else if (heroAction !== "wait") {
    return { ok: false, reason: "unsupported-battle-action" };
  }

  const enemyAttacks = enemyPlans.filter((plan) => plan.willAttack).map((plan) => {
    const enemy = enemies.find((candidate) => candidate.id === plan.enemyId);
    return { actorId: plan.enemyId, kind: "enemy", speedGrade: plan.speedGrade || enemy?.speedGrade || "C", initiative: enemy?.initiative || 0, plan, enemy };
  });
  const heroSpeedGrade = skill?.speedGrade || (heroAction === "potion" ? "S" : "F");
  const order = Skills.orderActionsBySpeed([
    { actorId: hero.id, kind: "hero", speedGrade: heroSpeedGrade, initiative: hero.initiative || 0 },
    ...enemyAttacks,
  ]);

  const executeHero = () => {
    if (!hero.alive || hero.hp <= 0) return;
    if (heroAction === "potion") {
      state.player.potions = Math.max(0, whole(state.player.potions, 0) - 1);
      battle.heroHp = Math.min(battle.heroMaxHp, battle.heroHp + 150);
      hero.hp = battle.heroHp;
      return;
    }
    if (heroAction !== "skill") return;
    battle.ap = Math.max(0, battle.ap - skill.apCost);
    const heals = (skill.effects || []).filter((effect) => effect.type === "heal");
    const damageEffect = (skill.effects || []).find((effect) => effect.type === "damage");
    const pierceEffect = (skill.effects || []).find((effect) => effect.type === "armor_pierce");
    const defenceDownEffect = (skill.effects || []).find((effect) => effect.type === "defense_down");
    const moveDownEffect = (skill.effects || []).find((effect) => effect.type === "move_down");
    const specialHpEffect = (skill.effects || []).find((effect) => ["halve_hp", "set_hp"].includes(effect.type));
    if (damageEffect) {
      const authoredMultiplier = Math.max(0, Number(Skills.calculateSkillDamageMultiplier(skill)) || 0);
      const hitCount = Math.max(1, whole(skill.hitResolution?.hit_count || damageEffect.hits, 1));
      for (const target of targetResult.affected.slice(0, 3)) {
        const index = enemies.findIndex((enemy) => enemy.id === target.id);
        const enemyState = battle.enemies[index];
        if (!enemyState?.alive) continue;
        const existingDebuff = target.defenceDownUntilRound >= battle.round ? target.defenceDown || 0 : 0;
        const defence = Math.max(0, (Number(target.defence) || 0) * (1 - existingDebuff) * (1 - (Number(pierceEffect?.amount) || 0)));
        const positional = Tactics.positionalAttack(hero, target, {
          attackPath: targetResult.attackPath,
          facing: hero.facing,
          side: 1 + SERVER_BATTLE_SIDE_DAMAGE_BONUS,
          rear: 1 + SERVER_BATTLE_REAR_DAMAGE_BONUS,
        });
        let damage = Tactics.calculateDamage(hero, target, {
          defence,
          multiplier: authoredMultiplier * positional.multiplier,
          minimum: Tactics.MIN_DIRECT_DAMAGE,
        });
        damage = Math.max(Tactics.MIN_DIRECT_DAMAGE, whole(damage, Tactics.MIN_DIRECT_DAMAGE) * hitCount);
        if (specialHpEffect?.type === "halve_hp") damage = Math.max(damage, Math.floor(enemyState.hp / 2));
        if (specialHpEffect?.type === "set_hp") damage = Math.max(damage, Math.max(0, enemyState.hp - Math.max(0, whole(specialHpEffect.value, 1))));
        enemyState.hp = Math.max(0, enemyState.hp - damage);
        enemyState.alive = enemyState.hp > 0;
        if (!enemyState.alive && !(whole(enemyState.deathRound, 0) > 0)) enemyState.deathRound = battle.round;
        target.hp = enemyState.hp;
        target.alive = enemyState.alive;
        target.deathRound = enemyState.deathRound || target.deathRound || null;
      }
    }
    if (heals.length) {
      const healAmount = heals.reduce((sum, effect) => sum + Math.max(0, whole(effect.flat, 0)) + Math.floor(battle.heroMaxHp * Math.max(0, Number(effect.maxHpRatio) || 0)), 0);
      battle.heroHp = Math.min(battle.heroMaxHp, battle.heroHp + healAmount);
      hero.hp = battle.heroHp;
    }
    if (defenceDownEffect || moveDownEffect) {
      for (const target of targetResult.affected) {
        if (!target.alive || target.hp <= 0) continue;
        if (defenceDownEffect) {
          target.defenceDown = Math.max(target.defenceDown || 0, Number(defenceDownEffect.amount) || 0);
          target.defenceDownUntilRound = battle.round + Math.max(1, whole(defenceDownEffect.duration, 1));
        }
        if (moveDownEffect) {
          target.moveDown = Math.max(target.moveDown || 0, Number(moveDownEffect.amount) || 0);
          target.moveDownUntilRound = battle.round + Math.max(1, whole(moveDownEffect.duration, 1));
        }
      }
    }
    const effectTargets = skill.targeting?.team === "ally" || skill.targeting?.team === "self"
      ? [hero]
      : targetResult.affected;
    const handled = new Set(["damage", "heal", "guard", "move_up", "evasion", "defense_down", "move_down", "armor_pierce", "halve_hp", "set_hp"]);
    const additionalEffects = (skill.effects || []).filter((effect) => !handled.has(effect.type));
    if (additionalEffects.length) {
      FighterEffects.applySkillEffects({
        skill: { ...skill, effects: additionalEffects },
        caster: hero,
        targets: effectTargets,
        units: [hero, ...enemies],
        grid,
        round: battle.round,
        random: deterministicBattleRng(battle, battle.round, `hero:${skill.id}`),
      });
    }
    battle.heroHp = Math.max(0, hero.hp);
  };

  const executeEnemy = (entry) => {
    const enemy = entry.enemy;
    const plan = entry.plan;
    if (!enemy?.alive || enemy.hp <= 0 || !hero.alive || hero.hp <= 0) return;
    const skillToUse = plan.skill || enemy.skill;
    if (!skillToUse || enemy.ap < (plan.apCost || skillToUse.apCost || 0)) return;
    const valid = MonsterAI.validateSkillFrom(skillToUse, enemy, enemy.cell, enemy.facing, hero, grid, [hero, ...enemies], { canDirectTarget: (unit) => FighterEffects.isDirectTargetable(unit, battle.round) });
    if (!valid) return;
    const targetCells = Skills.patternCells(skillToUse, enemy.cell, hero.cell, { grid, heightMap: grid.heightMap, facing: enemy.facing });
    if (!targetCells.some((cell) => Tactics.cellKey(cell) === Tactics.cellKey(hero.cell))) return;
    const battleEnemyState = battle.enemies[enemies.indexOf(enemy)];
    battleEnemyState.ap = Math.max(0, whole(battleEnemyState.ap, 0) - (plan.apCost || skillToUse.apCost || 0));
    enemy.ap = battleEnemyState.ap;
    const rng = deterministicBattleRng(battle, battle.round, enemy.id);
    const hitRoll = Tactics.rollHit({
      accuracy: enemy.accuracy,
      accuracyMultiplier: skillToUse.accuracyMultiplier ?? 1,
      evasion: Math.max(0, hero.evasion + evasionBonus * 100 + (FighterEffects.statusEvasion(hero, battle.round, {}) || 0) * 100),
      accuracyPenalties: [(FighterEffects.accuracyPenalty(enemy, battle.round) || 0) * 100],
    }, rng);
    if (!hitRoll.hit) return;
    const positional = Tactics.positionalAttack(enemy, hero, {
      attackPath: Tactics.facingOrthogonalPriority(enemy.cell, hero.cell, enemy.facing),
      facing: enemy.facing,
      side: 1 + SERVER_BATTLE_SIDE_DAMAGE_BONUS,
      rear: 1 + SERVER_BATTLE_REAR_DAMAGE_BONUS,
    });
    let damage = Tactics.calculateDamage(enemy, hero, {
      multiplier: (skillToUse.damageModel?.scale || 1) * positional.multiplier,
      guarded: guardReduction > 0,
      guardMultiplier: 1 - guardReduction,
      minimum: Tactics.MIN_DIRECT_DAMAGE,
    });
    damage = Math.max(1, Math.round(whole(damage, 1) * (FighterEffects.damageMultiplier(hero, battle.round) ?? 1)));
    const counter = FighterEffects.resolveCounter({
      defender: hero,
      attacker: enemy,
      damage,
      isProjectile: skillToUse.isProjectile === true,
      round: battle.round,
    });
    damage = counter.damage;
    const counterEnemyIndex = enemies.indexOf(enemy);
    if (counterEnemyIndex >= 0) {
      battle.enemies[counterEnemyIndex].hp = Math.max(0, enemy.hp);
      battle.enemies[counterEnemyIndex].alive = enemy.hp > 0;
    }
    battle.heroHp = Math.max(0, battle.heroHp - damage);
    hero.hp = battle.heroHp;
    hero.alive = hero.hp > 0;
    if (!hero.alive && !(whole(battle.heroDeathRound, 0) > 0)) battle.heroDeathRound = battle.round;
    hero.deathRound = battle.heroDeathRound || hero.deathRound || null;
    if (hero.alive && skillToUse.effects?.length) {
      FighterEffects.applySkillEffects({ skill: skillToUse, caster: enemy, targets: [hero], units: [hero, ...enemies], grid, round: battle.round, random: rng });
      battle.heroHp = Math.max(0, hero.hp);
      hero.alive = hero.hp > 0;
    }
  };

  for (const entry of order) {
    if (entry.actorId === hero.id) executeHero();
    else {
      const enemyEntry = enemyAttacks.find((candidate) => candidate.actorId === entry.actorId);
      if (enemyEntry) executeEnemy(enemyEntry);
    }
  }
  return { ok: true };
}

function persistServerBattleUnits(battle, hero, enemies) {
  battle.heroHp = Math.max(0, Number(hero.hp) || 0);
  battle.heroCell = { ...hero.cell };
  battle.heroFacing = canonicalBattleFacing(hero.facing, battle.heroFacing);
  battle.heroStatusEffects = clone(hero.statusEffects || {});
  battle.heroDeathRound = whole(hero.deathRound, 0) > 0 ? whole(hero.deathRound, 0) : (whole(battle.heroDeathRound, 0) > 0 ? whole(battle.heroDeathRound, 0) : null);
  for (let index = 0; index < battle.enemies.length; index += 1) {
    const stateEnemy = battle.enemies[index];
    const unit = enemies[index];
    if (!stateEnemy || !unit) continue;
    stateEnemy.hp = Math.max(0, Number(unit.hp) || 0);
    stateEnemy.alive = unit.alive !== false && stateEnemy.hp > 0;
    stateEnemy.deathRound = whole(unit.deathRound, 0) > 0 ? whole(unit.deathRound, 0) : (whole(stateEnemy.deathRound, 0) > 0 ? whole(stateEnemy.deathRound, 0) : null);
    stateEnemy.cell = { ...unit.cell };
    stateEnemy.facing = canonicalBattleFacing(unit.facing, stateEnemy.facing);
    stateEnemy.ap = clamp(whole(unit.ap, stateEnemy.ap || 0), 0, Skills.MAX_AP);
    stateEnemy.statusEffects = clone(unit.statusEffects || {});
    stateEnemy.defenceDown = Math.max(0, Number(unit.defenceDown) || 0);
    stateEnemy.defenceDownUntilRound = Math.max(0, whole(unit.defenceDownUntilRound, 0));
    stateEnemy.moveDown = Math.max(0, Number(unit.moveDown) || 0);
    stateEnemy.moveDownUntilRound = Math.max(0, whole(unit.moveDownUntilRound, 0));
  }
}

function battleCommand(save, input = {}, options = {}) {
  const state = saveCopy(save);
  const action = String(input.action || "").trim();
  const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
  const callerUid = String(options.uid || "").trim() || String(state?.player?.uid || "").trim() || "solo-player";
  const SharedBattle = require("./party-battle-system.js");
  let existing = state.expansion.serverBattle && typeof state.expansion.serverBattle === "object" ? state.expansion.serverBattle : null;

  const soloParty = () => ({
    id: `solo:${callerUid}`,
    leaderUid: callerUid,
    memberUids: [callerUid],
    members: {
      [callerUid]: {
        uid: callerUid,
        name: String(state?.player?.name || "冒險者"),
        classId: String(state?.expansion?.classId || "fighter"),
        gender: String(state?.player?.gender || "male"),
        level: Math.max(1, whole(state?.player?.level, 1)),
        battleUnitId: "battle-player",
      },
    },
  });

  const migrateLegacyBattle = (legacy) => {
    if (!legacy || (Array.isArray(legacy.memberUids) && legacy.members && legacy.solo === true)) return legacy;
    const shared = SharedBattle.createBattle({
      id: legacy.id,
      party: soloParty(),
      saves: { [callerUid]: state },
      canonicalBattle: legacy,
      nowMs,
      phaseMs: 0,
      loading: false,
    });
    shared.solo = true;
    shared.soloUid = callerUid;
    shared.tacticalVersion = Math.max(2, whole(legacy.tacticalVersion, 0));
    shared.round = Math.max(1, whole(legacy.round, 1));
    const member = shared.members[callerUid];
    if (member) {
      member.hp = clamp(Number(legacy.heroHp ?? member.hp) || 0, 0, member.maxHp);
      member.alive = member.hp > 0;
      member.deathRound = whole(legacy.heroDeathRound, 0) > 0 ? whole(legacy.heroDeathRound, 0) : null;
      if (legacy.heroCell) member.cell = { x: whole(legacy.heroCell.x, member.cell.x), y: whole(legacy.heroCell.y, member.cell.y) };
      member.facing = canonicalBattleFacing(legacy.heroFacing, member.facing || "right");
      member.ap = clamp(whole(legacy.ap, member.ap || 0), 0, Skills.MAX_AP);
      member.statusEffects = clone(legacy.heroStatusEffects || {});
    }
    shared.enemies = clone(legacy.enemies || shared.enemies || []);
    // Legacy snapshots were persisted after a resolved round and before the
    // next planning AP grant. Re-enter the canonical shared planning phase once.
    shared.phase = "planning_move";
    shared.phaseEndsAtMs = 0;
    shared.movePlans = {};
    shared.actions = {};
    return shared;
  };

  if (action === "start") {
    const requestedEncounterId = String(input.encounterId || "");
    const requestedMonsterType = MonsterBlueprints.normalizeMonsterId(input.monsterType);
    if (existing?.status === "active") {
      const sameEncounter = requestedEncounterId
        && String(existing.encounterId || "") === requestedEncounterId
        && String(existing.monsterType || "") === String(requestedMonsterType || "");
      if (sameEncounter) return resultWithState(state, { action, reused: true, battle: clone(existing) });
      return { ok: false, reason: "battle-active", battle: clone(existing) };
    }
    const persistedHeroHp = Number(state.player.hp);
    if (!Number.isFinite(persistedHeroHp) || persistedHeroHp <= 0) return { ok: false, reason: "player-dead" };

    const monsterType = requestedMonsterType;
    const blueprint = monsterType ? MonsterBlueprints.monsterBlueprint(monsterType) : null;
    if (!blueprint) return { ok: false, reason: "unknown-monster" };
    const mapId = normalizeMapId(state.expansion.currentMapId);
    const positionCheck = validateCommandPositionState(state, input, options);
    if (!positionCheck.ok) return positionCheck;
    const level = whole(input.level, blueprint.baseLevel || 1);
    if (level < 1 || level > 45) return { ok: false, reason: "invalid-monster-level" };

    let fieldEncounter = null;
    if (mapId === "field") {
      fieldEncounter = validateFieldRandomEncounter(positionCheck.position, blueprint, level);
      if (!fieldEncounter.ok) return fieldEncounter;
    } else if (Array.isArray(blueprint.habitat?.maps) && blueprint.habitat.maps.length && !blueprint.habitat.maps.includes(mapId)) {
      return { ok: false, reason: "wrong-map" };
    }

    const stats = MonsterBlueprints.monsterStatsAtLevel(monsterType, level);
    const count = clamp(whole(blueprint.encounterCount, 1), 1, 3);
    const hpMultiplier = MonsterBlueprints.encounterHpMultiplier(count);
    const battlefield = serverBattlefieldFor(mapId, monsterType);
    const battleId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const enemies = Array.from({ length: count }, (_, index) => ({
      index,
      id: index === 0 ? `battle-${requestedEncounterId || battleId}` : `battle-${requestedEncounterId || battleId}-pack-${index + 1}`,
      type: monsterType,
      level,
      hp: Math.max(1, Math.round(stats.hp * hpMultiplier)),
      maxHp: Math.max(1, Math.round(stats.hp * hpMultiplier)),
      alive: true,
      deathRound: null,
      ap: 0,
      cell: serverBattleDeploymentCell(battlefield, "enemy", index),
      facing: "left",
      statusEffects: {},
      defenceDown: 0,
      defenceDownUntilRound: 0,
      moveDown: 0,
      moveDownUntilRound: 0,
    }));
    const seed = { id: battleId, status: "active", tacticalVersion: 2, mapId, monsterType, encounterId: requestedEncounterId, level, round: 1, enemies };
    if (options.encounterSeedOnly === true) {
      state.expansion.serverBattle = seed;
      return resultWithState(state, { action, battle: clone(seed), ...(fieldEncounter ? { encounterZone: fieldEncounter.encounterZone } : {}) });
    }
    const shared = SharedBattle.createBattle({
      id: battleId,
      party: soloParty(),
      saves: { [callerUid]: state },
      canonicalBattle: seed,
      nowMs,
      phaseMs: 0,
      loading: false,
    });
    shared.solo = true;
    shared.soloUid = callerUid;
    shared.tacticalVersion = 2;
    state.expansion.serverBattle = shared;
    return resultWithState(state, { action, battle: clone(shared), ...(fieldEncounter ? { encounterZone: fieldEncounter.encounterZone } : {}) });
  }

  if (!existing || !["active", "finished"].includes(String(existing.status || ""))) return { ok: false, reason: "no-battle" };
  if (String(input.battleId || "") !== String(existing.id)) return { ok: false, reason: "battle-id" };
  existing = migrateLegacyBattle(existing);
  existing.solo = true;
  existing.soloUid = existing.soloUid || callerUid;
  existing.phaseDurationMs = 0;

  const saves = { [callerUid]: state };
  const commitBattle = (nextBattle, nextState = state, extra = {}) => {
    nextBattle.solo = true;
    nextBattle.soloUid = callerUid;
    nextBattle.phaseDurationMs = 0;
    nextState.expansion.serverBattle = nextBattle;
    return resultWithState(nextState, { action, battle: clone(nextBattle), ...extra });
  };

  const submitMove = () => {
    if (existing.status !== "active") return { ok: false, reason: "battle-closed", battle: clone(existing) };
    const requestedRound = whole(input.round, whole(existing.round, 1));
    if (requestedRound !== whole(existing.round, 1)) return { ok: false, reason: "round", battle: clone(existing) };
    const validation = SharedBattle.validateMoveSubmission(existing, callerUid, state, input.moveCommands || input.commands || [], input.finalFacing || input.facing);
    if (!validation.ok) return { ...validation, battle: clone(existing) };
    existing.movePlans = { ...(existing.movePlans || {}), [callerUid]: { commands: validation.commands, facing: validation.finalFacing, submittedAtMs: nowMs } };
    const resolved = SharedBattle.resolveMovement(existing, saves, nowMs);
    if (!resolved.ok) return { ...resolved, battle: clone(existing) };
    existing = resolved.battle;
    return commitBattle(existing);
  };

  const submitAction = () => {
    if (existing.status !== "active") return { ok: false, reason: "battle-closed", battle: clone(existing) };
    const requestedRound = whole(input.round, whole(existing.round, 1));
    if (requestedRound !== whole(existing.round, 1)) return { ok: false, reason: "round", battle: clone(existing) };
    const battleAction = input.battleAction && typeof input.battleAction === "object"
      ? input.battleAction
      : {
          type: String(input.heroAction || "wait"),
          ...(input.skillId ? { skillId: input.skillId } : {}),
          ...(input.targetCell ? { targetCell: input.targetCell } : {}),
        };
    const validation = SharedBattle.validatePlayerAction(existing, callerUid, state, battleAction);
    if (!validation.ok) return { ...validation, battle: clone(existing) };
    existing.actions = { ...(existing.actions || {}), [callerUid]: { ...validation.action, submittedAtMs: nowMs } };
    const resolved = SharedBattle.resolveActions(existing, saves, nowMs);
    if (!resolved.ok) return { ...resolved, battle: clone(existing) };
    existing = resolved.battle;
    const nextState = resolved.saves?.[callerUid] || state;
    return commitBattle(existing, nextState, { finished: existing.status === "finished", result: existing.result || null });
  };

  if (action === "move") return submitMove();
  if (action === "action") return submitAction();
  if (action === "retreat") {
    if (existing.status !== "active") return { ok: false, reason: "battle-closed", battle: clone(existing) };
    const chance = clamp(Number(SharedBattle.retreatChance(existing, callerUid)) || 0, 0, 1);
    const success = Math.random() < chance;
    if (!success) return resultWithState(state, { action, success: false, chance, battle: clone(existing) });
    state.expansion.serverBattle = null;
    return resultWithState(state, { action, success: true, chance });
  }
  if (action === "act") {
    // Rolling-update compatibility for older clients: resolve the same shared
    // movement phase and shared action phase in one callable response.
    if (existing.phase === "planning_move") {
      const moved = submitMove();
      if (!moved?.ok) return moved;
      existing = state.expansion.serverBattle;
    }
    return submitAction();
  }

  if (action === "settle") {
    const victory = input.outcome === "victory";
    const member = existing.members?.[callerUid] || existing.members?.[existing.memberUids?.[0]] || null;
    if (victory) {
      if (existing.status !== "finished" || existing.result !== "victory" || (existing.enemies || []).some((enemy) => enemy.alive !== false && Number(enemy.hp) > 0)) {
        return { ok: false, reason: "battle-not-won", battle: clone(existing) };
      }
      const rewarded = SharedBattle.grantVictoryRewards(existing, { [callerUid]: state });
      const nextState = rewarded.saves?.[callerUid] || state;
      const reward = rewarded.rewards?.[callerUid] || {};
      nextState.expansion.serverBattle = null;
      return resultWithState(nextState, {
        action,
        outcome: "victory",
        earnedXp: Math.max(0, whole(reward.earnedXp, 0)),
        coins: Math.max(0, whole(reward.coins, 0)),
        drops: [],
        beforeLevel: Math.max(1, whole(reward.beforeLevel, nextState.player.level)),
        beforeXp: Math.max(0, whole(reward.beforeXp, 0)),
        afterLevel: Math.max(1, whole(reward.afterLevel, nextState.player.level)),
        afterXp: Math.max(0, whole(reward.afterXp, nextState.player.xp)),
        levelsGained: Math.max(0, whole(reward.levelsGained, 0)),
        questProgress: reward.questProgress || null,
      });
    }
    const nextState = state;
    nextState.player.hp = 0;
    nextState.expansion.serverBattle = null;
    return resultWithState(nextState, { action, outcome: "defeat", memberHp: Math.max(0, Number(member?.hp) || 0) });
  }

  if (action === "cancel") {
    state.expansion.serverBattle = null;
    return resultWithState(state, { action });
  }
  return { ok: false, reason: "unsupported-action", action };
}

function mapCommand(save, input = {}, options = {}) {
  const state = saveCopy(save);
  const action = String(input.action || "").trim();
  if (action !== "transition") return { ok: false, reason: "unsupported-action" };
  const from = normalizeMapId(state.expansion.currentMapId);
  const to = String(input.targetMapId || "").trim();
  if (!MAP_LINKS[from]?.has(to)) return { ok: false, reason: "invalid-transition", from, to };

  const rule = MAP_TRANSITION_RULES[from]?.[to] || null;
  if (!rule) return { ok: false, reason: "transition-rule-missing", from, to };

  const trusted = trustedPositionForMap(state, from);
  // The normal client flushes immediately before mapCommand, so established
  // Step 9A saves should always have a trusted same-map anchor here. We keep a
  // migration fallback for genuinely old saves, but once an authority exists
  // it cannot be bypassed by client-supplied x/y.
  if (trusted && !pointNearRect(trusted.x, trusted.y, rule.sourceRect)) {
    return {
      ok: false,
      reason: "invalid-transition-position",
      from,
      to,
      trustedPosition: { x: trusted.x, y: trusted.y },
    };
  }

  const previousAuthority = state.expansion.positionAuthority;
  state.expansion.currentMapId = to;
  reanchorAfterTransition(state, to, rule.arrival, options.nowMs, previousAuthority);
  return resultWithState(state, {
    action,
    from,
    to,
    arrival: { x: state.player.x, y: state.player.y },
    positionValidated: Boolean(trusted),
  });
}

module.exports = Object.freeze({
  WORLD_RESPAWN,
  GAMEPLAY_INTERACTION_RULES,
  respawnTownStatePatch,
  validateGameplayInteraction,
  economyCommand,
  questCommand,
  battleCommand,
  mapCommand,
  statePayload,
  // Shared-party battle reuses the exact solo battle primitives instead of
  // redefining movement/stat/monster rules in the callable layer.
  serverBattlefieldFor,
  serverBattleGrid,
  serverBattleDeploymentCell,
  serverHeroBattleStats,
  serverEnemyUnit,
  serverCorpseVisible,
  serverCorpseBlockers,
  sanitizeServerMoveCommands,
  canonicalBattleFacing,
  deterministicBattleRng,
  recordServerKill,
});
