"use strict";

const Expansion = require("./shared/expansion-core.js");
const Guild = require("./shared/guild-commission-core.js");
const Skills = require("./shared/skill-core.js");
const Tactics = require("./shared/tactics-core.js");
const ItemData = require("./shared/data/items.js");
const MonsterBlueprints = require("./shared/map/monster-blueprints.js");
const { classMaxHp } = require("./game-rules.js");

const SHOP_SELL_RATE = 1 / 3;
const MAX_COINS = 99999;
const GENERAL_STORE_GOODS = Object.freeze({
  healing_potion: Object.freeze({ id: "healing_potion", price: 30 }),
  weak_potion: Object.freeze({ id: "weak_potion", price: 200 }),
});
const MAP_LINKS = Object.freeze({
  world: new Set(["field", "guild", "shop", "clinic", "general-store", "inn"]),
  field: new Set(["world", "dungeon"]),
  dungeon: new Set(["field", "mountain-south"]),
  "mountain-south": new Set(["dungeon"]),
  guild: new Set(["world"]),
  shop: new Set(["world"]),
  clinic: new Set(["world"]),
  "general-store": new Set(["world"]),
  inn: new Set(["world"]),
});

function clone(value) { return JSON.parse(JSON.stringify(value ?? null)); }
function whole(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function saveCopy(save) {
  const next = clone(save) || {};
  next.player = next.player && typeof next.player === "object" ? next.player : {};
  next.expansion = next.expansion && typeof next.expansion === "object" ? next.expansion : {};
  next.expansion.inventory = ItemData.normalizeInventory(next.expansion.inventory || {});
  next.expansion.ownedEquipment = Array.isArray(next.expansion.ownedEquipment) ? next.expansion.ownedEquipment.map(String) : [];
  next.expansion.equipped = next.expansion.equipped && typeof next.expansion.equipped === "object" ? next.expansion.equipped : {};
  next.expansion.guildCommission = Guild.normalizeState(next.expansion.guildCommission);
  next.expansion.skills = Skills.normalizeSkillState(next.expansion.skills, { classId: next.expansion.classId });
  next.expansion.weakPotion = next.expansion.weakPotion && typeof next.expansion.weakPotion === "object" ? { ...next.expansion.weakPotion } : { stepsRemaining: 0, distanceRemainder: 0 };
  next.expansion.monsterKills = next.expansion.monsterKills && typeof next.expansion.monsterKills === "object" ? { ...next.expansion.monsterKills } : {};
  next.expansion.dungeonClears = Math.max(0, whole(next.expansion.dungeonClears, 0));
  next.expansion.defeatedDungeonBosses = Array.isArray(next.expansion.defeatedDungeonBosses) ? next.expansion.defeatedDungeonBosses.map(String) : [];
  next.expansion.checkpoint = next.expansion.checkpoint && typeof next.expansion.checkpoint === "object" ? { ...next.expansion.checkpoint } : null;
  next.openedChests = Array.isArray(next.openedChests) ? next.openedChests.map(String) : [];
  return next;
}
function playerSnapshot(state) {
  return {
    hp: whole(state.player.hp, 0),
    level: clamp(whole(state.player.level, 1), 1, Expansion.LEVEL_CAP),
    xp: Math.max(0, whole(state.player.xp, 0)),
    coins: clamp(whole(state.player.coins, 0), 0, MAX_COINS),
    potions: clamp(whole(state.player.potions, 0), 0, 9),
  };
}
function statePayload(state) {
  return {
    player: playerSnapshot(state),
    expansion: {
      currentMapId: String(state.expansion.currentMapId || "world"),
      inventory: clone(state.expansion.inventory || {}),
      ownedEquipment: [...(state.expansion.ownedEquipment || [])],
      equipped: clone(state.expansion.equipped || {}),
      guildCommission: clone(state.expansion.guildCommission || Guild.emptyState()),
      guildMarks: Math.max(0, whole(state.expansion.guildMarks, 0)),
      guildRenown: Math.max(0, whole(state.expansion.guildRenown, 0)),
      skills: clone(state.expansion.skills || {}),
      weakPotion: clone(state.expansion.weakPotion || { stepsRemaining: 0, distanceRemainder: 0 }),
      monsterKills: clone(state.expansion.monsterKills || {}),
      dungeonClears: Math.max(0, whole(state.expansion.dungeonClears, 0)),
      defeatedDungeonBosses: [...(state.expansion.defeatedDungeonBosses || [])],
      checkpoint: clone(state.expansion.checkpoint || null),
      serverBattle: clone(state.expansion.serverBattle || null),
    },
    openedChests: [...(state.openedChests || [])],
  };
}
function resultWithState(state, result = {}) {
  return { ok: true, ...result, state: statePayload(state) };
}
function wrongMap(state, allowed) {
  return !allowed.includes(String(state.expansion.currentMapId || ""));
}
function equipmentSellPrice(item) {
  const cost = Math.max(0, whole(item?.cost, 0));
  return cost > 0 ? Math.max(1, Math.floor(cost * SHOP_SELL_RATE)) : 0;
}
function generalStoreSellPrice(itemId) {
  const shopItem = GENERAL_STORE_GOODS[itemId];
  if (shopItem) return Math.max(1, Math.floor(shopItem.price * SHOP_SELL_RATE));
  const item = ItemData.getItem(itemId);
  if (!item || ["ui", "currency", "quest"].includes(item.kind) || item.sellable === false) return 0;
  return 10;
}
function guildDiscountRate(state) {
  const marks = Math.max(0, whole(state.expansion.guildMarks, 0));
  return marks >= 18 ? .15 : marks >= 10 ? .1 : marks >= 4 ? .05 : 0;
}
function setInventoryQuantity(state, itemId, quantity) {
  const next = Math.max(0, whole(quantity, 0));
  if (next > 0) state.expansion.inventory[itemId] = next;
  else delete state.expansion.inventory[itemId];
}

function economyCommand(save, input = {}) {
  const state = saveCopy(save);
  const action = String(input.action || "").trim();
  const itemId = String(input.itemId || "").trim();
  const mapId = String(state.expansion.currentMapId || "");

  if (action === "buy-store-item") {
    if (mapId !== "general-store") return { ok: false, reason: "wrong-map" };
    const item = GENERAL_STORE_GOODS[itemId];
    if (!item) return { ok: false, reason: "not-for-sale" };
    const coins = clamp(whole(state.player.coins, 0), 0, MAX_COINS);
    if (coins < item.price) return { ok: false, reason: "coins" };
    if (itemId === "healing_potion") {
      const count = clamp(whole(state.player.potions, 0), 0, 9);
      if (count >= 9) return { ok: false, reason: "full" };
      state.player.potions = count + 1;
    } else {
      const count = Math.max(0, whole(state.expansion.inventory[itemId], 0));
      if (count >= 999) return { ok: false, reason: "full" };
      setInventoryQuantity(state, itemId, count + 1);
    }
    state.player.coins = coins - item.price;
    return resultWithState(state, { action, itemId, price: item.price });
  }

  if (action === "sell-store-item") {
    if (!['shop', 'general-store'].includes(mapId)) return { ok: false, reason: "wrong-map" };
    const price = generalStoreSellPrice(itemId);
    if (price <= 0) return { ok: false, reason: "not-sellable" };
    if (itemId === "healing_potion") {
      const count = clamp(whole(state.player.potions, 0), 0, 9);
      if (count <= 0) return { ok: false, reason: "missing" };
      state.player.potions = count - 1;
    } else {
      const count = Math.max(0, whole(state.expansion.inventory[itemId], 0));
      if (count <= 0) return { ok: false, reason: "missing" };
      setInventoryQuantity(state, itemId, count - 1);
    }
    state.player.coins = clamp(whole(state.player.coins, 0) + price, 0, MAX_COINS);
    return resultWithState(state, { action, itemId, price });
  }

  if (action === "buy-equipment") {
    if (mapId !== "shop") return { ok: false, reason: "wrong-map" };
    const item = Expansion.getEquipment(Expansion.DEFAULT_EQUIPMENT_CATALOG, itemId);
    if (!item || item.purchasable === false) return { ok: false, reason: "not-for-sale" };
    const classId = String(state.expansion.classId || "fighter");
    if (item.classId && item.classId !== classId) return { ok: false, reason: "class" };
    const discount = guildDiscountRate(state);
    const cost = Math.max(0, Math.floor(item.cost * (1 - discount)));
    const coins = clamp(whole(state.player.coins, 0), 0, MAX_COINS);
    if (coins < cost) return { ok: false, reason: "coins" };
    state.player.coins = coins - cost;
    state.expansion.ownedEquipment.push(item.id);
    return resultWithState(state, { action, itemId: item.id, price: cost, discount });
  }

  if (action === "sell-equipment") {
    if (!['shop', 'general-store'].includes(mapId)) return { ok: false, reason: "wrong-map" };
    const item = Expansion.getEquipment(Expansion.DEFAULT_EQUIPMENT_CATALOG, itemId);
    if (!item) return { ok: false, reason: "missing" };
    const owned = state.expansion.ownedEquipment;
    const count = owned.filter((id) => id === item.id).length;
    if (count <= 0) return { ok: false, reason: "missing" };
    if (Expansion.isEquipmentEquipped({ equipped: state.expansion.equipped }, item.id) && count <= 1) {
      return { ok: false, reason: "equipped" };
    }
    const price = equipmentSellPrice(item);
    if (price <= 0) return { ok: false, reason: "not-sellable" };
    owned.splice(owned.indexOf(item.id), 1);
    state.player.coins = clamp(whole(state.player.coins, 0) + price, 0, MAX_COINS);
    return resultWithState(state, { action, itemId: item.id, price });
  }

  if (action === "equip") {
    const result = Expansion.equipItem({
      coins: state.player.coins,
      level: state.player.level,
      classId: state.expansion.classId,
      ownedEquipment: state.expansion.ownedEquipment,
      equipped: state.expansion.equipped,
    }, itemId);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.equipped = result.state.equipped;
    const maxHp = classMaxHp(state.expansion.classId, state.player.level) + Math.max(0, whole(Expansion.equipmentStats(state.expansion.equipped).maxHp, 0));
    state.player.hp = clamp(Number(state.player.hp) || 1, 1, maxHp);
    return resultWithState(state, { action, itemId, itemName: result.item?.name || itemId });
  }

  if (action === "unequip") {
    const item = Expansion.getEquipment(Expansion.DEFAULT_EQUIPMENT_CATALOG, itemId);
    if (!item || !Expansion.isEquipmentEquipped({ equipped: state.expansion.equipped }, item.id)) return { ok: false, reason: "not-equipped" };
    const slot = item.occupiesSlots.find((candidate) => state.expansion.equipped[candidate] === item.id);
    const result = Expansion.unequipItem({
      coins: state.player.coins,
      level: state.player.level,
      classId: state.expansion.classId,
      ownedEquipment: state.expansion.ownedEquipment,
      equipped: state.expansion.equipped,
    }, slot);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.equipped = result.state.equipped;
    const maxHp = classMaxHp(state.expansion.classId, state.player.level) + Math.max(0, whole(Expansion.equipmentStats(state.expansion.equipped).maxHp, 0));
    state.player.hp = clamp(Number(state.player.hp) || 1, 1, maxHp);
    return resultWithState(state, { action, itemId, itemName: item.name });
  }

  if (action === "destroy-item") {
    if (!itemId) return { ok: false, reason: "invalid-item" };
    const equipment = Expansion.getEquipment(Expansion.DEFAULT_EQUIPMENT_CATALOG, itemId);
    if (equipment && state.expansion.ownedEquipment.includes(equipment.id)) {
      if (Expansion.isEquipmentEquipped({ equipped: state.expansion.equipped }, equipment.id)) return { ok: false, reason: "equipped" };
      state.expansion.ownedEquipment.splice(state.expansion.ownedEquipment.indexOf(equipment.id), 1);
      return resultWithState(state, { action, itemId, itemName: equipment.name });
    }
    if (itemId === "healing_potion") {
      const count = clamp(whole(state.player.potions, 0), 0, 9);
      if (count <= 0) return { ok: false, reason: "missing" };
      state.player.potions = count - 1;
      return resultWithState(state, { action, itemId, itemName: "小型回復藥" });
    }
    if (itemId === "weak_potion") {
      const count = Math.max(0, whole(state.expansion.inventory.weak_potion, 0));
      if (count <= 0) return { ok: false, reason: "missing" };
      setInventoryQuantity(state, itemId, count - 1);
      return resultWithState(state, { action, itemId, itemName: ItemData.getItem(itemId)?.name || itemId });
    }
    const envelope = /^skill_envelope_(\d+)$/.exec(itemId);
    if (envelope) {
      const star = Number(envelope[1]);
      const commission = Guild.normalizeState(state.expansion.guildCommission);
      if ((commission.envelopes[star] || 0) <= 0) return { ok: false, reason: "missing" };
      commission.envelopes[star] -= 1;
      state.expansion.guildCommission = commission;
      return resultWithState(state, { action, itemId, itemName: `${star}★ 技能書信封` });
    }
    const book = /^skill_book_(\d+)$/.exec(itemId);
    if (book) {
      const star = Number(book[1]);
      const skills = Skills.normalizeSkillState(state.expansion.skills, { classId: state.expansion.classId });
      if ((skills.books[star] || 0) <= 0) return { ok: false, reason: "missing" };
      skills.books[star] -= 1;
      state.expansion.skills = skills;
      return resultWithState(state, { action, itemId, itemName: `${star}★ 技能書` });
    }
    const manual = /^manual_(.+)$/.exec(itemId);
    if (manual) {
      const skillId = manual[1];
      const skills = Skills.normalizeSkillState(state.expansion.skills, { classId: state.expansion.classId });
      const count = Math.max(0, whole(skills.manualCounts?.[skillId], 0));
      if (count <= 0) return { ok: false, reason: "missing" };
      skills.manualCounts = { ...skills.manualCounts, [skillId]: count - 1 };
      if (skills.manualCounts[skillId] <= 0) delete skills.manualCounts[skillId];
      state.expansion.skills = skills;
      return resultWithState(state, { action, itemId, itemName: `技能書：${Skills.getSkill(skillId)?.name || skillId}` });
    }
    const data = ItemData.getItem(itemId);
    const count = Math.max(0, whole(state.expansion.inventory[itemId], 0));
    if (!data || ["ui", "currency", "quest"].includes(data.kind) || data.destroyable === false || count <= 0) return { ok: false, reason: "protected" };
    setInventoryQuantity(state, itemId, count - 1);
    return resultWithState(state, { action, itemId, itemName: data.name || itemId });
  }

  if (action === "open-envelope") {
    const star = clamp(whole(input.star, 0), 0, 99);
    const commission = Guild.normalizeState(state.expansion.guildCommission);
    const skill = Skills.drawFighterGuildSkillBook(star, {
      seed: "everrealm-guild-envelope",
      serial: commission.envelopeDrawSerial,
    });
    if (!skill) return { ok: false, reason: "empty-pool" };
    const consumed = Guild.consumeEnvelope(commission, star);
    if (!consumed.ok) return { ok: false, reason: consumed.reason };
    const granted = Skills.grantSkillManuals(state.expansion.skills, skill.id, 1);
    if (!granted.ok) return { ok: false, reason: granted.reason };
    state.expansion.guildCommission = consumed.state;
    state.expansion.skills = granted.state;
    return resultWithState(state, { action, star, skill: { id: skill.id, name: skill.name } });
  }


  if (action === "open-skill-book") {
    const star = clamp(whole(input.star, 0), 0, 99);
    const result = Skills.openOwnedSkillBook(star, { seed: "mist-harbour-guild-skills", serial: state.expansion.skills.drawSerial }, state.expansion.skills);
    if (!result.ok) return { ok: false, reason: result.reason || "no-book" };
    state.expansion.skills = result.state;
    return resultWithState(state, { action, star, skill: result.skill ? { id: result.skill.id, name: result.skill.name } : null });
  }

  if (action === "learn-skill-manual") {
    if (state.expansion.serverBattle?.status === "active") return { ok: false, reason: "battle-active" };
    const skillId = String(input.skillId || "").trim();
    const result = Skills.learnSkillFromManual(state.expansion.skills, skillId);
    if (!result.ok) return { ok: false, reason: result.reason, missingPrerequisites: result.missingPrerequisites || [] };
    state.expansion.skills = result.state;
    return resultWithState(state, { action, skill: { id: result.skill.id, name: result.skill.name } });
  }

  if (action === "equip-skill") {
    if (mapId !== "world") return { ok: false, reason: "wrong-map" };
    const skillId = String(input.skillId || "").trim();
    const slot = input.slot == null ? undefined : whole(input.slot, -1);
    const result = Skills.equipSkill(state.expansion.skills, skillId, slot);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.skills = result.state;
    return resultWithState(state, { action, skillId, slot: slot ?? null });
  }

  if (action === "unequip-skill") {
    if (mapId !== "world") return { ok: false, reason: "wrong-map" };
    const skillId = String(input.skillId || "").trim();
    const result = Skills.unequipSkill(state.expansion.skills, skillId);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.skills = result.state;
    return resultWithState(state, { action, skillId });
  }

  if (action === "master-skill") {
    if (state.expansion.serverBattle?.status === "active") return { ok: false, reason: "battle-active" };
    const skillId = String(input.skillId || "").trim();
    const result = Skills.unlockSkillWithShards(state.expansion.skills, skillId);
    if (!result.ok) return { ok: false, reason: result.reason, cost: result.cost || 0 };
    state.expansion.skills = result.state;
    return resultWithState(state, { action, skill: { id: result.skill.id, name: result.skill.name }, cost: result.cost });
  }

  if (["trade", "craft", "loot"].includes(action)) {
    return { ok: false, reason: "feature-not-live", action };
  }
  return { ok: false, reason: "unsupported-action", action };
}

function questCommand(save, input = {}) {
  const state = saveCopy(save);
  const action = String(input.action || "").trim();
  const mapId = String(state.expansion.currentMapId || "");
  const current = Guild.normalizeState(state.expansion.guildCommission);

  if (action === "accept") {
    if (mapId !== "guild") return { ok: false, reason: "wrong-map" };
    const result = Guild.accept(current, String(input.commissionId || ""));
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.guildCommission = result.state;
    return resultWithState(state, { action, commission: result.commission });
  }
  if (action === "report") {
    if (mapId !== "guild") return { ok: false, reason: "wrong-map" };
    const result = Guild.report(current);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.guildCommission = result.state;
    const rewardCoins = Math.max(0, whole(result.reward?.coins, 0));
    state.player.coins = clamp(whole(state.player.coins, 0) + rewardCoins, 0, MAX_COINS);
    return resultWithState(state, { action, commission: result.commission, reward: result.reward });
  }
  if (action === "abandon") {
    if (mapId !== "guild") return { ok: false, reason: "wrong-map" };
    const result = Guild.abandon(current);
    if (!result.ok) return { ok: false, reason: result.reason };
    state.expansion.guildCommission = result.state;
    return resultWithState(state, { action, commission: result.commission });
  }
  if (action === "interaction") {
    const interactionId = String(input.interactionId || "").trim();
    if (interactionId === "mountain-wish-pool" && mapId !== "field") return { ok: false, reason: "wrong-map" };
    const result = Guild.recordInteraction(current, interactionId);
    if (!result.changed) return { ok: false, reason: result.reason };
    state.expansion.guildCommission = result.state;
    return resultWithState(state, { action, commission: result.commission, questReason: result.reason });
  }
  if (action === "delivery") {
    const npcId = String(input.npcId || "").trim();
    const result = Guild.deliver(current, npcId);
    if (!result.changed) return { ok: false, reason: result.reason };
    state.expansion.guildCommission = result.state;
    return resultWithState(state, { action, commission: result.commission, questReason: result.reason });
  }
  return { ok: false, reason: "unsupported-action", action };
}

function recordServerKill(state, monsterType, instanceId) {
  const canonical = MonsterBlueprints.normalizeMonsterId(monsterType) || String(monsterType || "");
  if (!canonical) return null;
  state.expansion.monsterKills = state.expansion.monsterKills && typeof state.expansion.monsterKills === "object" ? state.expansion.monsterKills : {};
  state.expansion.monsterKills[canonical] = Math.max(0, whole(state.expansion.monsterKills[canonical], 0)) + 1;
  state.expansion.guildRenown = Math.max(0, whole(state.expansion.guildRenown, 0)) + 1;
  const progress = Guild.recordHuntKill(state.expansion.guildCommission, { monsterId: canonical, instanceId });
  state.expansion.guildCommission = progress.state;
  return progress;
}

function battleCommand(save, input = {}) {
  const state = saveCopy(save);
  const action = String(input.action || "").trim();
  const existing = state.expansion.serverBattle && typeof state.expansion.serverBattle === "object" ? state.expansion.serverBattle : null;

  if (action === "start") {
    if (existing?.status === "active") return { ok: false, reason: "battle-active" };
    const monsterType = MonsterBlueprints.normalizeMonsterId(input.monsterType);
    const blueprint = monsterType ? MonsterBlueprints.monsterBlueprint(monsterType) : null;
    if (!blueprint) return { ok: false, reason: "unknown-monster" };
    const mapId = String(state.expansion.currentMapId || "");
    if (Array.isArray(blueprint.habitat?.maps) && blueprint.habitat.maps.length && !blueprint.habitat.maps.includes(mapId)) {
      return { ok: false, reason: "wrong-map" };
    }
    const level = clamp(whole(input.level, blueprint.baseLevel || 1), 1, 45);
    const stats = MonsterBlueprints.monsterStatsAtLevel(monsterType, level);
    const count = clamp(whole(blueprint.encounterCount, 1), 1, 3);
    const hpMultiplier = MonsterBlueprints.encounterHpMultiplier(count);
    const enemies = Array.from({ length: count }, (_, index) => ({
      index,
      type: monsterType,
      level,
      hp: Math.max(1, Math.round(stats.hp * hpMultiplier)),
      maxHp: Math.max(1, Math.round(stats.hp * hpMultiplier)),
      alive: true,
    }));
    const battleId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const heroMaxHp = classMaxHp(state.expansion.classId, state.player.level) + Math.max(0, whole(Expansion.equipmentStats(state.expansion.equipped).maxHp, 0));
    state.expansion.serverBattle = {
      id: battleId,
      status: "active",
      monsterType,
      encounterId: String(input.encounterId || ""),
      level,
      round: 1,
      ap: 0,
      heroHp: clamp(Number(state.player.hp) || heroMaxHp, 1, heroMaxHp),
      heroMaxHp,
      enemies,
    };
    return resultWithState(state, { action, battle: clone(state.expansion.serverBattle) });
  }

  if (!existing || existing.status !== "active") return { ok: false, reason: "no-battle" };
  if (String(input.battleId || "") !== String(existing.id)) return { ok: false, reason: "battle-id" };

  if (action === "act") {
    const requestedRound = whole(input.round, -1);
    if (requestedRound !== whole(existing.round, 1)) return { ok: false, reason: "round", battle: clone(existing) };
    const heroAction = String(input.heroAction || "skill");
    existing.ap = Math.min(Skills.MAX_AP, Math.max(0, whole(existing.ap, 0)) + Skills.ROUND_AP_GAIN);

    if (heroAction === "potion") {
      const count = clamp(whole(state.player.potions, 0), 0, 9);
      if (count <= 0) return { ok: false, reason: "empty" };
      if (existing.heroHp >= existing.heroMaxHp) return { ok: false, reason: "full" };
      state.player.potions = count - 1;
      existing.heroHp = Math.min(existing.heroMaxHp, existing.heroHp + 150);
    } else if (heroAction === "skill") {
      const skillId = Skills.canonicalSkillId(String(input.skillId || ""));
      const skill = Skills.getSkill(skillId);
      const skillState = Skills.normalizeSkillState(state.expansion.skills, { classId: state.expansion.classId });
      if (!skill || !skillState.unlockedSkillIds.some((id) => Skills.canonicalSkillId(id) === skillId) || !skillState.equippedSkillIds.some((id) => Skills.canonicalSkillId(id) === skillId)) {
        return { ok: false, reason: "skill-not-equipped" };
      }
      if (existing.ap < skill.apCost) return { ok: false, reason: "ap" };
      existing.ap -= skill.apCost;

      const targets = [...new Set((Array.isArray(input.targetIndexes) ? input.targetIndexes : [input.targetIndex])
        .map((v) => whole(v, -1))
        .filter((v) => v >= 0 && v < existing.enemies.length))];
      const heals = (skill.effects || []).filter((effect) => effect.type === "heal");
      const isAllySkill = skill.targeting?.team === "ally" || skill.tags?.includes("heal");
      if (!targets.length && !isAllySkill) return { ok: false, reason: "target" };

      const gear = Expansion.equipmentStats(state.expansion.equipped);
      const attack = Math.max(0, Number(gear.attack) || 0);
      const authoredMultiplier = Math.max(0, Number(Skills.calculateSkillDamageMultiplier(skill)) || 0);
      const hitCount = Math.max(1, whole(skill.hitResolution?.hit_count || skill.effects?.find((effect) => effect.type === "damage")?.hits, 1));
      const specialHpEffect = (skill.effects || []).find((effect) => ["halve_hp", "set_hp"].includes(effect.type));

      for (const index of targets.slice(0, 3)) {
        const enemy = existing.enemies[index];
        if (!enemy?.alive) continue;
        const stats = MonsterBlueprints.monsterStatsAtLevel(enemy.type, enemy.level);
        let damage = Tactics.calculateDamage({ attack }, { defence: stats.defense }, {
          multiplier: authoredMultiplier,
          minimum: Tactics.MIN_DIRECT_DAMAGE,
        });
        damage = Math.max(Tactics.MIN_DIRECT_DAMAGE, whole(damage, Tactics.MIN_DIRECT_DAMAGE) * hitCount);
        if (specialHpEffect?.type === "halve_hp") damage = Math.max(damage, Math.floor(enemy.hp / 2));
        if (specialHpEffect?.type === "set_hp") damage = Math.max(damage, Math.max(0, enemy.hp - Math.max(0, whole(specialHpEffect.value, 1))));
        enemy.hp = Math.max(0, enemy.hp - damage);
        enemy.alive = enemy.hp > 0;
      }

      if (heals.length) {
        const healAmount = heals.reduce((sum, effect) => sum + Math.max(0, whole(effect.flat, 0)) + Math.floor(existing.heroMaxHp * Math.max(0, Number(effect.maxHpRatio) || 0)), 0);
        existing.heroHp = Math.min(existing.heroMaxHp, existing.heroHp + healAmount);
      }
    } else if (heroAction !== "wait") {
      return { ok: false, reason: "unsupported-battle-action" };
    }

    // Until Step 9 makes tactical/world position fully authoritative, the client
    // may report battle damage taken, but can never increase HP through this path.
    const reportedHp = Number(input.heroHp);
    if (Number.isFinite(reportedHp)) existing.heroHp = clamp(Math.min(existing.heroHp, reportedHp), 0, existing.heroMaxHp);
    state.player.hp = existing.heroHp;
    existing.round = Math.max(1, whole(existing.round, 1) + 1);
    state.expansion.serverBattle = existing;
    return resultWithState(state, { action, battle: clone(existing) });
  }

  if (action === "settle") {
    const victory = input.outcome === "victory";
    if (victory && existing.enemies.some((enemy) => enemy.alive && enemy.hp > 0)) return { ok: false, reason: "battle-not-won", battle: clone(existing) };
    if (!victory) {
      existing.status = "defeat";
      state.player.hp = 0;
      state.expansion.serverBattle = null;
      return resultWithState(state, { action, outcome: "defeat" });
    }
    const blueprint = MonsterBlueprints.monsterBlueprint(existing.monsterType);
    const encounterCount = existing.enemies.length;
    const rewardLevel = Math.max(existing.level || blueprint?.baseLevel || 1, ...existing.enemies.map((enemy) => enemy.level || 1));
    const earnedXp = MonsterBlueprints.battleXpReward(rewardLevel, state.player.level, encounterCount, blueprint?.rewards?.baseXp ?? 100);
    const earnedCoins = existing.enemies.reduce((sum) => sum + Math.max(0, whole(blueprint?.rewards?.coins, 0)), 0);
    const beforeLevel = clamp(whole(state.player.level, 1), 1, Expansion.LEVEL_CAP);
    const beforeXp = Math.max(0, whole(state.player.xp, 0));
    const xpResult = Expansion.grantExperience(beforeLevel, beforeXp, earnedXp);
    state.player.level = xpResult.level;
    state.player.xp = xpResult.xp;
    const maxHp = classMaxHp(state.expansion.classId, state.player.level) + Math.max(0, whole(Expansion.equipmentStats(state.expansion.equipped).maxHp, 0));
    state.player.hp = xpResult.levelsGained > 0 ? maxHp : clamp(existing.heroHp, 1, maxHp);
    state.player.coins = clamp(whole(state.player.coins, 0) + earnedCoins, 0, MAX_COINS);
    const questProgress = recordServerKill(state, existing.monsterType, existing.encounterId || existing.id);
    for (let index = 1; index < encounterCount; index += 1) recordServerKill(state, existing.monsterType, `${existing.encounterId || existing.id}:pack-${index + 1}`);
    state.expansion.serverBattle = null;
    return resultWithState(state, {
      action,
      outcome: "victory",
      earnedXp,
      coins: earnedCoins,
      drops: [],
      beforeLevel,
      beforeXp,
      afterLevel: state.player.level,
      afterXp: state.player.xp,
      levelsGained: xpResult.levelsGained,
      questProgress: questProgress ? { changed: questProgress.changed, reason: questProgress.reason } : null,
    });
  }

  if (action === "cancel") {
    state.expansion.serverBattle = null;
    return resultWithState(state, { action });
  }
  return { ok: false, reason: "unsupported-action", action };
}

function mapCommand(save, input = {}) {
  const state = saveCopy(save);
  const action = String(input.action || "").trim();
  if (action !== "transition") return { ok: false, reason: "unsupported-action" };
  const from = String(state.expansion.currentMapId || "world");
  const to = String(input.targetMapId || "").trim();
  if (!MAP_LINKS[from]?.has(to)) return { ok: false, reason: "invalid-transition", from, to };
  state.expansion.currentMapId = to;
  return resultWithState(state, { action, from, to });
}

module.exports = Object.freeze({
  economyCommand,
  questCommand,
  battleCommand,
  mapCommand,
  statePayload,
});
