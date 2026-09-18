"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Trade = require("./trade-system.js");

function makeSave() {
  return {
    player: { coins: 500, potions: 3 },
    expansion: {
      classId: "fighter",
      inventory: { bright_feather: 8, boar_tusk: 2 },
      ownedEquipment: ["novice_gloves", "metal_knuckles", "metal_knuckles"],
      equipped: { weapon: "metal_knuckles" },
      guildCommission: { envelopes: { 1: 2, 2: 0, 3: 0, 4: 1, 5: 0, 7: 0 } },
      skills: {
        classId: "fighter",
        books: { 1: 2 },
        manualCounts: { kentotsu: 2 },
        boundManualCounts: { kentotsu: 5 },
      },
    },
  };
}

test("bound manuals never increase tradable manual availability", () => {
  const save = makeSave();
  assert.equal(Trade.availableCount(save, { kind: "manual", id: "kentotsu", quantity: 1 }), 2);
});

test("equipped equipment copy is reserved but duplicate copy is tradable", () => {
  const save = makeSave();
  assert.equal(Trade.availableCount(save, { kind: "equipment", id: "metal_knuckles", quantity: 1 }), 1);
  assert.equal(Trade.validateOffer(save, { items: [{ kind: "equipment", id: "metal_knuckles", quantity: 2 }] }).ok, false);
});

test("exchange moves coins and mixed items atomically in prepared states", () => {
  const a = makeSave();
  const b = makeSave();
  b.player.coins = 40;
  b.expansion.inventory.bright_feather = 0;
  b.expansion.inventory.coyote_fang = 3;
  const result = Trade.prepareExchange(
    a,
    { coins: 100, items: [{ kind: "inventory", id: "bright_feather", quantity: 3 }, { kind: "potion", id: "healing_potion", quantity: 1 }] },
    b,
    { coins: 25, items: [{ kind: "inventory", id: "coyote_fang", quantity: 2 }] },
  );
  assert.equal(result.ok, true);
  assert.equal(result.nextA.player.coins, 425);
  assert.equal(result.nextB.player.coins, 115);
  assert.equal(result.nextA.expansion.inventory.bright_feather, 5);
  assert.equal(result.nextB.expansion.inventory.bright_feather, 3);
  assert.equal(result.nextA.expansion.inventory.coyote_fang, 2);
  assert.equal(result.nextB.expansion.inventory.coyote_fang, 1);
  assert.equal(result.nextA.player.potions, 2);
  assert.equal(result.nextB.player.potions, 4);
});

test("recipient stack caps reject exchange instead of truncating", () => {
  const a = makeSave();
  const b = makeSave();
  b.expansion.inventory.bright_feather = 999;
  const result = Trade.prepareExchange(a, { items: [{ kind: "inventory", id: "bright_feather", quantity: 1 }] }, b, {});
  assert.equal(result.ok, false);
  assert.equal(result.reason, "recipient-full");
});
