(function (root, factory) {
  const monsterData = root.EverrealmMonsterData
    || (typeof require === "function" ? require("../data/monsters.js") : null);
  const itemData = root.EverrealmItemData
    || (typeof require === "function" ? require("../data/items.js") : null);
  const api = factory(monsterData, itemData);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMonsterBlueprints = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (monsterData, itemData) {
  "use strict";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  const SKILLS = deepFreeze({ ...(monsterData?.SKILLS || {}) });
  const LEGACY_MONSTER_MIGRATION = deepFreeze({ ...(monsterData?.LEGACY_MONSTER_MIGRATION || {}) });

  function hydrateBlueprint(raw) {
    const rewards = {
      ...(raw.rewards || {}),
      drops: (raw.rewards?.drops || []).map((drop) => {
        const item = itemData?.getItem?.(drop.id);
        return { ...drop, id: item?.id || drop.id, name: item?.name || drop.name || drop.id };
      }),
    };
    const entry = {
      ...raw,
      rewards,
      skills: (raw.skills || []).map((id) => typeof id === "string" ? SKILLS[id] : id).filter(Boolean),
      encounterParty: [...(raw.encounterParty || [])],
      questTags: [...(raw.questTags || [])],
    };
    entry.type = entry.id;
    entry.name = entry.name_zh;
    entry.artType = entry.id;
    entry.baseLevel = entry.normalLevelRange?.[0] || 1;
    entry.hp = entry.baseStats?.hp || 1;
    entry.attack = entry.baseStats?.attack || 1;
    entry.defense = entry.baseStats?.defense || 0;
    entry.ability = entry.skills[0]?.name || "普通攻擊";
    entry.drop = rewards.drops[0] || null;
    return deepFreeze(entry);
  }

  const MONSTER_BLUEPRINTS = deepFreeze(Object.fromEntries(
    Object.entries(monsterData?.MONSTERS || {}).map(([id, raw]) => [id, hydrateBlueprint(raw)]),
  ));
  const CANONICAL_MONSTER_IDS = Object.freeze(Object.keys(MONSTER_BLUEPRINTS));

  function normalizeMonsterId(id) {
    const raw = String(id || "").trim();
    return MONSTER_BLUEPRINTS[raw] ? raw : LEGACY_MONSTER_MIGRATION[raw]?.id || null;
  }
  function monsterBlueprint(id) {
    const normalized = normalizeMonsterId(id);
    return normalized ? MONSTER_BLUEPRINTS[normalized] : null;
  }
  function levelStats(id, level, options = {}) {
    const blueprint = typeof id === "string" ? monsterBlueprint(id) : id;
    if (!blueprint) return null;
    const safeLevel = clamp(Math.floor(Number(level) || blueprint.baseLevel || 1), 1, options.levelCap || 30);
    const delta = safeLevel - 1;
    const elite = options.elite ? 1.18 : 1;
    return {
      level: safeLevel,
      hp: Math.max(1, Math.round(blueprint.baseStats.hp * (1 + delta * .2) * blueprint.multipliers.hp * elite)),
      attack: Math.max(1, Math.round(blueprint.baseStats.attack * (1 + delta * .12) * blueprint.multipliers.attack * (options.elite ? 1.1 : 1))),
      defense: Math.max(0, Math.round(blueprint.baseStats.defense * (1 + delta * .1) * blueprint.multipliers.defense * (options.elite ? 1.12 : 1))),
      moveRange: blueprint.moveRange,
    };
  }
  function monsterStatsAtLevel(id, level, options) { return levelStats(id, level, options); }
  function xpReward(baseXp, monsterLevel, playerLevel) { return Math.max(0, Math.round((Number(baseXp) || 0) * clamp(1 + .2 * ((Number(monsterLevel) || 1) - (Number(playerLevel) || 1)), .1, 1.6))); }
  function highestLivingEnemyLevel(enemies) { return Math.max(0, ...(Array.isArray(enemies) ? enemies : []).filter((enemy) => enemy && enemy.alive !== false && (enemy.hp ?? 1) > 0).map((enemy) => Number(enemy.level) || 0)); }
  function retreatChance(playerLevel, enemies) { return clamp(.4 + .15 * ((Number(playerLevel) || 1) - highestLivingEnemyLevel(enemies)), .05, 1); }
  function selectMonsterSkill(blueprintOrId, context = {}) {
    const blueprint = typeof blueprintOrId === "string" ? monsterBlueprint(blueprintOrId) : blueprintOrId;
    if (!blueprint?.skills.length) return null;
    const preferred = context.skillId && blueprint.skills.find((candidate) => candidate.id === context.skillId);
    if (preferred) return preferred;
    if (context.poisonNeeded) return blueprint.skills.find((candidate) => candidate.effects.some((effect) => effect.type === "poison")) || blueprint.skills[0];
    return blueprint.skills[Math.max(0, Math.min(blueprint.skills.length - 1, Number(context.round || 1) % blueprint.skills.length))];
  }
  function hydrateMonsterSpawn(spawn) {
    if (!spawn || typeof spawn !== "object") return spawn ? { ...spawn } : null;
    const blueprint = monsterBlueprint(spawn.type || spawn.id);
    if (!blueprint) return { ...spawn };
    const stats = levelStats(blueprint, spawn.level || blueprint.baseLevel, { elite: spawn.elite });
    return { ...blueprint, ...spawn, type: blueprint.id, name: spawn.name || blueprint.name_zh, artType: blueprint.id, stats, reward: { xp: xpReward(blueprint.rewards.baseXp, stats.level, spawn.playerLevel || 1), coins: Math.round(blueprint.rewards.coins * (1 + Math.max(0, stats.level - 1) * .12)), drop: blueprint.drop }, skills: blueprint.skills };
  }
  function validateMonsterCatalog(catalog = MONSTER_BLUEPRINTS) {
    const errors = [];
    for (const id of CANONICAL_MONSTER_IDS) {
      const entry = catalog[id];
      if (!entry || entry.id !== id) errors.push(`${id}: missing id`);
      if (!entry?.name_zh || !entry?.family || !entry?.battleRole) errors.push(`${id}: incomplete identity`);
      if (!entry?.baseStats || !entry?.multipliers || !entry?.skills?.length) errors.push(`${id}: incomplete combat data`);
      if (entry?.drop && itemData?.normalizeItemId && !itemData.normalizeItemId(entry.drop.id)) errors.push(`${id}: unknown drop ${entry.drop.id}`);
    }
    return { ok: errors.length === 0, errors };
  }
  return { MONSTER_BLUEPRINTS, CANONICAL_MONSTER_IDS, LEGACY_MONSTER_MIGRATION, SKILLS, monsterBlueprint, normalizeMonsterId, hydrateMonsterSpawn, levelStats, monsterStatsAtLevel, xpReward, highestLivingEnemyLevel, retreatChance, selectMonsterSkill, validateMonsterCatalog };
});
