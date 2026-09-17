(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmQuestData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const GUILD_COMMISSIONS = Object.freeze([
  {
    "id": "guild_hunt_chick_1star",
    "star": 1,
    "type": "hunt",
    "title": "山野小雞討伐",
    "description": "清理山路附近受驚的山野小雞，讓往來的旅人可以安心通行。",
    "recommendedLevel": 1,
    "repeatable": true,
    "objective": {
      "monster_id": "chick",
      "count": 5
    },
    "reward": {
      "skill_envelope_star": 1,
      "coins": 160
    }
  },
  {
    "id": "guild_wish_pool_2star",
    "star": 2,
    "type": "wish",
    "title": "代客許願",
    "description": "有位居民堅信山地深處嗰個古怪水池非常靈驗。只不過……今日佢唔想行咁遠，所以決定請冒險者代佢許願。",
    "recommendedLevel": 3,
    "repeatable": true,
    "objective": {
      "interaction_id": "mountain-wish-pool",
      "count": 1
    },
    "reward": {
      "skill_envelope_star": 2,
      "coins": 560
    }
  },
  {
    "id": "guild_hunt_raccoon_3star",
    "star": 3,
    "type": "hunt",
    "title": "灰紋浣熊討伐",
    "description": "驅走山路附近結群翻找行囊的灰紋浣熊，免得旅人一轉身就少咗乾糧。",
    "recommendedLevel": 10,
    "repeatable": true,
    "objective": {
      "monster_id": "raccoon",
      "count": 5
    },
    "reward": {
      "skill_envelope_star": 3,
      "coins": 1040
    }
  },
  {
    "id": "guild_hunt_frog_5star",
    "star": 5,
    "type": "hunt",
    "title": "霧沼蛙討伐",
    "description": "處理積水地帶出沒的霧沼蛙，避免牠們用長舌同黏液封住前路。",
    "recommendedLevel": 21,
    "repeatable": true,
    "objective": {
      "monster_id": "frog",
      "count": 5
    },
    "reward": {
      "skill_envelope_star": 5,
      "coins": 2000
    }
  },
  {
    "id": "guild_hunt_turtle_7star",
    "star": 7,
    "type": "hunt",
    "title": "苔甲龜討伐",
    "description": "深入危險區域討伐厚甲苔龜；牠行得慢，但一轉起龜殼就絕對唔慢。",
    "recommendedLevel": 33,
    "repeatable": true,
    "objective": {
      "monster_id": "turtle",
      "count": 5
    },
    "reward": {
      "skill_envelope_star": 7,
      "coins": 3000
    }
  }
].map((entry) => Object.freeze({ ...entry, objective: Object.freeze({ ...(entry.objective || {}) }), reward: Object.freeze({ ...(entry.reward || {}) }) })));
  return { GUILD_COMMISSIONS };
});
