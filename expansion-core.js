(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternExpansion = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const LEVEL_CAP = 40;
  const EQUIPMENT_SLOTS = Object.freeze(["head", "weapon", "upperBody", "lowerBody", "hands", "feet", "charm"]);
  const EQUIPMENT_SHOP_SLOTS = Object.freeze(["weapon", "upperBody", "lowerBody", "hands", "feet", "charm"]);
  const LEGACY_EQUIPMENT_SLOT_ALIASES = Object.freeze({ body: "upperBody", armor: "upperBody" });
  const EQUIPMENT_STAT_KEYS = Object.freeze(["attack", "defense", "maxHp", "speed", "critChance", "moveRange", "accuracy", "evasion", "weight"]);
  const PORTABLE_FACILITY_TABS = Object.freeze(["status", "bag", "equipment", "skills", "codex"]);

  function buildClassLevelTable(classId) {
    return Object.freeze(Array.from({ length: LEVEL_CAP }, (_, index) => {
      const steps = index;
      if (classId === "fighter") {
        return Object.freeze({
          level: index + 1,
          maxHp: 88 + steps * 7 + Math.floor(steps / 5) * 3,
          attack: 14,
          defence: 2,
          moveRange: 5,
        });
      }
      return Object.freeze({
        level: index + 1,
        maxHp: 88 + steps * 8 + Math.floor(steps / 5) * 4,
        attack: 14,
        defence: 2,
        moveRange: 3,
      });
    }));
  }

  const CLASS_LEVEL_TABLES = Object.freeze({
    warrior: buildClassLevelTable("warrior"),
    fighter: buildClassLevelTable("fighter"),
  });

  function classStatsAtLevel(classId, level) {
    const table = CLASS_LEVEL_TABLES[classId] || CLASS_LEVEL_TABLES.warrior;
    const safeLevel = Math.max(1, Math.min(LEVEL_CAP, Math.floor(Number(level) || 1)));
    return { ...table[safeLevel - 1] };
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

  const RAW_EQUIPMENT_CATALOG = [
    { id: "novice_blade", slot: "weapon", name: "見習燈刃", description: "拾燈人最初使用的短刃，輕巧可靠。", cost: 0, requiredLevel: 1, purchasable: false, stats: { attack: 2, weight: 2 }, classId: "warrior", iconIndex: 0 },
    { id: "novice_gloves", slot: "weapon", name: "見習拳套", description: "格鬥士初學者使用的軟皮拳套，護腕靈活而穩固。", cost: 0, requiredLevel: 1, purchasable: false, stats: { attack: 2, speed: 2, weight: 1 }, classId: "fighter", iconIndex: 0 },
    { id: "tide_iron_knuckles", slot: "weapon", name: "潮鐵拳套", description: "以輕量潮鐵護住指節，適合快速連拳。", cost: 95, requiredLevel: 1, stats: { attack: 5, speed: 2, weight: 2 }, classId: "fighter", iconIndex: 1 },
    { id: "gale_gauntlets", slot: "weapon", name: "疾風護拳", description: "薄甲拳套帶動氣流，令出拳同走位更快。", cost: 360, requiredLevel: 7, stats: { attack: 12, speed: 8, critChance: 0.03, weight: 2 }, classId: "fighter", iconIndex: 2 },
    { id: "dragon_knuckles", slot: "weapon", name: "昇龍鋼拳", description: "公會格鬥教官鍛造的重拳套，專為決勝連擊而設。", cost: 980, requiredLevel: 15, stats: { attack: 26, defense: 3, critChance: 0.04, weight: 5 }, classId: "fighter", iconIndex: 3 },
    { id: "metal_knuckles", slot: "weapon", name: "金屬拳套", description: "以鍛造金屬包覆指節，係格鬥士第一件正式升級拳套。", cost: 450, requiredLevel: 6, stats: { attack: 10, weight: 3 }, classId: "fighter", iconIndex: 0 },
    { id: "giz_armguard", slot: "weapon", name: "基茲臂鎧", description: "護住前臂與拳面的硬質臂鎧，令連拳更沉實。", cost: 1800, requiredLevel: 12, stats: { attack: 17, weight: 4 }, classId: "fighter", iconIndex: 1 },
    { id: "heavy_knuckles", slot: "weapon", name: "重拳套", description: "厚重拳套將身體重量集中到每一記直拳。", cost: 4050, requiredLevel: 18, stats: { attack: 25, weight: 6 }, classId: "fighter", iconIndex: 2 },
    { id: "superheavy_knuckles", slot: "weapon", name: "超重量拳套", description: "極重金屬拳套，為熟練格鬥士換取更高爆發力。", cost: 7200, requiredLevel: 24, stats: { attack: 34, weight: 8 }, classId: "fighter", iconIndex: 3 },
    { id: "tide_iron_sword", slot: "weapon", name: "潮鐵劍", description: "以霧都潮鐵打製，劍身會映出淡藍微光。", cost: 90, requiredLevel: 1, stats: { attack: 5, weight: 2 }, iconIndex: 1 },
    { id: "windfeather_dagger", slot: "weapon", name: "風羽短刀", description: "快得像海鳥掠過水面，適合靈巧的冒險者。", cost: 190, requiredLevel: 4, stats: { attack: 8, speed: 6, critChance: 0.03, weight: 1 }, iconIndex: 2 },
    { id: "lantern_sabre", slot: "weapon", name: "曜燈彎刀", description: "刀脊藏有燈晶，揮舞時會留下金色光弧。", cost: 380, requiredLevel: 7, stats: { attack: 14, critChance: 0.04, weight: 3 }, iconIndex: 3 },
    { id: "starfall_glaive", slot: "weapon", name: "墜星長刃", description: "從地城隕鐵重鑄而成，沉重但威力驚人。", cost: 720, requiredLevel: 12, stats: { attack: 22, defense: 2, weight: 5 }, iconIndex: 4 },
    { id: "dawn_oath", slot: "weapon", name: "破曉誓約", description: "公會高手夢寐以求的燈刃，光芒從不熄滅。", cost: 1250, requiredLevel: 17, stats: { attack: 31, maxHp: 12, critChance: 0.05, weight: 7 }, iconIndex: 5 },
    { id: "traveller_coat", slot: "upperBody", name: "旅行者短衣", description: "方便活動的厚布衣，是冒險的第一件護甲。", cost: 0, requiredLevel: 1, purchasable: false, stats: { defense: 1, maxHp: 4, weight: 2 }, iconIndex: 6 },
    { id: "guild_mail", slot: "upperBody", name: "公會鎖衣", description: "公會制式護甲，能擋住一般魔物的爪牙。", cost: 120, requiredLevel: 2, stats: { defense: 3, maxHp: 12, weight: 4 }, iconIndex: 7 },
    { id: "mistweave_cape", slot: "upperBody", name: "霧織斗篷", description: "以霧蛛絲織成，防護與靈活兼備。", cost: 290, requiredLevel: 6, stats: { defense: 5, maxHp: 18, speed: 5, weight: 3 }, iconIndex: 8 },
    { id: "cavern_guard", slot: "upperBody", name: "岩窟守衛甲", description: "厚重岩片內襯燈晶，專為深入地城而設。", cost: 560, requiredLevel: 10, stats: { defense: 9, maxHp: 30, speed: -8, moveRange: -1, weight: 8 }, iconIndex: 9 },
    { id: "aurora_plate", slot: "upperBody", name: "曙光輕鎧", description: "像朝霞般輕盈，卻可化開猛烈衝擊。", cost: 1080, requiredLevel: 16, stats: { defense: 14, maxHp: 44, speed: 4, weight: 6 }, iconIndex: 10 },
    { id: "disciple_gi", slot: "upperBody", name: "門人衣服", description: "以拳路為先的輕身上衣，犧牲部分防護換取攻勢。", cost: 781, requiredLevel: 5, stats: { attack: 2, defense: 1, maxHp: 2, weight: 1 }, classId: "fighter", iconIndex: 6 },
    { id: "disciple_lower", slot: "lowerBody", name: "門人下衣", description: "方便沉腰發力的門人下衣，配合拳路訓練。", cost: 500, requiredLevel: 5, stats: { attack: 1, weight: 1 }, classId: "fighter", iconIndex: 6 },
    { id: "disciple_handguards", slot: "hands", name: "門人手甲", description: "輕量護手，令格鬥士出拳更穩。", cost: 469, requiredLevel: 5, stats: { attack: 1, weight: 1 }, classId: "fighter", iconIndex: 7 },
    { id: "disciple_shoes", slot: "feet", name: "門人鞋子", description: "貼地的練功鞋，保持穩定步法。", cost: 469, requiredLevel: 5, stats: { attack: 1, weight: 1 }, classId: "fighter", iconIndex: 6 },
    { id: "training_wrap", slot: "upperBody", name: "練武用纏身布", description: "纏身布減少多餘護甲，將力量集中於攻擊。", cost: 6125, requiredLevel: 14, stats: { attack: 5, defense: 2, maxHp: 5, weight: 2 }, classId: "fighter", iconIndex: 6 },
    { id: "training_belt", slot: "lowerBody", name: "練武腰帶", description: "緊束腰胯的練武腰帶，令出力更直接。", cost: 3920, requiredLevel: 14, stats: { attack: 3, defense: 1, weight: 1 }, classId: "fighter", iconIndex: 6 },
    { id: "training_bracers", slot: "hands", name: "練武用護腕", description: "保護腕骨同時維持拳路靈活的護腕。", cost: 3675, requiredLevel: 14, stats: { attack: 2, defense: 1, weight: 1 }, classId: "fighter", iconIndex: 7 },
    { id: "training_zori", slot: "feet", name: "練武用草履", description: "薄底草履帶來穩定的練武步伐。", cost: 3675, requiredLevel: 14, stats: { attack: 2, defense: 1, weight: 1 }, classId: "fighter", iconIndex: 6 },
    { id: "conditioning_suit", slot: "upperBody", name: "鍛鍊服", description: "為高強度拳鬥打造的輕身鍛鍊服，攻守取捨清晰。", cost: 16531, requiredLevel: 23, stats: { attack: 9, defense: 3, maxHp: 8, weight: 3 }, classId: "fighter", iconIndex: 6 },
    { id: "conditioning_skirt", slot: "lowerBody", name: "鍛鍊褲裙", description: "活動幅度寬廣的鍛鍊褲裙，支援低身拳路。", cost: 10580, requiredLevel: 23, stats: { attack: 5, defense: 2, weight: 2 }, classId: "fighter", iconIndex: 6 },
    { id: "conditioning_handguards", slot: "hands", name: "鍛鍊手甲", description: "強化指節與腕部的鍛鍊手甲。", cost: 9919, requiredLevel: 23, stats: { attack: 4, defense: 2, weight: 2 }, classId: "fighter", iconIndex: 7 },
    { id: "conditioning_shoes", slot: "feet", name: "鍛鍊鞋", description: "為持久步法與連擊而設的鍛鍊鞋。", cost: 9919, requiredLevel: 23, stats: { attack: 4, defense: 2, weight: 2 }, classId: "fighter", iconIndex: 6 },
    { id: "white_martial_gi", slot: "upperBody", occupiesSlots: ["upperBody", "lowerBody"], name: "白色武道服", description: "覆蓋上下身的一件式武道服，重點在靈活步法。", cost: 4375, requiredLevel: 10, stats: { attack: 2, defense: 2, moveRange: 1, weight: 2 }, classId: "fighter", iconIndex: 8 },
    { id: "cloth_bracers", slot: "hands", name: "布製護腕", description: "輕便布護腕，不拖慢拳路。", cost: 1875, requiredLevel: 10, stats: { attack: 1, weight: 1 }, classId: "fighter", iconIndex: 7 },
    { id: "barefoot_bands", slot: "feet", name: "足裸帶", description: "簡單足裸帶，配合武道服保持步法。", cost: 1875, requiredLevel: 10, stats: { attack: 1, weight: 1 }, classId: "fighter", iconIndex: 6 },
    { id: "colored_martial_gi", slot: "upperBody", occupiesSlots: ["upperBody", "lowerBody"], name: "彩色上衣", description: "覆蓋上下身的進階武道服，兼顧拳勢與快速轉位。", cost: 17500, requiredLevel: 20, stats: { attack: 5, defense: 4, moveRange: 1, weight: 3 }, classId: "fighter", iconIndex: 8 },
    { id: "joint_bracers", slot: "hands", name: "手關節護腕", description: "加強關節承托的進階護腕。", cost: 7500, requiredLevel: 20, stats: { attack: 3, defense: 1, weight: 2 }, classId: "fighter", iconIndex: 7 },
    { id: "barefoot_guard", slot: "feet", name: "足裸護帶", description: "保護足踝而不妨礙快速踏步。", cost: 7500, requiredLevel: 20, stats: { attack: 3, defense: 1, weight: 2 }, classId: "fighter", iconIndex: 6 },
    { id: "copper_lantern_bell", slot: "charm", name: "銅燈鈴", description: "細小鈴聲令人安心，稍微提升生存能力。", cost: 80, requiredLevel: 1, stats: { maxHp: 8, weight: 0 }, iconIndex: 11 },
    { id: "hunter_fang", slot: "charm", name: "獵手尖牙", description: "完成討伐後留下的護符，令攻勢更凌厲。", cost: 210, requiredLevel: 5, stats: { attack: 4, critChance: 0.04, weight: 1 }, iconIndex: 12 },
    { id: "wayfarer_compass", slot: "charm", name: "遠行羅盤", description: "指針總會朝向出口，讓持有者步履更快。", cost: 420, requiredLevel: 9, stats: { speed: 9, moveRange: 1, weight: 1 }, iconIndex: 13 },
    { id: "deep_lantern_core", slot: "charm", name: "深層燈核", description: "在地城深處仍然發亮的古老核心。", cost: 900, requiredLevel: 15, stats: { attack: 7, defense: 5, maxHp: 20, weight: 2 }, iconIndex: 14 },
  ];

  const RAW_CONTRACT_TEMPLATES = [
    {
      id: "slime_sweep",
      title: "暗泥清道夫",
      description: "港外啲暗泥怪又塞住條舊路，幫商隊清走佢哋。",
      minLevel: 1,
      objective: { event: "defeat", target: "raccoon", count: 5 },
      reward: { coins: 65, xp: 45, items: [{ id: "healing_potion", name: "療傷藥", quantity: 1 }] },
    },
    {
      id: "wisp_watch",
      title: "霧靈驅散令",
      description: "霧靈喺舊路徘徊，唔好畀佢哋引旅人入濃霧。",
      minLevel: 2,
      objective: { event: "defeat", target: "chick", count: 4 },
      reward: { coins: 85, xp: 60, items: [{ id: "lamp_dust", name: "燈晶粉", quantity: 2 }] },
    },
    {
      id: "hound_patrol",
      title: "裂牙巡獵",
      description: "霧犬最近特別躁，公會要一位可靠嘅巡林員。",
      minLevel: 3,
      objective: { event: "defeat", target: "fox", count: 5 },
      reward: { coins: 110, xp: 80, items: [{ id: "hound_fang", name: "獵犬牙", quantity: 2 }] },
    },
    {
      id: "mushroom_harvest",
      title: "坑道苔災",
      description: "藥師要苔糰子嘅啫喱；小心唔好畀佢哋包圍。",
      minLevel: 5,
      objective: { event: "defeat", target: "raccoon", count: 6 },
      reward: { coins: 145, xp: 105, items: [{ id: "bright_spore", name: "亮光孢子", quantity: 3 }] },
    },
    {
      id: "moth_lanterns",
      title: "霧翼滅燈令",
      description: "霧翼蝠不停撞熄古燈，守住坑道嘅回音燈火。",
      minLevel: 7,
      objective: { event: "defeat", target: "frog", count: 6 },
      reward: { coins: 185, xp: 135, items: [{ id: "moth_scale", name: "晶翅鱗粉", quantity: 2 }] },
    },
    {
      id: "golem_fragments",
      title: "燈偶拆解",
      description: "失控燈偶喺封存庫醒咗，拆低佢哋帶核心返嚟。",
      minLevel: 10,
      objective: { event: "defeat", target: "turtle", count: 4 },
      reward: { coins: 260, xp: 185, items: [{ id: "golem_core", name: "石像核心", quantity: 1 }] },
    },
    {
      id: "shadow_stalkers",
      title: "深窟懸賞",
      description: "只畀資深冒險者接嘅深層討伐；記住點亮回音燈。",
      minLevel: 14,
      objective: { event: "defeat", target: "snake", count: 5 },
      reward: { coins: 390, xp: 260, items: [{ id: "deep_crystal", name: "深層晶石", quantity: 2 }] },
    },
  ];

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
        purchasable: raw.purchasable !== false,
        classId: ["warrior", "fighter"].includes(String(raw.classId || "")) ? String(raw.classId) : null,
        iconIndex: Math.max(0, Math.min(15, wholeNumber(raw.iconIndex, 0))),
        stats: cloneStats(raw.stats),
      }));
    }
    return Object.freeze(result);
  }

  const DEFAULT_EQUIPMENT_CATALOG = normalizeEquipmentCatalog(RAW_EQUIPMENT_CATALOG);

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

  function normalizeReward(raw) {
    const reward = raw && typeof raw === "object" ? raw : {};
    const items = Array.isArray(reward.items)
      ? reward.items
        .filter((item) => item && typeof item === "object" && String(item.id || "").trim())
        .map((item) => Object.freeze({
          id: String(item.id).trim(),
          name: String(item.name || item.id),
          quantity: wholeNumber(item.quantity, 1, 1),
        }))
      : [];
    return Object.freeze({ coins: wholeNumber(reward.coins), xp: wholeNumber(reward.xp), items: Object.freeze(items) });
  }

  function normalizeContractTemplates(templates) {
    const source = Array.isArray(templates) ? templates : [];
    const seen = new Set();
    const result = [];
    for (const raw of source) {
      if (!raw || typeof raw !== "object") continue;
      const id = String(raw.id || "").trim();
      const objective = raw.objective && typeof raw.objective === "object" ? raw.objective : {};
      const event = String(objective.event || "").trim();
      const target = String(objective.target || "").trim();
      if (!id || seen.has(id) || !event || !target) continue;
      seen.add(id);
      result.push(Object.freeze({
        id,
        title: String(raw.title || id),
        description: String(raw.description || ""),
        minLevel: Math.max(1, Math.min(LEVEL_CAP, wholeNumber(raw.minLevel, 1, 1))),
        maxLevel: Math.max(1, Math.min(LEVEL_CAP, wholeNumber(raw.maxLevel, LEVEL_CAP, 1))),
        objective: Object.freeze({ event, target, count: wholeNumber(objective.count, 1, 1) }),
        reward: normalizeReward(raw.reward),
      }));
    }
    return Object.freeze(result);
  }

  const DEFAULT_CONTRACT_TEMPLATES = normalizeContractTemplates(RAW_CONTRACT_TEMPLATES);

  function hashString(value) {
    const text = String(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createContractOffers(options = {}) {
    const templates = options.templates === DEFAULT_CONTRACT_TEMPLATES
      ? options.templates
      : normalizeContractTemplates(options.templates || DEFAULT_CONTRACT_TEMPLATES);
    const level = Math.max(1, Math.min(LEVEL_CAP, wholeNumber(options.playerLevel, 1, 1)));
    const count = wholeNumber(options.count, 3);
    const rotationKey = String(options.rotation == null ? 0 : options.rotation);
    const seed = String(options.seed == null ? "mist-harbour" : options.seed);
    const eligible = templates
      .filter((template) => level >= template.minLevel && level <= template.maxLevel)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!eligible.length || !count) return [];
    const numericRotation = Number(options.rotation);
    const turn = Number.isFinite(numericRotation) ? Math.floor(numericRotation) : hashString(rotationKey);
    const offset = (hashString(seed) + turn % eligible.length + eligible.length) % eligible.length;
    const offers = [];
    for (let index = 0; index < Math.min(count, eligible.length); index += 1) {
      const template = eligible[(offset + index) % eligible.length];
      offers.push({
        id: `${rotationKey}:${template.id}`,
        templateId: template.id,
        rotation: rotationKey,
        title: template.title,
        description: template.description,
        minLevel: template.minLevel,
        objective: { ...template.objective },
        reward: { ...template.reward, items: template.reward.items.map((item) => ({ ...item })) },
      });
    }
    return offers;
  }

  function cloneContract(contract) {
    return {
      ...contract,
      objective: { ...(contract.objective || {}) },
      reward: {
        ...(contract.reward || {}),
        items: Array.isArray(contract.reward && contract.reward.items)
          ? contract.reward.items.map((item) => ({ ...item }))
          : [],
      },
    };
  }

  function acceptContract(contracts, offer, options = {}) {
    const current = Array.isArray(contracts) ? contracts.map(cloneContract) : [];
    if (!offer || typeof offer !== "object" || !offer.id || !offer.objective) {
      return { ok: false, reason: "invalid-offer", contracts: current, contract: null };
    }
    if (current.some((contract) => contract.id === offer.id)) {
      return { ok: false, reason: "already-accepted", contracts: current, contract: null };
    }
    const maxActive = wholeNumber(options.maxActive, 3, 1);
    if (current.filter((contract) => contract.status === "active" || contract.status === "ready").length >= maxActive) {
      return { ok: false, reason: "full", contracts: current, contract: null };
    }
    const targetCount = wholeNumber(offer.objective.count, 1, 1);
    const contract = {
      ...cloneContract(offer),
      progress: 0,
      status: "active",
      objective: { ...offer.objective, count: targetCount },
    };
    return { ok: true, reason: null, contracts: [...current, contract], contract: cloneContract(contract) };
  }

  function progressContracts(contracts, event) {
    const current = Array.isArray(contracts) ? contracts : [];
    const input = event && typeof event === "object" ? event : {};
    const eventType = String(input.event || "");
    const target = String(input.target || "");
    const amount = wholeNumber(input.amount, 1, 1);
    const updatedIds = [];
    const next = current.map((source) => {
      const contract = cloneContract(source);
      if (
        contract.status !== "active" ||
        String(contract.objective.event) !== eventType ||
        String(contract.objective.target) !== target
      ) return contract;
      const count = wholeNumber(contract.objective.count, 1, 1);
      const progress = Math.min(count, wholeNumber(contract.progress) + amount);
      updatedIds.push(contract.id);
      return { ...contract, progress, status: progress >= count ? "ready" : "active" };
    });
    return { contracts: next, updatedIds };
  }

  function claimContract(contracts, contractId) {
    const current = Array.isArray(contracts) ? contracts : [];
    const id = String(contractId || "");
    const source = current.find((contract) => contract && contract.id === id);
    if (!source) return { ok: false, reason: "not-found", contracts: current.map(cloneContract), reward: null };
    if (source.status !== "ready") {
      return { ok: false, reason: source.status === "claimed" ? "already-claimed" : "not-ready", contracts: current.map(cloneContract), reward: null };
    }
    const next = current.map((contract) => contract.id === id ? { ...cloneContract(contract), status: "claimed" } : cloneContract(contract));
    return { ok: true, reason: null, contracts: next, reward: { ...source.reward, items: source.reward.items.map((item) => ({ ...item })) } };
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
    DEFAULT_CONTRACT_TEMPLATES,
    normalizeEquipmentCatalog,
    getEquipment,
    normalizeEquipmentState,
    equipmentStats,
    canAffordEquipment,
    purchaseEquipment,
    equipItem,
    unequipItem,
    isEquipmentEquipped,
    normalizeContractTemplates,
    createContractOffers,
    acceptContract,
    progressContracts,
    claimContract,
    xpRequired,
    grantExperience,
  };
});
