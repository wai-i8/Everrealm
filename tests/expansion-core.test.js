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

test("warrior and fighter use fixed HP growth tables with stable generic ATK/DEF", () => {
  for (const classId of ["warrior", "fighter"]) {
    const table = Expansion.CLASS_LEVEL_TABLES[classId];
    assert.equal(table.length, 40);
    assert.equal(Object.isFrozen(table), true);
    for (let index = 1; index < table.length; index += 1) {
      assert.ok(table[index].maxHp > table[index - 1].maxHp, `${classId} HP at level ${index + 1}`);
      assert.equal(table[index].attack, table[index - 1].attack, `${classId} attack at level ${index + 1}`);
      assert.equal(table[index].defence, table[index - 1].defence, `${classId} defence at level ${index + 1}`);
    }
  }
  assert.deepEqual(Expansion.classStatsAtLevel("fighter", 1), {
    level: 1, maxHp: 88, attack: 14, defence: 2, moveRange: 5,
  });
  assert.equal(Expansion.classStatsAtLevel("warrior", 1).moveRange, 3);
  assert.equal(Expansion.classStatsAtLevel("fighter", 40).moveRange, 5);
  assert.ok(Expansion.classStatsAtLevel("warrior", 40).maxHp > Expansion.classStatsAtLevel("fighter", 40).maxHp);
  assert.equal(Expansion.classStatsAtLevel("fighter", 40).attack, Expansion.classStatsAtLevel("warrior", 40).attack);
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

test("equipment uses canonical body slots and migrates legacy armor saves", () => {
  assert.deepEqual(Expansion.EQUIPMENT_SLOTS, ["head", "weapon", "upperBody", "lowerBody", "hands", "feet", "charm"]);
  const migrated = Expansion.normalizeEquipmentState({
    level: 10,
    ownedEquipment: ["novice_blade", "guild_mail", "hunter_fang"],
    equipped: { weapon: "novice_blade", armor: "guild_mail", charm: "hunter_fang" },
  });
  assert.deepEqual(migrated.equipped, {
    head: null, weapon: "novice_blade", upperBody: "guild_mail", lowerBody: null,
    hands: null, feet: null, charm: "hunter_fang",
  });
});

test("equipping owned items swaps their matching slot and keeps canonical output", () => {
  const source = {
    coins: 0,
    level: 10,
    ownedEquipment: ["novice_blade", "tide_iron_sword", "guild_mail", "hunter_fang"],
    equipped: { weapon: "novice_blade", armor: "guild_mail", charm: "hunter_fang" },
  };
  const result = Expansion.equipItem(source, "tide_iron_sword");
  assert.equal(result.ok, true);
  assert.deepEqual(result.state.equipped, {
    head: null,
    weapon: "tide_iron_sword",
    upperBody: "guild_mail",
    lowerBody: null,
    hands: null,
    feet: null,
    charm: "hunter_fang",
  });
  assert.equal(source.equipped.weapon, "novice_blade");
  assert.equal(Expansion.equipItem(source, "aurora_plate").reason, "not-owned");
});

test("equipment stats add canonical and legacy body slots without double counting", () => {
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
  assert.equal(stats.weight, 7);

  const mismatched = Expansion.equipmentStats({ weapon: "guild_mail" });
  assert.equal(mismatched.defense, 0);
});

test("Fighter V1 equipment is level-gated, class-locked, and supports full-body occupancy", () => {
  const expected = {
    novice_gloves: ["weapon", 1, 0, { attack: 2, speed: 2 }],
    tide_iron_knuckles: ["weapon", 1, 95, { attack: 5, speed: 2 }],
    gale_gauntlets: ["weapon", 7, 360, { attack: 12, speed: 8, critChance: 0.03 }],
    dragon_knuckles: ["weapon", 15, 980, { attack: 26, defense: 3, critChance: 0.04 }],
    metal_knuckles: ["weapon", 6, 450, { attack: 10 }],
    giz_armguard: ["weapon", 12, 1800, { attack: 17 }],
    heavy_knuckles: ["weapon", 18, 4050, { attack: 25 }],
    superheavy_knuckles: ["weapon", 24, 7200, { attack: 34 }],
    disciple_gi: ["upperBody", 5, 781, { attack: 2, defense: 1, maxHp: 2 }],
    disciple_lower: ["lowerBody", 5, 500, { attack: 1 }],
    disciple_handguards: ["hands", 5, 469, { attack: 1 }],
    disciple_shoes: ["feet", 5, 469, { attack: 1 }],
    training_wrap: ["upperBody", 14, 6125, { attack: 5, defense: 2, maxHp: 5 }],
    training_belt: ["lowerBody", 14, 3920, { attack: 3, defense: 1 }],
    training_bracers: ["hands", 14, 3675, { attack: 2, defense: 1 }],
    training_zori: ["feet", 14, 3675, { attack: 2, defense: 1 }],
    conditioning_suit: ["upperBody", 23, 16531, { attack: 9, defense: 3, maxHp: 8 }],
    conditioning_skirt: ["lowerBody", 23, 10580, { attack: 5, defense: 2 }],
    conditioning_handguards: ["hands", 23, 9919, { attack: 4, defense: 2 }],
    conditioning_shoes: ["feet", 23, 9919, { attack: 4, defense: 2 }],
    white_martial_gi: ["upperBody", 10, 4375, { attack: 2, defense: 2, moveRange: 1 }],
    cloth_bracers: ["hands", 10, 1875, { attack: 1 }],
    barefoot_bands: ["feet", 10, 1875, { attack: 1 }],
    colored_martial_gi: ["upperBody", 20, 17500, { attack: 5, defense: 4, moveRange: 1 }],
    joint_bracers: ["hands", 20, 7500, { attack: 3, defense: 1 }],
    barefoot_guard: ["feet", 20, 7500, { attack: 3, defense: 1 }],
  };
  const fighterItems = Expansion.DEFAULT_EQUIPMENT_CATALOG.filter((item) => item.classId === "fighter");
  assert.deepEqual(fighterItems.map((item) => item.id), Object.keys(expected));
  for (const [id, [slot, requiredLevel, cost, stats]] of Object.entries(expected)) {
    const item = Expansion.getEquipment(Expansion.DEFAULT_EQUIPMENT_CATALOG, id);
    assert.equal(item.slot, slot, id);
    assert.equal(item.requiredLevel, requiredLevel, id);
    assert.equal(item.cost, cost, id);
    assert.equal(item.classId, "fighter", id);
    for (const [key, value] of Object.entries(stats)) assert.equal(item.stats[key], value, `${id}.${key}`);
    for (const key of ["attack", "defense", "maxHp", "speed", "critChance", "moveRange", "accuracy", "evasion", "weight"]) {
      assert.equal(typeof item.stats[key], "number", `${id}.${key} is numeric`);
    }
  }
  assert.deepEqual(Expansion.getEquipment(Expansion.DEFAULT_EQUIPMENT_CATALOG, "white_martial_gi").occupiesSlots, ["upperBody", "lowerBody"]);
  const base = {
    level: 10, classId: "fighter", ownedEquipment: ["novice_gloves", "white_martial_gi", "disciple_lower", "cloth_bracers", "barefoot_bands"],
    equipped: { weapon: "novice_gloves" },
  };
  assert.equal(Expansion.equipItem({ ...base, level: 9 }, "white_martial_gi").reason, "level");
  const full = Expansion.equipItem(base, "white_martial_gi");
  assert.equal(full.ok, true);
  assert.equal(full.state.equipped.upperBody, "white_martial_gi");
  assert.equal(full.state.equipped.lowerBody, "white_martial_gi");
  assert.equal(Expansion.equipmentStats(full.state).attack, 4);
  const partial = Expansion.equipItem(full.state, "disciple_lower");
  assert.equal(partial.ok, true);
  assert.equal(partial.state.equipped.upperBody, null);
  assert.equal(partial.state.equipped.lowerBody, "disciple_lower");
  assert.equal(Expansion.equipmentStats(partial.state).attack, 3);
  assert.equal(Expansion.equipItem({ ...base, classId: "warrior", ownedEquipment: [...base.ownedEquipment, "metal_knuckles"] }, "metal_knuckles").reason, "class");
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
