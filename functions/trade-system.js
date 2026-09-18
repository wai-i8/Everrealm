"use strict";

const Expansion = require("./shared/expansion-core.js");
const Guild = require("./shared/guild-commission-core.js");
const Skills = require("./shared/skill-core.js");
const ItemData = require("./shared/data/items.js");

const MAX_COINS = 99999;
const MAX_OFFER_LINES = 20;
const MAX_STACK = 999;
const MAX_SPECIAL_STACK = 9999;
const MAX_POTIONS = 9;
const MAX_OWNED_EQUIPMENT = 120;
const ASSET_KINDS = new Set(["inventory", "potion", "equipment", "envelope", "skill-book", "manual"]);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function whole(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const numeric = Math.floor(Number(value));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function safeId(value) {
  return String(value || "").trim().slice(0, 128);
}

function assetKey(entry) {
  return `${entry.kind}:${entry.id}`;
}

function normalizeEntry(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const kind = String(source.kind || "").trim();
  if (!ASSET_KINDS.has(kind)) return null;
  const id = safeId(source.id);
  if (!id) return null;
  const quantity = whole(source.quantity, 0, 1, MAX_SPECIAL_STACK);
  if (!quantity) return null;
  return { kind, id, quantity };
}

function normalizeOffer(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const merged = new Map();
  for (const rawEntry of Array.isArray(source.items) ? source.items.slice(0, MAX_OFFER_LINES * 2) : []) {
    const entry = normalizeEntry(rawEntry);
    if (!entry) continue;
    const key = assetKey(entry);
    const previous = merged.get(key);
    if (previous) previous.quantity = Math.min(MAX_SPECIAL_STACK, previous.quantity + entry.quantity);
    else if (merged.size < MAX_OFFER_LINES) merged.set(key, { ...entry });
  }
  return {
    coins: whole(source.coins, 0, 0, MAX_COINS),
    items: [...merged.values()],
  };
}

function normalizedSkills(save) {
  return Skills.normalizeSkillState(save?.expansion?.skills, { classId: save?.expansion?.classId || "fighter" });
}

function normalizedGuild(save) {
  return Guild.normalizeState(save?.expansion?.guildCommission);
}

function equipmentCount(save, id) {
  const owned = Array.isArray(save?.expansion?.ownedEquipment) ? save.expansion.ownedEquipment : [];
  return owned.filter((value) => String(value) === id).length;
}

function equippedEquipmentCount(save, id) {
  const values = new Set(Object.values(save?.expansion?.equipped || {}).map(String));
  return values.has(id) ? 1 : 0;
}

function validInventoryTradeItem(id) {
  const item = ItemData.getItem(id);
  if (!item || id === "healing_potion") return null;
  if (["ui", "currency", "quest"].includes(item.kind)) return null;
  if (item.tradable === false) return null;
  return item;
}

function validEquipment(id) {
  const item = Expansion.getEquipment(Expansion.DEFAULT_EQUIPMENT_CATALOG, id);
  if (!item || item.tradable === false) return null;
  return item;
}

function validStar(value) {
  const star = whole(value, 0, 1, 14);
  return star || null;
}

function validManual(save, id) {
  const skill = Skills.getSkill(id);
  if (!skill || skill.classId !== String(save?.expansion?.classId || "fighter")) return null;
  return skill;
}

function availableCount(save, rawEntry) {
  const entry = normalizeEntry(rawEntry);
  if (!entry) return 0;
  const expansion = save?.expansion || {};
  if (entry.kind === "inventory") {
    if (!validInventoryTradeItem(entry.id)) return 0;
    return whole(expansion.inventory?.[entry.id], 0, 0, MAX_STACK);
  }
  if (entry.kind === "potion") {
    if (entry.id !== "healing_potion") return 0;
    return whole(save?.player?.potions, 0, 0, MAX_POTIONS);
  }
  if (entry.kind === "equipment") {
    if (!validEquipment(entry.id)) return 0;
    return Math.max(0, equipmentCount(save, entry.id) - equippedEquipmentCount(save, entry.id));
  }
  if (entry.kind === "envelope") {
    const star = validStar(entry.id);
    if (!star) return 0;
    return whole(normalizedGuild(save).envelopes?.[star], 0, 0, MAX_SPECIAL_STACK);
  }
  if (entry.kind === "skill-book") {
    const star = validStar(entry.id);
    if (!star) return 0;
    return whole(normalizedSkills(save).books?.[star], 0, 0, MAX_SPECIAL_STACK);
  }
  if (entry.kind === "manual") {
    if (!validManual(save, entry.id)) return 0;
    // Bound main-quest manuals live in boundManualCounts and are deliberately
    // not considered here. Only normal manualCounts can ever be traded.
    return whole(normalizedSkills(save).manualCounts?.[entry.id], 0, 0, MAX_SPECIAL_STACK);
  }
  return 0;
}

function validateOffer(save, rawOffer) {
  const offer = normalizeOffer(rawOffer);
  if (offer.coins > whole(save?.player?.coins, 0, 0, MAX_COINS)) {
    return { ok: false, reason: "coins", offer };
  }
  for (const entry of offer.items) {
    const available = availableCount(save, entry);
    if (available < entry.quantity) {
      return { ok: false, reason: available > 0 ? "quantity" : "missing-item", entry, available, offer };
    }
  }
  return { ok: true, reason: null, offer };
}

function ensureExpansion(save) {
  save.player = save.player && typeof save.player === "object" ? save.player : {};
  save.expansion = save.expansion && typeof save.expansion === "object" ? save.expansion : {};
  save.expansion.inventory = save.expansion.inventory && typeof save.expansion.inventory === "object" ? save.expansion.inventory : {};
  save.expansion.ownedEquipment = Array.isArray(save.expansion.ownedEquipment) ? save.expansion.ownedEquipment : [];
  save.expansion.equipped = save.expansion.equipped && typeof save.expansion.equipped === "object" ? save.expansion.equipped : {};
}

function setStack(container, id, next) {
  if (next > 0) container[id] = next;
  else delete container[id];
}

function removeEntry(save, entry) {
  ensureExpansion(save);
  if (entry.kind === "inventory") {
    setStack(save.expansion.inventory, entry.id, whole(save.expansion.inventory[entry.id], 0) - entry.quantity);
    return;
  }
  if (entry.kind === "potion") {
    save.player.potions = whole(save.player.potions, 0) - entry.quantity;
    return;
  }
  if (entry.kind === "equipment") {
    for (let i = 0; i < entry.quantity; i += 1) {
      const index = save.expansion.ownedEquipment.indexOf(entry.id);
      if (index >= 0) save.expansion.ownedEquipment.splice(index, 1);
    }
    return;
  }
  if (entry.kind === "envelope") {
    const star = Number(entry.id);
    const guild = normalizedGuild(save);
    guild.envelopes[star] = Math.max(0, whole(guild.envelopes[star], 0) - entry.quantity);
    save.expansion.guildCommission = guild;
    return;
  }
  if (entry.kind === "skill-book") {
    const star = Number(entry.id);
    const skills = normalizedSkills(save);
    skills.books[star] = Math.max(0, whole(skills.books[star], 0) - entry.quantity);
    save.expansion.skills = skills;
    return;
  }
  if (entry.kind === "manual") {
    const skills = normalizedSkills(save);
    const next = Math.max(0, whole(skills.manualCounts?.[entry.id], 0) - entry.quantity);
    skills.manualCounts = { ...skills.manualCounts };
    if (next > 0) skills.manualCounts[entry.id] = next;
    else delete skills.manualCounts[entry.id];
    save.expansion.skills = skills;
  }
}

function incomingCapacity(save, entry) {
  ensureExpansion(save);
  if (entry.kind === "inventory") return MAX_STACK - whole(save.expansion.inventory[entry.id], 0, 0, MAX_STACK);
  if (entry.kind === "potion") return MAX_POTIONS - whole(save.player.potions, 0, 0, MAX_POTIONS);
  if (entry.kind === "equipment") return Math.max(0, MAX_OWNED_EQUIPMENT - save.expansion.ownedEquipment.length);
  if (entry.kind === "envelope") return MAX_SPECIAL_STACK - whole(normalizedGuild(save).envelopes?.[Number(entry.id)], 0, 0, MAX_SPECIAL_STACK);
  if (entry.kind === "skill-book") return MAX_SPECIAL_STACK - whole(normalizedSkills(save).books?.[Number(entry.id)], 0, 0, MAX_SPECIAL_STACK);
  if (entry.kind === "manual") return MAX_SPECIAL_STACK - whole(normalizedSkills(save).manualCounts?.[entry.id], 0, 0, MAX_SPECIAL_STACK);
  return 0;
}

function addEntry(save, entry) {
  ensureExpansion(save);
  if (entry.kind === "inventory") {
    save.expansion.inventory[entry.id] = whole(save.expansion.inventory[entry.id], 0) + entry.quantity;
    return;
  }
  if (entry.kind === "potion") {
    save.player.potions = whole(save.player.potions, 0) + entry.quantity;
    return;
  }
  if (entry.kind === "equipment") {
    save.expansion.ownedEquipment.push(...Array.from({ length: entry.quantity }, () => entry.id));
    return;
  }
  if (entry.kind === "envelope") {
    const star = Number(entry.id);
    const guild = normalizedGuild(save);
    guild.envelopes[star] = whole(guild.envelopes[star], 0) + entry.quantity;
    save.expansion.guildCommission = guild;
    return;
  }
  if (entry.kind === "skill-book") {
    const star = Number(entry.id);
    const skills = normalizedSkills(save);
    skills.books[star] = whole(skills.books[star], 0) + entry.quantity;
    save.expansion.skills = skills;
    return;
  }
  if (entry.kind === "manual") {
    const skills = normalizedSkills(save);
    skills.manualCounts = { ...skills.manualCounts, [entry.id]: whole(skills.manualCounts?.[entry.id], 0) + entry.quantity };
    save.expansion.skills = skills;
  }
}

function prepareExchange(saveA, offerAInput, saveB, offerBInput) {
  const validationA = validateOffer(saveA, offerAInput);
  if (!validationA.ok) return { ok: false, side: "a", ...validationA };
  const validationB = validateOffer(saveB, offerBInput);
  if (!validationB.ok) return { ok: false, side: "b", ...validationB };
  const offerA = validationA.offer;
  const offerB = validationB.offer;
  const nextA = clone(saveA);
  const nextB = clone(saveB);
  ensureExpansion(nextA);
  ensureExpansion(nextB);

  const nextCoinsA = whole(nextA.player.coins, 0) - offerA.coins + offerB.coins;
  const nextCoinsB = whole(nextB.player.coins, 0) - offerB.coins + offerA.coins;
  if (nextCoinsA > MAX_COINS || nextCoinsB > MAX_COINS) return { ok: false, reason: "coin-cap" };

  // Remove both offers first. That correctly frees capacity when the recipient
  // is simultaneously trading away the same stack or equipment slot count.
  for (const entry of offerA.items) removeEntry(nextA, entry);
  for (const entry of offerB.items) removeEntry(nextB, entry);
  nextA.player.coins = nextCoinsA;
  nextB.player.coins = nextCoinsB;

  for (const entry of offerA.items) {
    if (incomingCapacity(nextB, entry) < entry.quantity) return { ok: false, side: "b", reason: "recipient-full", entry };
    addEntry(nextB, entry);
  }
  for (const entry of offerB.items) {
    if (incomingCapacity(nextA, entry) < entry.quantity) return { ok: false, side: "a", reason: "recipient-full", entry };
    addEntry(nextA, entry);
  }

  return { ok: true, reason: null, offerA, offerB, nextA, nextB };
}

function emptyOffer() {
  return { coins: 0, items: [], locked: false, confirmed: false };
}

module.exports = Object.freeze({
  MAX_COINS,
  MAX_OFFER_LINES,
  MAX_STACK,
  MAX_SPECIAL_STACK,
  MAX_POTIONS,
  MAX_OWNED_EQUIPMENT,
  normalizeEntry,
  normalizeOffer,
  assetKey,
  availableCount,
  validateOffer,
  prepareExchange,
  emptyOffer,
});
