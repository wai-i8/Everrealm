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

  const MONSTERS = deepFreeze({
    chick: {
      id: "chick",
      name: { zh: "山野小雞", en: "Mountain Chick" },
      family: "bird",
      progression: { rank: 1, level: 1 },
      encounter: { count: 1 },
      stats: { hp: 24, attack: 7, defense: 0 },
      combat: { moveRange: 5, role: "training_melee", skills: ["peck"] },
      rewards: { baseXp: 22, coins: 7, drops: [{ id: "bright_feather", chance: 0.25 }] },
      habitat: { maps: ["field"], zones: ["mountain-road"] },
      questTags: ["bird", "field"],
      locomotion: { status: "approved", assetKey: "chick", atlas: "assets/locomotion/chick-v1.png", sourceArt: null },
      codex: { summary: "棲息山野的小雞，動作快但攻擊單純，是最基礎的近身對手。" },
      exploration: { speed: 92, radius: 15, aggro: 225, color: "#d89d42" },
    },
    fox: {
      id: "fox",
      name: { zh: "赤尾狐", en: "Redtail Fox" },
      family: "beast",
      progression: { rank: 2, level: 5 },
      encounter: { count: 2 },
      stats: { hp: 48, attack: 10, defense: 1 },
      combat: { moveRange: 6, role: "agile_melee", skills: ["quick_bite", "fox_pounce"] },
      rewards: { baseXp: 45, coins: 10, drops: [{ id: "fox_fang", chance: 0.25 }] },
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
      stats: { hp: 90, attack: 14, defense: 4 },
      combat: { moveRange: 4, role: "balanced_melee", skills: ["raccoon_claw", "flurry_claw"] },
      rewards: { baseXp: 90, coins: 16, drops: [{ id: "lantern_pelt", chance: 0.3 }] },
      habitat: { maps: ["field"], zones: ["mountain-road"] },
      questTags: ["beast", "field"],
      locomotion: { status: "approved", assetKey: "raccoon", atlas: "assets/locomotion/raccoon-v1.png", sourceArt: null },
      codex: { summary: "灰紋厚毛的浣熊，攻防平均，會在 AP 足夠時改用連環抓。" },
      exploration: { speed: 100, radius: 15, aggro: 225, color: "#7c6656" },
    },
    wild_boar: {
      id: "wild_boar",
      name: { zh: "荒原野豬", en: "Wild Boar" },
      family: "beast",
      progression: { rank: 4, level: 15 },
      encounter: { count: 3 },
      stats: { hp: 105, attack: 16, defense: 4 },
      combat: { moveRange: 4, role: "charger", skills: ["tusk_strike", "boar_charge"] },
      rewards: { baseXp: 80, coins: 15, drops: [{ id: "boar_tusk", chance: 0.28 }] },
      habitat: { maps: ["field"], zones: ["mountain-road"] },
      questTags: ["beast", "charge", "field"],
      locomotion: { status: "approved", assetKey: "wild_boar", atlas: "assets/locomotion/wild-boar-v1.png", sourceArt: "assets/monster-sources/wild-boar.png" },
      codex: { summary: "粗壯的荒原野豬，通常三隻一組；正面衝鋒危險，但可用走位避開其直線攻擊。" },
      exploration: { speed: 104, radius: 17, aggro: 225, color: "#9a684c" },
    },
    frog: {
      id: "frog",
      name: { zh: "霧沼蛙", en: "Mist Marsh Frog" },
      family: "amphibian",
      progression: { rank: 5, level: 21 },
      encounter: { count: 1 },
      stats: { hp: 150, attack: 20, defense: 5 },
      combat: { moveRange: 4, role: "ranged_control", skills: ["tongue_strike", "slime_shot"] },
      rewards: { baseXp: 180, coins: 26, drops: [{ id: "mist_gland", chance: 0.24 }] },
      habitat: { maps: ["dungeon"], zones: ["flooded-ruins"] },
      questTags: ["amphibian", "ranged", "dungeon"],
      locomotion: { status: "approved", assetKey: "frog", atlas: "assets/locomotion/frog-v1.png", sourceArt: "assets/monster-sources/frog.png" },
      codex: { summary: "棲息濕地與積水坑道的青蛙，以長舌和黏液彈控制中距離。" },
      exploration: { speed: 88, radius: 15, aggro: 225, color: "#7ba15a" },
    },
    coyote: {
      id: "coyote",
      name: { zh: "灰原郊狼", en: "Greyland Coyote" },
      family: "beast",
      progression: { rank: 6, level: 27 },
      encounter: { count: 3 },
      stats: { hp: 135, attack: 24, defense: 4 },
      combat: { moveRange: 5, role: "pack_hunter", skills: ["coyote_bite", "hunting_pounce"] },
      rewards: { baseXp: 130, coins: 22, drops: [{ id: "coyote_fang", chance: 0.25 }] },
      habitat: { maps: ["field", "dungeon"], zones: ["mountain-depths", "mine-entrance"] },
      questTags: ["beast", "hunter", "field", "dungeon"],
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
      stats: { hp: 280, attack: 24, defense: 16 },
      combat: { moveRange: 2, role: "slow_aoe", skills: ["shell_ram", "spinning_shell"] },
      rewards: { baseXp: 300, coins: 38, drops: [{ id: "moss_shell", chance: 0.28 }] },
      habitat: { maps: ["dungeon"], zones: ["deep-mine"] },
      questTags: ["reptile", "dungeon", "aoe"],
      locomotion: { status: "approved", assetKey: "turtle", atlas: "assets/locomotion/turtle-v1.png", sourceArt: "assets/monster-sources/turtle.png" },
      codex: { summary: "背殼覆滿苔痕的厚重陸龜；移動緩慢，但會翻轉龜殼旋轉攻擊周圍八格並擊退目標。" },
      exploration: { speed: 62, radius: 19, aggro: 225, color: "#6e8e67" },
    },
    snake: {
      id: "snake",
      name: { zh: "毒霧蛇", en: "Venom Mist Snake" },
      family: "reptile",
      progression: { rank: 8, level: 39 },
      encounter: { count: 2 },
      stats: { hp: 190, attack: 32, defense: 7 },
      combat: { moveRange: 5, role: "ranged_poison", skills: ["venom_fang", "venom_spit"] },
      rewards: { baseXp: 220, coins: 34, drops: [{ id: "venom_sac", chance: 0.3 }] },
      habitat: { maps: ["dungeon"], zones: ["deep-mine"] },
      questTags: ["reptile", "poison", "deep"],
      locomotion: { status: "approved", assetKey: "snake", atlas: "assets/locomotion/snake-v1.png", sourceArt: "assets/monster-sources/snake.png" },
      codex: { summary: "兩條一組出現的毒霧蛇，會優先利用遠距離毒液噴吐，而非無必要貼近目標。" },
      exploration: { speed: 96, radius: 15, aggro: 225, color: "#d09535" },
    },
    bear: {
      id: "bear",
      name: { zh: "岩穴熊", en: "Cave Bear" },
      family: "beast",
      progression: { rank: 9, level: 45 },
      encounter: { count: 1 },
      stats: { hp: 520, attack: 42, defense: 18 },
      combat: { moveRange: 3, role: "heavy_bruiser", skills: ["heavy_palm", "quake_palm"] },
      rewards: { baseXp: 520, coins: 70, drops: [{ id: "bear_claw", chance: 0.25 }] },
      habitat: { maps: ["dungeon"], zones: ["deep-mine"] },
      questTags: ["beast", "deep"],
      locomotion: { status: "approved", assetKey: "bear", atlas: "assets/locomotion/bear-v1.png", sourceArt: "assets/monster-sources/bear.png" },
      codex: { summary: "目前普通怪物中最強壯的岩穴熊，步伐不快，但近身重掌與震地掌威力極高。" },
      exploration: { speed: 78, radius: 28, aggro: 225, color: "#a66f45" },
    },
  });

  // Compatibility only. New maps, quests and saves must author canonical IDs above.
  const LEGACY_MONSTER_MIGRATION = deepFreeze({
    slime: { id: "raccoon", reason: "舊版一般野外怪物" },
    wisp: { id: "chick", reason: "舊版飛行外觀" },
    hound: { id: "fox", reason: "舊版犬科野獸" },
    mossbun: { id: "raccoon", reason: "舊版坑道小型怪物" },
    mistwing: { id: "frog", reason: "舊版坑道飛行怪物" },
    cragboar: { id: "wild_boar", reason: "舊版野豬" },
    hollowmage: { id: "snake", reason: "舊版深窟遠程怪物" },
    "lantern-golem": { id: "turtle", reason: "舊版防禦型坑道怪物" },
    deepwarden: { id: "bear", reason: "舊版地城首領名稱；現行只有普通岩穴熊" },
    boss: { id: "bear", reason: "舊版首領兼容別名；現行沒有 Boss 怪物" },
  });

  return { MONSTER_LEVEL_CAP, SKILLS, MONSTERS, LEGACY_MONSTER_MIGRATION };
});
