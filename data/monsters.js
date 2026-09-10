(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmMonsterData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SKILLS = Object.freeze({
  "basic_claw": {
    "id": "basic_claw",
    "name": "爪擊",
    "speedGrade": "C",
    "apCost": 4,
    "range": {
      "min": 1,
      "max": 1
    },
    "rangeCellsRelative": [
      {
        "x": 0,
        "y": -1
      },
      {
        "x": -1,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "area": {
      "shape": "single"
    },
    "targeting": {
      "team": "enemy",
      "mode": "unit"
    },
    "deliveryMode": "contact",
    "pathMode": "facingOrthogonalPriority",
    "heightDifference": 0,
    "actionKind": "attack",
    "dealsDamage": true,
    "damageModel": {
      "scale": 0.9
    },
    "effects": []
  },
  "peck": {
    "id": "peck",
    "name": "啄擊",
    "speedGrade": "B",
    "apCost": 4,
    "range": {
      "min": 1,
      "max": 1
    },
    "rangeCellsRelative": [
      {
        "x": 0,
        "y": -1
      },
      {
        "x": -1,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "area": {
      "shape": "single"
    },
    "targeting": {
      "team": "enemy",
      "mode": "unit"
    },
    "deliveryMode": "contact",
    "pathMode": "facingOrthogonalPriority",
    "heightDifference": 0,
    "actionKind": "attack",
    "dealsDamage": true,
    "damageModel": {
      "scale": 0.82
    },
    "effects": []
  },
  "quick_bite": {
    "id": "quick_bite",
    "name": "迅咬",
    "speedGrade": "A",
    "apCost": 5,
    "range": {
      "min": 1,
      "max": 1
    },
    "rangeCellsRelative": [
      {
        "x": 0,
        "y": -1
      },
      {
        "x": -1,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      }
    ],
    "area": {
      "shape": "single"
    },
    "targeting": {
      "team": "enemy",
      "mode": "unit"
    },
    "deliveryMode": "contact",
    "pathMode": "facingOrthogonalPriority",
    "heightDifference": 0,
    "actionKind": "attack",
    "dealsDamage": true,
    "damageModel": {
      "scale": 0.86
    },
    "effects": []
  },
  "pounce": {
    "id": "pounce",
    "name": "撲躍",
    "speedGrade": "D",
    "apCost": 7,
    "range": {
      "min": 1,
      "max": 2
    },
    "rangeCellsRelative": [
      {
        "x": 0,
        "y": -1
      },
      {
        "x": -1,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "area": {
      "shape": "single"
    },
    "targeting": {
      "team": "enemy",
      "mode": "unit"
    },
    "deliveryMode": "leap",
    "pathMode": "facingOrthogonalPriority",
    "heightDifference": 0,
    "actionKind": "attack",
    "dealsDamage": true,
    "damageModel": {
      "scale": 1.2
    },
    "effects": [
      {
        "type": "knockback",
        "amount": 1
      }
    ]
  },
  "shell_defense": {
    "id": "shell_defense",
    "name": "龜甲防禦",
    "speedGrade": "A",
    "apCost": 5,
    "range": {
      "min": 1,
      "max": 1
    },
    "rangeCellsRelative": [
      {
        "x": 0,
        "y": -1
      },
      {
        "x": -1,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "area": {
      "shape": "single"
    },
    "targeting": {
      "team": "self",
      "mode": "self"
    },
    "deliveryMode": "contact",
    "pathMode": "facingOrthogonalPriority",
    "heightDifference": 0,
    "actionKind": "guard",
    "dealsDamage": false,
    "damageModel": {
      "scale": 1
    },
    "effects": [
      {
        "type": "guard",
        "amount": 0.42,
        "duration": 1
      }
    ]
  },
  "ram": {
    "id": "ram",
    "name": "角撞",
    "speedGrade": "D",
    "apCost": 6,
    "range": {
      "min": 1,
      "max": 2
    },
    "rangeCellsRelative": [
      {
        "x": 0,
        "y": -1
      },
      {
        "x": -1,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "area": {
      "shape": "single"
    },
    "targeting": {
      "team": "enemy",
      "mode": "unit"
    },
    "deliveryMode": "charge",
    "pathMode": "facingOrthogonalPriority",
    "heightDifference": 0,
    "actionKind": "attack",
    "dealsDamage": true,
    "damageModel": {
      "scale": 1.25
    },
    "effects": [
      {
        "type": "knockback",
        "amount": 1
      }
    ]
  },
  "bear_slam": {
    "id": "bear_slam",
    "name": "熊掌震擊",
    "speedGrade": "D",
    "apCost": 8,
    "range": {
      "min": 1,
      "max": 1
    },
    "rangeCellsRelative": [
      {
        "x": 0,
        "y": -1
      },
      {
        "x": -1,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "area": {
      "shape": "radius",
      "radius": 1
    },
    "targeting": {
      "team": "enemy",
      "mode": "cell"
    },
    "deliveryMode": "contact",
    "pathMode": "facingOrthogonalPriority",
    "heightDifference": 0,
    "actionKind": "attack",
    "dealsDamage": true,
    "damageModel": {
      "scale": 0.95
    },
    "effects": [
      {
        "type": "knockdown",
        "chance": 0.32
      }
    ]
  },
  "charge": {
    "id": "charge",
    "name": "衝鋒",
    "speedGrade": "D",
    "apCost": 7,
    "range": {
      "min": 1,
      "max": 3
    },
    "rangeCellsRelative": [
      {
        "x": 0,
        "y": -1
      },
      {
        "x": -1,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "area": {
      "shape": "single"
    },
    "targeting": {
      "team": "enemy",
      "mode": "unit"
    },
    "deliveryMode": "charge",
    "pathMode": "facingOrthogonalPriority",
    "heightDifference": 0,
    "actionKind": "attack",
    "dealsDamage": true,
    "damageModel": {
      "scale": 1.3
    },
    "effects": [
      {
        "type": "knockback",
        "amount": 1
      }
    ]
  },
  "tongue_snap": {
    "id": "tongue_snap",
    "name": "長舌彈",
    "speedGrade": "B",
    "apCost": 5,
    "range": {
      "min": 1,
      "max": 3
    },
    "rangeCellsRelative": [
      {
        "x": 0,
        "y": -1
      },
      {
        "x": -1,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "area": {
      "shape": "single"
    },
    "targeting": {
      "team": "enemy",
      "mode": "unit"
    },
    "deliveryMode": "projectile",
    "pathMode": "facingOrthogonalPriority",
    "heightDifference": 0,
    "actionKind": "attack",
    "dealsDamage": true,
    "damageModel": {
      "scale": 0.74
    },
    "effects": []
  },
  "snake_bite": {
    "id": "snake_bite",
    "name": "毒牙",
    "speedGrade": "A",
    "apCost": 5,
    "range": {
      "min": 1,
      "max": 1
    },
    "rangeCellsRelative": [
      {
        "x": 0,
        "y": -1
      },
      {
        "x": -1,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      }
    ],
    "area": {
      "shape": "single"
    },
    "targeting": {
      "team": "enemy",
      "mode": "unit"
    },
    "deliveryMode": "contact",
    "pathMode": "facingOrthogonalPriority",
    "heightDifference": 0,
    "actionKind": "attack",
    "dealsDamage": true,
    "damageModel": {
      "scale": 0.78
    },
    "effects": [
      {
        "type": "poison",
        "duration": 3
      }
    ]
  },
  "poison_spit": {
    "id": "poison_spit",
    "name": "毒液噴吐",
    "speedGrade": "C",
    "apCost": 7,
    "range": {
      "min": 2,
      "max": 4
    },
    "rangeCellsRelative": [
      {
        "x": 0,
        "y": -1
      },
      {
        "x": -1,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "area": {
      "shape": "single"
    },
    "targeting": {
      "team": "enemy",
      "mode": "unit"
    },
    "deliveryMode": "projectile",
    "pathMode": "facingOrthogonalPriority",
    "heightDifference": 0,
    "actionKind": "attack",
    "dealsDamage": true,
    "damageModel": {
      "scale": 0.7
    },
    "effects": [
      {
        "type": "poison",
        "duration": 3
      }
    ]
  },
  "poison_cloud": {
    "id": "poison_cloud",
    "name": "毒霧",
    "speedGrade": "A",
    "apCost": 9,
    "range": {
      "min": 1,
      "max": 3
    },
    "rangeCellsRelative": [
      {
        "x": 0,
        "y": -1
      },
      {
        "x": -1,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "area": {
      "shape": "radius",
      "radius": 1
    },
    "targeting": {
      "team": "enemy",
      "mode": "cell"
    },
    "deliveryMode": "pathless-area",
    "pathMode": "facingOrthogonalPriority",
    "heightDifference": 0,
    "actionKind": "attack",
    "dealsDamage": true,
    "damageModel": {
      "scale": 0.42
    },
    "effects": [
      {
        "type": "poison",
        "duration": 2
      }
    ]
  }
});
  const MONSTERS = Object.freeze({
  "chick": {
    "id": "chick",
    "name_zh": "山雀仔",
    "name_en": "Mountain Chick",
    "family": "bird",
    "normalLevelRange": [
      1,
      3
    ],
    "baseStats": {
      "hp": 27,
      "attack": 8,
      "defense": 1
    },
    "multipliers": {
      "hp": 0.9,
      "attack": 0.95,
      "defense": 0.8
    },
    "moveRange": 5,
    "battleRole": "skirmisher",
    "aiProfile": "flank-and-peck",
    "skills": [
      "peck",
      "pounce"
    ],
    "rewards": {
      "baseXp": 22,
      "coins": 7,
      "drops": [
        {
          "id": "bright_feather",
          "chance": 0.25
        }
      ]
    },
    "habitat": {
      "maps": [
        "field"
      ],
      "zones": [
        "mountain-forest"
      ]
    },
    "questTags": [
      "bird",
      "field"
    ],
    "boss": false,
    "locomotion": {
      "status": "approved",
      "assetKey": "chick",
      "atlas": "assets/locomotion/chick-v1.png",
      "sourceArt": null
    },
    "codex": {
      "summary": "棲息山路樹冠的膽小山雀，受驚時會突然撲下。",
      "notes": "以穩定的攻擊模式守住棲地。"
    },
    "encounterParty": [],
    "exploration": {
      "speed": 92,
      "radius": 15,
      "aggro": 225,
      "color": "#d89d42"
    }
  },
  "fox": {
    "id": "fox",
    "name_zh": "霧狐",
    "name_en": "Mist Fox",
    "family": "beast",
    "normalLevelRange": [
      1,
      3
    ],
    "baseStats": {
      "hp": 39,
      "attack": 12,
      "defense": 2
    },
    "multipliers": {
      "hp": 1.05,
      "attack": 1.12,
      "defense": 1
    },
    "moveRange": 5,
    "battleRole": "skirmisher",
    "aiProfile": "fast-flank",
    "skills": [
      "quick_bite",
      "pounce"
    ],
    "rewards": {
      "baseXp": 32,
      "coins": 11,
      "drops": [
        {
          "id": "fox_fang",
          "chance": 0.25
        }
      ]
    },
    "habitat": {
      "maps": [
        "field"
      ],
      "zones": [
        "mountain-forest"
      ]
    },
    "questTags": [
      "beast",
      "field"
    ],
    "boss": false,
    "locomotion": {
      "status": "approved",
      "assetKey": "fox",
      "atlas": "assets/locomotion/fox-v1.png",
      "sourceArt": null
    },
    "codex": {
      "summary": "沿山徑巡行的霧狐，會利用速度從側面撲擊。",
      "notes": "以穩定的攻擊模式守住棲地。"
    },
    "encounterParty": [],
    "exploration": {
      "speed": 104,
      "radius": 15,
      "aggro": 225,
      "color": "#c9783e"
    }
  },
  "raccoon": {
    "id": "raccoon",
    "name_zh": "燈紋浣熊",
    "name_en": "Lantern Raccoon",
    "family": "beast",
    "normalLevelRange": [
      1,
      3
    ],
    "baseStats": {
      "hp": 42,
      "attack": 10,
      "defense": 3
    },
    "multipliers": {
      "hp": 1.1,
      "attack": 0.96,
      "defense": 1.15
    },
    "moveRange": 4,
    "battleRole": "bruiser",
    "aiProfile": "approach-and-attack",
    "skills": [
      "basic_claw",
      "shell_defense"
    ],
    "rewards": {
      "baseXp": 30,
      "coins": 10,
      "drops": [
        {
          "id": "lantern_pelt",
          "chance": 0.3
        }
      ]
    },
    "habitat": {
      "maps": [
        "field"
      ],
      "zones": [
        "mountain-forest"
      ]
    },
    "questTags": [
      "beast",
      "field",
      "dungeon"
    ],
    "boss": false,
    "locomotion": {
      "status": "approved",
      "assetKey": "raccoon",
      "atlas": "assets/locomotion/raccoon-v1.png",
      "sourceArt": null
    },
    "codex": {
      "summary": "喜歡翻找燈屑的浣熊，防禦姿勢比外表更頑強。",
      "notes": "以穩定的攻擊模式守住棲地。"
    },
    "encounterParty": [],
    "exploration": {
      "speed": 104,
      "radius": 15,
      "aggro": 225,
      "color": "#7c6656"
    }
  },
  "wild_boar": {
    "id": "wild_boar",
    "name_zh": "荒野野豬",
    "name_en": "Wild Boar",
    "family": "beast",
    "normalLevelRange": [
      1,
      3
    ],
    "baseStats": {
      "hp": 58,
      "attack": 14,
      "defense": 4
    },
    "multipliers": {
      "hp": 1.35,
      "attack": 1.18,
      "defense": 1.2
    },
    "moveRange": 4,
    "battleRole": "charger",
    "aiProfile": "approach-and-attack",
    "skills": [
      "basic_claw",
      "charge"
    ],
    "rewards": {
      "baseXp": 42,
      "coins": 14,
      "drops": [
        {
          "id": "boar_tusk",
          "chance": 0.28
        }
      ]
    },
    "habitat": {
      "maps": [
        "field",
        "dungeon"
      ],
      "zones": [
        "mountain-forest",
        "mine-entrance"
      ]
    },
    "questTags": [
      "beast",
      "charge"
    ],
    "boss": false,
    "locomotion": {
      "status": "approved",
      "assetKey": "wild_boar",
      "atlas": "assets/locomotion/wild-boar-v1.png",
      "sourceArt": "assets/monster-sources/wild-boar.png"
    },
    "codex": {
      "summary": "在林道與坑道入口出沒的厚皮野豬，擅長直線衝鋒。",
      "notes": "以穩定的攻擊模式守住棲地。"
    },
    "encounterParty": [],
    "exploration": {
      "speed": 104,
      "radius": 15,
      "aggro": 225,
      "color": "#9a684c"
    }
  },
  "bear": {
    "id": "bear",
    "name_zh": "岩穴熊",
    "name_en": "Cave Bear",
    "family": "beast",
    "normalLevelRange": [
      7,
      10
    ],
    "baseStats": {
      "hp": 88,
      "attack": 18,
      "defense": 7
    },
    "multipliers": {
      "hp": 1.55,
      "attack": 1.25,
      "defense": 1.4
    },
    "moveRange": 3,
    "battleRole": "tank",
    "aiProfile": "approach-and-attack",
    "skills": [
      "bear_slam",
      "charge"
    ],
    "rewards": {
      "baseXp": 68,
      "coins": 24,
      "drops": [
        {
          "id": "bear_claw",
          "chance": 0.25
        }
      ]
    },
    "habitat": {
      "maps": [
        "dungeon"
      ],
      "zones": [
        "deep-mine"
      ]
    },
    "questTags": [
      "beast",
      "deep"
    ],
    "boss": false,
    "locomotion": {
      "status": "approved",
      "assetKey": "bear",
      "atlas": "assets/locomotion/bear-v1.png",
      "sourceArt": "assets/monster-sources/bear.png"
    },
    "codex": {
      "summary": "守在沉燈坑道深處的巨熊，一掌足以震亂陣形。",
      "notes": "以穩定的攻擊模式守住棲地。"
    },
    "encounterParty": [
      "turtle",
      "snake"
    ],
    "exploration": {
      "speed": 104,
      "radius": 28,
      "aggro": 225,
      "color": "#a66f45"
    }
  },
  "turtle": {
    "id": "turtle",
    "name_zh": "苔甲龜",
    "name_en": "Moss Turtle",
    "family": "reptile",
    "normalLevelRange": [
      1,
      3
    ],
    "baseStats": {
      "hp": 64,
      "attack": 9,
      "defense": 9
    },
    "multipliers": {
      "hp": 1.45,
      "attack": 0.82,
      "defense": 1.85
    },
    "moveRange": 2,
    "battleRole": "tank",
    "aiProfile": "approach-and-attack",
    "skills": [
      "shell_defense",
      "basic_claw"
    ],
    "rewards": {
      "baseXp": 46,
      "coins": 16,
      "drops": [
        {
          "id": "moss_shell",
          "chance": 0.3
        }
      ]
    },
    "habitat": {
      "maps": [
        "field",
        "dungeon"
      ],
      "zones": [
        "wet-road",
        "flooded-ruins"
      ]
    },
    "questTags": [
      "reptile",
      "guard"
    ],
    "boss": false,
    "locomotion": {
      "status": "approved",
      "assetKey": "turtle",
      "atlas": "assets/locomotion/turtle-v1.png",
      "sourceArt": "assets/monster-sources/turtle.png"
    },
    "codex": {
      "summary": "背著厚重苔甲的慢行守衛，會先穩住防線再反擊。",
      "notes": "以穩定的攻擊模式守住棲地。"
    },
    "encounterParty": [],
    "exploration": {
      "speed": 76,
      "radius": 22,
      "aggro": 225,
      "color": "#817548"
    }
  },
  "coyote": {
    "id": "coyote",
    "name_zh": "灰原郊狼",
    "name_en": "Grey Coyote",
    "family": "beast",
    "normalLevelRange": [
      1,
      3
    ],
    "baseStats": {
      "hp": 46,
      "attack": 15,
      "defense": 2
    },
    "multipliers": {
      "hp": 1.12,
      "attack": 1.2,
      "defense": 0.9
    },
    "moveRange": 5,
    "battleRole": "hunter",
    "aiProfile": "approach-and-attack",
    "skills": [
      "quick_bite",
      "charge"
    ],
    "rewards": {
      "baseXp": 39,
      "coins": 13,
      "drops": [
        {
          "id": "coyote_fang",
          "chance": 0.26
        }
      ]
    },
    "habitat": {
      "maps": [
        "field",
        "dungeon"
      ],
      "zones": [
        "mountain-forest",
        "mine-entrance"
      ]
    },
    "questTags": [
      "beast",
      "pack"
    ],
    "boss": false,
    "locomotion": {
      "status": "approved",
      "assetKey": "coyote",
      "atlas": "assets/locomotion/coyote-v1.png",
      "sourceArt": "assets/locomotion/sources/raw/coyote-atlas-source-v1.png"
    },
    "codex": {
      "summary": "在灰霧邊界結群狩獵的郊狼，會追擊落單目標。",
      "notes": "以穩定的攻擊模式守住棲地。"
    },
    "encounterParty": [],
    "exploration": {
      "speed": 104,
      "radius": 15,
      "aggro": 225,
      "color": "#87786f"
    }
  },
  "frog": {
    "id": "frog",
    "name_zh": "霧沼蛙",
    "name_en": "Mist Frog",
    "family": "amphibian",
    "normalLevelRange": [
      1,
      3
    ],
    "baseStats": {
      "hp": 36,
      "attack": 9,
      "defense": 2
    },
    "multipliers": {
      "hp": 1,
      "attack": 1,
      "defense": 1
    },
    "moveRange": 4,
    "battleRole": "ranged",
    "aiProfile": "approach-and-attack",
    "skills": [
      "tongue_snap",
      "poison_cloud"
    ],
    "rewards": {
      "baseXp": 35,
      "coins": 12,
      "drops": [
        {
          "id": "mist_gland",
          "chance": 0.24
        }
      ]
    },
    "habitat": {
      "maps": [
        "field",
        "dungeon"
      ],
      "zones": [
        "wet-road",
        "flooded-ruins"
      ]
    },
    "questTags": [
      "amphibian",
      "poison"
    ],
    "boss": false,
    "locomotion": {
      "status": "approved",
      "assetKey": "frog",
      "atlas": "assets/locomotion/frog-v1.png",
      "sourceArt": "assets/monster-sources/frog.png"
    },
    "codex": {
      "summary": "躲在濕地與積水石室的霧沼蛙，以長舌和毒霧保持距離。",
      "notes": "以穩定的攻擊模式守住棲地。"
    },
    "encounterParty": [],
    "exploration": {
      "speed": 88,
      "radius": 15,
      "aggro": 225,
      "color": "#7ba15a"
    }
  },
  "snake": {
    "id": "snake",
    "name_zh": "毒霧蛇",
    "name_en": "Venom Snake",
    "family": "reptile",
    "normalLevelRange": [
      6,
      10
    ],
    "baseStats": {
      "hp": 33,
      "attack": 13,
      "defense": 2
    },
    "multipliers": {
      "hp": 0.92,
      "attack": 1.15,
      "defense": 0.92
    },
    "moveRange": 5,
    "battleRole": "poison",
    "aiProfile": "approach-and-attack",
    "skills": [
      "snake_bite",
      "poison_spit",
      "poison_cloud"
    ],
    "rewards": {
      "baseXp": 48,
      "coins": 18,
      "drops": [
        {
          "id": "venom_sac",
          "chance": 0.3
        }
      ]
    },
    "habitat": {
      "maps": [
        "dungeon"
      ],
      "zones": [
        "flooded-ruins",
        "deep-mine"
      ]
    },
    "questTags": [
      "reptile",
      "poison",
      "deep"
    ],
    "boss": false,
    "locomotion": {
      "status": "approved",
      "assetKey": "snake",
      "atlas": "assets/locomotion/snake-v1.png",
      "sourceArt": "assets/monster-sources/snake.png"
    },
    "codex": {
      "summary": "沉燈坑道的毒霧蛇會先以噴吐削弱，再用毒牙收尾。",
      "notes": "以穩定的攻擊模式守住棲地。"
    },
    "encounterParty": [],
    "exploration": {
      "speed": 76,
      "radius": 15,
      "aggro": 225,
      "color": "#d09535"
    }
  }
});
  const LEGACY_MONSTER_MIGRATION = Object.freeze({
  "slime": {
    "id": "raccoon",
    "reason": "舊版一般野外怪物"
  },
  "wisp": {
    "id": "chick",
    "reason": "舊版飛行外觀暫以山雀承接"
  },
  "hound": {
    "id": "fox",
    "reason": "舊版犬科野獸"
  },
  "mossbun": {
    "id": "raccoon",
    "reason": "舊版坑道小型怪物"
  },
  "mistwing": {
    "id": "chick",
    "reason": "舊版飛行怪物"
  },
  "cragboar": {
    "id": "wild_boar",
    "reason": "舊版野豬"
  },
  "hollowmage": {
    "id": "snake",
    "reason": "舊版深窟遠程怪物，保留毒系行為"
  },
  "lantern-golem": {
    "id": "turtle",
    "reason": "舊版防禦型坑道怪物"
  },
  "deepwarden": {
    "id": "bear",
    "reason": "舊版地城首領，改為資料化精英熊首領"
  },
  "boss": {
    "id": "bear",
    "reason": "舊版主線首領兼容別名"
  }
});
  return { SKILLS, MONSTERS, LEGACY_MONSTER_MIGRATION };
});
