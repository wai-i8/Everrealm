(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmItemData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ACTIVE_ITEMS = Object.freeze([
    { id: "healing_potion", name: "回復藥水", description: "回復部分生命。", iconIndex: 0, kind: "consumable" },
    { id: "bright_feather", name: "亮羽", description: "冒險途中取得嘅素材，可以留作交換或製作裝備。", iconIndex: 4, kind: "material" },
    { id: "fox_fang", name: "霧狐尖牙", description: "冒險途中取得嘅素材，可以留作交換或製作裝備。", iconIndex: 4, kind: "material" },
    { id: "lantern_pelt", name: "燈紋毛皮", description: "冒險途中取得嘅素材，可以留作交換或製作裝備。", iconIndex: 4, kind: "material" },
    { id: "boar_tusk", name: "野豬獠牙", description: "冒險途中取得嘅素材，可以留作交換或製作裝備。", iconIndex: 4, kind: "material" },
    { id: "bear_claw", name: "岩穴熊爪", description: "冒險途中取得嘅素材，可以留作交換或製作裝備。", iconIndex: 4, kind: "material" },
    { id: "moss_shell", name: "苔甲碎片", description: "冒險途中取得嘅素材，可以留作交換或製作裝備。", iconIndex: 4, kind: "material" },
    { id: "coyote_fang", name: "郊狼尖牙", description: "冒險途中取得嘅素材，可以留作交換或製作裝備。", iconIndex: 4, kind: "material" },
    { id: "mist_gland", name: "霧蛙腺囊", description: "冒險途中取得嘅素材，可以留作交換或製作裝備。", iconIndex: 4, kind: "material" },
    { id: "venom_sac", name: "毒霧囊", description: "冒險途中取得嘅素材，可以留作交換或製作裝備。", iconIndex: 4, kind: "material" },
    { id: "warden_lens", name: "看守者霧鏡", description: "深霧看守者的稀有霧鏡，映著地城最深處。", iconIndex: 14, kind: "material" },
  ].map(Object.freeze));

  const LEGACY_ITEMS = Object.freeze([
    { id: "lamp_dust", name: "燈晶粉", description: "公會用來修補燈具的幼細晶粉。", iconIndex: 4, kind: "material", legacyOnly: true },
    { id: "hound_fang", name: "獵犬牙", description: "霧犬留下的硬牙，可以磨成護符。", iconIndex: 5, kind: "material", legacyOnly: true },
    { id: "bright_spore", name: "亮光孢子", description: "會在黑暗中發光的孢子。", iconIndex: 6, kind: "material", legacyOnly: true },
    { id: "moth_scale", name: "晶翅鱗粉", description: "薄而閃亮的晶翅鱗粉。", iconIndex: 7, kind: "material", legacyOnly: true },
    { id: "golem_core", name: "石像核心", description: "失控燈偶留下的動力核心。", iconIndex: 8, kind: "material", legacyOnly: true },
    { id: "deep_crystal", name: "深層晶石", description: "只會在深層濃霧凝結的紫晶。", iconIndex: 9, kind: "material", legacyOnly: true },
    { id: "moss_jelly", name: "青苔啫喱", description: "苔糰子留下的青苔啫喱。", iconIndex: 10, kind: "material", legacyOnly: true },
    { id: "mist_wing", name: "霧翼膜", description: "幾乎沒有重量的翼膜。", iconIndex: 11, kind: "material", legacyOnly: true },
    { id: "crag_tusk", name: "岩豚短牙", description: "岩甲小豚留下的硬牙。", iconIndex: 12, kind: "material", legacyOnly: true },
    { id: "hollow_rune", name: "空殼符片", description: "空殼術士身上剝落的古老符片。", iconIndex: 13, kind: "material", legacyOnly: true },
  ].map(Object.freeze));

  const UI_ITEMS = Object.freeze([
    { id: "skill_book_1", name: "一星技能書", iconIndex: 1, kind: "ui" },
    { id: "skill_book_2", name: "二星技能書", iconIndex: 2, kind: "ui" },
    { id: "skill_book_3", name: "三星技能書", iconIndex: 3, kind: "ui" },
    { id: "coins", name: "燈幣", iconIndex: 15, kind: "currency" },
  ].map(Object.freeze));

  const ITEM_ID_ALIASES = Object.freeze({
    "bright-feather": "bright_feather",
    "fox-fang": "fox_fang",
    "lantern-pelt": "lantern_pelt",
    "boar-tusk": "boar_tusk",
    "bear-claw": "bear_claw",
    "moss-shell": "moss_shell",
    "coyote-fang": "coyote_fang",
    "mist-gland": "mist_gland",
    "venom-sac": "venom_sac",
    "warden-lens": "warden_lens",
    "golem-core": "golem_core",
    "moss-jelly": "moss_jelly",
    "mist-wing": "mist_wing",
    "crag-tusk": "crag_tusk",
    "hollow-rune": "hollow_rune",
  });

  const ITEM_CATALOG = Object.freeze([...ACTIVE_ITEMS, ...LEGACY_ITEMS, ...UI_ITEMS]);
  const ITEM_BY_ID = Object.freeze(Object.fromEntries(ITEM_CATALOG.map((item) => [item.id, item])));

  function normalizeItemId(value) {
    const raw = String(value || "").trim();
    const canonical = ITEM_ID_ALIASES[raw] || raw;
    return ITEM_BY_ID[canonical] ? canonical : null;
  }

  function getItem(value) {
    const id = normalizeItemId(value);
    return id ? ITEM_BY_ID[id] : null;
  }

  function normalizeInventory(raw, options = {}) {
    const source = raw && typeof raw === "object" ? raw : {};
    const maxEntries = Math.max(1, Math.floor(Number(options.maxEntries) || 80));
    const maxQuantity = Math.max(1, Math.floor(Number(options.maxQuantity) || 999));
    const result = {};
    for (const [rawId, rawAmount] of Object.entries(source).slice(0, maxEntries)) {
      const id = normalizeItemId(rawId);
      if (!id || ITEM_BY_ID[id]?.kind === "ui" || ITEM_BY_ID[id]?.kind === "currency" || id === "healing_potion") continue;
      const amount = Math.max(0, Math.min(maxQuantity, Math.floor(Number(rawAmount) || 0)));
      if (amount > 0) result[id] = Math.min(maxQuantity, (result[id] || 0) + amount);
    }
    return result;
  }

  return { ACTIVE_ITEMS, LEGACY_ITEMS, UI_ITEMS, ITEM_CATALOG, ITEM_BY_ID, ITEM_ID_ALIASES, normalizeItemId, getItem, normalizeInventory };
});
