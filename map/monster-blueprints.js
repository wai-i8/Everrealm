(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMonsterBlueprints = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MONSTER_BLUEPRINTS = Object.freeze({
    mossbun: Object.freeze({ type: "mossbun", name: "苔糰子", family: "slime", artType: "slime", baseLevel: 5, hp: 74, attack: 14, defense: 4, speed: 7, moveRange: 4, attackRange: 1, xp: 34, coins: 18, ability: "孢子撲擊", drop: { id: "moss-jelly", name: "青苔啫喱", chance: 0.35 } }),
    mistwing: Object.freeze({ type: "mistwing", name: "霧翼蝠", family: "flying", artType: "wisp", baseLevel: 6, hp: 62, attack: 18, defense: 3, speed: 13, moveRange: 5, attackRange: 1, xp: 42, coins: 22, ability: "迴旋音波", drop: { id: "mist-wing", name: "薄霧翼膜", chance: 0.3 } }),
    cragboar: Object.freeze({ type: "cragboar", name: "岩甲小豚", family: "beast", artType: "hound", baseLevel: 7, hp: 112, attack: 21, defense: 9, speed: 6, moveRange: 4, attackRange: 1, xp: 55, coins: 28, ability: "碎岩衝撞", drop: { id: "crag-tusk", name: "岩豚短牙", chance: 0.28 } }),
    hollowmage: Object.freeze({ type: "hollowmage", name: "空殼術士", family: "spirit", artType: "wisp", baseLevel: 8, hp: 88, attack: 24, defense: 6, speed: 9, moveRange: 4, attackRange: 3, xp: 68, coins: 34, ability: "黯霧彈", drop: { id: "hollow-rune", name: "空殼符片", chance: 0.25 } }),
    "lantern-golem": Object.freeze({ type: "lantern-golem", name: "失控燈偶", family: "construct", artType: "boss", baseLevel: 10, hp: 168, attack: 28, defense: 13, speed: 5, moveRange: 4, attackRange: 2, xp: 105, coins: 55, ability: "過熱燈炮", drop: { id: "golem-core", name: "燈偶核心", chance: 0.45 } }),
    deepwarden: Object.freeze({ type: "deepwarden", name: "深霧看守者", family: "boss", artType: "boss", baseLevel: 12, hp: 420, attack: 36, defense: 16, speed: 8, moveRange: 4, attackRange: 2, xp: 320, coins: 180, ability: "黑潮燈滅", drop: { id: "warden-lens", name: "看守者霧鏡", chance: 1 }, boss: true }),
  });

  function monsterBlueprint(type) { return MONSTER_BLUEPRINTS[type] || null; }
  function hydrateMonsterSpawn(spawn) {
    const blueprint = monsterBlueprint(spawn?.type);
    if (!blueprint || !spawn) return spawn ? { ...spawn } : null;
    return {
      ...blueprint,
      ...spawn,
      stats: { hp: blueprint.hp, attack: blueprint.attack, defense: blueprint.defense, speed: blueprint.speed, moveRange: blueprint.moveRange, attackRange: blueprint.attackRange },
      reward: { xp: blueprint.xp, coins: blueprint.coins, drop: blueprint.drop },
    };
  }
  return { MONSTER_BLUEPRINTS, monsterBlueprint, hydrateMonsterSpawn };
});
