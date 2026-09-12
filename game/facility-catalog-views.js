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
    { key: "martial", label: "武道服", matches: (item) => item.slot === "upperBody" && item.occupiesSlots.includes("lowerBody") },
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
      <div class="gear-collection-grid">${collection || '<div class="facility-empty-state"><strong>未有裝備</strong></div>'}</div>
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
    ownedEquipment,
    equipped,
    catalog,
    fighterShopItemIdSet,
    equipmentMatchesClass,
    equipmentSellPrice,
    isEquipmentEquipped,
    statText,
    equipmentIconHtml,
    coinAmountHtml,
  }) {
    if (mode === "sell") {
      const sellable = catalog
        .filter((item) => ownedEquipment.includes(item.id) && equipmentSellPrice(item) > 0)
        .sort((left, right) => left.requiredLevel - right.requiredLevel || left.name.localeCompare(right.name, "zh-HK"));
      const cards = sellable.map((item) => {
        const isEquipped = isEquipmentEquipped({ equipped }, item.id);
        const sellPrice = equipmentSellPrice(item);
        return `<article class="equipment-card equipment-shop-card ${isEquipped ? "is-equipped" : ""}">
          <div class="equipment-shop-art">${equipmentIconHtml(item, "equipment-card-atlas-icon")}</div>
          <div class="equipment-copy">
            <div class="facility-card-heading"><span class="facility-chip">LV.${item.requiredLevel}</span><strong>${item.name}</strong></div>
            <p>${item.description}</p>
            <small>${statText(item.stats)}</small>
          </div>
          <div class="equipment-shop-purchase"><span class="equipment-price">出售價 ${coinAmountHtml(sellPrice, "store-price")}</span><button class="facility-action-button" type="button" data-facility-action="sell-equipment" data-item-id="${item.id}" ${!atShop || isEquipped ? "disabled" : ""}>${isEquipped ? "請先卸下" : "出售"}</button></div>
        </article>`;
      }).join("");
      content.innerHTML = `${tradeTabs}<section class="equipment-shop-browser" aria-label="出售裝備"><div class="facility-section-heading equipment-shop-heading"><div><small>SELL EQUIPMENT</small><h3>出售裝備</h3></div>${coinAmountHtml(coins, "store-balance")}</div><div class="equipment-grid">${cards || '<div class="facility-empty-state"><strong>暫時冇可出售裝備</strong></div>'}</div></section>`;
      setFacilityFooter("");
      return;
    }

    const activeCategory = SHOP_CATEGORIES.find((entry) => entry.key === category) || SHOP_CATEGORIES[0];
    const shopItems = catalog
      .filter((item) => fighterShopItemIdSet.has(item.id) && equipmentMatchesClass(item) && activeCategory.matches(item))
      .sort((left, right) => left.requiredLevel - right.requiredLevel || left.name.localeCompare(right.name, "zh-HK"));
    const tabs = SHOP_CATEGORIES.map((entry) => `<button class="equipment-shop-tab" type="button" role="tab" data-facility-action="shop-category" data-shop-category="${entry.key}" aria-selected="${entry.key === category ? "true" : "false"}">${entry.label}</button>`).join("");
    const cards = shopItems.map((item) => {
      const owned = ownedEquipment.includes(item.id);
      const isEquipped = isEquipmentEquipped({ equipped }, item.id);
      const levelLocked = level < item.requiredLevel;
      const shopCost = Math.max(0, Math.floor(item.cost * (1 - discountRate)));
      const action = owned ? (isEquipped ? "unequip" : "equip") : "buy";
      const disabled = owned ? (!isEquipped && levelLocked) : (!item.purchasable || !atShop);
      const buttonLabel = isEquipped ? "卸下" : owned ? (levelLocked ? "無法裝備" : "裝備") : !item.purchasable ? "非賣品" : "購買";
      const price = owned
        ? '<span class="equipment-price is-owned">已擁有</span>'
        : !item.purchasable
          ? '<span class="equipment-price">非賣品</span>'
          : `<span class="equipment-price">${coinAmountHtml(shopCost, "store-price")}${discountRate ? `<small>原價 ${item.cost}</small>` : ""}</span>`;
      const onePiece = item.occupiesSlots.includes("upperBody") && item.occupiesSlots.includes("lowerBody");
      return `<article class="equipment-card equipment-shop-card ${isEquipped ? "is-equipped" : ""}">
        <div class="equipment-shop-art">${equipmentIconHtml(item, "equipment-card-atlas-icon")}</div>
        <div class="equipment-copy">
          <div class="facility-card-heading"><span class="facility-chip">LV.${item.requiredLevel}</span><strong>${item.name}</strong>${onePiece ? '<em class="equipment-one-piece">一件式</em>' : ""}</div>
          <p>${item.description}</p>
          <small>${statText(item.stats)}</small>
        </div>
        <div class="equipment-shop-purchase">${price}<button class="facility-action-button" type="button" data-facility-action="${action}" data-item-id="${item.id}" ${disabled ? "disabled" : ""}>${buttonLabel}</button></div>
      </article>`;
    }).join("");
    content.innerHTML = `
      ${tradeTabs}
      ${!atShop ? '<div class="facility-note is-warning"><b>只供試睇</b><span>購買要親身去「裝備店」；已擁有裝備可以隨時換。</span></div>' : ""}
      <nav class="equipment-shop-tabs" role="tablist" aria-label="裝備分類">${tabs}</nav>
      <section class="equipment-shop-browser" aria-label="${activeCategory.label}">
        <div class="facility-section-heading equipment-shop-heading"><div><small>FIGHTER EQUIPMENT</small><h3>${activeCategory.label}</h3></div><span>格鬥士專用裝備</span></div>
        <div class="equipment-grid">${cards || '<div class="facility-empty-state"><strong>呢個分類暫時冇商品</strong></div>'}</div>
      </section>`;
    setFacilityFooter(`<span aria-hidden="true">⚒</span> ${coins} 金幣 · ${discountRate ? `${guildRankName}折扣 ${Math.round(discountRate * 100)}% · ` : ""}裝備店`);
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
    itemData,
    generalStoreSellPrice,
    materialDescription,
    itemIconHtml,
    coinAmountHtml,
  }) {
    if (mode === "sell") {
      const sellItems = [];
      if (potions > 0) sellItems.push({ id: "healing_potion", name: "小型回復藥", quantity: potions, description: goodsById.get("healing_potion")?.description || "回復 30 HP。" });
      for (const [id, quantity] of Object.entries(inventory).filter(([, amount]) => Number(amount) > 0)) {
        const item = itemData?.getItem?.(id);
        if (!item || ["ui", "currency", "quest"].includes(item.kind) || item.sellable === false) continue;
        sellItems.push({ id, name: item.name, quantity: Number(quantity), description: item.description || materialDescription(id) });
      }
      const cards = sellItems.map((item) => {
        const sellPrice = generalStoreSellPrice(item.id);
        return `<article class="equipment-card general-store-card"><div class="equipment-shop-art">${itemIconHtml(item.id, item.name, "equipment-card-atlas-icon", 0)}</div><div class="equipment-copy"><div class="facility-card-heading"><strong>${item.name}</strong><span class="facility-chip">×${item.quantity}</span></div><p>${item.description}</p></div><div class="equipment-shop-purchase"><span class="equipment-price">出售價 ${coinAmountHtml(sellPrice, "store-price")}</span><button class="facility-action-button" type="button" data-facility-action="sell-store-item" data-item-id="${item.id}" ${sellPrice <= 0 ? "disabled" : ""}>出售 1 件</button></div></article>`;
      }).join("");
      content.innerHTML = `${tradeTabs}<section class="equipment-shop-browser general-store-browser" aria-label="道具店出售"><div class="facility-section-heading equipment-shop-heading"><div><small>SELL ITEMS</small><h3>出售物品</h3></div>${coinAmountHtml(coins, "store-balance")}</div><div class="equipment-grid general-store-grid">${cards || '<div class="facility-empty-state"><strong>暫時冇可出售物品</strong></div>'}</div></section>`;
      setFacilityFooter("");
      return;
    }
    const cards = goods.map((item) => `<article class="equipment-card general-store-card"><div class="equipment-shop-art">${itemIconHtml(item.id, item.name, "equipment-card-atlas-icon", 0)}</div><div class="equipment-copy"><div class="facility-card-heading"><strong>${item.name}</strong></div><p>${item.description}</p></div><div class="equipment-shop-purchase"><span class="equipment-price">${coinAmountHtml(item.price, "store-price")}</span><button class="facility-action-button" type="button" data-facility-action="buy-store-item" data-item-id="${item.id}" ${coins < item.price ? "disabled" : ""}>購買</button></div></article>`).join("");
    content.innerHTML = `${tradeTabs}<section class="equipment-shop-browser general-store-browser" aria-label="道具店"><div class="facility-section-heading equipment-shop-heading"><div><small>ITEM SHOP</small><h3>道具店</h3></div>${coinAmountHtml(coins, "store-balance")}</div><div class="equipment-grid general-store-grid">${cards}</div></section>`;
    setFacilityFooter("");
  }

  function renderCodexFacility({
    content,
    setFacilityFooter,
    ids,
    monsterKills,
    legacyMonsterMigration,
    monsterBlueprint,
  }) {
    const cards = ids.map((type) => {
      const count = monsterKills[type] || Object.entries(legacyMonsterMigration).filter(([, migration]) => migration.id === type).reduce((sum, [legacy]) => sum + (monsterKills[legacy] || 0), 0);
      const blueprint = monsterBlueprint(type);
      const hidden = count === 0;
      return `<article class="codex-card ${hidden ? "is-unknown" : ""}"><span class="codex-count">${count ? `討伐 ${count}` : "未發現"}</span><div class="codex-sigil" aria-hidden="true">${hidden ? "?" : blueprint.battleRole === "poison" ? "✦" : blueprint.battleRole === "tank" ? "◇" : "●"}</div><div><strong>${hidden ? "？？？" : blueprint.name_zh}</strong><p>${hidden ? "繼續探索霧林同沉燈坑道。" : blueprint.codex.summary}</p><small>${hidden ? "能力未明" : `建議級別 ${blueprint.normalLevelRange[0]}-${blueprint.normalLevelRange[1]} · 暫無掉落物`}</small></div></article>`;
    }).join("");
    const discovered = ids.filter((type) => monsterKills[type] > 0).length;
    content.innerHTML = `<div class="facility-section-heading"><div><small>MONSTER CODEX</small><h3>霧獸觀察簿</h3></div><span>${discovered} / ${ids.length} 種</span></div><div class="codex-grid">${cards}</div>`;
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
