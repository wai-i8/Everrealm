(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmFacilityCatalogViews = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SHOP_CATEGORIES = Object.freeze([
    { key: "weapon", label: "武器", matches: (item) => item.slot === "weapon" },
    { key: "head", label: "頭部", matches: (item) => item.slot === "head" },
    { key: "upper", label: "上身", matches: (item) => item.slot === "upperBody" && !item.occupiesSlots.includes("lowerBody") },
    { key: "lower", label: "下身", matches: (item) => item.slot === "lowerBody" },
    { key: "hands", label: "手部", matches: (item) => item.slot === "hands" },
    { key: "feet", label: "腳部", matches: (item) => item.slot === "feet" },
    { key: "martial", label: "套裝", matches: (item) => item.slot === "upperBody" && item.occupiesSlots.includes("lowerBody") },
  ]);
  const SHOP_CATEGORY_KEYS = Object.freeze(SHOP_CATEGORIES.map((category) => category.key));

  function renderEquipmentFacility({
    content,
    setFacilityFooter,
    stats,
    level,
    displayName,
    ownedEquipment,
    equipped,
    catalog,
    equipmentMatchesClass,
    isEquipmentEquipped,
    statText,
    equipmentIconHtml,
    paperdollSlotHtml,
    drawEquipmentPaperdoll,
  }) {
    const slotOrder = { head: 0, weapon: 1, upperBody: 2, lowerBody: 3, hands: 4, feet: 5, charm: 6 };
    const collection = catalog
      .filter((item) => ownedEquipment.includes(item.id) && equipmentMatchesClass(item))
      .sort((left, right) => slotOrder[left.slot] - slotOrder[right.slot]
        || Number(isEquipmentEquipped({ equipped }, right.id)) - Number(isEquipmentEquipped({ equipped }, left.id))
        || left.requiredLevel - right.requiredLevel)
      .map((item) => {
        const isEquipped = isEquipmentEquipped({ equipped }, item.id);
        const levelLocked = level < item.requiredLevel;
        const slotLabel = { head: "頭部", weapon: "武器", upperBody: "上身", lowerBody: "下身", hands: "手部", feet: "腳部", charm: "飾物" }[item.slot] || item.slot;
        return `<article class="gear-collection-item ${isEquipped ? "is-equipped" : ""} ${levelLocked ? "is-locked" : ""}">
          ${equipmentIconHtml(item, "gear-collection-icon")}
          <div><small>${slotLabel}${item.occupiesSlots.length > 1 ? " · 一件式" : ""} · LV.${item.requiredLevel}</small><strong>${item.name}</strong><p>${item.description}</p><span>${statText(item.stats)}</span></div>
          <button class="facility-action-button${isEquipped ? " is-quiet" : ""}" type="button" data-facility-action="${isEquipped ? "unequip" : "equip"}" data-item-id="${item.id}" ${!isEquipped && levelLocked ? "disabled" : ""}>${isEquipped ? "卸下" : levelLocked ? "無法裝備" : "換上"}</button>
        </article>`;
      }).join("");
    content.innerHTML = `
      <div class="facility-section-heading equipment-overview-heading"><div><small>PAPER DOLL</small><h3>目前裝備</h3></div><span>LV.${level} ${displayName}</span></div>
      <section class="paperdoll-layout" aria-label="角色裝備槽位">
        <div class="paperdoll-board">
          ${paperdollSlotHtml("head", "頭部", "head")}
          ${paperdollSlotHtml("upperBody", "上身", "upperBody")}
          ${paperdollSlotHtml("lowerBody", "下身", "lowerBody")}
          ${paperdollSlotHtml("feet", "腳部", "feet")}
          <div class="paperdoll-avatar"><canvas id="equipmentPaperdoll" width="180" height="280" aria-hidden="true"></canvas><strong>${displayName}</strong><span>LV.${level}</span></div>
          ${paperdollSlotHtml("charm", "飾物", "charm")}
          ${paperdollSlotHtml("hands", "手部", "hands")}
          ${paperdollSlotHtml("weapon", "武器", "weapon")}
        </div>
        <aside class="paperdoll-stats"><small>CURRENT STATS</small><strong>目前能力</strong><dl><div><dt>生命</dt><dd>${stats.maxHp}</dd></div><div><dt>攻擊</dt><dd>${stats.attack}</dd></div><div><dt>防禦</dt><dd>${stats.defence}</dd></div><div><dt>速度</dt><dd>${Math.round(stats.speed)}</dd></div><div><dt>移動</dt><dd>${stats.moveRange}</dd></div></dl></aside>
      </section>
      <div class="facility-section-heading skill-list-heading"><div><small>OWNED GEAR</small><h3>已擁有裝備</h3></div><span>${ownedEquipment.length} 件</span></div>
      <div class="gear-collection-grid">${collection || '<div class="facility-empty-state"><strong>暫無裝備</strong></div>'}</div>
      <div class="facility-note"><b>裝備槽位</b><span>頭部、武器、上身、下身都會按裝備資料獨立佔用；武道服屬一件式裝備，會同時佔用上身及下身。</span></div>`;
    drawEquipmentPaperdoll();
    setFacilityFooter(`<span aria-hidden="true">⚔</span> 換裝會即時更新角色能力並自動保存。`);
  }

  function renderShopFacility({
    content,
    setFacilityFooter,
    mode,
    tradeTabs,
    atShop,
    category,
    discountRate,
    guildRankName,
    coins,
    level,
    selectedShopItemId,
    catalog,
    fighterShopItemIdSet,
    equipmentMatchesClass,
    statText,
    equipmentIconHtml,
    itemIconHtml,
    coinAmountHtml,
    sellItems,
  }) {
    const iconMarkup = (item, extraClass = "") => item.equipment
      ? equipmentIconHtml(item.equipment, extraClass)
      : itemIconHtml(item.id, item.name, extraClass, 0);
    const summaryMarkup = (item) => `<button class="equipment-card shop-item-summary ${selectedShopItemId === item.id ? "is-selected" : ""}" type="button" data-facility-action="select-shop-item" data-item-id="${item.id}" aria-pressed="${selectedShopItemId === item.id ? "true" : "false"}" aria-label="查看${item.name}詳情">
      <div class="equipment-shop-art">${iconMarkup(item, "equipment-card-atlas-icon")}</div><strong title="${item.name}">${item.name}</strong>
    </button>`;
    const detailMarkup = (item) => {
      if (!item) return "";
      const meta = item.equipment
        ? `<small>LV.${item.equipment.requiredLevel} · ${statText(item.equipment.stats)}</small>`
        : item.quantity > 1 ? `<small>持有 ×${item.quantity}</small>` : "";
      const quantity = item.equipment && item.quantity > 1 ? `<span class="facility-chip">×${item.quantity}</span>` : "";
      return `<article class="shop-item-detail ${item.equipment && item.isEquipped ? "is-equipped" : ""}">
        <div class="equipment-shop-art">${iconMarkup(item, "equipment-card-atlas-icon")}</div>
        <div class="equipment-copy"><div class="facility-card-heading"><strong>${item.name}</strong>${quantity}</div><p>${item.description || ""}</p>${meta}</div>
        <div class="equipment-shop-purchase"><span class="equipment-price">${item.priceLabel}</span><button class="facility-action-button" type="button" data-facility-action="${item.action}" data-item-id="${item.id}" ${item.disabled ? "disabled" : ""}>${item.actionLabel}</button></div>
      </article>`;
    };

    if (mode === "sell") {
      const items = (sellItems || []).map((item) => ({
        ...item,
        action: item.equipment ? "sell-equipment" : "sell-store-item",
        actionLabel: item.equipment && item.isEquipped && item.quantity <= 1 ? "請先卸下" : "出售 1 件",
        disabled: !atShop || (item.equipment && item.isEquipped && item.quantity <= 1),
        priceLabel: `出售價 ${coinAmountHtml(item.sellPrice, "store-price")}`,
      }));
      const selectedItem = items.find((item) => item.id === selectedShopItemId) || null;
      const cards = items.map(summaryMarkup).join("");
      content.innerHTML = `<section class="equipment-shop-browser" aria-label="出售物品"><div class="equipment-grid equipment-shop-compact-grid">${cards || '<div class="facility-empty-state"><strong>暫時沒有可出售的物品</strong></div>'}</div>${detailMarkup(selectedItem)}</section>`;
      setFacilityFooter("");
      return;
    }

    const activeCategory = SHOP_CATEGORIES.find((entry) => entry.key === category) || SHOP_CATEGORIES[0];
    const shopItems = catalog
      .filter((item) => fighterShopItemIdSet.has(item.id) && equipmentMatchesClass(item) && activeCategory.matches(item))
      .sort((left, right) => left.requiredLevel - right.requiredLevel || left.name.localeCompare(right.name, "zh-HK"));
    const tabs = SHOP_CATEGORIES.map((entry) => `<button class="equipment-shop-tab" type="button" role="tab" data-facility-action="shop-category" data-shop-category="${entry.key}" aria-selected="${entry.key === category ? "true" : "false"}">${entry.label}</button>`).join("");
    const buyItems = shopItems.map((item) => {
      const shopCost = Math.max(0, Math.floor(item.cost * (1 - discountRate)));
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        equipment: item,
        priceLabel: !item.purchasable
          ? "非賣品"
          : `${coinAmountHtml(shopCost, "store-price")}${discountRate ? `<small>原價 ${item.cost}</small>` : ""}`,
        action: "buy",
        actionLabel: !item.purchasable ? "非賣品" : "購買",
        disabled: !item.purchasable || !atShop,
      };
    });
    const selectedItem = buyItems.find((item) => item.id === selectedShopItemId) || null;
    const cards = buyItems.map(summaryMarkup).join("");
    content.innerHTML = `
      ${!atShop ? '<div class="facility-note is-warning"><b>僅供預覽</b><span>購買要親身去「裝備店」。</span></div>' : ""}
      <nav class="equipment-shop-tabs" role="tablist" aria-label="裝備分類">${tabs}</nav>
      <section class="equipment-shop-browser" aria-label="${activeCategory.label}">
        <div class="equipment-grid equipment-shop-compact-grid">${cards || '<div class="facility-empty-state"><strong>此分類暫時沒有商品</strong></div>'}</div>
        ${detailMarkup(selectedItem)}
      </section>`;
    setFacilityFooter(`<span aria-hidden="true">⚒</span> ${discountRate ? `${guildRankName}折扣 ${Math.round(discountRate * 100)}% · ` : ""}裝備店`);
  }

  function renderGeneralStoreFacility({
    content,
    setFacilityFooter,
    mode,
    tradeTabs,
    coins,
    potions,
    inventory,
    goods,
    goodsById,
    selectedShopItemId,
    sellItems,
    equipmentIconHtml,
    statText,
    itemIconHtml,
    coinAmountHtml,
  }) {
    if (mode === "sell") {
      const items = (sellItems || []).map((item) => ({
        ...item,
        action: item.equipment ? "sell-equipment" : "sell-store-item",
        actionLabel: item.equipment && item.isEquipped && item.quantity <= 1 ? "請先卸下" : "出售 1 件",
        disabled: item.equipment && item.isEquipped && item.quantity <= 1,
        priceLabel: `出售價 ${coinAmountHtml(item.sellPrice, "store-price")}`,
      }));
      const iconMarkup = (item) => item.equipment
        ? equipmentIconHtml(item.equipment, "equipment-card-atlas-icon")
        : itemIconHtml(item.id, item.name, "equipment-card-atlas-icon", 0);
      const cards = items.map((item) => `<button class="equipment-card shop-item-summary ${selectedShopItemId === item.id ? "is-selected" : ""}" type="button" data-facility-action="select-shop-item" data-item-id="${item.id}" aria-pressed="${selectedShopItemId === item.id ? "true" : "false"}" aria-label="查看${item.name}詳情"><div class="equipment-shop-art">${iconMarkup(item)}</div><strong title="${item.name}">${item.name}</strong></button>`).join("");
      const selectedItem = items.find((item) => item.id === selectedShopItemId) || null;
      const detail = selectedItem ? `<article class="shop-item-detail ${selectedItem.equipment && selectedItem.isEquipped ? "is-equipped" : ""}">
        <div class="equipment-shop-art">${iconMarkup(selectedItem)}</div>
        <div class="equipment-copy"><div class="facility-card-heading"><strong>${selectedItem.name}</strong>${selectedItem.quantity > 1 ? `<span class="facility-chip">×${selectedItem.quantity}</span>` : ""}</div><p>${selectedItem.description || ""}</p>${selectedItem.equipment ? `<small>LV.${selectedItem.equipment.requiredLevel} · ${statText(selectedItem.equipment.stats)}</small>` : selectedItem.quantity > 1 ? `<small>持有 ×${selectedItem.quantity}</small>` : ""}</div>
        <div class="equipment-shop-purchase"><span class="equipment-price">${selectedItem.priceLabel}</span><button class="facility-action-button" type="button" data-facility-action="${selectedItem.action}" data-item-id="${selectedItem.id}" ${selectedItem.disabled ? "disabled" : ""}>${selectedItem.actionLabel}</button></div>
      </article>` : "";
      content.innerHTML = `<section class="equipment-shop-browser general-store-browser" aria-label="出售物品"><div class="equipment-grid equipment-shop-compact-grid general-store-grid">${cards || '<div class="facility-empty-state"><strong>暫時沒有可出售的物品</strong></div>'}</div>${detail}</section>`;
      setFacilityFooter("");
      return;
    }
    const cards = goods.map((item) => `<article class="equipment-card general-store-card"><div class="equipment-shop-art">${itemIconHtml(item.id, item.name, "equipment-card-atlas-icon", 0)}</div><div class="equipment-copy"><div class="facility-card-heading"><strong>${item.name}</strong></div><p>${item.description}</p></div><div class="equipment-shop-purchase"><span class="equipment-price">${coinAmountHtml(item.price, "store-price")}</span><button class="facility-action-button" type="button" data-facility-action="buy-store-item" data-item-id="${item.id}" ${coins < item.price ? "disabled" : ""}>購買</button></div></article>`).join("");
    content.innerHTML = `<section class="equipment-shop-browser general-store-browser" aria-label="道具店"><div class="equipment-grid general-store-grid">${cards}</div></section>`;
    setFacilityFooter("");
  }

  function renderCodexFacility({
    content,
    setFacilityFooter,
    ids,
    monsterKills,
    monsterBlueprint,
  }) {
    const cards = ids.map((type) => {
      const count = monsterKills[type] || 0;
      const blueprint = monsterBlueprint(type);
      const hidden = count === 0;
      return `<article class="codex-card ${hidden ? "is-unknown" : ""}"><span class="codex-count">${count ? `討伐 ${count}` : "未發現"}</span><div class="codex-sigil" aria-hidden="true">${hidden ? "?" : blueprint.battleRole === "poison" ? "✦" : blueprint.battleRole === "tank" ? "◇" : "●"}</div><div><strong>${hidden ? "？？？" : blueprint.name_zh}</strong><p>${hidden ? "繼續探索山地各區域。" : blueprint.codex.summary}</p><small>${hidden ? "能力未明" : `建議級別 ${blueprint.normalLevelRange[0]}-${blueprint.normalLevelRange[1]} · 暫無掉落物`}</small></div></article>`;
    }).join("");
    const discovered = ids.filter((type) => monsterKills[type] > 0).length;
    content.innerHTML = `<div class="facility-section-heading"><div><small>MONSTER CODEX</small><h3>怪物觀察簿</h3></div><span>${discovered} / ${ids.length} 種</span></div><div class="codex-grid">${cards}</div>`;
    setFacilityFooter(`<span aria-hidden="true">◎</span> 每次討伐都會永久記錄；目前戰鬥只會獲得 EXP。`);
  }

  return Object.freeze({
    SHOP_CATEGORY_KEYS,
    renderEquipmentFacility,
    renderShopFacility,
    renderGeneralStoreFacility,
    renderCodexFacility,
  });
});
