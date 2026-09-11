(function (root, factory) {
  const monsterData = root.EverrealmMonsterData
    || (typeof require === "function" ? require("../data/monsters.js") : null);
  const monsterSkillData = root.EverrealmMonsterSkillData
    || (typeof require === "function" ? require("../data/skills/monster.js") : null);
  const itemData = root.EverrealmItemData
    || (typeof require === "function" ? require("../data/items.js") : null);
  const api = factory(monsterData, monsterSkillData, itemData);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMonsterBlueprints = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (monsterData, monsterSkillData, itemData) {
  "use strict";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  const MONSTER_LEVEL_CAP = Math.max(1, Number(monsterData?.MONSTER_LEVEL_CAP) || 45);
  const SKILLS = deepFreeze({ ...(monsterSkillData?.SKILLS || monsterData?.SKILLS || {}) });
  const LEGACY_MONSTER_MIGRATION = deepFreeze({ ...(monsterData?.LEGACY_MONSTER_MIGRATION || {}) });

  function hydrateBlueprint(raw) {
    const level = Math.max(1, Math.trunc(Number(raw.progression?.level) || 1));
    const rewards = {
      ...(raw.rewards || {}),
      drops: (raw.rewards?.drops || []).map((drop) => {
        const item = itemData?.getItem?.(drop.id);
        return { ...drop, id: item?.id || drop.id, name: item?.name || drop.name || drop.id };
      }),
    };
    const skills = (raw.combat?.skills || []).map((id) => SKILLS[id]).filter(Boolean);
    const entry = {
      ...raw,
      name_zh: raw.name?.zh || raw.name_zh || raw.id,
      name_en: raw.name?.en || raw.name_en || raw.id,
      normalLevelRange: [level, level],
      baseLevel: level,
      baseStats: { ...(raw.stats || raw.baseStats || {}) },
      multipliers: { hp: 1, attack: 1, defense: 1 },
      moveRange: Math.max(0, Math.trunc(Number(raw.combat?.moveRange ?? raw.moveRange) || 0)),
      battleRole: raw.combat?.role || raw.battleRole || "standard",
      aiProfile: "skill-driven",
      encounterCount: Math.max(1, Math.trunc(Number(raw.encounter?.count) || 1)),
      rewards,
      skills,
      questTags: [...(raw.questTags || [])],
    };
    entry.type = entry.id;
    entry.name = entry.name_zh;
    entry.artType = entry.id;
    entry.hp = entry.baseStats.hp || 1;
    entry.attack = entry.baseStats.attack || 1;
    entry.defense = entry.baseStats.defense || 0;
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
    const safeLevel = clamp(Math.floor(Number(level) || blueprint.baseLevel || 1), 1, options.levelCap || MONSTER_LEVEL_CAP);
    const delta = safeLevel - blueprint.baseLevel;
    const up = Math.max(0, delta);
    const down = Math.max(0, -delta);
    const hpScale = up ? 1 + up * .12 : Math.max(.35, 1 - down * .08);
    const attackScale = up ? 1 + up * .07 : Math.max(.45, 1 - down * .055);
    const defenseScale = up ? 1 + up * .06 : Math.max(.4, 1 - down * .05);
    return {
      level: safeLevel,
      hp: Math.max(1, Math.round(blueprint.baseStats.hp * hpScale)),
      attack: Math.max(1, Math.round(blueprint.baseStats.attack * attackScale)),
      defense: Math.max(0, Math.round(blueprint.baseStats.defense * defenseScale)),
      moveRange: blueprint.moveRange,
    };
  }

  function monsterStatsAtLevel(id, level, options) { return levelStats(id, level, options); }

  function levelXpMultiplier(monsterLevel, playerLevel) {
    const monster = Math.max(1, Math.floor(Number(monsterLevel) || 1));
    const player = Math.max(1, Math.floor(Number(playerLevel) || 1));
    const delta = monster - player;
    if (delta >= 0) return 1 + Math.min(10, delta) * .1;
    const levelsBelow = -delta;
    if (levelsBelow <= 4) return 1;
    return Math.pow(.9, levelsBelow - 4);
  }

  function encounterXpMultiplier(count) {
    const size = Math.max(1, Math.floor(Number(count) || 1));
    if (size === 1) return 1;
    if (size === 2) return 1.5;
    return 2;
  }

  function encounterHpMultiplier(count) {
    const size = Math.max(1, Math.floor(Number(count) || 1));
    if (size === 1) return 1;
    if (size === 2) return .85;
    return .7;
  }

  function xpReward(baseXp, monsterLevel, playerLevel) {
    return Math.max(0, Math.round((Number(baseXp) || 0) * levelXpMultiplier(monsterLevel, playerLevel)));
  }

  function battleXpReward(monsterLevel, playerLevel, count = 1, baseXp = 100) {
    return Math.max(0, Math.round(
      (Number(baseXp) || 0)
      * levelXpMultiplier(monsterLevel, playerLevel)
      * encounterXpMultiplier(count),
    ));
  }
  function highestLivingEnemyLevel(enemies) {
    return Math.max(0, ...(Array.isArray(enemies) ? enemies : []).filter((enemy) => enemy && enemy.alive !== false && (enemy.hp ?? 1) > 0).map((enemy) => Number(enemy.level) || 0));
  }
  function retreatChance(playerLevel, enemies) {
    return clamp(.4 + .15 * ((Number(playerLevel) || 1) - highestLivingEnemyLevel(enemies)), .05, 1);
  }

  // Compatibility helper for older call sites. The battle planner now evaluates
  // the full skill set and should not use round-robin skill selection.
  function selectMonsterSkill(blueprintOrId, context = {}) {
    const blueprint = typeof blueprintOrId === "string" ? monsterBlueprint(blueprintOrId) : blueprintOrId;
    if (!blueprint?.skills.length) return null;
    const preferred = context.skillId && blueprint.skills.find((candidate) => candidate.id === context.skillId);
    if (preferred) return preferred;
    const affordable = Number.isFinite(Number(context.ap))
      ? blueprint.skills.filter((candidate) => candidate.apCost <= Number(context.ap))
      : blueprint.skills;
    return affordable[0] || blueprint.skills[0];
  }

  function hydrateMonsterSpawn(spawn) {
    if (!spawn || typeof spawn !== "object") return spawn ? { ...spawn } : null;
    const blueprint = monsterBlueprint(spawn.type || spawn.id);
    if (!blueprint) return { ...spawn };
    const stats = levelStats(blueprint, spawn.level || blueprint.baseLevel);
    const hydrated = {
      ...blueprint,
      ...spawn,
      type: blueprint.id,
      name: spawn.name || blueprint.name_zh,
      artType: blueprint.id,
      level: stats.level,
      stats,
      reward: {
        xp: xpReward(blueprint.rewards.baseXp, stats.level, spawn.playerLevel || stats.level),
        coins: Math.round(blueprint.rewards.coins * (1 + Math.max(0, stats.level - blueprint.baseLevel) * .08)),
        drop: blueprint.drop,
      },
      skills: blueprint.skills,
      encounterCount: blueprint.encounterCount,
    };
    delete hydrated.boss;
    delete hydrated.elite;
    delete hydrated.encounterParty;
    return hydrated;
  }

  function validateMonsterCatalog(catalog = MONSTER_BLUEPRINTS) {
    const errors = [];
    const ranks = new Set();
    for (const id of CANONICAL_MONSTER_IDS) {
      const entry = catalog[id];
      if (!entry || entry.id !== id) errors.push(`${id}: missing id`);
      if (!entry?.name_zh || !entry?.family || !entry?.battleRole) errors.push(`${id}: incomplete identity`);
      if (!entry?.baseStats || !entry?.skills?.length) errors.push(`${id}: incomplete combat data`);
      if (!(entry?.encounterCount >= 1 && entry.encounterCount <= 3)) errors.push(`${id}: invalid encounter count`);
      const rank = entry?.progression?.rank;
      if (!Number.isInteger(rank) || rank < 1 || rank > 9 || ranks.has(rank)) errors.push(`${id}: invalid or duplicate progression rank`);
      ranks.add(rank);
      for (const skill of entry?.skills || []) if (!SKILLS[skill.id]) errors.push(`${id}: unknown skill ${skill.id}`);
      if (entry?.drop && itemData?.normalizeItemId && !itemData.normalizeItemId(entry.drop.id)) errors.push(`${id}: unknown drop ${entry.drop.id}`);
    }
    return { ok: errors.length === 0, errors };
  }

  return {
    MONSTER_LEVEL_CAP,
    MONSTER_BLUEPRINTS,
    CANONICAL_MONSTER_IDS,
    LEGACY_MONSTER_MIGRATION,
    SKILLS,
    monsterBlueprint,
    normalizeMonsterId,
    hydrateMonsterSpawn,
    levelStats,
    monsterStatsAtLevel,
    levelXpMultiplier,
    encounterXpMultiplier,
    encounterHpMultiplier,
    xpReward,
    battleXpReward,
    highestLivingEnemyLevel,
    retreatChance,
    selectMonsterSkill,
    validateMonsterCatalog,
  };
});
