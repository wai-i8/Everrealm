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
    "title": "山雀仔討伐",
    "description": "清理山路附近受驚的山雀仔，讓往來的旅人可以安心通行。",
    "recommendedLevel": 1,
    "repeatable": true,
    "objective": {
      "monster_id": "chick",
      "count": 5
    },
    "reward": {
      "skill_envelope_star": 1
    }
  },
  {
    "id": "guild_delivery_mountain_2star",
    "star": 2,
    "type": "delivery",
    "title": "山地送信",
    "description": "把公會信件送到山地遠端的常駐信使手上。",
    "recommendedLevel": 3,
    "repeatable": true,
    "objective": {
      "recipient_npc_id": "mountain_delivery_recipient",
      "count": 1
    },
    "reward": {
      "skill_envelope_star": 2
    }
  },
  {
    "id": "guild_hunt_coyote_3star",
    "star": 3,
    "type": "hunt",
    "title": "郊狼討伐",
    "description": "壓制灰霧邊界結群出沒的郊狼，免得牠們追上落單旅人。",
    "recommendedLevel": 4,
    "repeatable": true,
    "objective": {
      "monster_id": "coyote",
      "count": 5
    },
    "reward": {
      "skill_envelope_star": 3
    }
  },
  {
    "id": "guild_hunt_bear_4star",
    "star": 4,
    "type": "hunt",
    "title": "岩穴熊討伐",
    "description": "挑戰沉燈坑道深處的岩穴熊，替深入礦坑的隊伍清出道路。",
    "recommendedLevel": 7,
    "repeatable": true,
    "objective": {
      "monster_id": "bear",
      "count": 5
    },
    "reward": {
      "skill_envelope_star": 4
    }
  },
  {
    "id": "guild_hunt_snake_5star",
    "star": 5,
    "type": "hunt",
    "title": "毒霧蛇討伐",
    "description": "深入沉燈坑道，處理會以毒霧封路的毒霧蛇。",
    "recommendedLevel": 8,
    "repeatable": true,
    "objective": {
      "monster_id": "snake",
      "count": 5
    },
    "reward": {
      "skill_envelope_star": 5
    }
  }
].map((entry) => Object.freeze({ ...entry, objective: Object.freeze({ ...(entry.objective || {}) }), reward: Object.freeze({ ...(entry.reward || {}) }) })));
  return { GUILD_COMMISSIONS };
});
