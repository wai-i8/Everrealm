(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmFacilityBagView = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function renderBagFacility({
    content,
    setFacilityFooter,
    filteredItems,
    visibleItems,
    selectedItem,
    pendingDestroyItemId,
    inventoryCategory,
    inventoryPage,
    pageCount,
    coins,
    equipmentIconHtml,
    paperdollSlotHtml,
    envelopeIconHtml,
    itemIconHtml,
    atlasIconHtml,
    coinAmountHtml,
  }) {
    const categoryLabels = { all: "全部", equipment: "裝備", consumable: "消耗品", skillbook: "技能書", material: "素材" };
    const iconMarkup = (item, extraClass = "") => item.equipment
      ? equipmentIconHtml(item.equipment, extraClass)
      : item.iconType === "envelope"
        ? envelopeIconHtml(item.name)
        : item.iconItemId
          ? itemIconHtml(item.iconItemId, item.name, extraClass, 4)
          : Number.isFinite(Number(item.iconId))
            ? atlasIconHtml("item", Number(item.iconId), item.name, extraClass)
            : itemIconHtml(item.id, item.name, extraClass, 4);
    const actionMarkup = (item) => {
      const buttons = [];
      const confirmingDestroy = item.destroyable && pendingDestroyItemId === item.id;
      if (item.action && !confirmingDestroy) {
        const attrs = [
          `data-facility-action="${item.action}"`,
          item.bookStar ? `data-book-star="${item.bookStar}"` : "",
          item.envelopeStar ? `data-envelope-star="${item.envelopeStar}"` : "",
          item.manualSkillId ? `data-skill-id="${item.manualSkillId}"` : "",
          `data-item-id="${item.id}"`,
        ].filter(Boolean).join(" ");
        const actionClass = item.action === "unequip" ? "secondary-button" : "facility-action-button";
        buttons.push(`<button class="${actionClass}" type="button" ${attrs} ${item.disabled ? "disabled" : ""}>${item.actionLabel}</button>`);
      }
      if (item.destroyable) {
        if (confirmingDestroy) {
          buttons.push(`<button class="facility-action-button inventory-destroy-confirm" type="button" data-facility-action="confirm-destroy-item" data-item-id="${item.id}">確定銷毀</button>`);
          buttons.push(`<button class="secondary-button inventory-destroy-cancel" type="button" data-facility-action="cancel-destroy-item" data-item-id="${item.id}">取消</button>`);
        } else {
          buttons.push(`<button class="secondary-button inventory-destroy-button" type="button" data-facility-action="destroy-item" data-item-id="${item.id}">銷毀</button>`);
        }
      }
      return buttons.join("");
    };
    const quantityMarkup = (item) => item.quantity > 1 ? `<b class="inventory-quantity" aria-label="數量 ${item.quantity}">×${item.quantity}</b>` : "";
    const itemCards = visibleItems.map((item) => `<button class="inventory-grid-item ui-slot ${item.equipment ? "inventory-equipment-item" : ""} ${item.isEquipped ? "is-equipped" : ""} ${selectedItem?.id === item.id ? "is-selected" : ""}" type="button" data-item-id="${item.id}" data-facility-action="select-item" aria-pressed="${selectedItem?.id === item.id ? "true" : "false"}" aria-label="選取${item.name}，數量 ${item.quantity}">
      <div class="inventory-item-art">${iconMarkup(item)}${quantityMarkup(item)}${item.isEquipped ? '<span class="inventory-equipped-mark" aria-label="已裝備" title="已裝備">✓</span>' : ""}</div>
      <div class="inventory-item-copy"><strong title="${item.name}">${item.name}</strong></div>
    </button>`).join("");
    const filters = Object.entries(categoryLabels).map(([key, label]) => `<button class="inventory-filter" type="button" data-facility-action="inventory-filter" data-inventory-category="${key}" aria-selected="${inventoryCategory === key ? "true" : "false"}">${label}</button>`).join("");
    const pager = pageCount > 1 ? `<nav class="inventory-pager" aria-label="物品分頁"><button type="button" data-facility-action="inventory-prev" ${inventoryPage <= 0 ? "disabled" : ""} aria-label="上一頁">‹</button><span>${inventoryPage + 1} / ${pageCount}</span><button type="button" data-facility-action="inventory-next" ${inventoryPage >= pageCount - 1 ? "disabled" : ""} aria-label="下一頁">›</button></nav>` : "";
    const detailCopy = selectedItem
      ? [selectedItem.description ? `<p>${selectedItem.description}</p>` : "", selectedItem.detail ? `<span>${selectedItem.detail}</span>` : ""].filter(Boolean).join("")
      : "";
    const detail = selectedItem
      ? `<div class="inventory-detail-layer" data-inventory-detail-dismiss data-no-window-drag aria-hidden="false"><section class="inventory-detail-popup" role="dialog" aria-modal="true" aria-label="${selectedItem.name}" aria-live="polite"><div class="inventory-detail-art">${iconMarkup(selectedItem)}${quantityMarkup(selectedItem)}</div>${selectedItem.rankLabel ? `<small class="inventory-detail-rank">${selectedItem.rankLabel}</small>` : ""}<strong class="inventory-detail-name">${selectedItem.name}</strong>${detailCopy ? `<div class="inventory-detail-copy">${detailCopy}</div>` : ""}<div class="inventory-detail-actions">${actionMarkup(selectedItem)}</div></section></div>`
      : "";
    content.innerHTML = `
      <section class="unified-inventory-layout" aria-label="角色裝備與隨身物品">
        <aside class="bag-loadout-panel" aria-label="角色目前裝備"><div class="paperdoll-board bag-paperdoll-board bag-equipment-grid">${paperdollSlotHtml("head", "頭部", "head", { iconOnly: true })}${paperdollSlotHtml("weapon", "武器", "weapon", { iconOnly: true })}${paperdollSlotHtml("upperBody", "上身", "upperBody", { iconOnly: true })}${paperdollSlotHtml("hands", "手部", "hands", { iconOnly: true })}${paperdollSlotHtml("lowerBody", "下身", "lowerBody", { iconOnly: true })}${paperdollSlotHtml("feet", "腳部", "feet", { iconOnly: true })}</div></aside>
        <section class="bag-items-panel" aria-label="隨身物品">
          <div class="inventory-toolbar"><div class="inventory-filter-bar" role="tablist" aria-label="物品分類">${filters}</div><div class="inventory-money" aria-label="持有金幣">${coinAmountHtml(coins)}</div></div>
          ${filteredItems.length ? `<div class="inventory-icon-grid" role="list" aria-label="所有隨身物品">${itemCards}</div>${pager}` : `<div class="inventory-empty-grid" aria-label="呢類物品仲係空嘅"></div>`}
        </section>${detail}
      </section>`;
    setFacilityFooter("");
  }

  return Object.freeze({ renderBagFacility });
});
