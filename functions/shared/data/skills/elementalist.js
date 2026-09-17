(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmElementalistSkillData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const RANK_TEXT = (rank) => "★".repeat(Math.floor(rank / 5)) + "☆".repeat(rank % 5);
  const line = (length, start = 1) => Array.from({ length: length - start + 1 }, (_, index) => [0, start + index]);
  const cellsAt = (distance) => [
    [-1, distance], [0, distance], [1, distance],
  ];
  const radius = (size) => Array.from({ length: size * 2 + 1 }, (_, y) =>
    Array.from({ length: size * 2 + 1 }, (_, x) => [x - size, y - size])
  ).flat();
  const cross = (size) => [[0, 0], ...Array.from({ length: size }, (_, index) => index + 1).flatMap((step) => [
    [0, -step], [0, step], [-step, 0], [step, 0],
  ])];
  const plusLine = (length) => Array.from({ length }, (_, index) => [0, index + 1]);
  const melee = [[-1, 1], [0, 1], [1, 1], [-1, 0], [1, 0]];
  const areaCross = (size) => cross(size).filter(([x, y]) => x !== 0 || y !== 0);

  const TREE_GRID = [
    ["psv_flame_diminish", "little_force", "fireball", "wind_edge", "aqua_ball", "mud_hand"],
    ["psv_cold_diminish", "fire_shoot", "wind_jammer", "aqua_service_ball", "rock_missile", "repair"],
    ["psv_thunder_diminish", "lil_bomb", "air_clear", "mirage", "rock_lance", "repair_square"],
    ["psv_poison_diminish", "heat_touch", "vacuum", "ice_missile", "fall_stone", "sticky"],
    ["psv_mental_diminish", "grand_flame", "amazing_wind", "water_line", "petit_meteor", "clarity"],
    ["psv_salamander_blessing", "flame_pole", "demation_wind", "diamond_dust", "earthquake", "nightmare_impulse"],
    ["psv_undine_blessing", "self_burning", "hurricane", "absolute_zero", "meteor", "slip_trap"],
    ["psv_gnome_blessing", "ex_bomb", "double_hurricane", "flame_edge", "meteor_rush", "artificial_spell"],
    ["psv_sylph_blessing", "magma", "triple_hurricane", "sandstorm", "water_edge", "spark_ball"],
    ["psv_magic_rise", "thunder_shoot", "thunder_impact", "thunder_bolt", "leaf_blade", "bind_ivy"],
    [null, "green_green", "santana", "physical_defeat", "magical_defeat", "repair_ball"],
  ];

  const FIRE = "炎熱";
  const COLD = "冷氣";
  const THUNDER = "電擊";
  const NONE = null;
  const enemy = "enemy";
  const ally = "ally";

  function sourceRange(type, cells, description, up = 3, down = 3) {
    return {
      type,
      source_pattern: null,
      range_description: description,
      range_cells_relative: cells,
      height_difference: type === "self"
        ? { status: "not_applicable" }
        : { up, down, source_text: `上${up}・下${down}`, status: "confirmed" },
    };
  }

  function makeSkill(def) {
    const passive = def.type === "PSV";
    const utilities = def.utility || [];
    const dealsDamage = def.dealsDamage === true;
    const rawMultiplier = dealsDamage ? Math.sqrt(def.ap / 3) : 0;
    const utilityMultiplier = dealsDamage && utilities.length ? 0.8 : dealsDamage ? 1 : null;
    const finalMultiplier = dealsDamage ? Number((rawMultiplier * utilityMultiplier).toFixed(4)) : 0;
    const targetTeam = def.targetTeam || (passive ? "self" : enemy);
    const bookRanks = Array.isArray(def.books) ? def.books : def.book ? [def.book] : [];
    const range = sourceRange(
      def.rangeType || (passive ? "not_applicable" : "summon"),
      passive ? null : (def.rangeCells || [[0, 0]]),
      def.rangeDescription || "原作資料未另行說明；按指定相對格判定。",
      def.heightUp ?? 3,
      def.heightDown ?? 3,
    );
    if (passive) range.height_difference = { status: "not_applicable" };
    const effectArea = def.areaType === "passive"
      ? { type: "passive" }
      : {
        type: def.areaType || "selected_target_only",
        cells_relative: def.areaCells || null,
        coordinate_origin: def.areaOrigin || "selected_target",
        area_description: def.areaDescription || null,
        height_difference: def.areaHeight || null,
      };
    return {
      id: def.id,
      name_zh: def.name,
      source_name_ja: def.sourceName,
      type: def.type || "CMD",
      category: def.category,
      requires: def.requires || [],
      requires_status: "confirmed",
      original_reference: {
        ap: passive ? null : def.ap,
        speed: passive ? null : def.speed,
        interrupt: passive ? null : def.interrupt,
        durability: passive ? null : def.durability,
        range,
        effect_area: effectArea,
        acquisition: {
          initial: Boolean(def.initial),
          shop_price: def.shopPrice ?? null,
          guild_reward_books: bookRanks.map((rank) => ({ notation: RANK_TEXT(rank), star_value: rank })),
          rarity: def.rarity || null,
          quests: def.quests || [],
          drops: def.drops || [],
          other_sources: def.otherSources || [],
        },
        description_zh: def.description,
        description_status: "traditional_chinese_functional_translation",
        hit_count: def.hitCount || 0,
        source_hit_judgement: def.sourceHitJudgement || null,
        source_special_notes: def.notes || [],
        source_effects: utilities,
        requirements: def.requirements || null,
      },
      everrealm: {
        action_kind: def.actionKind || (passive ? "passive_buff" : dealsDamage ? "damage" : "utility"),
        deals_damage: dealsDamage,
        target_team: targetTeam,
        delivery_mode: passive ? null : def.deliveryMode || null,
        path_mode: passive ? null : def.pathMode || null,
        piercing: Boolean(def.piercing),
        max_pierce: def.maxPierce ?? null,
        friendly_fire: false,
        utility_effects: utilities,
        damage: {
          formula_applied: dealsDamage,
          formula: dealsDamage ? `sqrt(${def.ap}/3)${utilityMultiplier === 0.8 ? " * 0.8" : ""}` : null,
          raw_multiplier: dealsDamage ? Number(rawMultiplier.toFixed(4)) : null,
          utility_multiplier: utilityMultiplier,
          final_total_multiplier: finalMultiplier,
        },
        hit_resolution: {
          hit_count: def.hitCount || (dealsDamage ? 1 : 0),
          hit_judgement_mode: def.hitCount > 1 ? "initial_only" : dealsDamage ? "single" : "not_applicable",
          recheck_attack_path_each_hit: false,
          rounding_remainder_priority: def.hitCount > 1 ? "later_hits" : "not_applicable",
        },
      },
      source_note: def.sourceNote || null,
    };
  }

  const skills = [
    // Initial / fire branch.
    { id: "little_force", name: "實念攻擊", sourceName: "リトルフォース", category: "basic_magic", ap: 3, speed: "D", interrupt: 2100, durability: 1, book: 0, initial: true, rangeType: "summon", rangeCells: radius(3), areaType: "impact_area_all_enemy_units", areaCells: [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]], areaDescription: "指定點周圍十字 2 格", deliveryMode: null, actionKind: "area_damage", dealsDamage: true, description: "將想像中的攻擊實體化，攻擊指定範圍內的敵人。", sourceNote: "原作初始技能；召喚類不受施術者與目標之間障礙影響。" },
    { id: "fireball", name: "火球", sourceName: "ファイアボール", category: "fire_magic", ap: 6, speed: "D", interrupt: 2300, durability: 1, book: 0, initial: true, shopPrice: 300, rangeType: "linear", rangeCells: line(4), heightUp: 1, heightDown: "unlimited", deliveryMode: "linear", pathMode: "facingOrthogonalPriority", dealsDamage: true, utility: [{ type: "burn", condition: "oiled", duration_turns: 4, probability: "high" }], description: "發射火球攻擊目標；目標處於油狀態時有機會燃燒。" },
    { id: "fire_shoot", name: "炎箭", sourceName: "ファイアシュート", category: "fire_magic", ap: 18, speed: "D", interrupt: 2400, durability: 1, book: 2, shopPrice: 600, rangeType: "arc", rangeCells: [[0, 1], [-1, 2], [0, 2], [1, 2], [-1, 3], [0, 3], [1, 3], [-1, 4], [1, 4]], deliveryMode: "arc", dealsDamage: true, piercing: true, utility: [{ type: "burn", condition: "oiled", duration_turns: 4, probability: "high" }], description: "射出炎箭攻擊遠處目標；曲線投射可越過較低障礙。", requires: ["fireball"] },
    { id: "lil_bomb", name: "爆彈", sourceName: "リルボム", category: "fire_magic", ap: 24, speed: "D", interrupt: 1500, durability: 1, book: 3, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: areaCross(1), utility: [{ type: "knockdown", probability: "low", duration_turns: 1 }], description: "在指定範圍引發爆炸，可能令敵人跌倒。", requires: ["fire_shoot"] },
    { id: "heat_touch", name: "熱能觸手", sourceName: "ヒートタッチ", category: "fire_magic", ap: 18, speed: "D", interrupt: 1900, durability: 1, book: 4, rangeType: "direct", rangeCells: melee, deliveryMode: "linear", pathMode: "facingOrthogonalPriority", dealsDamage: true, notes: ["近戰魔法；會受反擊架式影響。"], description: "將熱能直接灌入目標體內，在近距離引發爆炸。", requires: ["lil_bomb"] },
    { id: "grand_flame", name: "火炎柱", sourceName: "グランドフレイム", category: "fire_magic", ap: 34, speed: "D", interrupt: 2600, durability: 1, book: 5, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: [[0, 0]], areaDescription: "最多指定三個地面目標", utility: [{ type: "multi_ground_targets", count: 3 }], description: "在指定地面位置升起火柱，最多攻擊三個目標。", requires: ["heat_touch"] },
    { id: "flame_pole", name: "火柱陣", sourceName: "フレイムポール", category: "fire_magic", ap: 42, speed: "D", interrupt: 2500, durability: 1, book: 8, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]], areaDescription: "指定點及十字兩格", utility: [{ type: "ground_target", height_up: 0, height_down: 0 }], description: "在指定地面位置召喚巨大火柱，攻擊範圍內所有敵人。", requires: ["grand_flame"] },
    { id: "self_burning", name: "自燃", sourceName: "セルフバーニング", category: "fire_magic", ap: 14, speed: "C", interrupt: 850, durability: 1, book: 10, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "area_all_enemy_units", areaCells: areaCross(1), utility: [{ type: "knockback", cells: 1 }], description: "令自身周圍燃起火球，攻擊鄰近敵人並擊退一格。", requires: ["flame_pole"] },
    { id: "ex_bomb", name: "爆炎彈", sourceName: "エクスボム", category: "fire_magic", ap: 36, speed: "D", interrupt: 2700, durability: 12, book: 11, rangeType: "arc", rangeCells: line(3), deliveryMode: "arc", dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: areaCross(1), piercing: true, utility: [{ type: "burn", condition: "oiled", duration_turns: 4, probability: "high" }, { type: "knockback", cells: 2 }], description: "發射爆炸火球，攻擊目標及周圍敵人並擊退兩格。", requires: ["self_burning"] },
    { id: "magma", name: "熔岩", sourceName: "マグマ", category: "fire_magic", ap: 70, speed: "F", interrupt: 2300, durability: 1, book: 13, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "area_all_enemy_units", areaCells: radius(4), utility: [{ type: "full_field_area" }], description: "令地底湧出熔岩，攻擊大範圍內所有敵人。", requires: ["ex_bomb"] },

    // Wind branch.
    { id: "wind_edge", name: "風刀", sourceName: "ウィンドエッジ", category: "wind_magic", ap: 6, speed: "C", interrupt: 1300, durability: 1, book: 0, initial: true, rangeType: "direct", rangeCells: melee, deliveryMode: "linear", pathMode: "facingOrthogonalPriority", dealsDamage: true, hitCount: 3, notes: ["直接技能但不受投射無效影響；原作不受反擊架式影響。"], description: "借助風精靈形成風刃，對近身目標連續造成三次傷害。" },
    { id: "wind_jammer", name: "疾風干擾", sourceName: "ウィンドジャマー", category: "wind_magic", ap: 7, speed: "C", interrupt: 1300, durability: 1, book: 2, rangeType: "self", rangeCells: null, deliveryMode: null, actionKind: "self_buff", dealsDamage: false, targetTeam: "self", areaType: "self_only", utility: [{ type: "projectile_reflect_stance" }], description: "張開風之屏障，令投射系攻擊無法命中自己。", requires: ["wind_edge"] },
    { id: "air_clear", name: "大氣淨化", sourceName: "エアクリア", category: "wind_magic", ap: 12, speed: "D", interrupt: 1600, durability: 1, book: 3, rangeType: "summon", rangeCells: radius(2), deliveryMode: null, actionKind: "area_buff", dealsDamage: false, targetTeam: ally, areaType: "area_all_ally_units", areaCells: [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]], utility: [{ type: "accuracy_up", duration_turns: 6, amount: 0.1 }], description: "淨化空氣，提高範圍內友方命中率六回合。", requires: ["wind_jammer"] },
    { id: "vacuum", name: "真空爆", sourceName: "バキューム", category: "wind_magic", ap: 32, speed: "D", interrupt: 2500, durability: 1, book: 4, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: areaCross(1), description: "在指定位置製造真空，攻擊範圍內敵人。", requires: ["air_clear"] },
    { id: "amazing_wind", name: "驚異之風", sourceName: "アメージングウィンド", category: "wind_magic", ap: 34, speed: "D", interrupt: 2400, durability: 1, book: 8, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]], utility: [{ type: "life_steal", magnitude: "damage" }], description: "以奇異風渦攻擊範圍內敵人，將造成的傷害轉化為自身回復。", requires: ["vacuum"] },
    { id: "demation_wind", name: "異界之風", sourceName: "デメーションウィンド", category: "wind_magic", ap: 34, speed: "F", interrupt: 1, durability: 10, book: 9, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: [[0, 0]], utility: [{ type: "ap_damage", multiplier: 6, pvpMultiplier: 3 }], description: "召喚異界之風，按目標目前 AP 造成傷害。", requires: ["amazing_wind"] },
    { id: "hurricane", name: "颶風", sourceName: "ハリケーン", category: "wind_magic", ap: 14, speed: "D", interrupt: 2300, durability: 1, book: 12, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]], description: "召喚巨大龍捲風，攻擊範圍內敵人。", requires: ["demation_wind"] },
    { id: "double_hurricane", name: "雙重颶風", sourceName: "ダブルハリケーン", category: "wind_magic", ap: 30, speed: "D", interrupt: 1, durability: 8, book: 14, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: [[0, 0], [-1, 0], [1, 0]], hitCount: 2, description: "召喚兩個龍捲風，攻擊兩個不同目標。", requires: ["hurricane"] },
    { id: "triple_hurricane", name: "三重颶風", sourceName: "トリプルハリケーン", category: "wind_magic", ap: 40, speed: "D", interrupt: 1, durability: 8, book: 14, rangeType: "summon", rangeCells: radius(4), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: [[0, 0], [-1, 0], [1, 0]], hitCount: 3, description: "召喚三個龍捲風，攻擊三個不同目標。", requires: ["double_hurricane"] },

    // Water branch.
    { id: "aqua_ball", name: "水球", sourceName: "アクアボール", category: "water_magic", ap: 6, speed: "D", interrupt: 2200, durability: 1, book: 1, rangeType: "arc", rangeCells: [[0, 1], [-1, 2], [0, 2], [1, 2], [-1, 3], [0, 3], [1, 3]], deliveryMode: "arc", dealsDamage: true, utility: [{ type: "wet", duration_turns: 2 }], description: "發射水球攻擊目標，使目標短暫濕身。" },
    { id: "aqua_service_ball", name: "大水球", sourceName: "アクアサービスボール", category: "water_magic", ap: 18, speed: "D", interrupt: 2400, durability: 1, book: 2, rangeType: "arc", rangeCells: [[0, 1], [-1, 2], [0, 2], [1, 2], [-1, 3], [0, 3], [1, 3]], deliveryMode: "arc", dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: areaCross(1), utility: [{ type: "wet", duration_turns: 2 }], description: "發射大型水球，攻擊目標周圍敵人並使其濕身。", requires: ["aqua_ball"] },
    { id: "mirage", name: "幻影", sourceName: "ミラージュ", category: "water_magic", ap: 9, speed: "D", interrupt: 1700, durability: 1, book: 3, rangeType: "summon", rangeCells: radius(2), deliveryMode: null, actionKind: "area_debuff", dealsDamage: false, targetTeam: enemy, areaType: "area_all_enemy_units", areaCells: areaCross(1), utility: [{ type: "accuracy_down", duration_turns: 2, amount: 0.35 }], description: "製造海市蜃樓，降低範圍內敵人命中率兩回合。", requires: ["aqua_service_ball"] },
    { id: "ice_missile", name: "冰箭", sourceName: "アイスミサイル", category: "water_magic", ap: 28, speed: "D", interrupt: 2500, durability: 1, book: 4, rangeType: "arc", rangeCells: [[0, 1], [-1, 2], [0, 2], [1, 2], [-1, 3], [0, 3], [1, 3]], deliveryMode: "arc", piercing: true, dealsDamage: true, utility: [{ type: "freeze", condition: "wet", duration_turns: 2, probability: "low" }], description: "射出冰箭攻擊目標；濕身目標有機會被凍結。", requires: ["mirage"] },
    { id: "water_line", name: "水柱陣", sourceName: "ウォーターライン", category: "water_magic", ap: 34, speed: "D", interrupt: 2650, durability: 1, book: 8, rangeType: "summon", rangeCells: radius(2), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: plusLine(5), utility: [{ type: "wet", duration_turns: 4 }], description: "從地面升起長列水柱，攻擊範圍內所有敵人並使其濕身。", requires: ["ice_missile"] },
    { id: "diamond_dust", name: "鑽石塵", sourceName: "ダイヤモンドダスト", category: "water_magic", ap: 63, speed: "E", interrupt: 1, durability: 10, book: 9, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "area_all_enemy_units", areaCells: radius(2), utility: [{ type: "freeze", condition: "wet", duration_turns: 4, probability: "low" }, { type: "delayed_cast", turns: 2 }], description: "產生強烈冷氣，兩回合後攻擊範圍內敵人；濕身目標有機會凍結。", requires: ["water_line"] },
    { id: "absolute_zero", name: "絕對零度", sourceName: "絶対零度", category: "water_magic", ap: 75, speed: "F", interrupt: 1, durability: 10, book: 14, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "area_all_enemy_units", areaCells: radius(3), utility: [{ type: "freeze", condition: "wet", duration_turns: 5, probability: "high" }], description: "釋放極寒冷氣，攻擊大範圍敵人；濕身目標高機率凍結。", requires: ["diamond_dust"] },

    // Earth branch.
    { id: "mud_hand", name: "泥手", sourceName: "マドハンド", category: "earth_magic", ap: 8, speed: "D", interrupt: 2300, durability: 1, book: 1, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, utility: [{ type: "move_down", amount: 99, duration_turns: 1, source: "movement_lock" }], description: "從腳下召喚泥手造成傷害，並有機會令目標一回合不能移動。" },
    { id: "rock_missile", name: "岩箭", sourceName: "ロックミサイル", category: "earth_magic", ap: 18, speed: "D", interrupt: 2500, durability: 1, book: 2, rangeType: "arc", rangeCells: [[0, 1], [-1, 2], [0, 2], [1, 2], [-1, 3], [0, 3], [1, 3]], deliveryMode: "arc", piercing: true, dealsDamage: true, description: "發射岩石箭矢攻擊遠處目標。", requires: ["mud_hand"] },
    { id: "rock_lance", name: "石槍", sourceName: "ロックランス", category: "earth_magic", ap: 24, speed: "D", interrupt: 2500, durability: 1, book: 3, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, piercing: true, utility: [{ type: "knockdown", probability: "low", duration_turns: 1 }], description: "從地面升起石柱攻擊目標，可能令其跌倒。", requires: ["rock_missile"] },
    { id: "fall_stone", name: "落石", sourceName: "フォールストーン", category: "earth_magic", ap: 28, speed: "D", interrupt: 2600, durability: 1, book: 4, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: areaCross(1), utility: [{ type: "knockdown", probability: "low", duration_turns: 1 }], description: "召喚岩石從目標頭頂落下，攻擊範圍內敵人並可能令其跌倒。", requires: ["rock_lance"] },
    { id: "petit_meteor", name: "小隕石", sourceName: "プチメテオ", category: "earth_magic", ap: 36, speed: "E", interrupt: 3290, durability: 1, book: 10, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, utility: [{ type: "delayed_cast", turns: 2 }, { type: "knockdown", probability: "low", duration_turns: 1 }], description: "兩回合後降下小型隕石攻擊目標。", requires: ["fall_stone"] },
    { id: "earthquake", name: "地震", sourceName: "アースクエイク", category: "earth_magic", ap: 48, speed: "D", interrupt: 12, durability: 8, book: 12, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, actionKind: "area_control", dealsDamage: false, targetTeam: enemy, areaType: "area_all_enemy_units", areaCells: radius(3), utility: [{ type: "knockdown", probability: "high", duration_turns: 1 }], description: "引發地震，令範圍內所有敵人跌倒；本招不造成傷害。", requires: ["petit_meteor"] },
    { id: "meteor", name: "隕石", sourceName: "メテオ", category: "earth_magic", ap: 65, speed: "F", interrupt: 1, durability: 10, book: 13, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: areaCross(1), utility: [{ type: "delayed_cast", turns: 2 }, { type: "knockdown", probability: "low", duration_turns: 1 }], description: "兩回合後召喚隕石，攻擊指定範圍內所有敵人。", requires: ["earthquake"] },
    { id: "meteor_rush", name: "隕石連降", sourceName: "メテオラッシュ", category: "earth_magic", ap: 88, speed: "F", interrupt: 1, durability: 10, book: 14, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: areaCross(1), hitCount: 3, utility: [{ type: "delayed_cast", turns: 2 }, { type: "knockdown", probability: "low", duration_turns: 1 }], description: "隕石的強化版，兩回合後連續降下三次隕石。", requires: ["meteor"] },

    // Derived elemental skills.
    { id: "flame_edge", name: "火刃", sourceName: "フレイムエッジ", category: "derived_magic", ap: 14, speed: "C", interrupt: 1000, durability: 2, book: 5, rangeType: "direct", rangeCells: melee, deliveryMode: "linear", pathMode: "facingOrthogonalPriority", dealsDamage: true, utility: [{ type: "knockback", cells: 1 }], description: "以火焰形成刀刃攻擊近身目標並擊退一格。", requires: ["fireball", "wind_edge"] },
    { id: "sandstorm", name: "砂風暴", sourceName: "サンドストーム", category: "derived_magic", ap: 48, speed: "E", interrupt: 1, durability: 10, book: 6, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: areaCross(1), utility: [{ type: "delayed_cast", turns: 2 }, { type: "blind", probability: "low", duration_turns: 2 }], description: "製造砂暴攻擊範圍內敵人，並有機會令其陷入黑暗。", requires: ["flame_edge", "vacuum"] },
    { id: "santana", name: "灼熱旋風", sourceName: "サンターナ", category: "derived_magic", ap: 75, speed: "F", interrupt: 1, durability: 10, book: 13, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: areaCross(1), utility: [{ type: "ground_target", height_up: 0, height_down: 0 }], description: "在指定地面段落製造灼熱風渦，攻擊範圍內敵人。", requires: ["sandstorm", "grand_flame"] },
    { id: "water_edge", name: "水刀", sourceName: "ウォーターエッジ", category: "derived_magic", ap: 14, speed: "D", interrupt: 1900, durability: 1, book: 5, rangeType: "direct", rangeCells: melee, deliveryMode: "linear", pathMode: "facingOrthogonalPriority", dealsDamage: true, hitCount: 3, utility: [{ type: "wet", duration_turns: 1 }], description: "以水形成刀刃，對近身目標連續斬擊並使其濕身。", requires: ["aqua_ball", "wind_edge"] },
    { id: "spark_ball", name: "雷球", sourceName: "スパークボール", category: "derived_magic", ap: 18, speed: "D", interrupt: 2300, durability: 1, book: 10, rangeType: "linear", rangeCells: line(4), heightUp: 1, deliveryMode: "linear", pathMode: "facingOrthogonalPriority", dealsDamage: true, utility: [{ type: "paralysis", probability: "low", duration_turns: 1 }], description: "發射雷球攻擊目標，低機率造成麻痺。", requires: ["water_line"] },
    { id: "thunder_shoot", name: "雷箭", sourceName: "サンダーシュート", category: "derived_magic", ap: 55, speed: "E", interrupt: 1, durability: 10, book: 11, rangeType: "arc", rangeCells: [[0, 1], [-1, 2], [0, 2], [1, 2], [-1, 3], [0, 3], [1, 3]], deliveryMode: "arc", piercing: true, dealsDamage: true, utility: [{ type: "paralysis", probability: "low", duration_turns: 1 }], description: "發射帶電雷箭，低機率造成麻痺。", requires: ["spark_ball"] },
    { id: "thunder_impact", name: "雷擊", sourceName: "サンダーインパクト", category: "derived_magic", ap: 90, speed: "D", interrupt: 10, durability: 8, book: 14, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: areaCross(1), description: "召喚雷雲，對指定範圍落下強烈雷擊。", requires: ["thunder_shoot"] },
    { id: "thunder_bolt", name: "落雷", sourceName: "サンダーボルト", category: "derived_magic", ap: 45, speed: "D", interrupt: 6, durability: 8, book: 13, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: radius(2), description: "在指定範圍引發強烈落雷，攻擊所有敵人。", requires: ["thunder_impact"] },
    { id: "leaf_blade", name: "葉刃", sourceName: "リーフブレード", category: "derived_magic", ap: 24, speed: "D", interrupt: 2400, durability: 1, book: 6, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: radius(2), description: "令尖銳植物葉片從地面生長，攻擊範圍內敵人。", requires: ["rock_lance"] },
    { id: "bind_ivy", name: "藤蔓束縛", sourceName: "バインドアイビー", category: "derived_magic", ap: 38, speed: "D", interrupt: 2500, durability: 1, book: 7, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: radius(2), piercing: true, utility: [{ type: "paralysis", probability: "low", duration_turns: 1 }], description: "召喚藤蔓纏住範圍內敵人，並有機會造成麻痺。", requires: ["leaf_blade"] },
    { id: "green_green", name: "綠意爆發", sourceName: "グリーングリーン", category: "derived_magic", ap: 34, speed: "D", interrupt: 12, durability: 8, book: 9, rangeType: "summon", rangeCells: radius(3), deliveryMode: null, dealsDamage: true, areaType: "impact_area_all_enemy_units", areaCells: [[-1, -1], [1, -1], [-1, 1], [1, 1]], utility: [{ type: "knockback", cells: 2 }, { type: "knockdown", probability: "low", duration_turns: 1 }], description: "令植物急速生長，攻擊 X 字範圍內敵人並擊退。", requires: ["bind_ivy"] },

    // Side jobs.
    { id: "repair", name: "回復術", sourceName: "リペアー", category: "side_guardian", ap: 8, speed: "D", interrupt: null, durability: 6, book: 2, rangeType: "summon", rangeCells: melee, deliveryMode: null, actionKind: "heal", dealsDamage: false, targetTeam: ally, areaType: "selected_target_only", utility: [{ type: "heal_hp", magnitude: "small" }], description: "以祈禱回復目標少量 HP。", requirements: { side_job: "guardian" }, },
    { id: "repair_square", name: "回復之地", sourceName: "リペアースクエア", category: "side_guardian", ap: 24, speed: "D", interrupt: null, durability: 6, book: 4, rangeType: "summon", rangeCells: melee, deliveryMode: null, actionKind: "area_heal", dealsDamage: false, targetTeam: ally, areaType: "area_all_ally_units", areaCells: areaCross(1), utility: [{ type: "heal_hp", magnitude: "small" }], description: "回復指定範圍內所有友方 HP。", requires: ["repair"], requirements: { side_job: "guardian", side_job_level: 10 } },
    { id: "repair_ball", name: "回復光球", sourceName: "リペアーボール", category: "side_guardian", ap: 16, speed: "D", interrupt: null, durability: 6, book: 6, rangeType: "arc", rangeCells: [[0, 1], [-1, 2], [0, 2], [1, 2]], deliveryMode: "arc", actionKind: "heal", dealsDamage: false, targetTeam: ally, areaType: "selected_target_only", utility: [{ type: "heal_hp", magnitude: "small" }], description: "發射光球，回復遠處友方 HP。", requires: ["repair_square"], requirements: { side_job: "guardian", side_job_level: 15 } },
    { id: "physical_defeat", name: "物理屏障", sourceName: "フィジカルデフィート", category: "side_guardian", ap: 24, speed: "D", interrupt: null, durability: 8, book: 12, rangeType: "summon", rangeCells: melee, deliveryMode: null, actionKind: "barrier", dealsDamage: false, targetTeam: ally, areaType: "selected_target_only", utility: [{ type: "physical_barrier", duration_turns: 1, amount: 0.65 }], description: "為目標施加暫時抵抗物理攻擊的屏障；Everrealm 以通用傷害減免表達。", requires: ["repair"], requirements: { side_job: "guardian", side_job_level: 20 } },
    { id: "magical_defeat", name: "魔法屏障", sourceName: "マジカルデフィート", category: "side_guardian", ap: 24, speed: "D", interrupt: null, durability: 8, book: 13, rangeType: "summon", rangeCells: melee, deliveryMode: null, actionKind: "barrier", dealsDamage: false, targetTeam: ally, areaType: "selected_target_only", utility: [{ type: "magic_barrier", duration_turns: 1, amount: 0.65 }], description: "為目標施加暫時抵抗魔法攻擊的屏障；Everrealm 暫以通用傷害減免表達。", requires: ["repair"], requirements: { side_job: "guardian", side_job_level: 25 } },
    { id: "sticky", name: "蜘蛛網", sourceName: "スティッキー", category: "side_black", ap: 28, speed: "D", interrupt: null, durability: 8, book: 1, rangeType: "summon", rangeCells: radius(2), deliveryMode: null, actionKind: "control", dealsDamage: false, targetTeam: enemy, areaType: "area_all_enemy_units", areaCells: radius(2), utility: [{ type: "move_down", amount: 99, duration_turns: 3, source: "movement_lock" }], description: "召喚巨大蜘蛛網，令範圍內單位三回合不能移動。", requirements: { side_job: "black" } },
    { id: "clarity", name: "隱身結界", sourceName: "クラリティー", category: "side_black", ap: 30, speed: "D", interrupt: null, durability: 8, book: 3, rangeType: "self", rangeCells: null, deliveryMode: null, actionKind: "self_buff", dealsDamage: false, targetTeam: "self", areaType: "self_only", utility: [{ type: "invisible", duration_turns: 4 }], description: "在自身周圍張開結界，進入隱身四回合。", requires: ["sticky"], requirements: { side_job: "black", side_job_level: 5 } },
    { id: "nightmare_impulse", name: "惡夢衝擊", sourceName: "ナイトメアインパルス", category: "side_black", ap: 20, speed: "D", interrupt: null, durability: 3, book: 5, rangeType: "direct", rangeCells: melee, deliveryMode: "linear", pathMode: "facingOrthogonalPriority", actionKind: "conditional_damage", dealsDamage: true, utility: [{ type: "damage_if_sleeping" }], description: "只對熟睡目標發動，令其承受惡夢傷害。", requires: ["clarity"], requirements: { side_job: "black", side_job_level: 10 } },
    { id: "slip_trap", name: "跌倒陷阱", sourceName: "スリップトラップ", category: "side_black", ap: 15, speed: "D", interrupt: null, durability: 8, book: 7, rangeType: "summon", rangeCells: melee, deliveryMode: null, actionKind: "trap", dealsDamage: false, targetTeam: enemy, areaType: "selected_target_only", utility: [{ type: "knockdown_trap", duration_turns: 2 }], description: "在目標格設置自動印記，觸發時令目標跌倒。", requires: ["sticky"], requirements: { side_job: "black", side_job_level: 15 } },
    { id: "artificial_spell", name: "假術式", sourceName: "アーティフィシャルスペル", category: "side_black", ap: 0, speed: "S", interrupt: null, durability: 8, book: 14, rangeType: "self", rangeCells: null, deliveryMode: null, actionKind: "fake_cast", dealsDamage: false, targetTeam: "self", areaType: "self_only", utility: [{ type: "fake_cast", apparent_duration_turns: 2 }], description: "偽裝成需要兩回合詠唱的術式，完成後仍可立即移動及使用技能。", requires: ["slip_trap"], requirements: { side_job: "black", side_job_level: 25 } },

    // Passive branch.
    { id: "psv_flame_diminish", name: "弱炎之法", sourceName: "フレイムデミニッシュ", type: "PSV", category: "element_passive", book: 8, utility: [{ type: "defense_up", element: FIRE, magnitude: "small" }], description: "炎熱抗性小幅提升；Everrealm 以通用 DEF 被動表達。" },
    { id: "psv_cold_diminish", name: "弱冷之法", sourceName: "コールドデミニッシュ", type: "PSV", category: "element_passive", book: 9, requires: ["psv_flame_diminish"], utility: [{ type: "defense_up", element: COLD, magnitude: "small" }], description: "冷氣抗性小幅提升；Everrealm 以通用 DEF 被動表達。" },
    { id: "psv_thunder_diminish", name: "弱雷之法", sourceName: "サンダーデミニッシュ", type: "PSV", category: "element_passive", book: 10, requires: ["psv_cold_diminish"], utility: [{ type: "defense_up", element: THUNDER, magnitude: "small" }], description: "電擊抗性小幅提升；Everrealm 以通用 DEF 被動表達。" },
    { id: "psv_poison_diminish", name: "弱毒之法", sourceName: "ポイズンデミニッシュ", type: "PSV", category: "element_passive", book: 11, requires: ["psv_thunder_diminish"], utility: [{ type: "defense_up", element: "毒", magnitude: "small" }], description: "毒抗性小幅提升；Everrealm 以通用 DEF 被動表達。" },
    { id: "psv_mental_diminish", name: "弱心之法", sourceName: "メンタルデミニッシュ", type: "PSV", category: "element_passive", book: 12, requires: ["psv_poison_diminish"], utility: [{ type: "defense_up", element: "心", magnitude: "small" }], description: "精神抗性小幅提升；Everrealm 以通用 DEF 被動表達。" },
    { id: "psv_salamander_blessing", name: "火精靈加護", sourceName: "サラマンダーの加護", type: "PSV", category: "element_passive", book: 8, requires: ["psv_mental_diminish"], utility: [{ type: "counter_stance", element: FIRE, condition: "not_casting" }], description: "非詠唱狀態受到直接攻擊時，以火柱自動反擊。" },
    { id: "psv_undine_blessing", name: "水精靈加護", sourceName: "ウィンディーネの加護", type: "PSV", category: "element_passive", book: 9, requires: ["psv_salamander_blessing"], utility: [{ type: "auto_cleanse", statuses: ["paralysis"] }], description: "麻痺狀態會在下一次移動階段前自動解除。" },
    { id: "psv_gnome_blessing", name: "土精靈加護", sourceName: "ノームの加護", type: "PSV", category: "element_passive", book: 10, requires: ["psv_undine_blessing"], utility: [{ type: "auto_cleanse", statuses: ["petrify"] }], description: "石化狀態會在下一次移動階段前自動解除。" },
    { id: "psv_sylph_blessing", name: "風精靈加護", sourceName: "シルフの加護", type: "PSV", category: "element_passive", book: 11, requires: ["psv_gnome_blessing"], utility: [{ type: "auto_cleanse", statuses: ["move_down"] }], description: "移動不能狀態會在下一次移動階段前自動解除。" },
    { id: "psv_magic_rise", name: "魔力強化", sourceName: "マジックライズ", type: "PSV", category: "element_passive", book: 12, requires: ["psv_sylph_blessing"], utility: [{ type: "magic_attack_up", magnitude: "small" }], description: "魔法攻擊力小幅提升；Everrealm 以通用 ATK 被動表達。" },
  ];

  const data = {
    schemaVersion: 1,
    game: "Everrealm",
    classId: "elementalist",
    className: "精靈魔導師",
    promotedClass: "summoner",
    sideJobs: ["guardian", "black"],
    display: {
      rootSkillId: "little_force",
      layout: { grid: TREE_GRID },
      note: "版面位置只供顯示；技能前置一律以每招 requires[] 為準。右側分支代表守護／黑印副職條件。",
    },
    source: {
      title: "ストラガーデンwiki 職業/精霊魔導師",
      url: "https://wiki.strugarden.pluslake.net/%E8%81%B7%E6%A5%AD/%E7%B2%BE%E9%9C%8A%E9%AD%94%E5%B0%8E%E5%B8%AB/",
      checked: "2026-09-15",
    },
    skills: skills.map(makeSkill),
    starterSkills: ["little_force", "fireball", "wind_edge"],
  };

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  return deepFreeze(data);
});
