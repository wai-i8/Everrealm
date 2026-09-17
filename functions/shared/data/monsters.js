(function (root, factory) {
  const monsterSkills = root.EverrealmMonsterSkillData
    || (typeof require === "function" ? require("./skills/monster.js") : null);
  const api = factory(monsterSkills);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmMonsterData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (monsterSkills) {
  "use strict";

  const MONSTER_LEVEL_CAP = 45;
  const SKILLS = monsterSkills?.SKILLS || Object.freeze({});

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  // Base ATK/DEF tracks the impact-oriented Fighter gear curve at the same level.
  // Encounter size only scales HP; role-specific exceptions are turtle (tank),
  // snake (glass-cannon) and bear (heavy bruiser).
  const MONSTERS = deepFreeze({
    chick: {
      id: "chick",
      name: { zh: "山地小雞", en: "Mountain Chick" },
      family: "bird",
      progression: { rank: 1, level: 1 },
      encounter: { count: 1 },
      stats: { hp: 120, attack: 95, defense: 15 },
      combat: { moveRange: 5, role: "training_melee", skills: ["peck"] },
      rewards: { baseXp: 100, coins: 0, drops: [] },
      habitat: { maps: ["field"], zones: ["mountain-road"] },
      questTags: ["bird", "field"],
      locomotion: { status: "approved", assetKey: "chick", atlas: "assets/locomotion/chick-v1.png", sourceArt: null },
      codex: { summary: "棲息山地的小雞，動作快但攻擊單純，是最基礎的近身對手。" },
      exploration: { speed: 92, radius: 15, aggro: 225, color: "#d89d42" },
    },
    fox: {
      id: "fox",
      name: { zh: "赤尾狐", en: "Redtail Fox" },
      family: "beast",
      progression: { rank: 2, level: 5 },
      encounter: { count: 2 },
      stats: { hp: 300, attack: 140, defense: 50 },
      combat: { moveRange: 6, role: "agile_melee", skills: ["quick_bite", "fox_pounce"] },
      rewards: { baseXp: 100, coins: 0, drops: [] },
      habitat: { maps: ["field"], zones: ["mountain-road"] },
      questTags: ["beast", "field"],
      locomotion: { status: "approved", assetKey: "fox", atlas: "assets/locomotion/fox-v1.png", sourceArt: null },
      codex: { summary: "赤紅尾毛的敏捷狐狸，常成雙出現，會利用飛撲縮短攻擊距離。" },
      exploration: { speed: 104, radius: 15, aggro: 225, color: "#c9783e" },
    },
    raccoon: {
      id: "raccoon",
      name: { zh: "灰紋浣熊", en: "Greystripe Raccoon" },
      family: "beast",
      progression: { rank: 3, level: 10 },
      encounter: { count: 1 },
      stats: { hp: 450, attack: 170, defense: 55 },
      combat: { moveRange: 4, role: "balanced_melee", skills: ["raccoon_claw", "flurry_claw"] },
      rewards: { baseXp: 100, coins: 0, drops: [] },
      habitat: { maps: ["field"], zones: ["mountain-road"] },
      questTags: ["beast", "field"],
      locomotion: { status: "approved", assetKey: "raccoon", atlas: "assets/locomotion/raccoon-v1.png", sourceArt: null },
      codex: { summary: "灰紋厚毛的浣熊，攻防平均，會在 AP 足夠時改用連環抓。" },
      exploration: { speed: 100, radius: 15, aggro: 225, color: "#7c6656" },
    },
    frog: {
      id: "frog",
      name: { zh: "沼澤蛙", en: "Marsh Frog" },
      family: "amphibian",
      progression: { rank: 4, level: 15 },
      encounter: { count: 1 },
      stats: { hp: 800, attack: 225, defense: 80 },
      combat: { moveRange: 4, role: "ranged_control", skills: ["tongue_strike", "slime_shot"] },
      rewards: { baseXp: 100, coins: 0, drops: [] },
      habitat: { maps: ["field", "mountain-southeast"], zones: ["mountain-road", "mountain-wetland"] },
      questTags: ["amphibian", "ranged", "mountain"],
      locomotion: { status: "approved", assetKey: "frog", atlas: "assets/locomotion/frog-v1.png", sourceArt: "assets/monster-sources/frog.png" },
      codex: { summary: "棲息濕地與積水坑道的青蛙，以長舌和黏液彈控制中距離。" },
      exploration: { speed: 88, radius: 15, aggro: 225, color: "#7ba15a" },
    },
    blackcat: {
      id: "blackcat",
      name: { zh: "幽影黑貓", en: "Shadow Black Cat" },
      family: "beast",
      progression: { rank: 5, level: 21 },
      encounter: { count: 3 },
      stats: { hp: 750, attack: 195, defense: 75 },
      combat: { moveRange: 5, role: "agile_melee", skills: ["raccoon_claw", "flurry_claw"] },
      rewards: { baseXp: 100, coins: 0, drops: [] },
      habitat: { maps: ["field"], zones: ["mountain-road"] },
      questTags: ["beast", "shadow", "field"],
      locomotion: { status: "battle-approved", assetKey: "blackcat", atlas: "assets/battle/blackcat/blackcat-battle-diagonal-v1.png", sourceArt: null },
      codex: { summary: "潛伏山路陰影中的黑貓，會以迅捷爪擊和連環抓撕開防線。" },
      exploration: { speed: 108, radius: 17, aggro: 225, color: "#51485d" },
    },
    coyote: {
      id: "coyote",
      name: { zh: "灰原郊狼", en: "Greyland Coyote" },
      family: "beast",
      progression: { rank: 6, level: 27 },
      encounter: { count: 3 },
      stats: { hp: 1000, attack: 275, defense: 105 },
      combat: { moveRange: 5, role: "pack_hunter", skills: ["coyote_bite", "hunting_pounce"] },
      rewards: { baseXp: 100, coins: 0, drops: [] },
      habitat: { maps: ["field", "mountain-southeast"], zones: ["mountain-depths", "mountain-southeast"] },
      questTags: ["beast", "hunter", "field", "mountain"],
      locomotion: { status: "approved", assetKey: "coyote", atlas: "assets/locomotion/coyote-v1.png", sourceArt: "assets/monster-sources/coyote.png" },
      codex: { summary: "高機動的灰原郊狼，三隻結伴狩獵，會以飛撲快速建立包圍壓力。" },
      exploration: { speed: 112, radius: 17, aggro: 225, color: "#8a847a" },
    },
    turtle: {
      id: "turtle",
      name: { zh: "苔甲龜", en: "Mossback Turtle" },
      family: "reptile",
      progression: { rank: 7, level: 33 },
      encounter: { count: 1 },
      stats: { hp: 1400, attack: 355, defense: 190 },
      combat: { moveRange: 2, role: "slow_aoe", skills: ["shell_ram", "spinning_shell"] },
      rewards: { baseXp: 100, coins: 0, drops: [] },
      habitat: { maps: ["mountain-southeast"], zones: ["mountain-southeast"] },
      questTags: ["reptile", "mountain", "aoe"],
      locomotion: { status: "approved", assetKey: "turtle", atlas: "assets/locomotion/turtle-v1.png", sourceArt: "assets/monster-sources/turtle.png" },
      codex: { summary: "背殼覆滿苔痕的厚重陸龜；移動緩慢，但會翻轉龜殼旋轉攻擊周圍八格並擊退目標。" },
      exploration: { speed: 62, radius: 19, aggro: 225, color: "#6e8e67" },
    },
    snake: {
      id: "snake",
      name: { zh: "噴毒蛇", en: "Spitting Venom Snake" },
      family: "reptile",
      progression: { rank: 8, level: 39 },
      encounter: { count: 2 },
      stats: { hp: 1200, attack: 420, defense: 130 },
      combat: { moveRange: 5, role: "ranged_poison", skills: ["venom_fang", "venom_spit"] },
      rewards: { baseXp: 100, coins: 0, drops: [] },
      habitat: { maps: ["mountain-southeast"], zones: ["mountain-southeast"] },
      questTags: ["reptile", "poison", "deep"],
      locomotion: { status: "approved", assetKey: "snake", atlas: "assets/locomotion/snake-v1.png", sourceArt: "assets/monster-sources/snake.png" },
      codex: { summary: "兩條一組出現的噴毒蛇，會優先利用遠距離毒液噴吐，而非無必要貼近目標。" },
      exploration: { speed: 96, radius: 15, aggro: 225, color: "#d09535" },
    },
    bear: {
      id: "bear",
      name: { zh: "岩穴熊", en: "Cave Bear" },
      family: "beast",
      progression: { rank: 9, level: 45 },
      encounter: { count: 1 },
      stats: { hp: 2600, attack: 500, defense: 200 },
      combat: { moveRange: 3, role: "heavy_bruiser", skills: ["heavy_palm", "quake_palm"] },
      rewards: { baseXp: 100, coins: 0, drops: [] },
      habitat: { maps: ["mountain-southeast"], zones: ["mountain-southeast"] },
      questTags: ["beast", "deep"],
      locomotion: { status: "approved", assetKey: "bear", atlas: "assets/locomotion/bear-v1.png", sourceArt: "assets/monster-sources/bear.png" },
      codex: { summary: "目前普通怪物中最強壯的岩穴熊，步伐不快，但近身重掌與震地掌威力極高。" },
      exploration: { speed: 78, radius: 28, aggro: 225, color: "#a66f45" },
    },
  });

  return { MONSTER_LEVEL_CAP, SKILLS, MONSTERS };
});
