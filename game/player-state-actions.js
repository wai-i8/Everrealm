(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmPlayerStateActions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Phase 3 migration seam.
  //
  // These helpers deliberately centralize browser-local mutations for resources
  // that will become server-authoritative (HP consumables, inventory and coins).
  // This module is NOT a security boundary: until the matching Cloud Functions
  // exist, the browser is still applying the returned result locally.
  //
  // Keep DOM, audio, Firebase and presentation concerns out of this file so the
  // command semantics can later be moved behind a server API without rewriting
  // every caller in game.js.

  function whole(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.trunc(number) : fallback;
  }

  function nonNegativeWhole(value) {
    return Math.max(0, whole(value, 0));
  }

  function positiveWhole(value, fallback = 1) {
    return Math.max(1, whole(value, fallback));
  }

  function grantCoins(player, amount, options = {}) {
    const granted = nonNegativeWhole(amount);
    const current = nonNegativeWhole(player?.coins);
    const maxCoins = Number.isFinite(options.maxCoins) ? Math.max(0, whole(options.maxCoins)) : null;
    const next = maxCoins == null ? current + granted : Math.min(maxCoins, current + granted);
    if (player) player.coins = next;
    return { ok: true, granted: next - current, coins: next };
  }

  function spendCoins(player, amount) {
    const cost = nonNegativeWhole(amount);
    const current = nonNegativeWhole(player?.coins);
    if (current < cost) return { ok: false, reason: "coins", cost, coins: current };
    const next = current - cost;
    if (player) player.coins = next;
    return { ok: true, spent: cost, coins: next };
  }

  function grantHealingPotions(player, amount, options = {}) {
    const granted = nonNegativeWhole(amount);
    const current = nonNegativeWhole(player?.potions);
    const maxPotions = Number.isFinite(options.maxPotions) ? Math.max(0, whole(options.maxPotions)) : 9;
    const next = Math.min(maxPotions, current + granted);
    if (player) player.potions = next;
    return { ok: true, granted: next - current, potions: next };
  }

  function consumeHealingPotion(player, options = {}) {
    const currentPotions = nonNegativeWhole(player?.potions);
    if (currentPotions <= 0) return { ok: false, reason: "empty", healed: 0 };

    const maxHp = Math.max(1, Number(options.maxHp) || 1);
    const currentHp = Math.max(0, Number(player?.hp) || 0);
    if (currentHp >= maxHp) return { ok: false, reason: "full", healed: 0 };

    const healAmount = Math.max(0, Number(options.healAmount) || 0);
    const healed = Math.min(maxHp - currentHp, healAmount);
    if (!(healed > 0)) return { ok: false, reason: "no-heal", healed: 0 };

    if (player) {
      player.potions = currentPotions - 1;
      player.hp = currentHp + healed;
    }
    return { ok: true, healed, hp: currentHp + healed, potions: currentPotions - 1 };
  }

  function inventoryCount(inventory, itemId) {
    return nonNegativeWhole(inventory?.[String(itemId || "")]);
  }

  function consumeInventoryItem(inventory, itemId, quantity = 1) {
    const id = String(itemId || "").trim();
    const requested = positiveWhole(quantity);
    const current = inventoryCount(inventory, id);
    if (!id || current < requested) return { ok: false, reason: "missing", itemId: id, quantity: current };
    const next = current - requested;
    if (next > 0) inventory[id] = next;
    else delete inventory[id];
    return { ok: true, itemId: id, consumed: requested, quantity: next };
  }

  function grantInventoryItem(inventory, itemId, quantity = 1, options = {}) {
    const id = String(itemId || "").trim();
    if (!id) return { ok: false, reason: "invalid-item", itemId: id, quantity: 0 };
    const granted = nonNegativeWhole(quantity);
    const current = inventoryCount(inventory, id);
    const maxQuantity = Number.isFinite(options.maxQuantity) ? Math.max(0, whole(options.maxQuantity)) : 999;
    const next = Math.min(maxQuantity, current + granted);
    inventory[id] = next;
    return { ok: true, itemId: id, granted: next - current, quantity: next };
  }

  function buyGeneralStoreItem({ player, inventory, itemId, price }) {
    const id = String(itemId || "").trim();
    const payment = spendCoins(player, price);
    if (!payment.ok) return payment;

    if (id === "healing_potion") {
      const item = grantHealingPotions(player, 1, { maxPotions: 9 });
      return { ok: true, coins: payment.coins, item };
    }

    const item = grantInventoryItem(inventory, id, 1, { maxQuantity: 999 });
    if (!item.ok) {
      grantCoins(player, payment.spent);
      return item;
    }
    return { ok: true, coins: payment.coins, item };
  }

  function sellGeneralStoreItem({ player, inventory, itemId, sellPrice }) {
    const id = String(itemId || "").trim();
    if (id === "healing_potion") {
      const current = nonNegativeWhole(player?.potions);
      if (current <= 0) return { ok: false, reason: "missing" };
      player.potions = current - 1;
    } else {
      const consumed = consumeInventoryItem(inventory, id, 1);
      if (!consumed.ok) return consumed;
    }
    const reward = grantCoins(player, sellPrice, { maxCoins: 99999 });
    return { ok: true, coins: reward.coins, granted: reward.granted };
  }

  return Object.freeze({
    grantCoins,
    spendCoins,
    grantHealingPotions,
    consumeHealingPotion,
    inventoryCount,
    consumeInventoryItem,
    grantInventoryItem,
    buyGeneralStoreItem,
    sellGeneralStoreItem,
  });
});
