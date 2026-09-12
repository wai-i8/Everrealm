(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmEquipmentData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const EQUIPMENT_SLOTS = Object.freeze(["head", "weapon", "upperBody", "lowerBody", "hands", "feet", "charm"]);
  const EQUIPMENT_SHOP_SLOTS = Object.freeze(["weapon", "head", "upperBody", "lowerBody"]);
  const LEGACY_EQUIPMENT_SLOT_ALIASES = Object.freeze({ body: "upperBody", armor: "upperBody" });
  const EQUIPMENT_STAT_KEYS = Object.freeze(["attack", "defense", "maxHp", "speed", "critChance", "moveRange", "accuracy", "evasion", "weight"]);
  const RAW_EQUIPMENT_CATALOG = [
  {
    "id": "novice_blade",
    "slot": "weapon",
    "occupiesSlots": [
      "weapon"
    ],
    "name": "見習燈刃",
    "description": "拾燈人最初使用的短刃，輕巧可靠。",
    "cost": 0,
    "requiredLevel": 1,
    "purchasable": false,
    "classId": "warrior",
    "iconIndex": 0,
    "stats": {
      "attack": 2,
      "defense": 0,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 2
    },
    "legacyOnly": false,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 0
    }
  },
  {
    "id": "novice_gloves",
    "slot": "weapon",
    "occupiesSlots": [
      "weapon"
    ],
    "name": "見習拳套",
    "description": "格鬥士初學者使用的軟皮拳套，護腕靈活而穩固。",
    "cost": 0,
    "requiredLevel": 1,
    "purchasable": false,
    "classId": "fighter",
    "iconIndex": 0,
    "stats": {
      "attack": 19,
      "defense": 0,
      "maxHp": 0,
      "speed": 2,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 1
    },
    "legacyOnly": false,
    "icon": {
      "type": "atlas",
      "atlas": "fighter-equipment",
      "index": 0
    }
  },
  {
    "id": "tide_iron_knuckles",
    "slot": "weapon",
    "occupiesSlots": [
      "weapon"
    ],
    "name": "潮鐵拳套",
    "description": "以輕量潮鐵護住指節，適合快速連拳。",
    "cost": 95,
    "requiredLevel": 1,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 1,
    "stats": {
      "attack": 5,
      "defense": 0,
      "maxHp": 0,
      "speed": 2,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 2
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "fighter-equipment",
      "index": 1
    }
  },
  {
    "id": "gale_gauntlets",
    "slot": "weapon",
    "occupiesSlots": [
      "weapon"
    ],
    "name": "疾風護拳",
    "description": "薄甲拳套帶動氣流，令出拳同走位更快。",
    "cost": 360,
    "requiredLevel": 7,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 2,
    "stats": {
      "attack": 12,
      "defense": 0,
      "maxHp": 0,
      "speed": 8,
      "critChance": 0.03,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 2
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "fighter-equipment",
      "index": 2
    }
  },
  {
    "id": "dragon_knuckles",
    "slot": "weapon",
    "occupiesSlots": [
      "weapon"
    ],
    "name": "昇龍鋼拳",
    "description": "公會格鬥教官鍛造的重拳套，專為決勝連擊而設。",
    "cost": 980,
    "requiredLevel": 15,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 3,
    "stats": {
      "attack": 26,
      "defense": 3,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0.04,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 5
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "fighter-equipment",
      "index": 3
    }
  },
  {
    "id": "metal_knuckles",
    "slot": "weapon",
    "occupiesSlots": [
      "weapon"
    ],
    "name": "金屬拳套",
    "description": "以鍛造金屬包覆指節，係格鬥士第一件正式升級拳套。",
    "cost": 450,
    "requiredLevel": 6,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 0,
    "stats": {
      "attack": 23,
      "defense": 0,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 3
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/metal_knuckles.png"
    }
  },
  {
    "id": "giz_armguard",
    "slot": "weapon",
    "occupiesSlots": [
      "weapon"
    ],
    "name": "基茲臂鎧",
    "description": "護住前臂與拳面的硬質臂鎧，令連拳更沉實。",
    "cost": 1800,
    "requiredLevel": 12,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 1,
    "stats": {
      "attack": 27,
      "defense": 0,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 4
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/giz_armguard.png"
    }
  },
  {
    "id": "heavy_knuckles",
    "slot": "weapon",
    "occupiesSlots": [
      "weapon"
    ],
    "name": "重拳套",
    "description": "厚重拳套將身體重量集中到每一記直拳。",
    "cost": 4050,
    "requiredLevel": 18,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 2,
    "stats": {
      "attack": 33,
      "defense": 0,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 6
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/heavy_knuckles.png"
    }
  },
  {
    "id": "superheavy_knuckles",
    "slot": "weapon",
    "occupiesSlots": [
      "weapon"
    ],
    "name": "超重量拳套",
    "description": "極重金屬拳套，為熟練格鬥士換取更高爆發力。",
    "cost": 7200,
    "requiredLevel": 24,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 3,
    "stats": {
      "attack": 39,
      "defense": 0,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 8
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/superheavy_knuckles.png"
    }
  },
  {
    "id": "fighter_headband",
    "slot": "head",
    "occupiesSlots": [
      "head"
    ],
    "name": "額巾",
    "description": "最基本的布製額巾，輕便而不妨礙拳路。",
    "cost": 40,
    "requiredLevel": 1,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 0,
    "stats": {
      "attack": 0,
      "defense": 2,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 1
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/fighter_headband.png"
    }
  },
  {
    "id": "topknot_cap",
    "slot": "head",
    "occupiesSlots": [
      "head"
    ],
    "name": "髮髻帽",
    "description": "整齊束髮的修行者帽，適合日常練武。",
    "cost": 720,
    "requiredLevel": 6,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 0,
    "stats": {
      "attack": 0,
      "defense": 3,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 1
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/topknot_cap.png"
    }
  },
  {
    "id": "continental_hat",
    "slot": "head",
    "occupiesSlots": [
      "head"
    ],
    "name": "大陸帽子",
    "description": "遊歷武者常用的帽子，兼顧遮護與活動性。",
    "cost": 2420,
    "requiredLevel": 11,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 0,
    "stats": {
      "attack": 0,
      "defense": 3,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 1
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/continental_hat.png"
    }
  },
  {
    "id": "fighter_head_guard",
    "slot": "head",
    "occupiesSlots": [
      "head"
    ],
    "name": "護頭具",
    "description": "以皮革與金屬補強額側，承受近身交鋒的撞擊。",
    "cost": 5120,
    "requiredLevel": 16,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 0,
    "stats": {
      "attack": 0,
      "defense": 4,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 2
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/fighter_head_guard.png"
    }
  },
  {
    "id": "floral_topknot_cap",
    "slot": "head",
    "occupiesSlots": [
      "head"
    ],
    "name": "鮮花髮髻帽",
    "description": "高階武鬥家使用的精緻髮髻帽，以花飾彰顯修行造詣。",
    "cost": 8820,
    "requiredLevel": 21,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 0,
    "stats": {
      "attack": 0,
      "defense": 4,
      "maxHp": 0,
      "speed": 1,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 2
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/floral_topknot_cap.png"
    }
  },
  {
    "id": "tide_iron_sword",
    "slot": "weapon",
    "occupiesSlots": [
      "weapon"
    ],
    "name": "潮鐵劍",
    "description": "以霧都潮鐵打製，劍身會映出淡藍微光。",
    "cost": 90,
    "requiredLevel": 1,
    "purchasable": true,
    "classId": null,
    "iconIndex": 1,
    "stats": {
      "attack": 5,
      "defense": 0,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 2
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 1
    }
  },
  {
    "id": "windfeather_dagger",
    "slot": "weapon",
    "occupiesSlots": [
      "weapon"
    ],
    "name": "風羽短刀",
    "description": "快得像海鳥掠過水面，適合靈巧的冒險者。",
    "cost": 190,
    "requiredLevel": 4,
    "purchasable": true,
    "classId": null,
    "iconIndex": 2,
    "stats": {
      "attack": 8,
      "defense": 0,
      "maxHp": 0,
      "speed": 6,
      "critChance": 0.03,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 1
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 2
    }
  },
  {
    "id": "lantern_sabre",
    "slot": "weapon",
    "occupiesSlots": [
      "weapon"
    ],
    "name": "曜燈彎刀",
    "description": "刀脊藏有燈晶，揮舞時會留下金色光弧。",
    "cost": 380,
    "requiredLevel": 7,
    "purchasable": true,
    "classId": null,
    "iconIndex": 3,
    "stats": {
      "attack": 14,
      "defense": 0,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0.04,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 3
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 3
    }
  },
  {
    "id": "starfall_glaive",
    "slot": "weapon",
    "occupiesSlots": [
      "weapon"
    ],
    "name": "墜星長刃",
    "description": "從地城隕鐵重鑄而成，沉重但威力驚人。",
    "cost": 720,
    "requiredLevel": 12,
    "purchasable": true,
    "classId": null,
    "iconIndex": 4,
    "stats": {
      "attack": 22,
      "defense": 2,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 5
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 4
    }
  },
  {
    "id": "dawn_oath",
    "slot": "weapon",
    "occupiesSlots": [
      "weapon"
    ],
    "name": "破曉誓約",
    "description": "公會高手夢寐以求的燈刃，光芒從不熄滅。",
    "cost": 1250,
    "requiredLevel": 17,
    "purchasable": true,
    "classId": null,
    "iconIndex": 5,
    "stats": {
      "attack": 31,
      "defense": 0,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0.05,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 7
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 5
    }
  },
  {
    "id": "traveller_coat",
    "slot": "upperBody",
    "occupiesSlots": [
      "upperBody"
    ],
    "name": "旅行者短衣",
    "description": "方便活動的厚布衣，是冒險的第一件護甲。",
    "cost": 0,
    "requiredLevel": 1,
    "purchasable": false,
    "classId": null,
    "iconIndex": 6,
    "stats": {
      "attack": 0,
      "defense": 1,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 2
    },
    "legacyOnly": false,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 6
    }
  },
  {
    "id": "guild_mail",
    "slot": "upperBody",
    "occupiesSlots": [
      "upperBody"
    ],
    "name": "公會鎖衣",
    "description": "公會制式護甲，能擋住一般魔物的爪牙。",
    "cost": 120,
    "requiredLevel": 2,
    "purchasable": true,
    "classId": null,
    "iconIndex": 7,
    "stats": {
      "attack": 0,
      "defense": 3,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 4
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 7
    }
  },
  {
    "id": "mistweave_cape",
    "slot": "upperBody",
    "occupiesSlots": [
      "upperBody"
    ],
    "name": "霧織斗篷",
    "description": "以霧蛛絲織成，防護與靈活兼備。",
    "cost": 290,
    "requiredLevel": 6,
    "purchasable": true,
    "classId": null,
    "iconIndex": 8,
    "stats": {
      "attack": 0,
      "defense": 5,
      "maxHp": 0,
      "speed": 5,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 3
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 8
    }
  },
  {
    "id": "cavern_guard",
    "slot": "upperBody",
    "occupiesSlots": [
      "upperBody"
    ],
    "name": "岩窟守衛甲",
    "description": "厚重岩片內襯燈晶，專為深入地城而設。",
    "cost": 560,
    "requiredLevel": 10,
    "purchasable": true,
    "classId": null,
    "iconIndex": 9,
    "stats": {
      "attack": 0,
      "defense": 9,
      "maxHp": 0,
      "speed": -8,
      "critChance": 0,
      "moveRange": -1,
      "accuracy": 0,
      "evasion": 0,
      "weight": 8
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 9
    }
  },
  {
    "id": "aurora_plate",
    "slot": "upperBody",
    "occupiesSlots": [
      "upperBody"
    ],
    "name": "曙光輕鎧",
    "description": "像朝霞般輕盈，卻可化開猛烈衝擊。",
    "cost": 1080,
    "requiredLevel": 16,
    "purchasable": true,
    "classId": null,
    "iconIndex": 10,
    "stats": {
      "attack": 0,
      "defense": 14,
      "maxHp": 0,
      "speed": 4,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 6
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 10
    }
  },
  {
    "id": "disciple_gi",
    "slot": "upperBody",
    "occupiesSlots": [
      "upperBody"
    ],
    "name": "門人衣服",
    "description": "以拳路為先的輕身上衣，犧牲部分防護換取攻勢。",
    "cost": 781,
    "requiredLevel": 5,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 6,
    "stats": {
      "attack": 2,
      "defense": 2,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 1
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/disciple_gi.png"
    }
  },
  {
    "id": "disciple_lower",
    "slot": "lowerBody",
    "occupiesSlots": [
      "lowerBody"
    ],
    "name": "門人下衣",
    "description": "方便沉腰發力的門人下衣，配合拳路訓練。",
    "cost": 500,
    "requiredLevel": 5,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 6,
    "stats": {
      "attack": 2,
      "defense": 2,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 1
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/disciple_lower.png"
    }
  },
  {
    "id": "disciple_handguards",
    "slot": "hands",
    "occupiesSlots": [
      "hands"
    ],
    "name": "門人手甲",
    "description": "輕量護手，令格鬥士出拳更穩。",
    "cost": 469,
    "requiredLevel": 5,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 7,
    "stats": {
      "attack": 2,
      "defense": 2,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 1
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 7
    }
  },
  {
    "id": "disciple_shoes",
    "slot": "feet",
    "occupiesSlots": [
      "feet"
    ],
    "name": "門人鞋子",
    "description": "貼地的練功鞋，保持穩定步法。",
    "cost": 469,
    "requiredLevel": 5,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 6,
    "stats": {
      "attack": 2,
      "defense": 2,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 1
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 6
    }
  },
  {
    "id": "training_wrap",
    "slot": "upperBody",
    "occupiesSlots": [
      "upperBody"
    ],
    "name": "練武用纏身布",
    "description": "纏身布減少多餘護甲，將力量集中於攻擊。",
    "cost": 6125,
    "requiredLevel": 14,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 6,
    "stats": {
      "attack": 3,
      "defense": 3,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 2
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/training_wrap.png"
    }
  },
  {
    "id": "training_belt",
    "slot": "lowerBody",
    "occupiesSlots": [
      "lowerBody"
    ],
    "name": "練武腰帶",
    "description": "緊束腰胯的練武腰帶，令出力更直接。",
    "cost": 3920,
    "requiredLevel": 14,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 6,
    "stats": {
      "attack": 3,
      "defense": 3,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 1
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/training_belt.png"
    }
  },
  {
    "id": "training_bracers",
    "slot": "hands",
    "occupiesSlots": [
      "hands"
    ],
    "name": "練武用護腕",
    "description": "保護腕骨同時維持拳路靈活的護腕。",
    "cost": 3675,
    "requiredLevel": 14,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 7,
    "stats": {
      "attack": 3,
      "defense": 3,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 1
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 7
    }
  },
  {
    "id": "training_zori",
    "slot": "feet",
    "occupiesSlots": [
      "feet"
    ],
    "name": "練武用草履",
    "description": "薄底草履帶來穩定的練武步伐。",
    "cost": 3675,
    "requiredLevel": 14,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 6,
    "stats": {
      "attack": 3,
      "defense": 3,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 1
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 6
    }
  },
  {
    "id": "conditioning_suit",
    "slot": "upperBody",
    "occupiesSlots": [
      "upperBody"
    ],
    "name": "鍛鍊服",
    "description": "為高強度拳鬥打造的輕身鍛鍊服，攻守取捨清晰。",
    "cost": 16531,
    "requiredLevel": 23,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 6,
    "stats": {
      "attack": 4,
      "defense": 4,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 3
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/conditioning_suit.png"
    }
  },
  {
    "id": "conditioning_skirt",
    "slot": "lowerBody",
    "occupiesSlots": [
      "lowerBody"
    ],
    "name": "鍛鍊褲裙",
    "description": "活動幅度寬廣的鍛鍊褲裙，支援低身拳路。",
    "cost": 10580,
    "requiredLevel": 23,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 6,
    "stats": {
      "attack": 4,
      "defense": 4,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 2
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/conditioning_skirt.png"
    }
  },
  {
    "id": "conditioning_handguards",
    "slot": "hands",
    "occupiesSlots": [
      "hands"
    ],
    "name": "鍛鍊手甲",
    "description": "強化指節與腕部的鍛鍊手甲。",
    "cost": 9919,
    "requiredLevel": 23,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 7,
    "stats": {
      "attack": 4,
      "defense": 4,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 2
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 7
    }
  },
  {
    "id": "conditioning_shoes",
    "slot": "feet",
    "occupiesSlots": [
      "feet"
    ],
    "name": "鍛鍊鞋",
    "description": "為持久步法與連擊而設的鍛鍊鞋。",
    "cost": 9919,
    "requiredLevel": 23,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 6,
    "stats": {
      "attack": 4,
      "defense": 4,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 2
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 6
    }
  },
  {
    "id": "white_martial_gi",
    "slot": "upperBody",
    "occupiesSlots": [
      "upperBody",
      "lowerBody"
    ],
    "name": "白色武道服",
    "description": "覆蓋上下身的一件式武道服，重點在靈活步法。",
    "cost": 4375,
    "requiredLevel": 10,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 8,
    "stats": {
      "attack": 0,
      "defense": 3,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 1,
      "accuracy": 0,
      "evasion": 0,
      "weight": 2
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/white_martial_gi.png"
    }
  },
  {
    "id": "cloth_bracers",
    "slot": "hands",
    "occupiesSlots": [
      "hands"
    ],
    "name": "布製護腕",
    "description": "輕便布護腕，不拖慢拳路。",
    "cost": 1875,
    "requiredLevel": 10,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 7,
    "stats": {
      "attack": 1,
      "defense": 0,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 1
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 7
    }
  },
  {
    "id": "barefoot_bands",
    "slot": "feet",
    "occupiesSlots": [
      "feet"
    ],
    "name": "足裸帶",
    "description": "簡單足裸帶，配合武道服保持步法。",
    "cost": 1875,
    "requiredLevel": 10,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 6,
    "stats": {
      "attack": 1,
      "defense": 0,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 1
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 6
    }
  },
  {
    "id": "colored_martial_gi",
    "slot": "upperBody",
    "occupiesSlots": [
      "upperBody",
      "lowerBody"
    ],
    "name": "彩色上衣",
    "description": "覆蓋上下身的進階武道服，兼顧拳勢與快速轉位。",
    "cost": 17500,
    "requiredLevel": 20,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 8,
    "stats": {
      "attack": 0,
      "defense": 4,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 1,
      "accuracy": 0,
      "evasion": 0,
      "weight": 3
    },
    "legacyOnly": false,
    "icon": {
      "type": "image",
      "src": "assets/equipment/fighter/colored_martial_gi.png"
    }
  },
  {
    "id": "joint_bracers",
    "slot": "hands",
    "occupiesSlots": [
      "hands"
    ],
    "name": "手關節護腕",
    "description": "加強關節承托的進階護腕。",
    "cost": 7500,
    "requiredLevel": 20,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 7,
    "stats": {
      "attack": 3,
      "defense": 1,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 2
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 7
    }
  },
  {
    "id": "barefoot_guard",
    "slot": "feet",
    "occupiesSlots": [
      "feet"
    ],
    "name": "足裸護帶",
    "description": "保護足踝而不妨礙快速踏步。",
    "cost": 7500,
    "requiredLevel": 20,
    "purchasable": true,
    "classId": "fighter",
    "iconIndex": 6,
    "stats": {
      "attack": 3,
      "defense": 1,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 2
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 6
    }
  },
  {
    "id": "copper_lantern_bell",
    "slot": "charm",
    "occupiesSlots": [
      "charm"
    ],
    "name": "銅燈鈴",
    "description": "細小鈴聲令人安心，稍微提升生存能力。",
    "cost": 80,
    "requiredLevel": 1,
    "purchasable": true,
    "classId": null,
    "iconIndex": 11,
    "stats": {
      "attack": 0,
      "defense": 0,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 0
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 11
    }
  },
  {
    "id": "hunter_fang",
    "slot": "charm",
    "occupiesSlots": [
      "charm"
    ],
    "name": "獵手尖牙",
    "description": "完成討伐後留下的護符，令攻勢更凌厲。",
    "cost": 210,
    "requiredLevel": 5,
    "purchasable": true,
    "classId": null,
    "iconIndex": 12,
    "stats": {
      "attack": 4,
      "defense": 0,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0.04,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 1
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 12
    }
  },
  {
    "id": "wayfarer_compass",
    "slot": "charm",
    "occupiesSlots": [
      "charm"
    ],
    "name": "遠行羅盤",
    "description": "指針總會朝向出口，讓持有者步履更快。",
    "cost": 420,
    "requiredLevel": 9,
    "purchasable": true,
    "classId": null,
    "iconIndex": 13,
    "stats": {
      "attack": 0,
      "defense": 0,
      "maxHp": 0,
      "speed": 9,
      "critChance": 0,
      "moveRange": 1,
      "accuracy": 0,
      "evasion": 0,
      "weight": 1
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 13
    }
  },
  {
    "id": "deep_lantern_core",
    "slot": "charm",
    "occupiesSlots": [
      "charm"
    ],
    "name": "深層燈核",
    "description": "在地城深處仍然發亮的古老核心。",
    "cost": 900,
    "requiredLevel": 15,
    "purchasable": true,
    "classId": null,
    "iconIndex": 14,
    "stats": {
      "attack": 7,
      "defense": 5,
      "maxHp": 0,
      "speed": 0,
      "critChance": 0,
      "moveRange": 0,
      "accuracy": 0,
      "evasion": 0,
      "weight": 2
    },
    "legacyOnly": true,
    "icon": {
      "type": "atlas",
      "atlas": "equipment",
      "index": 14
    }
  }
];
  const ALL_EQUIPMENT_CATALOG = Object.freeze(RAW_EQUIPMENT_CATALOG.map((item) => Object.freeze({ ...item, occupiesSlots: Object.freeze([...(item.occupiesSlots || [item.slot])]), stats: Object.freeze({ ...(item.stats || {}) }), icon: Object.freeze({ ...(item.icon || {}) }) })));
  const EQUIPMENT_CATALOG = Object.freeze(ALL_EQUIPMENT_CATALOG.filter((item) => !item.legacyOnly));
  const LEGACY_EQUIPMENT_CATALOG = Object.freeze(ALL_EQUIPMENT_CATALOG.filter((item) => item.legacyOnly));
  const FIGHTER_SHOP_ITEM_IDS = Object.freeze(["metal_knuckles", "giz_armguard", "heavy_knuckles", "superheavy_knuckles", "fighter_headband", "topknot_cap", "continental_hat", "fighter_head_guard", "floral_topknot_cap", "disciple_gi", "training_wrap", "conditioning_suit", "disciple_lower", "training_belt", "conditioning_skirt", "white_martial_gi", "colored_martial_gi"]);
  const FIGHTER_SHOP_ITEM_ID_SET = new Set(FIGHTER_SHOP_ITEM_IDS);
  function getEquipment(id, options = {}) {
    const source = options.activeOnly ? EQUIPMENT_CATALOG : ALL_EQUIPMENT_CATALOG;
    return source.find((item) => item.id === String(id || "").trim()) || null;
  }
  return { EQUIPMENT_SLOTS, EQUIPMENT_SHOP_SLOTS, LEGACY_EQUIPMENT_SLOT_ALIASES, EQUIPMENT_STAT_KEYS, EQUIPMENT_CATALOG, LEGACY_EQUIPMENT_CATALOG, ALL_EQUIPMENT_CATALOG, FIGHTER_SHOP_ITEM_IDS, FIGHTER_SHOP_ITEM_ID_SET, getEquipment };
});
