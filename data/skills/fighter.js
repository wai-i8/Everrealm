(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternFighterSkillData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const data = {
  "schemaVersion": 3,
  "game": "Everrealm",
  "classId": "fighter",
  "className": "格鬥士",
  "display": {
    "rootSkillId": "kentotsu",
    "rootColumn": "jinken_line",
    "layout": {
      "grid": [
        [
          "psv_tesshin",
          null,
          null,
          "kentotsu",
          null,
          null,
          null,
          null,
          null,
          null
        ],
        [
          "psv_ukimi",
          null,
          "haiken",
          "jinken",
          null,
          "buyou",
          "houkou",
          null,
          "bougyo",
          "hijo_tenketsu"
        ],
        [
          "psv_koushin",
          null,
          "sunkei",
          "rendan",
          "tenpoukyaku",
          "sen_no_sen",
          "mutouki",
          null,
          "denkangeki",
          "shincha_tenketsu"
        ],
        [
          "psv_shintou_mekkyaku",
          null,
          "kenpou",
          "jisa_kentotsu",
          "chiheikyaku",
          "choudankyaku",
          "shuukijutsu",
          "fudoushibari",
          "ruka_hanki_ken",
          "kaimoku_tenketsu"
        ],
        [
          "psv_seishin_touitsu",
          null,
          "gangatotsu",
          "sandan",
          "fuujinkyaku",
          "ryuugan",
          "retsusenkou",
          "shuuki_hijutsu",
          "ruka_kouitsu_ken",
          "boumin_daha"
        ],
        [
          "psv_soshin_sokutai",
          "gangaretsujin",
          "gangahoujin",
          "korendan",
          "gouhoukyaku",
          null,
          "shidan",
          null,
          "kenshaku",
          "kikou_gedoku"
        ],
        [
          "psv_hishin_jutai",
          "chisaihou",
          "kueiku",
          "kouryuusei",
          null,
          null,
          "kikoudan",
          null,
          null,
          null
        ],
        [
          "psv_koushin_gekitai",
          "tenretsuhou",
          "resshin_kueiku",
          "zanjuken",
          null,
          "fuujin_kikoukyaku",
          "gekikoudan",
          "kikouhou",
          null,
          null
        ],
        [
          "psv_boushin_goutai",
          null,
          "dokushuken",
          "byakkorendan",
          null,
          null,
          "gekikou_kyodan",
          "kikou_sakuretsudan",
          null,
          null
        ],
        [
          "psv_sokushin_keitai",
          null,
          "lusedes_da",
          "lusedes_koku",
          "lusedes_tan",
          null,
          "ryudan",
          null,
          null,
          null
        ]
      ]
    },
    "note": "正拳放在迅拳欄上方；版面只顯示明確 requires 連線。"
  },
  "legacyIds": {
    "iron_body": "psv_tesshin",
    "floating_body": "psv_ukimi",
    "steel_body": "psv_koushin",
    "mind_over_heat": "psv_shintou_mekkyaku",
    "mental_focus": "psv_seishin_touitsu",
    "body_targeting": "psv_soshin_sokutai",
    "supple_body": "psv_hishin_jutai",
    "striking_body": "psv_koushin_gekitai",
    "guarded_body": "psv_boushin_goutai",
    "light_body": "psv_sokushin_keitai",
    "straight_punch": "kentotsu",
    "backfist": "haiken",
    "one_inch_punch": "sunkei",
    "fist_cannon": "kenpou",
    "rock_fang_strike": "gangatotsu",
    "rock_fang_formation": "gangahoujin",
    "nine_shadow_amber": "kueiku",
    "quaking_nine_shadow_amber": "resshin_kueiku",
    "rock_fang_line": "gangaretsujin",
    "earth_shatter": "chisaihou",
    "sky_rend": "tenretsuhou",
    "rapid_fist": "jinken",
    "rising_knuckle": "rendan",
    "delayed_punch": "jisa_kentotsu",
    "scatter_burst": "sandan",
    "tiger_chain": "korendan",
    "crimson_meteor": "kouryuusei",
    "zantetsu_fist": "zanjuken",
    "poison_hand_fist": "dokushuken",
    "hundred_tiger_chain": "byakkorendan",
    "turning_cannon_kick": "tenpoukyaku",
    "horizon_kick": "chiheikyaku",
    "wind_blade_kick": "fuujinkyaku",
    "grand_cannon_kick": "gouhoukyaku",
    "wind_god_chi_kick": "fuujin_kikoukyaku",
    "dancing_leaf": "buyou",
    "preemptive_counter": "sen_no_sen",
    "projectile_counter_kick": "choudankyaku",
    "dragon_eye": "ryuugan",
    "roar": "houkou",
    "vanishing_aura": "mutouki",
    "chi_gathering": "shuukijutsu",
    "immobility_bind": "fudoushibari",
    "rending_flash": "retsusenkou",
    "secret_chi_gathering": "shuuki_hijutsu",
    "finger_bullet": "shidan",
    "chi_blast": "kikoudan",
    "empowered_chi_blast": "gekikoudan",
    "giant_chi_blast": "gekikou_kyodan",
    "dragon_bullet": "ryudan",
    "chi_cannon": "kikouhou",
    "explosive_chi_blast": "kikou_sakuretsudan",
    "defense_stance": "bougyo",
    "lightning_punch": "denkangeki",
    "halving_fist": "ruka_hanki_ken",
    "one_hp_fist": "ruka_kouitsu_ken",
    "flash_fist": "kenshaku",
    "paralysis_release": "hijo_tenketsu",
    "mind_release": "shincha_tenketsu",
    "sight_release": "kaimoku_tenketsu",
    "sleep_recovery": "boumin_daha",
    "poison_recovery": "kikou_gedoku"
  },
  "skills": [
    {
      "id": "psv_tesshin",
      "name_zh": "鐵身",
      "source_name_ja": "鉄身",
      "type": "PSV",
      "category": "body_passive",
      "requires": [],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": null,
        "speed": null,
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "not_applicable",
          "source_pattern": null,
          "range_description": "被動技能，沒有主動選取射程。",
          "range_cells_relative": null,
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "passive"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆",
              "star_value": 1
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "斬擊防禦小幅提升",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "slash_defense_up",
            "magnitude": "small"
          }
        ]
      },
      "everrealm": {
        "action_kind": "passive_buff",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "defense_up",
            "magnitude": "small"
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "psv_ukimi",
      "name_zh": "浮身",
      "source_name_ja": "浮身",
      "type": "PSV",
      "category": "body_passive",
      "requires": [
        "psv_tesshin"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": null,
        "speed": null,
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "not_applicable",
          "source_pattern": null,
          "range_description": "被動技能，沒有主動選取射程。",
          "range_cells_relative": null,
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "passive"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆☆",
              "star_value": 2
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "衝擊防禦小幅提升",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "impact_defense_up",
            "magnitude": "small"
          }
        ]
      },
      "everrealm": {
        "action_kind": "passive_buff",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "defense_up",
            "magnitude": "small"
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "psv_koushin",
      "name_zh": "鋼身",
      "source_name_ja": "鋼身",
      "type": "PSV",
      "category": "body_passive",
      "requires": [
        "psv_ukimi"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": null,
        "speed": null,
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "not_applicable",
          "source_pattern": null,
          "range_description": "被動技能，沒有主動選取射程。",
          "range_cells_relative": null,
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "passive"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆☆☆",
              "star_value": 3
            }
          ],
          "rarity": null,
          "quests": [
            "蟹"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "貫通防禦小幅提升",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "piercing_defense_up",
            "magnitude": "small"
          }
        ]
      },
      "everrealm": {
        "action_kind": "passive_buff",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "defense_up",
            "magnitude": "small"
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "psv_shintou_mekkyaku",
      "name_zh": "心頭滅卻",
      "source_name_ja": "心頭滅却",
      "type": "PSV",
      "category": "body_passive",
      "requires": [
        "psv_koushin"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": null,
        "speed": null,
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "not_applicable",
          "source_pattern": null,
          "range_description": "被動技能，沒有主動選取射程。",
          "range_cells_relative": null,
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "passive"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆☆☆☆",
              "star_value": 4
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "炎熱防禦小幅提升",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "heat_defense_up",
            "magnitude": "small"
          }
        ]
      },
      "everrealm": {
        "action_kind": "passive_buff",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "defense_up",
            "magnitude": "small"
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "psv_seishin_touitsu",
      "name_zh": "精神統一",
      "source_name_ja": "精神統一",
      "type": "PSV",
      "category": "body_passive",
      "requires": [
        "psv_shintou_mekkyaku"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": null,
        "speed": null,
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "not_applicable",
          "source_pattern": null,
          "range_description": "被動技能，沒有主動選取射程。",
          "range_cells_relative": null,
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "passive"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★",
              "star_value": 5
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "精神防禦小幅提升",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "mental_defense_up",
            "magnitude": "small"
          }
        ]
      },
      "everrealm": {
        "action_kind": "passive_buff",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "defense_up",
            "magnitude": "small"
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "psv_soshin_sokutai",
      "name_zh": "狙身捉體",
      "source_name_ja": "狙身捉体",
      "type": "PSV",
      "category": "body_passive",
      "requires": [
        "psv_seishin_touitsu"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": null,
        "speed": null,
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "not_applicable",
          "source_pattern": null,
          "range_description": "被動技能，沒有主動選取射程。",
          "range_cells_relative": null,
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "passive"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆",
              "star_value": 6
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "命中力小幅提升",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "accuracy_up",
            "magnitude": "small"
          }
        ],
        "requirements": {
          "fighter_level_min": 10
        }
      },
      "everrealm": {
        "action_kind": "passive_buff",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "accuracy_up",
            "magnitude": "small"
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "psv_hishin_jutai",
      "name_zh": "避身柔體",
      "source_name_ja": "避身柔体",
      "type": "PSV",
      "category": "body_passive",
      "requires": [
        "psv_soshin_sokutai"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": null,
        "speed": null,
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "not_applicable",
          "source_pattern": null,
          "range_description": "被動技能，沒有主動選取射程。",
          "range_cells_relative": null,
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "passive"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆☆",
              "star_value": 7
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "迴避力小幅提升",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "evasion_up",
            "magnitude": "small"
          }
        ],
        "requirements": {
          "fighter_level_min": 10
        }
      },
      "everrealm": {
        "action_kind": "passive_buff",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "evasion_up",
            "magnitude": "small"
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "psv_koushin_gekitai",
      "name_zh": "功身擊體",
      "source_name_ja": "功身撃体",
      "type": "PSV",
      "category": "body_passive",
      "requires": [
        "psv_hishin_jutai"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": null,
        "speed": null,
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "not_applicable",
          "source_pattern": null,
          "range_description": "被動技能，沒有主動選取射程。",
          "range_cells_relative": null,
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "passive"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆☆☆",
              "star_value": 8
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "物理攻擊小幅提升",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "physical_attack_up",
            "magnitude": "small"
          }
        ],
        "requirements": {
          "fighter_level_min": 10
        }
      },
      "everrealm": {
        "action_kind": "passive_buff",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "physical_attack_up",
            "magnitude": "small"
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "psv_boushin_goutai",
      "name_zh": "防身剛體",
      "source_name_ja": "防身剛体",
      "type": "PSV",
      "category": "body_passive",
      "requires": [
        "psv_koushin_gekitai"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": null,
        "speed": null,
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "not_applicable",
          "source_pattern": null,
          "range_description": "被動技能，沒有主動選取射程。",
          "range_cells_relative": null,
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "passive"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆☆☆☆",
              "star_value": 9
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "防禦力小幅提升",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "defense_up",
            "magnitude": "small"
          }
        ],
        "requirements": {
          "fighter_level_min": 10
        }
      },
      "everrealm": {
        "action_kind": "passive_buff",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "defense_up",
            "magnitude": "small"
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "psv_sokushin_keitai",
      "name_zh": "速身輕體",
      "source_name_ja": "速身軽体",
      "type": "PSV",
      "category": "body_passive",
      "requires": [
        "psv_boushin_goutai"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": null,
        "speed": null,
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "not_applicable",
          "source_pattern": null,
          "range_description": "被動技能，沒有主動選取射程。",
          "range_cells_relative": null,
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "passive"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★",
              "star_value": 10
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "行動速度小幅提升",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "action_speed_up",
            "source_equivalent": "weight_minus_50"
          }
        ],
        "requirements": {
          "fighter_level_min": 10
        }
      },
      "everrealm": {
        "action_kind": "passive_buff",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "action_speed_up",
            "source_equivalent": "weight_minus_50"
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "kentotsu",
      "name_zh": "正拳",
      "source_name_ja": "拳突",
      "type": "CMD",
      "category": "root",
      "requires": [],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 3,
        "speed": "B",
        "interrupt": 1,
        "durability": 10,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■■■\n■↑■",
          "range_description": "可選 5 格：前1左1、前1、前1右1、左1、右1。",
          "range_cells_relative": [
            [
              -1,
              1
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": true,
          "shop_price": null,
          "guild_reward_books": [],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "基本拳擊傷害",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(3 / 3)",
          "raw_multiplier": 1.0,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 1.0
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      },
      "source_note": "初期所持；visual layout 放喺迅拳欄上方。"
    },
    {
      "id": "haiken",
      "name_zh": "背拳",
      "source_name_ja": "背拳",
      "type": "CMD",
      "category": "kentotsu_line",
      "requires": [
        "kentotsu"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 12,
        "speed": "B",
        "interrupt": 1,
        "durability": 6,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口↑口\n■■■",
          "range_description": "可選 3 格：後1左1、後1、後1右1。",
          "range_cells_relative": [
            [
              -1,
              -1
            ],
            [
              0,
              -1
            ],
            [
              1,
              -1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆",
              "star_value": 1
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "向身後拳擊",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(12 / 3)",
          "raw_multiplier": 2.0,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 2.0
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "sunkei",
      "name_zh": "寸勁",
      "source_name_ja": "寸剄",
      "type": "CMD",
      "category": "kentotsu_line",
      "requires": [
        "haiken"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 18,
        "speed": "D",
        "interrupt": 6,
        "durability": 6,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口■口\n■↑■",
          "range_description": "可選 3 格：前1、左1、右1。",
          "range_cells_relative": [
            [
              0,
              1
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆☆",
              "star_value": 2
            }
          ],
          "rarity": null,
          "quests": [
            "リョマ"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "傷害並擊退1格",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "knockback",
            "cells": 1
          }
        ]
      },
      "everrealm": {
        "action_kind": "damage_control",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [
          {
            "type": "knockback",
            "cells": 1
          }
        ],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(18 / 3) * 0.8",
          "raw_multiplier": 2.4495,
          "utility_multiplier": 0.8,
          "final_total_multiplier": 1.9596
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "kenpou",
      "name_zh": "拳砲",
      "source_name_ja": "拳砲",
      "type": "CMD",
      "category": "kentotsu_line",
      "requires": [
        "sunkei"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 32,
        "speed": "D",
        "interrupt": 12,
        "durability": 10,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■\n↑",
          "range_description": "可選 1 格：前1。",
          "range_cells_relative": [
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆☆☆",
              "star_value": 3
            }
          ],
          "rarity": null,
          "quests": [
            "ネギ",
            "球根",
            "ハチミツ"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "傷害並擊退3格",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "knockback",
            "cells": 3
          }
        ]
      },
      "everrealm": {
        "action_kind": "damage_control",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [
          {
            "type": "knockback",
            "cells": 3
          }
        ],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(32 / 3) * 0.8",
          "raw_multiplier": 3.266,
          "utility_multiplier": 0.8,
          "final_total_multiplier": 2.6128
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "gangatotsu",
      "name_zh": "岩牙突",
      "source_name_ja": "岩牙突",
      "type": "CMD",
      "category": "kentotsu_line",
      "requires": [
        "kenpou"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 30,
        "speed": "D",
        "interrupt": 1,
        "durability": 10,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口口■口口\n口■口■口\n■口↑口■\n口■口■口",
          "range_description": "可選 7 格：前2、前1左1、前1右1、左2、右2、後1左1、後1右1。",
          "range_cells_relative": [
            [
              0,
              2
            ],
            [
              -1,
              1
            ],
            [
              1,
              1
            ],
            [
              -2,
              0
            ],
            [
              2,
              0
            ],
            [
              -1,
              -1
            ],
            [
              1,
              -1
            ]
          ],
          "height_difference": {
            "up": 2,
            "down": 2,
            "source_text": "上2・下2",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆☆☆☆",
              "star_value": 4
            }
          ],
          "rarity": null,
          "quests": [
            "墓場"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "石柱傷害並轉倒",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "knockdown",
            "duration_turns": 0
          }
        ]
      },
      "everrealm": {
        "action_kind": "damage_control",
        "deals_damage": true,
        "delivery_mode": "pathless",
        "path_mode": null,
        "utility_effects": [
          {
            "type": "knockdown",
            "duration_turns": 0
          }
        ],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(30 / 3) * 0.8",
          "raw_multiplier": 3.1623,
          "utility_multiplier": 0.8,
          "final_total_multiplier": 2.5298
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "gangaretsujin",
      "name_zh": "岩牙列陣",
      "source_name_ja": "岩牙列陣",
      "type": "CMD",
      "category": "kentotsu_line",
      "requires": [
        "gangatotsu"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 45,
        "speed": "D",
        "interrupt": 1,
        "durability": 6,
        "range": {
          "type": "self",
          "source_pattern": "自己",
          "range_description": "只可選擇自己／以自己作為施放起點。",
          "range_cells_relative": [
            [
              0,
              0
            ]
          ],
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "area_all_units",
          "source_pattern": "■\n■\n■\n■\n■\n■\n■\n■\n↑",
          "coordinate_origin": "caster",
          "area_description": "影響 8 格：前8、前7、前6、前5、前4、前3、前2、前1。",
          "cells_relative": [
            [
              0,
              8
            ],
            [
              0,
              7
            ],
            [
              0,
              6
            ],
            [
              0,
              5
            ],
            [
              0,
              4
            ],
            [
              0,
              3
            ],
            [
              0,
              2
            ],
            [
              0,
              1
            ]
          ]
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆",
              "star_value": 6
            }
          ],
          "rarity": null,
          "quests": [
            "メイド(弱)",
            "コボルト",
            "死神呪い"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "直列石柱範圍傷害",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "area_damage",
        "deals_damage": true,
        "delivery_mode": "pathless",
        "path_mode": null,
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(45 / 3)",
          "raw_multiplier": 3.873,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 3.873
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "gangahoujin",
      "name_zh": "岩牙方陣",
      "source_name_ja": "岩牙方陣",
      "type": "CMD",
      "category": "kentotsu_line",
      "requires": [
        "gangatotsu"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 30,
        "speed": "D",
        "interrupt": 1,
        "durability": 6,
        "range": {
          "type": "self",
          "source_pattern": "自己",
          "range_description": "只可選擇自己／以自己作為施放起點。",
          "range_cells_relative": [
            [
              0,
              0
            ]
          ],
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "area_all_enemy_units",
          "source_pattern": "■■■\n■↑■\n■■■",
          "coordinate_origin": "caster",
          "area_description": "影響 8 格：前1左1、前1、前1右1、左1、右1、後1左1、後1、後1右1。",
          "cells_relative": [
            [
              -1,
              1
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ],
            [
              -1,
              -1
            ],
            [
              0,
              -1
            ],
            [
              1,
              -1
            ]
          ],
          "height_difference": {
            "up": 2,
            "down": 2,
            "source_text": "上2・下2",
            "status": "confirmed"
          }
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★",
              "star_value": 5
            }
          ],
          "rarity": null,
          "quests": [
            "球根",
            "たこ焼き",
            "コボルト"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "周身石柱傷害並轉倒",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "knockdown",
            "duration_turns": 0
          }
        ]
      },
      "everrealm": {
        "action_kind": "area_damage_control",
        "deals_damage": true,
        "delivery_mode": "pathless",
        "path_mode": null,
        "utility_effects": [
          {
            "type": "knockdown",
            "duration_turns": 0
          }
        ],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(30 / 3) * 0.8",
          "raw_multiplier": 3.1623,
          "utility_multiplier": 0.8,
          "final_total_multiplier": 2.5298
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "chisaihou",
      "name_zh": "地碎崩",
      "source_name_ja": "地砕崩",
      "type": "CMD",
      "category": "kentotsu_line",
      "requires": [
        "gangaretsujin"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 30,
        "speed": "C",
        "interrupt": 12,
        "durability": 6,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口■口\n■↑■",
          "range_description": "可選 3 格：前1、左1、右1。",
          "range_cells_relative": [
            [
              0,
              1
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆☆",
              "star_value": 7
            },
            {
              "notation": "★★☆",
              "star_value": 11
            }
          ],
          "rarity": null,
          "quests": [
            "死神呪い",
            "カエル",
            "ハーブ"
          ],
          "drops": [
            "グラスマージ"
          ],
          "other_sources": []
        },
        "description_zh": "摔技傷害並轉倒",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "knockdown",
            "probability": "high",
            "duration_turns": 0
          }
        ]
      },
      "everrealm": {
        "action_kind": "damage_control",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [
          {
            "type": "knockdown",
            "probability": "high",
            "duration_turns": 0
          }
        ],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(30 / 3) * 0.8",
          "raw_multiplier": 3.1623,
          "utility_multiplier": 0.8,
          "final_total_multiplier": 2.5298
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "kueiku",
      "name_zh": "九影琥",
      "source_name_ja": "九影琥",
      "type": "CMD",
      "category": "kentotsu_line",
      "requires": [
        "gangahoujin"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 49,
        "speed": "D",
        "interrupt": 12,
        "durability": 6,
        "range": {
          "type": "self",
          "source_pattern": "自己",
          "range_description": "只可選擇自己／以自己作為施放起點。",
          "range_cells_relative": [
            [
              0,
              0
            ]
          ],
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "area_all_units",
          "source_pattern": "口口口■口口口\n口口■■■口口\n口■■■■■口\n■■■↑■■■\n口■■■■■口\n口口■■■口口\n口口口■口口口",
          "coordinate_origin": "caster",
          "area_description": "影響 24 格：前3、前2左1、前2、前2右1、前1左2、前1左1、前1、前1右1、前1右2、左3、左2、左1、右1、右2、右3、後1左2、後1左1、後1、後1右1、後1右2、後2左1、後2、後2右1、後3。",
          "cells_relative": [
            [
              0,
              3
            ],
            [
              -1,
              2
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ],
            [
              -2,
              1
            ],
            [
              -1,
              1
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              2,
              1
            ],
            [
              -3,
              0
            ],
            [
              -2,
              0
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              3,
              0
            ],
            [
              -2,
              -1
            ],
            [
              -1,
              -1
            ],
            [
              0,
              -1
            ],
            [
              1,
              -1
            ],
            [
              2,
              -1
            ],
            [
              -1,
              -2
            ],
            [
              0,
              -2
            ],
            [
              1,
              -2
            ],
            [
              0,
              -3
            ]
          ],
          "height_difference": {
            "up": 2,
            "down": 2,
            "source_text": "上2・下2",
            "status": "confirmed"
          }
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆",
              "star_value": 6
            },
            {
              "notation": "★★☆",
              "star_value": 11
            }
          ],
          "rarity": null,
          "quests": [
            "墓場",
            "ゴーレム",
            "スライム",
            "絵画"
          ],
          "drops": [
            "ペングィン",
            "ダンディウサギ等"
          ],
          "other_sources": []
        },
        "description_zh": "範圍衝擊波傷害並轉倒",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "knockdown",
            "probability": "high",
            "duration_turns": 0
          }
        ]
      },
      "everrealm": {
        "action_kind": "area_damage_control",
        "deals_damage": true,
        "delivery_mode": "pathless",
        "path_mode": null,
        "utility_effects": [
          {
            "type": "knockdown",
            "probability": "high",
            "duration_turns": 0
          }
        ],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(49 / 3) * 0.8",
          "raw_multiplier": 4.0415,
          "utility_multiplier": 0.8,
          "final_total_multiplier": 3.2332
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "tenretsuhou",
      "name_zh": "天裂崩",
      "source_name_ja": "天裂崩",
      "type": "CMD",
      "category": "kentotsu_line",
      "requires": [
        "chisaihou"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 85,
        "speed": "C",
        "interrupt": 12,
        "durability": 4,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■\n↑",
          "range_description": "可選 1 格：前1。",
          "range_cells_relative": [
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★",
              "star_value": 10
            },
            {
              "notation": "★★☆☆☆",
              "star_value": 13
            }
          ],
          "rarity": null,
          "quests": [
            "カエル",
            "石碑",
            "海賊"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "摔技傷害並擊退5格",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "knockback",
            "cells": 5
          }
        ]
      },
      "everrealm": {
        "action_kind": "damage_control",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [
          {
            "type": "knockback",
            "cells": 5
          }
        ],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(85 / 3) * 0.8",
          "raw_multiplier": 5.3229,
          "utility_multiplier": 0.8,
          "final_total_multiplier": 4.2583
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "resshin_kueiku",
      "name_zh": "烈震九影琥",
      "source_name_ja": "烈震九影琥",
      "type": "CMD",
      "category": "kentotsu_line",
      "requires": [
        "kueiku"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 56,
        "speed": "D",
        "interrupt": 12,
        "durability": 6,
        "range": {
          "type": "self",
          "source_pattern": "自己",
          "range_description": "只可選擇自己／以自己作為施放起點。",
          "range_cells_relative": [
            [
              0,
              0
            ]
          ],
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "area_all_units",
          "source_pattern": "口口■口口\n口■■■口\n■■↑■■\n口■■■口\n口口■口口",
          "coordinate_origin": "caster",
          "area_description": "影響 12 格：前2、前1左1、前1、前1右1、左2、左1、右1、右2、後1左1、後1、後1右1、後2。",
          "cells_relative": [
            [
              0,
              2
            ],
            [
              -1,
              1
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              -2,
              0
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ],
            [
              2,
              0
            ],
            [
              -1,
              -1
            ],
            [
              0,
              -1
            ],
            [
              1,
              -1
            ],
            [
              0,
              -2
            ]
          ],
          "height_difference": {
            "up": 2,
            "down": 2,
            "source_text": "上2・下2",
            "status": "confirmed"
          }
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆☆☆",
              "star_value": 8
            },
            {
              "notation": "★★☆☆",
              "star_value": 12
            }
          ],
          "rarity": null,
          "quests": [
            "スライム",
            "石碑",
            "海賊",
            "王家の墓"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "震地範圍傷害並轉倒",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "knockdown",
            "probability": "high",
            "duration_turns": 0
          }
        ]
      },
      "everrealm": {
        "action_kind": "area_damage_control",
        "deals_damage": true,
        "delivery_mode": "pathless",
        "path_mode": null,
        "utility_effects": [
          {
            "type": "knockdown",
            "probability": "high",
            "duration_turns": 0
          }
        ],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(56 / 3) * 0.8",
          "raw_multiplier": 4.3205,
          "utility_multiplier": 0.8,
          "final_total_multiplier": 3.4564
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "jinken",
      "name_zh": "迅拳",
      "source_name_ja": "迅拳",
      "type": "CMD",
      "category": "jinken_line",
      "requires": [
        "kentotsu"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 6,
        "speed": "A",
        "interrupt": 1,
        "durability": 10,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口■口\n■↑■",
          "range_description": "可選 3 格：前1、左1、右1。",
          "range_cells_relative": [
            [
              0,
              1
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": true,
          "shop_price": 300,
          "guild_reward_books": [
            {
              "notation": "☆",
              "star_value": 1
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "高速拳擊傷害",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(6 / 3)",
          "raw_multiplier": 1.4142,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 1.4142
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      },
      "source_note": "原 Wiki 詳細表亦記為初期所持；初始授予可以視為 acquisition exception。"
    },
    {
      "id": "rendan",
      "name_zh": "連擊",
      "source_name_ja": "連弾",
      "type": "CMD",
      "category": "jinken_line",
      "requires": [
        "jinken"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 12,
        "speed": "B",
        "interrupt": "1*2",
        "durability": 10,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■■■\n■↑■",
          "range_description": "可選 5 格：前1左1、前1、前1右1、左1、右1。",
          "range_cells_relative": [
            [
              -1,
              1
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": 600,
          "guild_reward_books": [
            {
              "notation": "☆☆",
              "star_value": 2
            }
          ],
          "rarity": null,
          "quests": [
            "旅立ちの決意"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "2段連續拳擊",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 2,
        "source_hit_judgement": "every_hit",
        "source_special_notes": [],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "multi_hit_damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(12 / 3)",
          "raw_multiplier": 2.0,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 2.0
        },
        "hit_resolution": {
          "hit_count": 2,
          "hit_judgement_mode": "each_hit",
          "recheck_attack_path_each_hit": true,
          "rounding_remainder_priority": "later_hits",
          "keep_original_intended_target": true,
          "keep_original_attack_path": true
        }
      }
    },
    {
      "id": "jisa_kentotsu",
      "name_zh": "時差正拳",
      "source_name_ja": "時差拳突",
      "type": "CMD",
      "category": "jinken_line",
      "requires": [
        "rendan"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 7,
        "speed": "C",
        "interrupt": 1,
        "durability": 10,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■■■\n■↑■",
          "range_description": "可選 5 格：前1左1、前1、前1右1、左1、右1。",
          "range_cells_relative": [
            [
              -1,
              1
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆☆☆",
              "star_value": 3
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "對防禦姿態有效的佯攻",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "feint",
            "effective_against": "guarding_target"
          }
        ]
      },
      "everrealm": {
        "action_kind": "damage_control",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [
          {
            "type": "feint",
            "effective_against": "guarding_target"
          }
        ],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(7 / 3) * 0.8",
          "raw_multiplier": 1.5275,
          "utility_multiplier": 0.8,
          "final_total_multiplier": 1.222
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      },
      "source_note": "上方只有連擊直線落入；冇跨欄 connector 接入，所以唔需要轉砲腳。"
    },
    {
      "id": "sandan",
      "name_zh": "散彈",
      "source_name_ja": "散弾",
      "type": "CMD",
      "category": "jinken_line",
      "requires": [
        "jisa_kentotsu"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 16,
        "speed": "C",
        "interrupt": 1,
        "durability": 6,
        "range": {
          "type": "self",
          "source_pattern": "自己",
          "range_description": "只可選擇自己／以自己作為施放起點。",
          "range_cells_relative": [
            [
              0,
              0
            ]
          ],
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "area_all_units",
          "source_pattern": "■■■\n口↑口",
          "coordinate_origin": "caster",
          "area_description": "影響 3 格：前1左1、前1、前1右1。",
          "cells_relative": [
            [
              -1,
              1
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆☆☆☆",
              "star_value": 4
            }
          ],
          "rarity": null,
          "quests": [
            "ネギ"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "前方範圍衝擊波傷害",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "area_damage",
        "deals_damage": true,
        "delivery_mode": "pathless",
        "path_mode": null,
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(16 / 3)",
          "raw_multiplier": 2.3094,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 2.3094
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "korendan",
      "name_zh": "虎連擊",
      "source_name_ja": "虎連弾",
      "type": "CMD",
      "category": "jinken_line",
      "requires": [
        "sandan"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 24,
        "speed": "C",
        "interrupt": "1*3",
        "durability": 6,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口■口\n■↑■",
          "range_description": "可選 3 格：前1、左1、右1。",
          "range_cells_relative": [
            [
              0,
              1
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★",
              "star_value": 5
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [
            "ウッディーリード",
            "ミノゴブロス",
            "一部ゴブリン"
          ],
          "other_sources": []
        },
        "description_zh": "3段連續拳擊",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 3,
        "source_hit_judgement": "every_hit",
        "source_special_notes": [
          "三連続攻撃",
          "特殊：威力の変動"
        ],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "multi_hit_damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(24 / 3)",
          "raw_multiplier": 2.8284,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 2.8284
        },
        "hit_resolution": {
          "hit_count": 3,
          "hit_judgement_mode": "each_hit",
          "recheck_attack_path_each_hit": true,
          "rounding_remainder_priority": "later_hits",
          "keep_original_intended_target": true,
          "keep_original_attack_path": true
        }
      }
    },
    {
      "id": "kouryuusei",
      "name_zh": "紅流星",
      "source_name_ja": "紅流星",
      "type": "CMD",
      "category": "jinken_line",
      "requires": [
        "korendan"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 28,
        "speed": "D",
        "interrupt": 1,
        "durability": 10,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■\n■\n■\n↑",
          "range_description": "可選 3 格：前3、前2、前1。",
          "range_cells_relative": [
            [
              0,
              3
            ],
            [
              0,
              2
            ],
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "line_to_selected_target"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆",
              "star_value": 6
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "直線路徑衝擊波傷害",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [],
        "piercing": true
      },
      "everrealm": {
        "action_kind": "line_damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(28 / 3)",
          "raw_multiplier": 3.0551,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 3.0551
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "zanjuken",
      "name_zh": "殘充拳",
      "source_name_ja": "残充拳",
      "type": "CMD",
      "category": "jinken_line",
      "requires": [
        "kouryuusei"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 18,
        "speed": "S",
        "interrupt": 1,
        "durability": 6,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■\n↑",
          "range_description": "可選 1 格：前1。",
          "range_cells_relative": [
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆☆",
              "star_value": 7
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "超高速拳擊傷害",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(18 / 3)",
          "raw_multiplier": 2.4495,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 2.4495
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "dokushuken",
      "name_zh": "毒手拳",
      "source_name_ja": "毒手拳",
      "type": "CMD",
      "category": "jinken_line",
      "requires": [
        "zanjuken"
      ],
      "requires_status": "cross_confirmed",
      "original_reference": {
        "ap": 25,
        "speed": "D",
        "interrupt": 1,
        "durability": 10,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口■口\n■↑■",
          "range_description": "可選 3 格：前1、左1、右1。",
          "range_cells_relative": [
            [
              0,
              1
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆☆☆☆",
              "star_value": 9
            },
            {
              "notation": "★★☆☆",
              "star_value": 12
            }
          ],
          "rarity": null,
          "quests": [
            "死神呪い",
            "山賊",
            "踊り子"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "傷害並令雙方中毒",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "self_poison",
            "duration_turns": 1
          },
          {
            "type": "poison",
            "probability": "high",
            "duration_turns": 5,
            "status": "uncertain"
          }
        ]
      },
      "everrealm": {
        "action_kind": "damage_control",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [
          {
            "type": "self_poison",
            "duration_turns": 1
          },
          {
            "type": "poison",
            "probability": "high",
            "duration_turns": 5,
            "status": "uncertain"
          }
        ],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(25 / 3) * 0.8",
          "raw_multiplier": 2.8868,
          "utility_multiplier": 0.8,
          "final_total_multiplier": 2.3094
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      },
      "source_note": "殘充拳主線喺百虎連擊前分出左支線落毒手拳。"
    },
    {
      "id": "byakkorendan",
      "name_zh": "百虎連擊",
      "source_name_ja": "百虎連弾",
      "type": "CMD",
      "category": "jinken_line",
      "requires": [
        "zanjuken"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 42,
        "speed": "C",
        "interrupt": "1*5",
        "durability": 6,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■\n↑",
          "range_description": "可選 1 格：前1。",
          "range_cells_relative": [
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★",
              "star_value": 10
            }
          ],
          "rarity": "レア",
          "quests": [
            "絵画",
            "踊り子",
            "ハーブ",
            "邪教"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "5段連續拳擊",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 5,
        "source_hit_judgement": "every_hit",
        "source_special_notes": [
          "五連続攻撃",
          "特殊：威力の変動"
        ],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "multi_hit_damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(42 / 3)",
          "raw_multiplier": 3.7417,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 3.7417
        },
        "hit_resolution": {
          "hit_count": 5,
          "hit_judgement_mode": "each_hit",
          "recheck_attack_path_each_hit": true,
          "rounding_remainder_priority": "later_hits",
          "keep_original_intended_target": true,
          "keep_original_attack_path": true
        }
      }
    },
    {
      "id": "tenpoukyaku",
      "name_zh": "轉砲腳",
      "source_name_ja": "転砲脚",
      "type": "CMD",
      "category": "kick",
      "requires": [
        "jinken"
      ],
      "requires_status": "cross_confirmed",
      "original_reference": {
        "ap": 22,
        "speed": "D",
        "interrupt": 4,
        "durability": 6,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口■口\n口■口\n■↑■",
          "range_description": "可選 4 格：前2、前1、左1、右1。",
          "range_cells_relative": [
            [
              0,
              2
            ],
            [
              0,
              1
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆☆",
              "star_value": 7
            }
          ],
          "rarity": "レア",
          "quests": [
            "種",
            "メイド(強)",
            "スライム",
            "果実"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "傷害並擊退1格",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "knockback",
            "cells": 1
          }
        ]
      },
      "everrealm": {
        "action_kind": "damage_control",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [
          {
            "type": "knockback",
            "cells": 1
          }
        ],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(22 / 3) * 0.8",
          "raw_multiplier": 2.708,
          "utility_multiplier": 0.8,
          "final_total_multiplier": 2.1664
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      },
      "source_note": "迅拳右側 connector 轉落轉砲腳。"
    },
    {
      "id": "chiheikyaku",
      "name_zh": "地平腳",
      "source_name_ja": "地平脚",
      "type": "CMD",
      "category": "kick",
      "requires": [
        "tenpoukyaku"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 25,
        "speed": "C",
        "interrupt": 12,
        "durability": 6,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口■口\n■↑■",
          "range_description": "可選 3 格：前1、左1、右1。",
          "range_cells_relative": [
            [
              0,
              1
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ]
          ],
          "height_difference": {
            "up": 0,
            "down": 0,
            "source_text": "上0?・下0?",
            "status": "uncertain"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆☆☆",
              "star_value": 8
            }
          ],
          "rarity": null,
          "quests": [
            "メイド(強)",
            "コボルト",
            "ゴーレム",
            "ハーブ",
            "復讐"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "貼地踢擊並轉倒",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "knockdown",
            "probability": "high",
            "duration_turns": 0
          }
        ]
      },
      "everrealm": {
        "action_kind": "damage_control",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [
          {
            "type": "knockdown",
            "probability": "high",
            "duration_turns": 0
          }
        ],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(25 / 3) * 0.8",
          "raw_multiplier": 2.8868,
          "utility_multiplier": 0.8,
          "final_total_multiplier": 2.3094
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "fuujinkyaku",
      "name_zh": "風刃腳",
      "source_name_ja": "風刃脚",
      "type": "CMD",
      "category": "kick",
      "requires": [
        "chiheikyaku"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 25,
        "speed": "C",
        "interrupt": 1,
        "durability": 6,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口■口\n■■■\n■口■\n口↑口",
          "range_description": "可選 6 格：前3、前2左1、前2、前2右1、前1左1、前1右1。",
          "range_cells_relative": [
            [
              0,
              3
            ],
            [
              -1,
              2
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ],
            [
              -1,
              1
            ],
            [
              1,
              1
            ]
          ],
          "height_difference": {
            "up": 2,
            "down": 2,
            "source_text": "上2・下2",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★",
              "star_value": 10
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "曲射真空刃傷害",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [
          "曲射"
        ],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "damage",
        "deals_damage": true,
        "delivery_mode": "arc",
        "path_mode": null,
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(25 / 3)",
          "raw_multiplier": 2.8868,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 2.8868
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "gouhoukyaku",
      "name_zh": "豪砲腳",
      "source_name_ja": "豪砲脚",
      "type": "CMD",
      "category": "kick",
      "requires": [
        "fuujinkyaku"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 36,
        "speed": "D",
        "interrupt": 12,
        "durability": 4,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口■口\n■↑■",
          "range_description": "可選 3 格：前1、左1、右1。",
          "range_cells_relative": [
            [
              0,
              1
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★☆",
              "star_value": 11
            }
          ],
          "rarity": null,
          "quests": [
            "山賊",
            "海賊",
            "邪教"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "傷害並擊退4格",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "knockback",
            "cells": 4
          }
        ]
      },
      "everrealm": {
        "action_kind": "damage_control",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [
          {
            "type": "knockback",
            "cells": 4
          }
        ],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(36 / 3) * 0.8",
          "raw_multiplier": 3.4641,
          "utility_multiplier": 0.8,
          "final_total_multiplier": 2.7713
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "fuujin_kikoukyaku",
      "name_zh": "風神氣功腳",
      "source_name_ja": "風神気功脚",
      "type": "CMD",
      "category": "kick_ki_hybrid",
      "requires": [
        "gouhoukyaku",
        "kikoudan"
      ],
      "requires_status": "cross_confirmed",
      "original_reference": {
        "ap": 55,
        "speed": "D",
        "interrupt": 1,
        "durability": 6,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■■■■■\n口■■■口\n口口■口口\n口口↑口口",
          "range_description": "可選 9 格：前3左2、前3左1、前3、前3右1、前3右2、前2左1、前2、前2右1、前1。",
          "range_cells_relative": [
            [
              -2,
              3
            ],
            [
              -1,
              3
            ],
            [
              0,
              3
            ],
            [
              1,
              3
            ],
            [
              2,
              3
            ],
            [
              -1,
              2
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ],
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 2,
            "down": null,
            "source_text": "上2?・下∞",
            "status": "uncertain_up"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★☆☆☆",
              "star_value": 13
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "直射氣功踢擊",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [
          "直射",
          "上2?・下∞"
        ],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(55 / 3)",
          "raw_multiplier": 4.2817,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 4.2817
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      },
      "source_note": "原 tree 用左右兩邊轉入同一節點嘅 connector；足技線同氣功線同時接入。"
    },
    {
      "id": "buyou",
      "name_zh": "舞葉",
      "source_name_ja": "舞葉",
      "type": "CMD",
      "category": "evade_counter",
      "requires": [
        "kentotsu"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 7,
        "speed": "A",
        "interrupt": null,
        "durability": 10,
        "range": {
          "type": "self",
          "source_pattern": "自己",
          "range_description": "只可選擇自己／以自己作為施放起點。",
          "range_cells_relative": [
            [
              0,
              0
            ]
          ],
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "self_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆",
              "star_value": 1
            }
          ],
          "rarity": "準レア",
          "quests": [
            "ネギ",
            "球根"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "高迴避姿態",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "evasion_stance",
            "probability": "high",
            "duration_turns": 0
          }
        ]
      },
      "everrealm": {
        "action_kind": "self_buff",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "evasion_stance",
            "probability": "high",
            "duration_turns": 0
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "sen_no_sen",
      "name_zh": "先之先",
      "source_name_ja": "先之先",
      "type": "CMD",
      "category": "evade_counter",
      "requires": [
        "buyou"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 18,
        "speed": "B",
        "interrupt": null,
        "durability": 10,
        "range": {
          "type": "self",
          "source_pattern": "自己",
          "range_description": "只可選擇自己／以自己作為施放起點。",
          "range_cells_relative": [
            [
              0,
              0
            ]
          ],
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "self_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆",
              "star_value": 1
            }
          ],
          "rarity": "レア",
          "quests": [
            "蟹",
            "地竜",
            "球根"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "反擊姿態",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "counter_stance",
            "duration_turns": 0
          }
        ]
      },
      "everrealm": {
        "action_kind": "counter_stance",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "counter_stance",
            "duration_turns": 0
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "choudankyaku",
      "name_zh": "跳彈腳",
      "source_name_ja": "跳弾脚",
      "type": "CMD",
      "category": "evade_counter",
      "requires": [
        "sen_no_sen",
        "tenpoukyaku"
      ],
      "requires_status": "cross_confirmed",
      "original_reference": {
        "ap": 18,
        "speed": "B",
        "interrupt": null,
        "durability": 6,
        "range": {
          "type": "self",
          "source_pattern": "自己",
          "range_description": "只可選擇自己／以自己作為施放起點。",
          "range_cells_relative": [
            [
              0,
              0
            ]
          ],
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "self_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆☆",
              "star_value": 7
            }
          ],
          "rarity": null,
          "quests": [
            "メイド(弱)",
            "コボルト",
            "ハチミツ",
            "指輪",
            "絵画",
            "山賊"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "投射反射姿態",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "projectile_reflect_stance",
            "duration_turns": 0
          }
        ]
      },
      "everrealm": {
        "action_kind": "counter_stance",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "projectile_reflect_stance",
            "duration_turns": 0
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      },
      "source_note": "跳彈腳上方「┫」明確表示轉砲腳支線同先之先直線一齊接入。"
    },
    {
      "id": "ryuugan",
      "name_zh": "龍眼",
      "source_name_ja": "竜眼",
      "type": "CMD",
      "category": "evade_counter",
      "requires": [
        "choudankyaku"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 16,
        "speed": "A",
        "interrupt": null,
        "durability": 10,
        "range": {
          "type": "self",
          "source_pattern": "自己",
          "range_description": "只可選擇自己／以自己作為施放起點。",
          "range_cells_relative": [
            [
              0,
              0
            ]
          ],
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "self_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★☆",
              "star_value": 11
            }
          ],
          "rarity": "レア",
          "quests": [
            "ハーブ",
            "王家の墓"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "強化高迴避姿態",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "super_evasion_stance",
            "probability": "high",
            "duration_turns": 0
          }
        ]
      },
      "everrealm": {
        "action_kind": "self_buff",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "super_evasion_stance",
            "probability": "high",
            "duration_turns": 0
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "houkou",
      "name_zh": "咆哮",
      "source_name_ja": "咆哮",
      "type": "CMD",
      "category": "ki_ranged",
      "requires": [
        "kentotsu"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 38,
        "speed": "B",
        "interrupt": 12,
        "durability": 6,
        "range": {
          "type": "self",
          "source_pattern": "自己",
          "range_description": "只可選擇自己／以自己作為施放起點。",
          "range_cells_relative": [
            [
              0,
              0
            ]
          ],
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "area_all_units",
          "source_pattern": "■■■■■■■\n口■■■■■口\n口口■■■口口\n口口口■口口口\n口口口↑口口口",
          "coordinate_origin": "caster",
          "area_description": "影響 16 格：前4左3、前4左2、前4左1、前4、前4右1、前4右2、前4右3、前3左2、前3左1、前3、前3右1、前3右2、前2左1、前2、前2右1、前1。",
          "cells_relative": [
            [
              -3,
              4
            ],
            [
              -2,
              4
            ],
            [
              -1,
              4
            ],
            [
              0,
              4
            ],
            [
              1,
              4
            ],
            [
              2,
              4
            ],
            [
              3,
              4
            ],
            [
              -2,
              3
            ],
            [
              -1,
              3
            ],
            [
              0,
              3
            ],
            [
              1,
              3
            ],
            [
              2,
              3
            ],
            [
              -1,
              2
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ],
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 2,
            "down": 2,
            "source_text": "上2・下2",
            "status": "confirmed"
          }
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆☆",
              "star_value": 2
            }
          ],
          "rarity": null,
          "quests": [
            "リョマ",
            "ネギ",
            "焼肉",
            "土鍋"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "範圍行動妨害",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "action_interference",
            "value": 12,
            "affects": "all_units_in_effect_area"
          }
        ]
      },
      "everrealm": {
        "action_kind": "area_control",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "action_interference",
            "value": 12,
            "affects": "all_units_in_effect_area"
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "mutouki",
      "name_zh": "無鬥氣",
      "source_name_ja": "無闘気",
      "type": "CMD",
      "category": "ki_ranged",
      "requires": [
        "houkou"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 35,
        "speed": "B",
        "interrupt": null,
        "durability": 6,
        "range": {
          "type": "self",
          "source_pattern": "自己",
          "range_description": "只可選擇自己／以自己作為施放起點。",
          "range_cells_relative": [
            [
              0,
              0
            ]
          ],
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "self_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆☆☆",
              "star_value": 3
            }
          ],
          "rarity": null,
          "quests": [
            "ネギ",
            "焼肉",
            "土鍋",
            "ハチミツ"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "透明2回合",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "invisible",
            "duration_turns": 2
          }
        ]
      },
      "everrealm": {
        "action_kind": "self_buff",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "invisible",
            "duration_turns": 2
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "shuukijutsu",
      "name_zh": "集氣術",
      "source_name_ja": "集気術",
      "type": "CMD",
      "category": "ki_ranged",
      "requires": [
        "mutouki"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 20,
        "speed": "C",
        "interrupt": null,
        "durability": 6,
        "range": {
          "type": "self",
          "source_pattern": "自己",
          "range_description": "只可選擇自己／以自己作為施放起點。",
          "range_cells_relative": [
            [
              0,
              0
            ]
          ],
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "self_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆☆☆☆",
              "star_value": 4
            }
          ],
          "rarity": null,
          "quests": [
            "仮面",
            "たこ焼き"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "少量HP回復",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "heal_hp",
            "magnitude": "small"
          }
        ]
      },
      "everrealm": {
        "action_kind": "heal",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "heal_hp",
            "magnitude": "small"
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "fudoushibari",
      "name_zh": "不動縛",
      "source_name_ja": "不動縛",
      "type": "CMD",
      "category": "ki_ranged",
      "requires": [
        "mutouki"
      ],
      "requires_status": "cross_confirmed",
      "original_reference": {
        "ap": 35,
        "speed": "D",
        "interrupt": null,
        "durability": 6,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口口■口口\n口口口口口\n■口↑口■",
          "range_description": "可選 3 格：前2、左2、右2。",
          "range_cells_relative": [
            [
              0,
              2
            ],
            [
              -2,
              0
            ],
            [
              2,
              0
            ]
          ],
          "height_difference": {
            "up": 3,
            "down": 3,
            "source_text": "上3・下3",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆☆☆☆",
              "star_value": 9
            }
          ],
          "rarity": null,
          "quests": [
            "ゴーレム",
            "カエル",
            "王家の墓",
            "邪教"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "指定目標麻痺2回合",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [
          "経路が存在する"
        ],
        "source_effects": [
          {
            "type": "paralysis",
            "probability": "high",
            "duration_turns": 2
          }
        ]
      },
      "everrealm": {
        "action_kind": "single_target_control",
        "deals_damage": false,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [
          {
            "type": "paralysis",
            "probability": "high",
            "duration_turns": 2
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      },
      "source_note": "無鬥氣右側 branch 轉落不動縛；唔係由集氣術直落。"
    },
    {
      "id": "retsusenkou",
      "name_zh": "裂閃光",
      "source_name_ja": "裂閃光",
      "type": "CMD",
      "category": "ki_ranged",
      "requires": [
        "shuukijutsu"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 35,
        "speed": "D",
        "interrupt": null,
        "durability": 6,
        "range": {
          "type": "self",
          "source_pattern": "自己",
          "range_description": "只可選擇自己／以自己作為施放起點。",
          "range_cells_relative": [
            [
              0,
              0
            ]
          ],
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "area_all_units",
          "source_pattern": "■■■■■\n口■■■口\n口口■口口\n口口↑口口",
          "coordinate_origin": "caster",
          "area_description": "影響 9 格：前3左2、前3左1、前3、前3右1、前3右2、前2左1、前2、前2右1、前1。",
          "cells_relative": [
            [
              -2,
              3
            ],
            [
              -1,
              3
            ],
            [
              0,
              3
            ],
            [
              1,
              3
            ],
            [
              2,
              3
            ],
            [
              -1,
              2
            ],
            [
              0,
              2
            ],
            [
              1,
              2
            ],
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 3,
            "down": 3,
            "source_text": "上3?・下3?",
            "status": "uncertain"
          }
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★",
              "star_value": 5
            }
          ],
          "rarity": "準レア",
          "quests": [
            "焼肉",
            "人形",
            "仮面",
            "パンダ",
            "種",
            "死神呪い",
            "スライム"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "範圍暗闇4回合",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "blind",
            "probability": "high",
            "duration_turns": 4
          }
        ]
      },
      "everrealm": {
        "action_kind": "area_control",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "blind",
            "probability": "high",
            "duration_turns": 4
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "shuuki_hijutsu",
      "name_zh": "集氣秘術",
      "source_name_ja": "集気秘術",
      "type": "CMD",
      "category": "ki_ranged",
      "requires": [
        "shuukijutsu"
      ],
      "requires_status": "cross_confirmed",
      "original_reference": {
        "ap": 38,
        "speed": "C",
        "interrupt": null,
        "durability": 6,
        "range": {
          "type": "self",
          "source_pattern": "自己",
          "range_description": "只可選擇自己／以自己作為施放起點。",
          "range_cells_relative": [
            [
              0,
              0
            ]
          ],
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "self_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★☆☆☆",
              "star_value": 13
            }
          ],
          "rarity": null,
          "quests": [
            "海賊",
            "邪教"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "大量HP回復",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "heal_hp",
            "magnitude": "large"
          }
        ]
      },
      "everrealm": {
        "action_kind": "heal",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "heal_hp",
            "magnitude": "large"
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      },
      "source_note": "集氣術向右分支再落集氣秘術；上方不動縛並冇 connector 直落呢招。"
    },
    {
      "id": "shidan",
      "name_zh": "指彈",
      "source_name_ja": "指弾",
      "type": "CMD",
      "category": "ki_ranged",
      "requires": [
        "retsusenkou"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 12,
        "speed": "C",
        "interrupt": 1,
        "durability": 6,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■■■\n■■■\n口■口\n口■口\n口↑口",
          "range_description": "可選 8 格：前4左1、前4、前4右1、前3左1、前3、前3右1、前2、前1。",
          "range_cells_relative": [
            [
              -1,
              4
            ],
            [
              0,
              4
            ],
            [
              1,
              4
            ],
            [
              -1,
              3
            ],
            [
              0,
              3
            ],
            [
              1,
              3
            ],
            [
              0,
              2
            ],
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": "unlimited",
            "source_text": "上1・下∞",
            "status": "confirmed_down_unlimited"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆",
              "star_value": 6
            }
          ],
          "rarity": null,
          "quests": [
            "パンダ",
            "種",
            "メイド(弱)",
            "指輪",
            "果実"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "小型直射氣彈",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [
          "直射"
        ],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(12 / 3)",
          "raw_multiplier": 2.0,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 2.0
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "kikoudan",
      "name_zh": "氣功彈",
      "source_name_ja": "気功弾",
      "type": "CMD",
      "category": "ki_ranged",
      "requires": [
        "shidan"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 32,
        "speed": "D",
        "interrupt": 1,
        "durability": 6,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■■■\n■■■\n口■口\n口■口\n口↑口",
          "range_description": "可選 8 格：前4左1、前4、前4右1、前3左1、前3、前3右1、前2、前1。",
          "range_cells_relative": [
            [
              -1,
              4
            ],
            [
              0,
              4
            ],
            [
              1,
              4
            ],
            [
              -1,
              3
            ],
            [
              0,
              3
            ],
            [
              1,
              3
            ],
            [
              0,
              2
            ],
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": "unlimited",
            "source_text": "上1・下∞",
            "status": "confirmed_down_unlimited"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆☆☆",
              "star_value": 8
            }
          ],
          "rarity": null,
          "quests": [
            "メイド(強)",
            "スライム",
            "指輪",
            "カエル",
            "山賊"
          ],
          "drops": [
            "エンサインオーク",
            "ウォーラントオークなど一部オーク"
          ],
          "other_sources": []
        },
        "description_zh": "直射氣彈傷害",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [
          "直射"
        ],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(32 / 3)",
          "raw_multiplier": 3.266,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 3.266
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "gekikoudan",
      "name_zh": "激氣功彈",
      "source_name_ja": "激気功弾",
      "type": "CMD",
      "category": "ki_ranged",
      "requires": [
        "kikoudan"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 45,
        "speed": "D",
        "interrupt": 1,
        "durability": 4,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■■■\n■■■\n口■口\n口■口\n口↑口",
          "range_description": "可選 8 格：前4左1、前4、前4右1、前3左1、前3、前3右1、前2、前1。",
          "range_cells_relative": [
            [
              -1,
              4
            ],
            [
              0,
              4
            ],
            [
              1,
              4
            ],
            [
              -1,
              3
            ],
            [
              0,
              3
            ],
            [
              1,
              3
            ],
            [
              0,
              2
            ],
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": "unlimited",
            "source_text": "上1・下∞",
            "status": "confirmed_down_unlimited"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★☆",
              "star_value": 11
            }
          ],
          "rarity": null,
          "quests": [
            "石碑",
            "踊り子"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "大型直射氣彈",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [
          "直射"
        ],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(45 / 3)",
          "raw_multiplier": 3.873,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 3.873
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "kikouhou",
      "name_zh": "氣功砲",
      "source_name_ja": "気功砲",
      "type": "CMD",
      "category": "ki_ranged",
      "requires": [
        "kikoudan"
      ],
      "requires_status": "cross_confirmed",
      "original_reference": {
        "ap": 42,
        "speed": "D",
        "interrupt": 1,
        "durability": 6,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■\n■\n■\n■\n■\n↑",
          "range_description": "可選 5 格：前5、前4、前3、前2、前1。",
          "range_cells_relative": [
            [
              0,
              5
            ],
            [
              0,
              4
            ],
            [
              0,
              3
            ],
            [
              0,
              2
            ],
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": "unlimited",
            "source_text": "上1・下∞",
            "status": "confirmed_down_unlimited"
          }
        },
        "effect_area": {
          "type": "line_to_selected_target"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆☆☆☆",
              "star_value": 9
            }
          ],
          "rarity": null,
          "quests": [
            "メイド(強)",
            "絵画",
            "石碑",
            "復讐"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "直線貫通氣功傷害",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [
          "直射"
        ],
        "source_effects": [],
        "piercing": true
      },
      "everrealm": {
        "action_kind": "line_damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(42 / 3)",
          "raw_multiplier": 3.7417,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 3.7417
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      },
      "source_note": "氣功彈下方「╋」向右 branch 落氣功砲；唔需要集氣秘術。"
    },
    {
      "id": "gekikou_kyodan",
      "name_zh": "激氣功巨彈",
      "source_name_ja": "激気功巨弾",
      "type": "CMD",
      "category": "ki_ranged",
      "requires": [
        "gekikoudan"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 63,
        "speed": "E",
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■■■\n■■■\n口■口\n口■口\n口↑口",
          "range_description": "可選 8 格：前4左1、前4、前4右1、前3左1、前3、前3右1、前2、前1。",
          "range_cells_relative": [
            [
              -1,
              4
            ],
            [
              0,
              4
            ],
            [
              1,
              4
            ],
            [
              -1,
              3
            ],
            [
              0,
              3
            ],
            [
              1,
              3
            ],
            [
              0,
              2
            ],
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": "unlimited",
            "source_text": "上1・下∞",
            "status": "confirmed_down_unlimited"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★",
              "star_value": 10
            },
            {
              "notation": "★★☆☆☆☆",
              "star_value": 14
            }
          ],
          "rarity": null,
          "quests": [
            "海賊"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "巨大直射氣彈",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [
          "実際は直射"
        ],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(63 / 3)",
          "raw_multiplier": 4.5826,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 4.5826
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "kikou_sakuretsudan",
      "name_zh": "氣功炸裂彈",
      "source_name_ja": "気功炸裂弾",
      "type": "CMD",
      "category": "ki_ranged",
      "requires": [
        "gekikoudan"
      ],
      "requires_status": "cross_confirmed",
      "original_reference": {
        "ap": 55,
        "speed": "D",
        "interrupt": 1,
        "durability": 4,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口口■口口\n口■口■口\n■口口口■\n口口↑口口",
          "range_description": "可選 5 格：前3、前2左1、前2右1、前1左2、前1右2。",
          "range_cells_relative": [
            [
              0,
              3
            ],
            [
              -1,
              2
            ],
            [
              1,
              2
            ],
            [
              -2,
              1
            ],
            [
              2,
              1
            ]
          ],
          "height_difference": {
            "up": 2,
            "down": "unlimited",
            "source_text": "上2・下∞",
            "status": "confirmed_down_unlimited"
          }
        },
        "effect_area": {
          "type": "impact_area_all_units",
          "source_pattern": "口■口\n■■■\n口■口",
          "coordinate_origin": "impact_cell",
          "area_description": "影響 5 格：前1、左1、自身、右1、後1。",
          "cells_relative": [
            [
              0,
              1
            ],
            [
              -1,
              0
            ],
            [
              0,
              0
            ],
            [
              1,
              0
            ],
            [
              0,
              -1
            ]
          ]
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★☆☆☆☆",
              "star_value": 14
            }
          ],
          "rarity": null,
          "quests": [
            "海賊"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "曲射爆炸範圍傷害",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [
          "曲射"
        ],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "area_damage",
        "deals_damage": true,
        "delivery_mode": "arc",
        "path_mode": null,
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(55 / 3)",
          "raw_multiplier": 4.2817,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 4.2817
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      },
      "source_note": "激氣功彈分支向右再落炸裂彈；上方氣功砲並冇直落 connector。"
    },
    {
      "id": "ryudan",
      "name_zh": "龍彈",
      "source_name_ja": "龍弾",
      "type": "CMD",
      "category": "ki_ranged",
      "requires": [
        "gekikou_kyodan"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 90,
        "speed": "E",
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■\n■\n■\n■\n■\n↑",
          "range_description": "可選 5 格：前5、前4、前3、前2、前1。",
          "range_cells_relative": [
            [
              0,
              5
            ],
            [
              0,
              4
            ],
            [
              0,
              3
            ],
            [
              0,
              2
            ],
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": "unlimited",
            "source_text": "上1・下∞",
            "status": "confirmed_down_unlimited"
          }
        },
        "effect_area": {
          "type": "line_to_selected_target"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★☆☆☆☆",
              "star_value": 14
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "龍形直線貫通傷害",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [
          "直射"
        ],
        "source_effects": [],
        "piercing": true
      },
      "everrealm": {
        "action_kind": "line_damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(90 / 3)",
          "raw_multiplier": 5.4772,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 5.4772
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "bougyo",
      "name_zh": "防禦",
      "source_name_ja": "防御",
      "type": "CMD",
      "category": "side_warrior",
      "requires": [
        "kentotsu"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 2,
        "speed": "A",
        "interrupt": null,
        "durability": 10,
        "range": {
          "type": "self",
          "source_pattern": "自己",
          "range_description": "只可選擇自己／以自己作為施放起點。",
          "range_cells_relative": [
            [
              0,
              0
            ]
          ],
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "self_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆☆",
              "star_value": 2
            }
          ],
          "rarity": null,
          "quests": [
            "蟹",
            "地竜",
            "焼肉",
            "球根",
            "人形"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "減傷姿態",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "damage_reduction_stance",
            "duration_turns": 0
          }
        ],
        "requirements": {
          "job": "warrior",
          "level_min": 5
        }
      },
      "everrealm": {
        "action_kind": "self_buff",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "damage_reduction_stance",
            "duration_turns": 0
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "denkangeki",
      "name_zh": "電拳擊",
      "source_name_ja": "電拳撃",
      "type": "CMD",
      "category": "side_warrior",
      "requires": [
        "bougyo"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 42,
        "speed": "D",
        "interrupt": 1,
        "durability": 10,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口■口\n■↑■",
          "range_description": "可選 3 格：前1、左1、右1。",
          "range_cells_relative": [
            [
              0,
              1
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆☆☆☆",
              "star_value": 4
            }
          ],
          "rarity": null,
          "quests": [
            "地竜",
            "人形",
            "パンダ",
            "種"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "傷害並低機率麻痺",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "paralysis",
            "probability": "low",
            "duration_turns": 1
          }
        ],
        "requirements": {
          "job": "warrior",
          "level_min": 10
        }
      },
      "everrealm": {
        "action_kind": "damage_control",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [
          {
            "type": "paralysis",
            "probability": "low",
            "duration_turns": 1
          }
        ],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(42 / 3) * 0.8",
          "raw_multiplier": 3.7417,
          "utility_multiplier": 0.8,
          "final_total_multiplier": 2.9933
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "ruka_hanki_ken",
      "name_zh": "留下半氣拳",
      "source_name_ja": "留下半気拳",
      "type": "CMD",
      "category": "side_warrior",
      "requires": [
        "denkangeki"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 47,
        "speed": "D",
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■\n↑",
          "range_description": "可選 1 格：前1。",
          "range_cells_relative": [
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★☆☆",
              "star_value": 12
            }
          ],
          "rarity": null,
          "quests": [
            "踊り子",
            "復讐"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "成功時令目標HP減至一半",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [],
        "requirements": {
          "job": "warrior",
          "level_min": 15
        }
      },
      "everrealm": {
        "action_kind": "fixed_damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": false,
          "model": {
            "type": "set_remaining_hp_fraction",
            "fraction": 0.5
          },
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": null,
          "status": "source_defined_fixed_damage_override"
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "ruka_kouitsu_ken",
      "name_zh": "留下後一拳",
      "source_name_ja": "留下後一拳",
      "type": "CMD",
      "category": "side_warrior",
      "requires": [
        "ruka_hanki_ken"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 77,
        "speed": "D",
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■\n↑",
          "range_description": "可選 1 格：前1。",
          "range_cells_relative": [
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆☆☆☆",
              "star_value": 9
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "成功時令目標HP剩1",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [],
        "requirements": {
          "job": "warrior",
          "level_min": 20
        }
      },
      "everrealm": {
        "action_kind": "fixed_damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": false,
          "model": {
            "type": "set_remaining_hp_value",
            "value": 1
          },
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": null,
          "status": "source_defined_fixed_damage_override"
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "kenshaku",
      "name_zh": "拳瞬",
      "source_name_ja": "拳瞬",
      "type": "CMD",
      "category": "side_warrior",
      "requires": [
        "ruka_kouitsu_ken"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 48,
        "speed": "S",
        "interrupt": null,
        "durability": 10,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■\n↑",
          "range_description": "可選 1 格：前1。",
          "range_cells_relative": [
            [
              0,
              1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 1,
            "source_text": "上1・下1",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★☆☆☆",
              "star_value": 13
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "超高速拳擊傷害",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 1,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [],
        "requirements": {
          "job": "warrior",
          "level_min": 25
        }
      },
      "everrealm": {
        "action_kind": "damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(48 / 3)",
          "raw_multiplier": 4.0,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 4.0
        },
        "hit_resolution": {
          "hit_count": 1,
          "hit_judgement_mode": "single",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "hijo_tenketsu",
      "name_zh": "痺除點穴",
      "source_name_ja": "痺除点穴",
      "type": "CMD",
      "category": "side_guardian",
      "requires": [
        "kentotsu"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 3,
        "speed": "D",
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口■口\n■↑■",
          "range_description": "可選 3 格：前1、左1、右1。",
          "range_cells_relative": [
            [
              0,
              1
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ]
          ],
          "height_difference": {
            "up": null,
            "down": null,
            "source_text": "上??・下??",
            "status": "uncertain"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "☆☆☆",
              "star_value": 3
            }
          ],
          "rarity": null,
          "quests": [
            "蟹",
            "地竜",
            "人形",
            "仮面",
            "パンダ",
            "たこ焼き",
            "墓場"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "解除麻痺",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "cleanse",
            "statuses": [
              "paralysis"
            ]
          }
        ],
        "requirements": {
          "job": "guardian",
          "level_min": 5
        }
      },
      "everrealm": {
        "action_kind": "cleanse",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "cleanse",
            "statuses": [
              "paralysis"
            ]
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "shincha_tenketsu",
      "name_zh": "心著點穴",
      "source_name_ja": "心着点穴",
      "type": "CMD",
      "category": "side_guardian",
      "requires": [
        "hijo_tenketsu"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 4,
        "speed": "D",
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "unknown",
          "source_pattern": "?",
          "range_description": "原 Wiki 射程圖標示為「?」，現有來源不足以確認平面射程。",
          "range_cells_relative": null,
          "height_difference": {
            "up": null,
            "down": null,
            "source_text": "上??・下??",
            "status": "uncertain"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★",
              "star_value": 5
            }
          ],
          "rarity": null,
          "quests": [
            "土鍋",
            "たこ焼き",
            "メイド(弱)",
            "指輪"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "解除放心／混亂／激怒",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "cleanse",
            "statuses": [
              "放心",
              "混亂",
              "激怒"
            ]
          }
        ],
        "requirements": {
          "job": "guardian",
          "level_min": 10
        }
      },
      "everrealm": {
        "action_kind": "cleanse",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "cleanse",
            "statuses": [
              "放心",
              "混亂",
              "激怒"
            ]
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "kaimoku_tenketsu",
      "name_zh": "快目點穴",
      "source_name_ja": "快目点穴",
      "type": "CMD",
      "category": "side_guardian",
      "requires": [
        "shincha_tenketsu"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 3,
        "speed": "D",
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "unknown",
          "source_pattern": "?",
          "range_description": "原 Wiki 射程圖標示為「?」，現有來源不足以確認平面射程。",
          "range_cells_relative": null,
          "height_difference": {
            "up": null,
            "down": null,
            "source_text": "上??・下??",
            "status": "uncertain"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★☆☆☆",
              "star_value": 8
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "解除暗闇",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "cleanse",
            "statuses": [
              "blind"
            ]
          }
        ],
        "requirements": {
          "job": "guardian",
          "level_min": 15
        }
      },
      "everrealm": {
        "action_kind": "cleanse",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "cleanse",
            "statuses": [
              "blind"
            ]
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "boumin_daha",
      "name_zh": "謀眠打破",
      "source_name_ja": "謀眠打破",
      "type": "PSV",
      "category": "side_guardian",
      "requires": [
        "kaimoku_tenketsu"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": null,
        "speed": null,
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "not_applicable",
          "source_pattern": null,
          "range_description": "被動技能，沒有主動選取射程。",
          "range_cells_relative": null,
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "passive"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★☆☆",
              "star_value": 12
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "自動解除睡眠",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "auto_cleanse",
            "statuses": [
              "sleep"
            ]
          }
        ],
        "requirements": {
          "job": "guardian",
          "level_min": 20
        }
      },
      "everrealm": {
        "action_kind": "passive_cleanse",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "auto_cleanse",
            "statuses": [
              "sleep"
            ]
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "kikou_gedoku",
      "name_zh": "氣孔解毒",
      "source_name_ja": "気孔解毒",
      "type": "PSV",
      "category": "side_guardian",
      "requires": [
        "boumin_daha"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": null,
        "speed": null,
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "not_applicable",
          "source_pattern": null,
          "range_description": "被動技能，沒有主動選取射程。",
          "range_cells_relative": null,
          "height_difference": {
            "status": "not_applicable"
          }
        },
        "effect_area": {
          "type": "passive"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★☆☆☆☆",
              "star_value": 14
            }
          ],
          "rarity": null,
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "自動解除中毒",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 0,
        "source_hit_judgement": null,
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "auto_cleanse",
            "statuses": [
              "poison"
            ]
          }
        ],
        "requirements": {
          "job": "guardian",
          "level_min": 25
        }
      },
      "everrealm": {
        "action_kind": "passive_cleanse",
        "deals_damage": false,
        "delivery_mode": null,
        "path_mode": null,
        "utility_effects": [
          {
            "type": "auto_cleanse",
            "statuses": [
              "poison"
            ]
          }
        ],
        "damage": {
          "formula_applied": false,
          "raw_multiplier": null,
          "utility_multiplier": null,
          "final_total_multiplier": 0
        },
        "hit_resolution": {
          "hit_count": 0,
          "hit_judgement_mode": "not_applicable",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "not_applicable"
        }
      }
    },
    {
      "id": "lusedes_da",
      "name_zh": "ルセデス古流奧義「墮」",
      "source_name_ja": "ルセデス古流奥義「堕」",
      "type": "CMD",
      "category": "ultimate",
      "requires": [
        "byakkorendan"
      ],
      "requires_status": "cross_confirmed",
      "original_reference": {
        "ap": 100,
        "speed": "D",
        "interrupt": 12,
        "durability": 4,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口口■口口\n口■口■口\n■口↑口■",
          "range_description": "可選 5 格：前2、前1左1、前1右1、左2、右2。",
          "range_cells_relative": [
            [
              0,
              2
            ],
            [
              -1,
              1
            ],
            [
              1,
              1
            ],
            [
              -2,
              0
            ],
            [
              2,
              0
            ]
          ],
          "height_difference": {
            "up": 0,
            "down": 0,
            "source_text": "上0・下0",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★☆☆☆",
              "star_value": 13
            }
          ],
          "rarity": "レア",
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "3段急降拳擊",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 3,
        "source_hit_judgement": "initial_only",
        "source_special_notes": [],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "multi_hit_damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(100 / 3)",
          "raw_multiplier": 5.7735,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 5.7735
        },
        "hit_resolution": {
          "hit_count": 3,
          "hit_judgement_mode": "initial_only",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "later_hits"
        }
      },
      "source_note": "百虎連擊下方 connector 向左轉落「墮」；毒手拳上方/下方並冇直線接入。"
    },
    {
      "id": "lusedes_koku",
      "name_zh": "ルセデス古流奧義「哭」",
      "source_name_ja": "ルセデス古流奥義「哭」",
      "type": "CMD",
      "category": "ultimate",
      "requires": [
        "byakkorendan"
      ],
      "requires_status": "confirmed",
      "original_reference": {
        "ap": 100,
        "speed": "D",
        "interrupt": 12,
        "durability": 4,
        "range": {
          "type": "relative_cells",
          "source_pattern": "■■■\n口↑口",
          "range_description": "可選 3 格：前1左1、前1、前1右1。",
          "range_cells_relative": [
            [
              -1,
              1
            ],
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "height_difference": {
            "up": 1,
            "down": 0,
            "source_text": "上1・下0",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★☆☆",
              "star_value": 12
            }
          ],
          "rarity": "レア",
          "quests": [
            "王家の墓"
          ],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "8段高速連擊",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 8,
        "source_hit_judgement": "initial_only",
        "source_special_notes": [],
        "source_effects": []
      },
      "everrealm": {
        "action_kind": "multi_hit_damage",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(100 / 3)",
          "raw_multiplier": 5.7735,
          "utility_multiplier": 1.0,
          "final_total_multiplier": 5.7735
        },
        "hit_resolution": {
          "hit_count": 8,
          "hit_judgement_mode": "initial_only",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "later_hits"
        }
      },
      "source_note": "百虎連擊主線直接落「哭」。"
    },
    {
      "id": "lusedes_tan",
      "name_zh": "ルセデス古流奧義「嘆」",
      "source_name_ja": "ルセデス古流奥義「嘆」",
      "type": "CMD",
      "category": "ultimate",
      "requires": [
        "byakkorendan",
        "gouhoukyaku"
      ],
      "requires_status": "cross_confirmed",
      "original_reference": {
        "ap": 100,
        "speed": "D",
        "interrupt": null,
        "durability": null,
        "range": {
          "type": "relative_cells",
          "source_pattern": "口■口\n■↑■",
          "range_description": "可選 3 格：前1、左1、右1。",
          "range_cells_relative": [
            [
              0,
              1
            ],
            [
              -1,
              0
            ],
            [
              1,
              0
            ]
          ],
          "height_difference": {
            "up": 0,
            "down": 0,
            "source_text": "上0・下0",
            "status": "confirmed"
          }
        },
        "effect_area": {
          "type": "selected_target_only"
        },
        "acquisition": {
          "initial": false,
          "shop_price": null,
          "guild_reward_books": [
            {
              "notation": "★★☆☆☆☆",
              "star_value": 14
            }
          ],
          "rarity": "レア",
          "quests": [],
          "drops": [],
          "other_sources": []
        },
        "description_zh": "6段踩踏並擊退1格",
        "description_status": "traditional_chinese_functional_translation",
        "hit_count": 6,
        "source_hit_judgement": "initial_only",
        "source_special_notes": [],
        "source_effects": [
          {
            "type": "knockback",
            "cells": 1
          }
        ]
      },
      "everrealm": {
        "action_kind": "multi_hit_damage_control",
        "deals_damage": true,
        "delivery_mode": "linear",
        "path_mode": "facingOrthogonalPriority",
        "utility_effects": [
          {
            "type": "knockback",
            "cells": 1
          }
        ],
        "damage": {
          "formula_applied": true,
          "formula": "sqrt(100 / 3) * 0.8",
          "raw_multiplier": 5.7735,
          "utility_multiplier": 0.8,
          "final_total_multiplier": 4.6188
        },
        "hit_resolution": {
          "hit_count": 6,
          "hit_judgement_mode": "initial_only",
          "recheck_attack_path_each_hit": false,
          "rounding_remainder_priority": "later_hits"
        }
      },
      "source_note": "「嘆」上方「┫」同時接百虎連擊橫支線及豪砲腳垂直線。"
    }
  ]
};
  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }
  return deepFreeze(data);
});
