(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmFacilityActionRouter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const INVENTORY_CATEGORIES = Object.freeze(["all", "equipment", "consumable", "skillbook", "material"]);
  const SHOP_CATEGORIES = Object.freeze(["weapon", "head", "upper", "lower", "martial"]);

  function commandFromButton(button) {
    if (!button?.dataset) return null;
    const type = button.dataset.facilityAction || "";
    const command = { type };
    switch (type) {
      case "select-item":
      case "buy":
      case "equip":
      case "unequip":
      case "sell-equipment":
      case "sell-store-item":
      case "destroy-item":
      case "confirm-destroy-item":
      case "buy-store-item":
        command.itemId = button.dataset.itemId || null;
        break;
      case "inventory-filter":
        command.category = INVENTORY_CATEGORIES.includes(button.dataset.inventoryCategory)
          ? button.dataset.inventoryCategory
          : "all";
        break;
      case "shop-category":
        command.category = SHOP_CATEGORIES.includes(button.dataset.shopCategory)
          ? button.dataset.shopCategory
          : "weapon";
        break;
      case "shop-trade-mode":
        command.mode = button.dataset.shopTradeMode === "sell" ? "sell" : "buy";
        break;
      case "commission-detail":
      case "accept":
        command.offerId = button.dataset.offerId;
        break;
      case "claim":
      case "abandon":
        command.contractId = button.dataset.contractId;
        break;
      case "open-book":
        command.star = Number(button.dataset.bookStar);
        break;
      case "open-envelope":
        command.star = Number(button.dataset.envelopeStar);
        break;
      case "use-manual":
      case "skill-detail":
      case "equip-skill":
      case "unequip-skill":
      case "master-skill":
        command.skillId = button.dataset.skillId;
        break;
      default:
        break;
    }
    command.button = button;
    return command;
  }

  function resolveContentClick({
    event,
    facilityTab,
    hasSelectedInventoryItem,
    suppressSkillTreeClickUntil = 0,
    now = 0,
  }) {
    const target = event?.target;
    if (now < suppressSkillTreeClickUntil && target?.closest?.(".skill-tree-scroll")) {
      return {
        kind: "suppressed",
        preventDefault: true,
        dismissInventoryDetail: false,
        renderAfterDismiss: false,
        button: null,
        command: null,
      };
    }

    const clickedDetailPopup = target?.closest?.(".inventory-detail-popup") || null;
    const clickedDetailBackdrop = target?.closest?.("[data-inventory-detail-dismiss]") || null;
    const clickedInventoryItem = target?.closest?.('[data-facility-action="select-item"]') || null;
    const button = target?.closest?.("[data-facility-action]") || null;
    const bagDetailOpen = facilityTab === "bag" && Boolean(hasSelectedInventoryItem);

    if (bagDetailOpen && clickedDetailBackdrop && !clickedDetailPopup) {
      return {
        kind: "dismiss-inventory-detail",
        preventDefault: false,
        dismissInventoryDetail: true,
        renderAfterDismiss: true,
        button,
        command: null,
      };
    }

    const dismissInventoryDetail = bagDetailOpen && !clickedDetailPopup && !clickedInventoryItem;
    if (dismissInventoryDetail && !button) {
      return {
        kind: "dismiss-inventory-detail",
        preventDefault: false,
        dismissInventoryDetail: true,
        renderAfterDismiss: true,
        button: null,
        command: null,
      };
    }

    if (!button || button.disabled) {
      return {
        kind: "ignored",
        preventDefault: false,
        dismissInventoryDetail,
        renderAfterDismiss: false,
        button,
        command: null,
      };
    }

    return {
      kind: "action",
      preventDefault: false,
      dismissInventoryDetail,
      renderAfterDismiss: false,
      button,
      command: commandFromButton(button),
    };
  }

  function dispatch(command, handlers) {
    const handler = command && handlers?.[command.type];
    if (typeof handler !== "function") return false;
    handler(command);
    return true;
  }

  return Object.freeze({
    INVENTORY_CATEGORIES,
    SHOP_CATEGORIES,
    commandFromButton,
    resolveContentClick,
    dispatch,
  });
});
