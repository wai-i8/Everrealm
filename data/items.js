(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmItemData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ACTIVE_ITEMS = Object.freeze([
    { id: "healing_potion", name: "小型回復藥", description: "回復 150 HP。", iconIndex: 0, kind: "consumable" },
    { id: "weak_potion", name: "弱氣之藥", description: "一瓶來歷可疑的藥氣之藥。據說喝下後會令人變得孱弱，但身上散出的怪味，卻會令附近魔物蠢蠢欲動。", iconIndex: 0, iconSrc: "assets/items/weak-potion-v1.png", kind: "consumable" },
    { id: "bright_feather", name: "亮羽", description: "冒險途中取得的素材，可以留作交換或製作裝備。", iconIndex: 4, kind: "material" },
    { id: "boar_tusk", name: "野豬獠牙", description: "冒險途中取得的素材，可以留作交換或製作裝備。", iconIndex: 4, kind: "material" },
    { id: "bear_claw", name: "岩穴熊爪", description: "冒險途中取得的素材，可以留作交換或製作裝備。", iconIndex: 4, kind: "material" },
    { id: "moss_shell", name: "苔甲碎片", description: "冒險途中取得的素材，可以留作交換或製作裝備。", iconIndex: 4, kind: "material" },
    { id: "coyote_fang", name: "郊狼尖牙", description: "冒險途中取得的素材，可以留作交換或製作裝備。", iconIndex: 4, kind: "material" },
  ].map(Object.freeze));

  function skillBookRankLabel(rank) {
    const safeRank = Math.max(1, Math.min(14, Math.trunc(Number(rank) || 1)));
    return "★".repeat(Math.floor(safeRank / 5)) + "☆".repeat(safeRank % 5);
  }

  const UI_ITEMS = Object.freeze([
    ...Array.from({ length: 14 }, (_, index) => {
      const rank = index + 1;
      return { id: `skill_book_${rank}`, name: `${skillBookRankLabel(rank)} 技能書`, iconIndex: Math.min(rank, 3), kind: "ui" };
    }),
    { id: "coins", name: "金幣", iconIndex: 15, kind: "currency" },
  ].map(Object.freeze));

  const ITEM_ID_ALIASES = Object.freeze({
    "bright-feather": "bright_feather",
    "boar-tusk": "boar_tusk",
    "bear-claw": "bear_claw",
    "moss-shell": "moss_shell",
    "coyote-fang": "coyote_fang",
  });

  const ITEM_CATALOG = Object.freeze([...ACTIVE_ITEMS, ...UI_ITEMS]);
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

  return { ACTIVE_ITEMS, UI_ITEMS, ITEM_CATALOG, ITEM_BY_ID, ITEM_ID_ALIASES, normalizeItemId, getItem, normalizeInventory };
});
