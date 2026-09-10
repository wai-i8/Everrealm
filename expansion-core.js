(function (root, factory) {
  const classData = root.EverrealmClassData
    || (typeof require === "function" ? require("./data/classes.js") : null);
  const equipmentData = root.EverrealmEquipmentData
    || (typeof require === "function" ? require("./data/equipment.js") : null);
  const api = factory(classData, equipmentData);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternExpansion = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (classData, equipmentData) {
  "use strict";

  const LEVEL_CAP = classData?.LEVEL_CAP || 40;
  const EQUIPMENT_SLOTS = Object.freeze([...(equipmentData?.EQUIPMENT_SLOTS || ["head", "weapon", "upperBody", "lowerBody", "hands", "feet", "charm"])]);
  const EQUIPMENT_SHOP_SLOTS = Object.freeze([...(equipmentData?.EQUIPMENT_SHOP_SLOTS || ["weapon", "head", "upperBody", "lowerBody"])]);
  const LEGACY_EQUIPMENT_SLOT_ALIASES = Object.freeze({ ...(equipmentData?.LEGACY_EQUIPMENT_SLOT_ALIASES || { body: "upperBody", armor: "upperBody" }) });
  const EQUIPMENT_STAT_KEYS = Object.freeze([...(equipmentData?.EQUIPMENT_STAT_KEYS || ["attack", "defense", "maxHp", "speed", "critChance", "moveRange", "accuracy", "evasion", "weight"])]);
  const PORTABLE_FACILITY_TABS = Object.freeze(["status", "bag", "equipment", "skills", "codex"]);
  const CLASS_LEVEL_TABLES = classData?.CLASS_LEVEL_TABLES || Object.freeze({});

  function classStatsAtLevel(classId, level) {
    return classData?.classStatsAtLevel?.(classId, level) || { level: 1, maxHp: 88, attack: 14, defence: 2, moveRange: 3 };
  }

  function starterEquipmentForClass(classId) {
    return classData?.starterEquipment?.(classId) || { weapon: classId === "fighter" ? "novice_gloves" : "novice_blade", upperBody: "traveller_coat" };
  }

  function facilityTabsForContext(context = "portable", mapId = "world") {
    if (context === "deck-view") return ["deck"];
    if (context === "deck" && mapId === "world") return ["deck"];
    if (context === "guild" && mapId === "guild") return ["guild"];
    if (context === "shop" && mapId === "shop") return ["shop"];
    const tabs = ["status", "bag", "equipment"];
    tabs.push("skills", "codex");
    return tabs;
  }

  function normalizeFacilityTab(tab, context = "portable", mapId = "world") {
    const available = facilityTabsForContext(context, mapId);
    return available.includes(tab) ? tab : available.includes("bag") ? "bag" : available[0] || "bag";
  }


  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function wholeNumber(value, fallback = 0, min = 0) {
    return Math.max(min, Math.floor(finiteNumber(value, fallback)));
  }

  function cloneStats(stats) {
    const result = {};
    for (const key of EQUIPMENT_STAT_KEYS) result[key] = finiteNumber(stats && stats[key], 0);
    return Object.freeze(result);
  }

  function normalizeEquipmentCatalog(catalog) {
    const source = Array.isArray(catalog) ? catalog : catalog && typeof catalog === "object" ? Object.values(catalog) : [];
    const seen = new Set();
    const result = [];
    for (const raw of source) {
      if (!raw || typeof raw !== "object") continue;
      const id = String(raw.id || "").trim();
      const requestedSlot = String(raw.slot || "").trim();
      const slot = LEGACY_EQUIPMENT_SLOT_ALIASES[requestedSlot] || requestedSlot;
      if (!id || seen.has(id) || !EQUIPMENT_SLOTS.includes(slot)) continue;
      seen.add(id);
      const requestedOccupancy = Array.isArray(raw.occupiesSlots) ? raw.occupiesSlots : [slot];
      const occupiesSlots = [...new Set(requestedOccupancy
        .map((entry) => LEGACY_EQUIPMENT_SLOT_ALIASES[String(entry || "").trim()] || String(entry || "").trim())
        .filter((entry) => EQUIPMENT_SLOTS.includes(entry)))];
      if (!occupiesSlots.includes(slot)) occupiesSlots.unshift(slot);
      result.push(Object.freeze({
        id,
        slot,
        occupiesSlots: Object.freeze(occupiesSlots),
        name: String(raw.name || id),
        description: String(raw.description || ""),
        cost: wholeNumber(raw.cost),
        requiredLevel: Math.max(1, Math.min(LEVEL_CAP, wholeNumber(raw.requiredLevel, 1, 1))),
        purchasable: raw.purchasable !== false && raw.legacyOnly !== true,
        classId: ["warrior", "fighter"].includes(String(raw.classId || "")) ? String(raw.classId) : null,
        legacyOnly: raw.legacyOnly === true,
        iconIndex: Math.max(0, Math.min(15, wholeNumber(raw.iconIndex, 0))),
        icon: raw.icon && typeof raw.icon === "object" ? Object.freeze({ ...raw.icon }) : null,
        stats: cloneStats(raw.stats),
      }));
    }
    return Object.freeze(result);
  }

  const DEFAULT_EQUIPMENT_CATALOG = normalizeEquipmentCatalog(equipmentData?.ALL_EQUIPMENT_CATALOG || []);
  const ACTIVE_EQUIPMENT_CATALOG = normalizeEquipmentCatalog(equipmentData?.EQUIPMENT_CATALOG || []);

  function getEquipment(catalog, itemId) {
    const items = catalog === DEFAULT_EQUIPMENT_CATALOG ? catalog : normalizeEquipmentCatalog(catalog);
    return items.find((item) => item.id === String(itemId || "")) || null;
  }

  function normalizeEquipmentState(raw, catalog = DEFAULT_EQUIPMENT_CATALOG) {
    const state = raw && typeof raw === "object" ? raw : {};
    const ownedSource = Array.isArray(state.ownedEquipment) ? state.ownedEquipment : [];
    const ownedEquipment = [...new Set(ownedSource.map((id) => String(id || "").trim()).filter(Boolean))];
    const sourceEquipped = state.equipped && typeof state.equipped === "object" ? state.equipped : {};
    const items = catalog === DEFAULT_EQUIPMENT_CATALOG ? catalog : normalizeEquipmentCatalog(catalog);
    const equipped = {};
    for (const slot of EQUIPMENT_SLOTS) equipped[slot] = null;
    const sourceForSlot = (slot) => {
      const canonical = String(sourceEquipped[slot] || "").trim();
      if (canonical) return canonical;
      for (const [legacy, target] of Object.entries(LEGACY_EQUIPMENT_SLOT_ALIASES)) {
        if (target === slot) {
          const legacyId = String(sourceEquipped[legacy] || "").trim();
          if (legacyId) return legacyId;
        }
      }
      return "";
    };
    for (const slot of EQUIPMENT_SLOTS) {
      const id = sourceForSlot(slot);
      if (!id || !ownedEquipment.includes(id) || equipped[slot]) continue;
      const item = items.find((candidate) => candidate.id === id && candidate.occupiesSlots.includes(slot));
      if (!item || (item.classId && state.classId && item.classId !== state.classId) || item.occupiesSlots.some((occupiedSlot) => equipped[occupiedSlot] && equipped[occupiedSlot] !== id)) continue;
      for (const occupiedSlot of item.occupiesSlots) equipped[occupiedSlot] = id;
    }
    return {
      coins: wholeNumber(state.coins),
      level: Math.max(1, Math.min(LEVEL_CAP, wholeNumber(state.level, 1, 1))),
      classId: ["warrior", "fighter"].includes(String(state.classId || "")) ? String(state.classId) : null,
      ownedEquipment,
      equipped,
    };
  }

  function equipmentStats(equippedOrState, catalog = DEFAULT_EQUIPMENT_CATALOG) {
    const source = equippedOrState && equippedOrState.equipped ? equippedOrState.equipped : equippedOrState || {};
    const equipped = {};
    for (const slot of EQUIPMENT_SLOTS) {
      equipped[slot] = String(source[slot] || "").trim() || null;
      if (!equipped[slot]) {
        for (const [legacy, target] of Object.entries(LEGACY_EQUIPMENT_SLOT_ALIASES)) {
          if (target === slot && source[legacy]) equipped[slot] = String(source[legacy]).trim();
        }
      }
    }
    const items = catalog === DEFAULT_EQUIPMENT_CATALOG ? catalog : normalizeEquipmentCatalog(catalog);
    const totals = {};
    for (const key of EQUIPMENT_STAT_KEYS) totals[key] = 0;
    const counted = new Set();
    for (const slot of EQUIPMENT_SLOTS) {
      const item = items.find((candidate) => candidate.id === equipped[slot] && candidate.occupiesSlots.includes(slot));
      if (!item || counted.has(item.id)) continue;
      counted.add(item.id);
      for (const key of EQUIPMENT_STAT_KEYS) totals[key] += item.stats[key];
    }
    return totals;
  }

  function canAffordEquipment(state, itemOrId, catalog = DEFAULT_EQUIPMENT_CATALOG) {
    const base = normalizeEquipmentState(state, catalog);
    const item = typeof itemOrId === "object" && itemOrId ? itemOrId : getEquipment(catalog, itemOrId);
    if (!item) return { ok: false, reason: "not-found", item: null };
    if (item.classId && base.classId && item.classId !== base.classId) return { ok: false, reason: "class", item };
    if (item.purchasable === false) return { ok: false, reason: "not-for-sale", item };
    if (base.ownedEquipment.includes(item.id)) return { ok: false, reason: "already-owned", item };
    if (base.level < item.requiredLevel) return { ok: false, reason: "level", item };
    if (base.coins < item.cost) return { ok: false, reason: "coins", item };
    return { ok: true, reason: null, item };
  }

  function purchaseEquipment(state, itemId, catalog = DEFAULT_EQUIPMENT_CATALOG) {
    const base = normalizeEquipmentState(state, catalog);
    const check = canAffordEquipment(base, itemId, catalog);
    if (!check.ok) return { ok: false, reason: check.reason, state: base, item: check.item };
    return {
      ok: true,
      reason: null,
      item: check.item,
      state: {
        ...base,
        coins: base.coins - check.item.cost,
        ownedEquipment: [...base.ownedEquipment, check.item.id],
      },
    };
  }

  function equipItem(state, itemId, catalog = DEFAULT_EQUIPMENT_CATALOG) {
    const base = normalizeEquipmentState(state, catalog);
    const item = getEquipment(catalog, itemId);
    if (!item) return { ok: false, reason: "not-found", state: base, item: null };
    if (item.classId && base.classId && item.classId !== base.classId) return { ok: false, reason: "class", state: base, item };
    if (!base.ownedEquipment.includes(item.id)) return { ok: false, reason: "not-owned", state: base, item };
    if (base.level < item.requiredLevel) return { ok: false, reason: "level", state: base, item };
    const conflicts = [...new Set(item.occupiesSlots
      .map((slot) => base.equipped[slot])
      .filter((id) => id && id !== item.id)
      .map((id) => getEquipment(catalog, id))
      .filter(Boolean))];
    const nextEquipped = { ...base.equipped };
    for (const conflict of conflicts) {
      for (const occupiedSlot of conflict.occupiesSlots) {
        if (nextEquipped[occupiedSlot] === conflict.id) nextEquipped[occupiedSlot] = null;
      }
    }
    for (const occupiedSlot of item.occupiesSlots) nextEquipped[occupiedSlot] = item.id;
    return {
      ok: true,
      reason: null,
      item,
      state: {
        ...base,
        equipped: nextEquipped,
      },
    };
  }

  function unequipItem(state, slot, catalog = DEFAULT_EQUIPMENT_CATALOG) {
    const base = normalizeEquipmentState(state, catalog);
    const canonicalSlot = LEGACY_EQUIPMENT_SLOT_ALIASES[String(slot || "").trim()] || String(slot || "").trim();
    if (!EQUIPMENT_SLOTS.includes(canonicalSlot) || !base.equipped[canonicalSlot]) {
      return { ok: false, reason: "empty", state: base, item: null };
    }
    const item = getEquipment(catalog, base.equipped[canonicalSlot]);
    const equipped = { ...base.equipped };
    for (const occupiedSlot of item?.occupiesSlots || [canonicalSlot]) {
      if (equipped[occupiedSlot] === item?.id) equipped[occupiedSlot] = null;
    }
    return { ok: true, reason: null, state: { ...base, equipped }, item };
  }

  function isEquipmentEquipped(state, itemId, catalog = DEFAULT_EQUIPMENT_CATALOG) {
    const item = getEquipment(catalog, itemId);
    if (!item) return false;
    const equipped = state?.equipped || state || {};
    return item.occupiesSlots.some((slot) => equipped[slot] === item.id || equipped[Object.entries(LEGACY_EQUIPMENT_SLOT_ALIASES).find(([, target]) => target === slot)?.[0]] === item.id);
  }


  function xpRequired(level) {
    const safeLevel = Math.max(1, Math.min(LEVEL_CAP, wholeNumber(level, 1, 1)));
    return Math.floor(45 + safeLevel * 32 + Math.pow(safeLevel, 1.35) * 7);
  }

  function grantExperience(level, xp, amount) {
    let nextLevel = Math.max(1, Math.min(LEVEL_CAP, wholeNumber(level, 1, 1)));
    let nextXp = wholeNumber(xp) + wholeNumber(amount);
    let levelsGained = 0;
    while (nextLevel < LEVEL_CAP && nextXp >= xpRequired(nextLevel)) {
      nextXp -= xpRequired(nextLevel);
      nextLevel += 1;
      levelsGained += 1;
    }
    if (nextLevel >= LEVEL_CAP) nextXp = 0;
    return { level: nextLevel, xp: nextXp, levelsGained, capped: nextLevel >= LEVEL_CAP };
  }

  return {
    LEVEL_CAP,
    EQUIPMENT_SLOTS,
    EQUIPMENT_SHOP_SLOTS,
    LEGACY_EQUIPMENT_SLOT_ALIASES,
    EQUIPMENT_STAT_KEYS,
    PORTABLE_FACILITY_TABS,
    CLASS_LEVEL_TABLES,
    classStatsAtLevel,
    facilityTabsForContext,
    normalizeFacilityTab,
    DEFAULT_EQUIPMENT_CATALOG,
    ACTIVE_EQUIPMENT_CATALOG,
    starterEquipmentForClass,
    normalizeEquipmentCatalog,
    getEquipment,
    normalizeEquipmentState,
    equipmentStats,
    canAffordEquipment,
    purchaseEquipment,
    equipItem,
    unequipItem,
    isEquipmentEquipped,
    xpRequired,
    grantExperience,
  };
});
