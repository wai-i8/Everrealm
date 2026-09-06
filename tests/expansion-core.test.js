const test = require("node:test");
const assert = require("node:assert/strict");
const Expansion = require("../expansion-core.js");

test("facility tabs keep portable menus separate from map-only services", () => {
  assert.deepEqual(Expansion.facilityTabsForContext("portable", "world"), ["status", "bag", "equipment", "skills", "codex"]);
  assert.deepEqual(Expansion.facilityTabsForContext("portable", "guild"), ["status", "bag", "equipment", "skills", "codex"]);
  assert.deepEqual(Expansion.facilityTabsForContext("guild", "guild"), ["guild"]);
  assert.deepEqual(Expansion.facilityTabsForContext("shop", "shop"), ["shop"]);
  assert.deepEqual(Expansion.facilityTabsForContext("deck", "world"), ["deck"]);
  assert.deepEqual(Expansion.facilityTabsForContext("deck-view", "dungeon"), ["deck"]);
  assert.equal(Expansion.normalizeFacilityTab("guild", "portable", "guild"), "bag");
  assert.equal(Expansion.normalizeFacilityTab("shop", "shop", "world"), "bag");
  assert.equal(Expansion.normalizeFacilityTab("deck", "portable", "world"), "bag");
  assert.equal(Expansion.normalizeFacilityTab("deck", "deck", "world"), "deck");
  assert.equal(Expansion.normalizeFacilityTab("deck", "deck-view", "dungeon"), "deck");
  assert.equal(Expansion.normalizeFacilityTab("status", "portable", "world"), "status");
  assert.equal(Expansion.normalizeFacilityTab("skills", "portable", "world"), "skills");
});

test("warrior and fighter use fixed monotonic level 1 to 40 growth tables", () => {
  for (const classId of ["warrior", "fighter"]) {
    const table = Expansion.CLASS_LEVEL_TABLES[classId];
    assert.equal(table.length, 40);
    assert.equal(Object.isFrozen(table), true);
    for (let index = 1; index < table.length; index += 1) {
      assert.ok(table[index].maxHp > table[index - 1].maxHp, `${classId} HP at level ${index + 1}`);
      assert.ok(table[index].attack > table[index - 1].attack, `${classId} attack at level ${index + 1}`);
      assert.ok(table[index].defence >= table[index - 1].defence, `${classId} defence at level ${index + 1}`);
    }
  }
  assert.deepEqual(Expansion.classStatsAtLevel("fighter", 1), {
    level: 1, maxHp: 88, attack: 14, defence: 2, moveRange: 5,
  });
  assert.equal(Expansion.classStatsAtLevel("warrior", 1).moveRange, 3);
  assert.equal(Expansion.classStatsAtLevel("fighter", 40).moveRange, 5);
  assert.ok(Expansion.classStatsAtLevel("warrior", 40).maxHp > Expansion.classStatsAtLevel("fighter", 40).maxHp);
  assert.ok(Expansion.classStatsAtLevel("fighter", 40).attack > Expansion.classStatsAtLevel("warrior", 40).attack);
});

test("equipment catalog normalization rejects bad entries and sanitizes stats", () => {
  const catalog = Expansion.normalizeEquipmentCatalog([
    { id: "blade", slot: "weapon", cost: -8, requiredLevel: 99, stats: { attack: 5, speed: "4" } },
    { id: "blade", slot: "armor", stats: { defense: 99 } },
    { id: "bad", slot: "boots", stats: {} },
  ]);
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].cost, 0);
  assert.equal(catalog[0].requiredLevel, Expansion.LEVEL_CAP);
  assert.equal(catalog[0].stats.attack, 5);
  assert.equal(catalog[0].stats.speed, 4);
  assert.equal(Object.isFrozen(catalog), true);
});

test("purchase checks level and coins without mutating the source", () => {
  const source = { coins: 200, level: 1, ownedEquipment: ["novice_blade"], equipped: { weapon: "novice_blade" } };
  const locked = Expansion.purchaseEquipment(source, "windfeather_dagger");
  assert.equal(locked.ok, false);
  assert.equal(locked.reason, "level");

  const poor = Expansion.purchaseEquipment({ ...source, coins: 20 }, "tide_iron_sword");
  assert.equal(poor.reason, "coins");

  const bought = Expansion.purchaseEquipment(source, "tide_iron_sword");
  assert.equal(bought.ok, true);
  assert.equal(bought.state.coins, 110);
  assert.deepEqual(bought.state.ownedEquipment, ["novice_blade", "tide_iron_sword"]);
  assert.deepEqual(source.ownedEquipment, ["novice_blade"]);
  assert.equal(source.coins, 200);
});

test("equipment cannot be bought twice or when it is not for sale", () => {
  const owned = { coins: 500, level: 5, ownedEquipment: ["tide_iron_sword"], equipped: {} };
  assert.equal(Expansion.purchaseEquipment(owned, "tide_iron_sword").reason, "already-owned");
  assert.equal(Expansion.purchaseEquipment(owned, "novice_blade").reason, "not-for-sale");
  assert.equal(Expansion.purchaseEquipment(owned, "missing").reason, "not-found");
});

test("equipping owned items swaps only their matching slot", () => {
  const source = {
    coins: 0,
    level: 10,
    ownedEquipment: ["novice_blade", "tide_iron_sword", "guild_mail", "hunter_fang"],
    equipped: { weapon: "novice_blade", armor: "guild_mail", charm: "hunter_fang" },
  };
  const result = Expansion.equipItem(source, "tide_iron_sword");
  assert.equal(result.ok, true);
  assert.deepEqual(result.state.equipped, {
    weapon: "tide_iron_sword",
    armor: "guild_mail",
    charm: "hunter_fang",
  });
  assert.equal(source.equipped.weapon, "novice_blade");
  assert.equal(Expansion.equipItem(source, "aurora_plate").reason, "not-owned");
});

test("equipment stats add all three slots and ignore mismatched IDs", () => {
  const stats = Expansion.equipmentStats({
    weapon: "tide_iron_sword",
    armor: "guild_mail",
    charm: "hunter_fang",
  });
  assert.equal(stats.attack, 9);
  assert.equal(stats.defense, 3);
  assert.equal(stats.maxHp, 12);
  assert.equal(stats.critChance, 0.04);
  assert.equal(stats.moveRange, 0);

  const mismatched = Expansion.equipmentStats({ weapon: "guild_mail" });
  assert.equal(mismatched.defense, 0);
});

test("contract offers are deterministic, level-gated, and rotate", () => {
  const options = { playerLevel: 10, count: 3, seed: "test", rotation: 4 };
  const first = Expansion.createContractOffers(options);
  const again = Expansion.createContractOffers(options);
  const next = Expansion.createContractOffers({ ...options, rotation: 5 });
  assert.deepEqual(first, again);
  assert.notDeepEqual(first.map((offer) => offer.id), next.map((offer) => offer.id));
  assert.equal(first.length, 3);
  assert.ok(first.every((offer) => offer.minLevel <= 10));

  const beginners = Expansion.createContractOffers({ playerLevel: 1, count: 9, rotation: 0 });
  assert.deepEqual(beginners.map((offer) => offer.templateId), ["slime_sweep"]);
});

test("accepting a contract creates independent active state", () => {
  const offer = Expansion.createContractOffers({ playerLevel: 3, count: 1, rotation: 8 })[0];
  const accepted = Expansion.acceptContract([], offer);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.contract.status, "active");
  assert.equal(accepted.contract.progress, 0);
  accepted.contract.objective.count = 999;
  assert.notEqual(accepted.contracts[0].objective.count, 999);

  const duplicate = Expansion.acceptContract(accepted.contracts, offer);
  assert.equal(duplicate.reason, "already-accepted");
});

test("active contract limit counts ready contracts too", () => {
  const offers = Expansion.createContractOffers({ playerLevel: 10, count: 3, rotation: 2 });
  let contracts = [];
  for (const offer of offers.slice(0, 2)) contracts = Expansion.acceptContract(contracts, offer, { maxActive: 2 }).contracts;
  contracts[0] = { ...contracts[0], status: "ready" };
  const blocked = Expansion.acceptContract(contracts, offers[2], { maxActive: 2 });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "full");
});

test("matching defeats progress contracts, clamp totals, and mark them ready", () => {
  const offer = {
    id: "day:slimes",
    templateId: "slimes",
    objective: { event: "defeat", target: "slime", count: 5 },
    reward: { coins: 10, xp: 8, items: [] },
  };
  const accepted = Expansion.acceptContract([], offer).contracts;
  const miss = Expansion.progressContracts(accepted, { event: "defeat", target: "wisp" });
  assert.equal(miss.contracts[0].progress, 0);
  const hit = Expansion.progressContracts(accepted, { event: "defeat", target: "slime", amount: 99 });
  assert.equal(hit.contracts[0].progress, 5);
  assert.equal(hit.contracts[0].status, "ready");
  assert.deepEqual(hit.updatedIds, ["day:slimes"]);
  assert.equal(accepted[0].progress, 0);
});

test("ready contracts can be claimed exactly once and return rewards", () => {
  const ready = [{
    id: "r:1",
    status: "ready",
    progress: 2,
    objective: { event: "defeat", target: "slime", count: 2 },
    reward: { coins: 55, xp: 20, items: [{ id: "potion", quantity: 1 }] },
  }];
  const claimed = Expansion.claimContract(ready, "r:1");
  assert.equal(claimed.ok, true);
  assert.equal(claimed.contracts[0].status, "claimed");
  assert.deepEqual(claimed.reward, { coins: 55, xp: 20, items: [{ id: "potion", quantity: 1 }] });
  assert.equal(ready[0].status, "ready");
  assert.equal(Expansion.claimContract(claimed.contracts, "r:1").reason, "already-claimed");
});

test("experience helper matches the base curve and supports multi-level gains", () => {
  const first = Expansion.xpRequired(1);
  const second = Expansion.xpRequired(2);
  const result = Expansion.grantExperience(1, first - 1, second + 6);
  assert.deepEqual(result, { level: 3, xp: 5, levelsGained: 2, capped: false });
});

test("experience is capped at level 40 and discards overflow", () => {
  const result = Expansion.grantExperience(39, Expansion.xpRequired(39) - 1, 999999);
  assert.deepEqual(result, { level: 40, xp: 0, levelsGained: 1, capped: true });
  assert.deepEqual(Expansion.grantExperience(40, 50, 80), { level: 40, xp: 0, levelsGained: 0, capped: true });
});
