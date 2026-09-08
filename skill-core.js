(function (root, factory) {
  const fighterData = root.LanternFighterSkillData
    || (typeof require === "function" ? require("./fighter-skill-data.js") : null);
  const api = factory(fighterData);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternSkills = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (fighterData) {
  "use strict";

  const STARTING_AP = 10;
  const ROUND_AP_GAIN = 10;
  const MAX_AP = 200;
  const STARTING_DECK_CAPACITY = 3;
  const MAX_EQUIPPED_SKILLS = 6;
  const DECK_CAPACITY_MILESTONES = deepFreeze({
    "main:fog-gate-open": 4,
    "guild:rank-2": 5,
    "main:light-eater-defeated": 6,
  });
  const CLASS_IDS = Object.freeze(["warrior", "fighter"]);
  const DEFAULT_CLASS_ID = "warrior";
  const SPEED_GRADES = Object.freeze(["S", "A", "B", "C", "D", "E", "F", "PSV"]);
  const DEFAULT_TARGET_ARC = Object.freeze(["front", "left", "right"]);
  const TARGET_ARCS = Object.freeze(["front", "left", "right", "rear", "self"]);
  const BOOK_STARS = Object.freeze([1, 2, 3]);
  const MAX_SKILL_BOOK_RANK = 10;
  const AP_BANDS = deepFreeze({
    1: { min: 3, max: 16 },
    2: { min: 10, max: 45 },
    3: { min: 20, max: 100 },
  });
  const DUPLICATE_SHARDS = deepFreeze({ 1: 2, 2: 5, 3: 10 });
  const MASTERY_UNLOCK_COST = deepFreeze({ 1: 12, 2: 28, 3: 55 });
  const AREA_SHAPES = Object.freeze(["single", "self", "line", "cone", "cross", "radius", "relative_cells", "line_to_target", "impact_area"]);
  const DEFAULT_STARTER_SKILLS = Object.freeze(["quick_slash", "lantern_shot", "guard_stance"]);
  // The promoted Fighter specification uses the original romanized ids.  A
  // small compatibility map keeps saves, debug commands and old Warrior-era
  // integrations readable without adding duplicate skills to the catalog.
  const LEGACY_ID_ALIASES = Object.freeze(fighterData?.legacyIds || {});
  const CANONICAL_ID_ALIASES = Object.freeze(Object.fromEntries(
    Object.entries(LEGACY_ID_ALIASES).map(([legacyId, canonicalId]) => [canonicalId, legacyId]),
  ));
  const CLASS_STARTER_SKILLS = deepFreeze({
    warrior: [...DEFAULT_STARTER_SKILLS],
    fighter: ["kentotsu"],
  });
  const COMPATIBILITY_STARTER_SKILLS = Object.freeze({ fighter: ["straight_punch"] });

  function fighterBookTier(apCost) {
    if (apCost <= 16) return 1;
    if (apCost <= 45) return 2;
    return 3;
  }

  // Layout follows the supplied chart. Empty cells are intentional: shared
  // prerequisites join across columns, while independent roots have no links.
  const FIGHTER_TREE_GRID = deepFreeze(fighterData?.display?.layout?.grid || []);
  const FIGHTER_TREE_POSITIONS = Object.fromEntries(FIGHTER_TREE_GRID.flatMap((row, treeRow) =>
    row.flatMap((id, treeColumn) => id ? [[id, { treeColumn, treeRow }]] : [])));

  function fighterSkillSpec(id, name, description, apCost, speedGrade, treeGroup, treeColumn, treeRow, options = {}) {
    const passive = options.passive === true;
    const range = options.range || (passive || options.self ? { min: 0, max: 0 } : { min: options.team === "ally" ? 0 : 1, max: 1 });
    const area = options.area || { shape: passive || options.self ? "self" : "single" };
    const defaultScale = Math.min(2.5, .55 + Math.max(0, apCost) / 38);
    const effects = options.effects || (passive
      ? [{ type: "passive_stat", stat: options.passiveStat || "utility", amount: options.amount || .06 }]
      : [{ type: "damage", scale: options.power || defaultScale, ...(options.hits ? { hits: options.hits } : {}) }]);
    const team = options.team || (passive || options.self ? "self" : "enemy");
    const mode = options.mode || (passive || options.self ? "self" : area.shape === "single" ? "unit" : "cell");
    return {
      id,
      name,
      description,
      star: options.star || fighterBookTier(apCost),
      apCost,
      range,
      area,
      power: options.power ?? (effects.find((effect) => effect.type === "damage")?.scale || 0),
      effects,
      targeting: {
        team,
        mode,
        lineOfSight: options.lineOfSight ?? Boolean(options.ranged),
        ...(mode === "cell" ? { allowsEmpty: true } : {}),
        ...(options.cardinal ? { requiresCardinal: true } : {}),
        ...(team === "ally" ? { allowsSelf: true } : {}),
      },
      tags: options.tags || [passive ? "passive" : options.ranged ? "ranged" : "melee", passive || options.self ? "utility" : "physical", ...(options.hits ? ["combo"] : [])],
      poolWeight: options.poolWeight || (passive ? 7 : 14),
      speedGrade,
      prerequisites: options.prerequisites || [],
      targetArc: options.targetArc,
      treeGroup,
      treeColumn: FIGHTER_TREE_POSITIONS[id]?.treeColumn ?? treeColumn,
      treeRow: FIGHTER_TREE_POSITIONS[id]?.treeRow ?? treeRow,
    };
  }

  const LEGACY_FIGHTER_SKILL_SPECS = deepFreeze([
    // 左側 PSV 欄：圖上垂直排列，但每一招都係獨立技能，絕無前置。
    fighterSkillSpec("iron_body", "鐵身", "時刻將氣息注入身體，提升防禦力。", 0, "PSV", "PSV", 0, 0, { passive: true, passiveStat: "defence", star: 1 }),
    fighterSkillSpec("floating_body", "浮身", "時刻將氣息注入身體，提升防禦力。", 0, "PSV", "PSV", 0, 1, { passive: true, passiveStat: "defence", star: 1 }),
    fighterSkillSpec("steel_body", "鋼身", "時刻將氣息注入身體，提升防禦力。", 0, "PSV", "PSV", 0, 2, { passive: true, passiveStat: "defence", star: 1 }),
    fighterSkillSpec("mind_over_heat", "心火滅卻", "時刻將氣息注入身體，提升防禦力。", 0, "PSV", "PSV", 0, 3, { passive: true, passiveStat: "defence", star: 1 }),
    fighterSkillSpec("mental_focus", "精神統一", "集中精神，提升防禦力。", 0, "PSV", "PSV", 0, 4, { passive: true, passiveStat: "defence", star: 2 }),
    fighterSkillSpec("body_targeting", "狙身捉體", "精準掌握對手身體動向，提升命中率。", 0, "PSV", "PSV", 0, 5, { passive: true, passiveStat: "accuracy", star: 2 }),
    fighterSkillSpec("supple_body", "避身柔體", "令身體保持柔韌，提升迴避率。", 0, "PSV", "PSV", 0, 6, { passive: true, passiveStat: "evasion", star: 2 }),
    fighterSkillSpec("striking_body", "功身擊體", "將氣息集中於攻擊動作，提升攻擊力。", 0, "PSV", "PSV", 0, 7, { passive: true, passiveStat: "attack", star: 2 }),
    fighterSkillSpec("guarded_body", "防身鋼體", "鍛鍊護身勁力，提升防禦力。", 0, "PSV", "PSV", 0, 8, { passive: true, passiveStat: "defence", star: 3 }),
    fighterSkillSpec("light_body", "速身輕體", "令全身動作變得輕巧，提升行動速度。", 0, "PSV", "PSV", 0, 9, { passive: true, passiveStat: "speed", star: 3 }),

    fighterSkillSpec("straight_punch", "正拳", "推出握住的拳頭攻擊對象，格鬥士的基本招式。", 3, "B", "正拳列", 1, 0, { power: .68 }),
    fighterSkillSpec("backfist", "背拳", "往背後出拳，使對象受到傷害。", 12, "B", "正拳列", 1, 1, { power: 1.02, prerequisites: ["straight_punch"], targetArc: ["rear"] }),
    fighterSkillSpec("one_inch_punch", "寸勁", "將爆發氣息注入拳頭攻擊，並把對象擊退一格。", 18, "D", "正拳列", 1, 2, { prerequisites: ["backfist"], effects: [{ type: "damage", scale: 1.12 }, { type: "knockback", amount: 1 }] }),
    fighterSkillSpec("fist_cannon", "拳砲", "將注入氣息的拳勁擊出，攻擊並把對象擊退三格。", 32, "D", "正拳列", 1, 3, { prerequisites: ["one_inch_punch"], effects: [{ type: "damage", scale: 1.38 }, { type: "knockback", amount: 3 }] }),
    fighterSkillSpec("rock_fang_strike", "岩牙突", "從地面突出石柱，使指定對象受到攻擊。", 36, "D", "正拳列", 1, 4, { prerequisites: ["fist_cannon"], range: { min: 1, max: 2 }, area: { shape: "cross", radius: 2 }, mode: "cell" }),
    fighterSkillSpec("rock_fang_formation", "岩牙方陣", "從四周地面突出石柱，攻擊自身附近的全部目標。", 45, "D", "正拳列", 1, 5, { prerequisites: ["rock_fang_strike"], self: true, area: { shape: "radius", radius: 1 }, mode: "cell" }),
    fighterSkillSpec("nine_shadow_amber", "九影琥", "以拳勁釋放大範圍衝擊波，令目標高機率跌倒。", 49, "D", "正拳列", 1, 6, { prerequisites: ["rock_fang_formation"], self: true, area: { shape: "radius", radius: 3 }, mode: "cell", effects: [{ type: "damage", scale: 1.08 }, { type: "knockdown", chance: .72 }] }),
    fighterSkillSpec("quaking_nine_shadow_amber", "列陣九影琥", "猛烈衝擊地面，令範圍內目標高機率跌倒。", 56, "D", "正拳列", 1, 7, { prerequisites: ["nine_shadow_amber"], self: true, area: { shape: "radius", radius: 2 }, mode: "cell", effects: [{ type: "damage", scale: 1.28 }, { type: "knockdown", chance: .82 }] }),
    fighterSkillSpec("rock_fang_line", "岩牙列陣", "沿一直線連續突出石柱，攻擊線上的全部目標。", 75, "D", "正拳列", 1, 5, { prerequisites: ["rock_fang_strike"], range: { min: 1, max: 8 }, area: { shape: "line", length: 8 }, mode: "cell", ranged: true, cardinal: true }),
    fighterSkillSpec("earth_shatter", "地碎崩", "使勁撞擊地面，使對象受傷並高機率跌倒。", 52, "D", "正拳列", 1, 6, { prerequisites: ["rock_fang_line"], effects: [{ type: "damage", scale: 1.72 }, { type: "knockdown", chance: .82 }] }),
    fighterSkillSpec("sky_rend", "天裂崩", "運用撕裂天空的攻擊技巧，攻擊並把對象擊退五格。", 85, "D", "正拳列", 1, 7, { prerequisites: ["earth_shatter"], effects: [{ type: "damage", scale: 2.35 }, { type: "knockback", amount: 5 }] }),

    fighterSkillSpec("rapid_fist", "迅拳", "如疾風般快速出拳攻擊目標。", 6, "A", "迅拳列", 2, 1, { power: .92, prerequisites: ["straight_punch"] }),
    fighterSkillSpec("rising_knuckle", "連擊", "連續出拳，使對象受到兩段獨立攻擊。", 12, "B", "迅拳列", 2, 2, { power: .48, hits: 2, star: 2, prerequisites: ["rapid_fist"] }),
    fighterSkillSpec("delayed_punch", "時差正拳", "針對採取防守架式的對象發揮效果的延遲攻擊。", 7, "C", "迅拳列", 2, 3, { power: .82, prerequisites: ["rising_knuckle"] }),
    fighterSkillSpec("scatter_burst", "散彈", "從拳頭釋放衝擊波，攻擊自身前方多個目標。", 16, "C", "迅拳列", 2, 4, { prerequisites: ["delayed_punch"], range: { min: 1, max: 1 }, area: { shape: "cone", length: 1, width: 1 }, mode: "cell", cardinal: true }),
    fighterSkillSpec("tiger_chain", "虎連擊", "連續出拳，使對象受到三段威力變動的攻擊。", 24, "C", "迅拳列", 2, 5, { power: .42, hits: 3, prerequisites: ["scatter_burst"] }),
    fighterSkillSpec("crimson_meteor", "紅流星", "以拳頭釋放直線衝擊波，攻擊路線上的目標。", 28, "D", "迅拳列", 2, 6, { prerequisites: ["tiger_chain"], range: { min: 1, max: 3 }, area: { shape: "line", length: 3 }, mode: "cell", ranged: true, cardinal: true }),
    fighterSkillSpec("zantetsu_fist", "殘充拳", "如雷鳴般以極高速出拳攻擊目標。", 12, "S", "迅拳列", 2, 7, { power: 1.02, prerequisites: ["crimson_meteor"] }),
    fighterSkillSpec("poison_hand_fist", "毒手拳", "以自身毒素攻擊，使對象中毒；自身亦會短暫中毒。", 25, "D", "迅拳列", 2, 8, { prerequisites: ["zantetsu_fist"], effects: [{ type: "damage", scale: 1.08 }, { type: "poison", duration: 5, selfDuration: 1 }] }),
    fighterSkillSpec("hundred_tiger_chain", "百虎連擊", "連續出拳，使對象受到五段威力變動的攻擊。", 42, "C", "迅拳列", 2, 8, { power: .32, hits: 5, prerequisites: ["zantetsu_fist"] }),
    fighterSkillSpec("oni_slayer", "鬼殺", "躍至半空急降出拳，向對象施展三連擊。", 100, "D", "迅拳列", 2, 9, { power: .75, hits: 3, prerequisites: ["poison_hand_fist", "hundred_tiger_chain", "grand_cannon_kick"] }),
    fighterSkillSpec("oni_cry", "鬼哭", "使出禁招般的連續攻勢，向對象施展八連擊。", 100, "D", "迅拳列", 2, 9, { power: .32, hits: 8, prerequisites: ["poison_hand_fist", "hundred_tiger_chain", "grand_cannon_kick"] }),
    fighterSkillSpec("oni_lament", "鬼嘆", "在空中連續踢擊六次，最後把對象擊退兩格。", 100, "D", "迅拳列", 2, 9, { power: .4, hits: 6, prerequisites: ["poison_hand_fist", "hundred_tiger_chain", "grand_cannon_kick"], effects: [{ type: "damage", scale: .4, hits: 6 }, { type: "knockback", amount: 2 }] }),

    fighterSkillSpec("turning_cannon_kick", "轉砲腳", "利用身體迴轉踢擊，造成傷害並擊退一格。", 22, "D", "足技", 3, 2, { prerequisites: ["rapid_fist"], effects: [{ type: "damage", scale: 1.08 }, { type: "knockback", amount: 1 }] }),
    fighterSkillSpec("horizon_kick", "地平腳", "貼近地面踢擊，使對象受傷並跌倒。", 25, "C", "足技", 3, 3, { prerequisites: ["turning_cannon_kick", "preemptive_counter"], effects: [{ type: "damage", scale: 1.12 }, { type: "knockdown", chance: .78 }] }),
    fighterSkillSpec("wind_blade_kick", "風刃腳", "高速踢擊產生真空，從特殊角度攻擊遠處對象。", 25, "C", "足技", 3, 4, { prerequisites: ["horizon_kick"], range: { min: 1, max: 3 }, area: { shape: "cone", length: 3, width: 1 }, mode: "cell", ranged: true }),
    fighterSkillSpec("grand_cannon_kick", "豪砲腳", "以強力踢擊造成傷害，並把對象擊退四格。", 36, "D", "足技", 3, 5, { prerequisites: ["wind_blade_kick"], effects: [{ type: "damage", scale: 1.48 }, { type: "knockback", amount: 4 }] }),
    fighterSkillSpec("wind_god_chi_kick", "風神氣功腳", "把氣功化成鐮鼬般的直線斬擊，攻擊遠方目標。", 55, "D", "足技", 3, 7, { prerequisites: ["grand_cannon_kick", "chi_blast"], range: { min: 1, max: 6 }, area: { shape: "line", length: 6 }, mode: "cell", ranged: true, cardinal: true }),

    fighterSkillSpec("dancing_leaf", "舞葉", "觀察對手動作，採取高機率迴避的架式。", 7, "A", "迴避・反擊", 4, 1, { prerequisites: ["straight_punch"], self: true, effects: [{ type: "evasion", amount: .55, duration: 1 }] }),
    fighterSkillSpec("preemptive_counter", "先之先", "觀察對手行動，準備反擊攻擊自身的對象。", 18, "B", "迴避・反擊", 4, 2, { prerequisites: ["dancing_leaf"], self: true, effects: [{ type: "counter", amount: .9, duration: 1 }] }),
    fighterSkillSpec("projectile_counter_kick", "跳彈腳", "採取架式，把所見的投射攻擊反擊回去。", 18, "B", "迴避・反擊", 4, 3, { prerequisites: ["turning_cannon_kick", "preemptive_counter"], self: true, effects: [{ type: "projectile_counter", amount: 1, duration: 1 }] }),
    fighterSkillSpec("dragon_eye", "龍之眼", "從大氣觀察攻擊，採取高機率迴避的架式。", 16, "A", "迴避・反擊", 4, 4, { prerequisites: ["projectile_counter_kick"], self: true, effects: [{ type: "evasion", amount: .72, duration: 1 }] }),

    fighterSkillSpec("roar", "咆哮", "大聲咆哮，妨礙大範圍內所有目標的行動。", 38, "B", "狀態異常", 5, 1, { prerequisites: ["straight_punch"], self: true, area: { shape: "radius", radius: 3 }, mode: "cell", effects: [{ type: "move_down", amount: 2, duration: 1 }] }),
    fighterSkillSpec("vanishing_aura", "無鬥氣", "使氣息與自然同化，進入兩回合透明狀態。", 35, "B", "狀態異常", 5, 2, { prerequisites: ["roar"], self: true, effects: [{ type: "stealth", duration: 2 }] }),
    fighterSkillSpec("immobility_bind", "不動縛", "以咆哮從遠處束縛目標，使其麻痺兩回合。", 35, "D", "狀態異常", 5, 3, { prerequisites: ["vanishing_aura"], range: { min: 1, max: 3 }, area: { shape: "cross", radius: 3 }, mode: "cell", ranged: true, effects: [{ type: "paralysis", duration: 2 }] }),
    fighterSkillSpec("chi_gathering", "集氣術", "融合氣功與自然之力，回復少量生命。", 20, "C", "狀態異常", 5, 3, { prerequisites: ["vanishing_aura"], self: true, effects: [{ type: "heal", maxHpRatio: .18, flat: 6 }] }),
    fighterSkillSpec("secret_chi_gathering", "集氣秘術", "深度融合氣功與自然之力，回復大量生命。", 38, "C", "狀態異常", 5, 4, { prerequisites: ["chi_gathering", "immobility_bind"], self: true, effects: [{ type: "heal", maxHpRatio: .38, flat: 12 }] }),
    fighterSkillSpec("rending_flash", "裂閃光", "令身體放出強光，使範圍內目標陷入黑暗。", 35, "D", "狀態異常", 5, 4, { prerequisites: ["chi_gathering", "immobility_bind"], self: true, area: { shape: "cone", length: 3, width: 2 }, mode: "cell", effects: [{ type: "blind", duration: 4 }] }),

    fighterSkillSpec("finger_bullet", "指彈", "將氣功化成小型子彈，攻擊遠處目標。", 12, "C", "氣功・遠距離", 6, 5, { prerequisites: ["rending_flash"], range: { min: 1, max: 5 }, ranged: true }),
    fighterSkillSpec("chi_blast", "氣功彈", "將體內氣功化成子彈，攻擊遠處目標。", 32, "D", "氣功・遠距離", 6, 6, { prerequisites: ["finger_bullet"], range: { min: 1, max: 5 }, ranged: true }),
    fighterSkillSpec("empowered_chi_blast", "激氣功彈", "將體內氣功化成更強力的大型子彈。", 45, "D", "氣功・遠距離", 6, 7, { prerequisites: ["chi_blast"], range: { min: 1, max: 5 }, ranged: true }),
    fighterSkillSpec("giant_chi_blast", "激氣功巨彈", "發射巨大的氣功子彈，重創遠處目標。", 63, "E", "氣功・遠距離", 6, 8, { prerequisites: ["empowered_chi_blast"], range: { min: 1, max: 5 }, ranged: true }),
    fighterSkillSpec("dragon_bullet", "龍彈", "將氣功化成龍形射出，攻擊自身與對象之間的所有目標。", 90, "E", "氣功・遠距離", 6, 9, { prerequisites: ["giant_chi_blast"], range: { min: 1, max: 6 }, area: { shape: "line", length: 6 }, mode: "cell", ranged: true, cardinal: true }),
    fighterSkillSpec("chi_cannon", "氣功砲", "迴轉並強化氣功彈，貫穿自身與對象之間的全部目標。", 42, "D", "氣功・遠距離", 6, 7, { prerequisites: ["chi_blast"], range: { min: 1, max: 5 }, area: { shape: "line", length: 5 }, mode: "cell", ranged: true, cardinal: true }),
    fighterSkillSpec("explosive_chi_blast", "氣功炸裂彈", "發射會爆炸的氣功彈，攻擊曲線範圍內的全部目標。", 55, "D", "氣功・遠距離", 6, 8, { prerequisites: ["chi_cannon"], range: { min: 2, max: 5 }, area: { shape: "radius", radius: 2 }, mode: "cell", ranged: true }),

    // 右側兩條副職分支各自成鏈，與正拳中央網絡完全分離。
    fighterSkillSpec("defense_stance", "防禦", "採取架式，減輕本回合受到的傷害。", 5, "A", "副職・戰士", 7, 0, { self: true, effects: [{ type: "guard", amount: .38, duration: 1 }] }),
    fighterSkillSpec("lightning_punch", "電擊拳", "伴隨落雷揮拳攻擊，並有低機率使對象麻痺。", 42, "D", "副職・戰士", 7, 1, { prerequisites: ["defense_stance"], effects: [{ type: "damage", scale: 1.55, element: "storm" }, { type: "paralysis", chance: .24, duration: 1 }] }),
    fighterSkillSpec("halving_fist", "留下半氣拳", "命中成功時，以特殊拳勁把對象生命壓至一半。", 47, "D", "副職・戰士", 7, 2, { prerequisites: ["lightning_punch"], effects: [{ type: "halve_hp" }] }),
    fighterSkillSpec("one_hp_fist", "留下後一拳", "命中成功時，以特殊拳勁把對象生命壓至一點。", 77, "D", "副職・戰士", 7, 3, { prerequisites: ["halving_fist"], effects: [{ type: "set_hp", amount: 1 }] }),
    fighterSkillSpec("flash_fist", "拳瞬", "以超高速的一步揮拳，使對象受到猛烈傷害。", 48, "S", "副職・戰士", 7, 4, { prerequisites: ["one_hp_fist"], power: 1.82 }),

    fighterSkillSpec("paralysis_release", "痺除點穴", "以穴道療法解除對象的麻痺狀態。", 6, "D", "副職・守護", 8, 0, { team: "ally", mode: "unit", effects: [{ type: "cleanse", statuses: ["paralysis"] }] }),
    fighterSkillSpec("mind_release", "心著點穴", "以穴道療法解除對象的混亂、激怒等精神狀態。", 8, "D", "副職・守護", 8, 1, { prerequisites: ["paralysis_release"], team: "ally", mode: "unit", effects: [{ type: "cleanse", statuses: ["confusion", "rage"] }] }),
    fighterSkillSpec("sight_release", "快目點穴", "以穴道療法解除對象的黑暗狀態。", 6, "D", "副職・守護", 8, 2, { prerequisites: ["mind_release"], team: "ally", mode: "unit", effects: [{ type: "cleanse", statuses: ["blind"] }] }),
    fighterSkillSpec("sleep_recovery", "謀眠打破", "受到天使加護，睡眠後會自動甦醒。", 0, "PSV", "副職・守護", 8, 3, { passive: true, prerequisites: ["sight_release"], passiveStat: "sleep_recovery", star: 2 }),
    fighterSkillSpec("poison_recovery", "氣孔解毒", "受到天使加護，中毒後會自動解除。", 0, "PSV", "副職・守護", 8, 4, { passive: true, prerequisites: ["sleep_recovery"], passiveStat: "poison_recovery", star: 3 }),
  ]);

  const CLEANSE_STATUS_ALIASES = Object.freeze({
    "放心": "panic",
    "混亂": "confusion",
    "激怒": "rage",
  });

  function sourceStar(raw) {
    // Current Everrealm skill-book pools use the agreed AP bands for command
    // skills.  The original source's 1–14 reward tier is retained under
    // acquisition metadata; it is not the three-tier runtime book rarity.
    if (raw.type !== "PSV") {
      const ap = Number(raw.original_reference?.ap);
      if (Number.isFinite(ap)) return fighterBookTier(ap);
    }
    const books = raw.original_reference?.acquisition?.guild_reward_books || [];
    const sourceStar = Number(books[0]?.star_value);
    if (Number.isFinite(sourceStar)) return Math.min(3, Math.max(1, Math.ceil(sourceStar / 5)));
    const ap = Number(raw.original_reference?.ap);
    return Number.isFinite(ap) ? fighterBookTier(ap) : 1;
  }

  function relativeRangeBounds(cells) {
    if (!Array.isArray(cells) || !cells.length) return { min: null, max: null };
    const distances = cells.map(([lateral, depth]) => Math.max(Math.abs(Number(lateral) || 0), Math.abs(Number(depth) || 0)));
    return { min: Math.min(...distances), max: Math.max(...distances) };
  }

  function runtimeRange(raw) {
    const source = raw.original_reference?.range || {};
    const cells = Array.isArray(source.range_cells_relative)
      ? source.range_cells_relative.map((cell) => [Number(cell[0]), Number(cell[1])])
      : null;
    const bounds = relativeRangeBounds(cells);
    const heightDifference = { ...(source.height_difference || { status: "uncertain" }) };
    // The source marks this skill's upward value as uncertain, while its
    // source text explicitly confirms unlimited downward reach. Keep that
    // distinction instead of turning infinity into an arbitrary integer.
    if (heightDifference.down == null && /下∞/.test(String(heightDifference.source_text || ""))) {
      heightDifference.down = "unlimited";
    }
    return {
      min: source.type === "self" ? 0 : bounds.min,
      max: source.type === "self" ? 0 : bounds.max,
      type: source.type || "unknown",
      sourcePattern: source.source_pattern ?? null,
      rangeDescription: source.range_description || "原始資料未確認射程。",
      rangeCellsRelative: cells,
      heightDifference,
    };
  }

  function runtimeArea(raw) {
    const source = raw.original_reference?.effect_area || {};
    const cells = Array.isArray(source.cells_relative)
      ? source.cells_relative.map((cell) => [Number(cell[0]), Number(cell[1])])
      : null;
    let shape = "single";
    if (source.type === "passive" || source.type === "self_only") shape = "self";
    else if (source.type === "area_all_units" || source.type === "area_all_enemy_units") shape = "relative_cells";
    else if (source.type === "line_to_selected_target") shape = "line_to_target";
    else if (source.type === "impact_area_all_units") shape = "impact_area";
    return {
      shape,
      sourceType: source.type || "selected_target_only",
      sourcePattern: source.source_pattern ?? null,
      coordinateOrigin: source.coordinate_origin || null,
      areaDescription: source.area_description || null,
      relativeCells: cells,
      heightDifference: source.height_difference ? { ...source.height_difference } : null,
    };
  }

  function cleanseStatuses(statuses) {
    return (statuses || []).map((status) => CLEANSE_STATUS_ALIASES[status] || status);
  }

  function runtimeEffects(raw) {
    const original = raw.original_reference || {};
    const everrealm = raw.everrealm || {};
    const utilities = everrealm.utility_effects || [];
    const effects = [];
    const damage = everrealm.damage || {};
    const hitCount = everrealm.hit_resolution?.hit_count || 0;
    if (everrealm.deals_damage && damage.formula_applied) {
      effects.push({ type: "damage", scale: Number(damage.final_total_multiplier) || 0, hits: Math.max(1, Number(hitCount) || 1) });
    }
    if (everrealm.deals_damage && damage.model?.type === "set_remaining_hp_fraction") {
      effects.push({ type: "halve_hp", fraction: Number(damage.model.fraction) || .5 });
    } else if (everrealm.deals_damage && damage.model?.type === "set_remaining_hp_value") {
      effects.push({ type: "set_hp", amount: Number(damage.model.value) || 1 });
    }
    for (const utility of utilities) {
      const type = utility.type;
      if (type === "knockback") effects.push({ type, amount: Number(utility.cells) || 1 });
      else if (type === "knockdown") effects.push({ type, chance: utility.probability === "low" ? .25 : utility.probability === "high" ? .75 : 1, duration: Math.max(1, Number(utility.duration_turns) || 1) });
      else if (type === "feint") effects.push({ type, effectiveAgainst: utility.effective_against || "guarding_target" });
      else if (type === "self_poison") effects.push({ type: "self_poison", duration: Math.max(1, Number(utility.duration_turns) || 1) });
      else if (type === "poison") effects.push({ type, chance: utility.probability === "low" ? .25 : utility.probability === "high" ? .75 : 1, duration: Math.max(1, Number(utility.duration_turns) || 1), sourceUncertain: utility.status === "uncertain" });
      else if (type === "evasion_stance") effects.push({ type: "evasion", amount: .55, duration: 1 });
      else if (type === "super_evasion_stance") effects.push({ type: "evasion", amount: .72, duration: 1 });
      else if (type === "counter_stance") effects.push({ type: "counter", amount: .9, duration: 1 });
      else if (type === "projectile_reflect_stance") effects.push({ type: "projectile_counter", amount: 1, duration: 1 });
      else if (type === "action_interference") effects.push({ type, amount: Number(utility.value) || 0, duration: 1 });
      else if (type === "invisible") effects.push({ type: "stealth", duration: Math.max(1, Number(utility.duration_turns) || 1) });
      else if (type === "heal_hp") effects.push({ type: "heal", maxHpRatio: utility.magnitude === "large" ? .38 : .18, flat: utility.magnitude === "large" ? 12 : 6 });
      else if (type === "paralysis") effects.push({ type, chance: utility.probability === "low" ? .25 : utility.probability === "high" ? .75 : 1, duration: Math.max(1, Number(utility.duration_turns) || 1) });
      else if (type === "blind") effects.push({ type, chance: utility.probability === "low" ? .25 : utility.probability === "high" ? .75 : 1, duration: Math.max(1, Number(utility.duration_turns) || 1) });
      else if (type === "cleanse") effects.push({ type, statuses: cleanseStatuses(utility.statuses) });
      else if (type === "damage_reduction_stance") effects.push({ type: "guard", amount: .38, duration: 1 });
      else if (type === "auto_cleanse") effects.push({ type: "passive_stat", stat: utility.statuses?.[0] === "poison" ? "poison_recovery" : "sleep_recovery" });
      else if (["slash_defense_up", "impact_defense_up", "piercing_defense_up", "heat_defense_up", "mental_defense_up"].includes(type)) effects.push({ type: "passive_stat", stat: "defence", amount: .06 });
      else if (type === "defense_up") effects.push({ type: "passive_stat", stat: "defence", amount: .06 });
      else if (type === "accuracy_up") effects.push({ type: "passive_stat", stat: "accuracy", amount: .06 });
      else if (type === "evasion_up") effects.push({ type: "passive_stat", stat: "evasion", amount: .06 });
      else if (type === "physical_attack_up") effects.push({ type: "passive_stat", stat: "attack", amount: .06 });
      else if (type === "action_speed_up") effects.push({ type: "passive_stat", stat: "speed", amount: .06 });
    }
    const selfPoison = utilities.find((utility) => utility.type === "self_poison");
    const poison = effects.find((effect) => effect.type === "poison");
    if (poison && selfPoison) poison.selfDuration = Math.max(1, Number(selfPoison.duration_turns) || 1);
    return effects.length ? effects : (raw.type === "PSV" ? [{ type: "passive_stat", stat: "utility", amount: .06 }] : []);
  }

  function fighterSkillSpecFromData(raw) {
    const original = raw.original_reference || {};
    const everrealm = raw.everrealm || {};
    const damage = everrealm.damage || {};
    const hitResolution = everrealm.hit_resolution || {};
    const range = runtimeRange(raw);
    const area = runtimeArea(raw);
    const effects = runtimeEffects(raw);
    const passive = raw.type === "PSV";
    const selectedTarget = area.shape === "single";
    const cleanse = everrealm.action_kind === "cleanse";
    const selfTargeted = passive || range.type === "self";
    const areaTargetTeam = area.sourceType === "area_all_units" || area.sourceType === "area_all_enemy_units" ? "enemy" : null;
    const tags = passive ? ["passive", "utility"] : [range.max != null && range.max > 1 ? "ranged" : "melee", raw.category === "ki_ranged" ? "magic" : "physical"];
    if (everrealm.deals_damage && Number(hitResolution.hit_count) > 1) tags.push("combo");
    if (cleanse || effects.some((effect) => ["heal", "guard", "evasion", "counter", "projectile_counter", "passive_stat"].includes(effect.type))) tags.push("utility");
    if (area.shape !== "single" && !tags.includes("aoe")) tags.push("aoe");
    const targetTeam = cleanse ? "ally" : selfTargeted ? "self" : "enemy";
    const mode = passive || range.type === "self" ? "self" : selectedTarget ? "unit" : "cell";
    const positions = FIGHTER_TREE_POSITIONS[raw.id] || {};
    return {
      id: raw.id,
      name: raw.name_zh,
      description: original.description_zh || raw.name_zh,
      star: sourceStar(raw),
      apCost: Number.isFinite(Number(original.ap)) ? Number(original.ap) : 0,
      ap: original.ap ?? null,
      interrupt: original.interrupt ?? null,
      durability: original.durability ?? null,
      range,
      rangeCellsRelative: range.rangeCellsRelative,
      heightDifference: range.heightDifference,
      area,
      effectArea: original.effect_area || null,
      power: Number(damage.final_total_multiplier) || 0,
      effects,
      targeting: {
        team: targetTeam,
        mode,
        lineOfSight: false,
        ...(mode === "cell" ? { allowsEmpty: true } : {}),
        ...(areaTargetTeam ? { areaTargetTeam } : {}),
        ...(cleanse ? { allowsSelf: true } : {}),
      },
      tags,
      poolWeight: passive ? 7 : 14,
      speedGrade: original.speed || "PSV",
      prerequisites: Array.isArray(raw.requires) ? [...raw.requires] : [],
      targetArc: selfTargeted ? ["self"] : ["front", "left", "right", "rear"],
      treeGroup: raw.category,
      treeColumn: positions.treeColumn ?? null,
      treeRow: positions.treeRow ?? null,
      type: raw.type,
      category: raw.category,
      sourceNameJa: raw.source_name_ja,
      requiresStatus: raw.requires_status,
      sourceNote: raw.source_note || null,
      requirements: original.requirements || null,
      originalReference: original,
      everrealm,
      actionKind: everrealm.action_kind,
      dealsDamage: everrealm.deals_damage === true,
      deliveryMode: everrealm.delivery_mode || null,
      pathMode: everrealm.path_mode || null,
      blocksByTerrain: everrealm.delivery_mode === "linear",
      blocksByUnits: everrealm.delivery_mode === "linear",
      stopOnFirstUnit: everrealm.delivery_mode === "linear",
      utilityEffects: everrealm.utility_effects || [],
      damage: damage,
      hitResolution,
      sourceHitJudgement: original.source_hit_judgement || null,
      guildBookStars: [...new Set((original.acquisition?.guild_reward_books || [])
        .map((book) => Math.trunc(Number(book?.star_value)))
        .filter((star) => Number.isFinite(star) && star > 0))],
    };
  }

  const FIGHTER_SKILL_SPECS = deepFreeze((fighterData?.skills || []).map(fighterSkillSpecFromData));

  function fighterRawSkill(spec) {
    return {
      id: spec.id,
      name: spec.name,
      description: spec.description,
      star: spec.star,
      apCost: spec.apCost,
      ap: spec.ap,
      interrupt: spec.interrupt,
      durability: spec.durability,
      range: spec.range,
      rangeCellsRelative: spec.rangeCellsRelative,
      heightDifference: spec.heightDifference,
      area: spec.area,
      effectArea: spec.effectArea,
      power: spec.power,
      effects: spec.effects,
      targeting: spec.targeting,
      tags: spec.tags,
      poolWeight: spec.poolWeight,
      type: spec.type,
      category: spec.category,
      sourceNameJa: spec.sourceNameJa,
      requiresStatus: spec.requiresStatus,
      sourceNote: spec.sourceNote,
      requirements: spec.requirements,
      originalReference: spec.originalReference,
      everrealm: spec.everrealm,
      actionKind: spec.actionKind,
      dealsDamage: spec.dealsDamage,
      deliveryMode: spec.deliveryMode,
      pathMode: spec.pathMode,
      blocksByTerrain: spec.blocksByTerrain,
      blocksByUnits: spec.blocksByUnits,
      stopOnFirstUnit: spec.stopOnFirstUnit,
      utilityEffects: spec.utilityEffects,
      damage: spec.damage,
      hitResolution: spec.hitResolution,
      sourceHitJudgement: spec.sourceHitJudgement,
      guildBookStars: spec.guildBookStars,
      treeGroup: spec.treeGroup,
      treeColumn: spec.treeColumn,
      treeRow: spec.treeRow,
    };
  }

  const RAW_SKILLS = [
    {
      id: "quick_slash",
      name: "瞬刃",
      description: "貼身快速斬擊；消耗低，適合留低 AP 接下一輪大招。",
      star: 1,
      apCost: 4,
      range: { min: 1, max: 1 },
      area: { shape: "single" },
      power: 0.72,
      effects: [{ type: "damage", scale: 0.72 }],
      targeting: { team: "enemy", mode: "unit", lineOfSight: false },
      tags: ["melee", "physical", "combo"],
      poolWeight: 26,
    },
    {
      id: "steady_strike",
      name: "破甲直劈",
      description: "穩重一劈削弱護甲，傷害比瞬刃高但連招空間較少。",
      star: 1,
      apCost: 6,
      range: { min: 1, max: 1 },
      area: { shape: "single" },
      power: 1.05,
      effects: [
        { type: "damage", scale: 1.05 },
        { type: "defense_down", amount: 0.12, duration: 1 },
      ],
      targeting: { team: "enemy", mode: "unit", lineOfSight: false },
      tags: ["melee", "physical", "debuff"],
      poolWeight: 20,
    },
    {
      id: "lantern_shot",
      name: "燈火彈",
      description: "射出一粒穩定燈火，射程遠但威力低過同級近戰。",
      star: 1,
      apCost: 7,
      range: { min: 2, max: 5 },
      area: { shape: "single" },
      power: 0.8,
      effects: [{ type: "damage", scale: 0.8, element: "light" }],
      targeting: { team: "enemy", mode: "unit", lineOfSight: true },
      tags: ["ranged", "magic", "light"],
      poolWeight: 23,
    },
    {
      id: "crescent_sweep",
      name: "半月掃",
      description: "向面前掃出短小扇形劍風；命中多人時划算，單體威力偏低。",
      star: 1,
      apCost: 8,
      range: { min: 1, max: 1 },
      area: { shape: "cone", length: 2, width: 1 },
      power: 0.62,
      effects: [{ type: "damage", scale: 0.62 }],
      targeting: { team: "enemy", mode: "cell", lineOfSight: false, allowsEmpty: true, requiresCardinal: true },
      tags: ["melee", "physical", "aoe"],
      poolWeight: 15,
    },
    {
      id: "guard_stance",
      name: "提燈守勢",
      description: "今個技能階段減少所受傷害，仍可儲起一半回合 AP 做穩健部署。",
      star: 1,
      apCost: 5,
      range: { min: 0, max: 0 },
      area: { shape: "self" },
      power: 0,
      effects: [{ type: "guard", amount: 0.35, duration: 1 }],
      targeting: { team: "self", mode: "self", lineOfSight: false },
      tags: ["utility", "defense"],
      poolWeight: 22,
    },
    {
      id: "field_dressing",
      name: "燈芯包紮",
      description: "替自己或附近同伴急救；回復量有限，但能救急。",
      star: 1,
      apCost: 8,
      range: { min: 0, max: 2 },
      area: { shape: "single" },
      power: 0,
      effects: [{ type: "heal", maxHpRatio: 0.2, flat: 8 }],
      targeting: { team: "ally", mode: "unit", lineOfSight: true, allowsSelf: true },
      tags: ["ranged", "heal", "support"],
      poolWeight: 14,
    },
    {
      id: "piercing_lance",
      name: "貫霧突",
      description: "沿一直線刺穿三格敵人，部分無視防禦；要先排好直線。",
      star: 2,
      apCost: 12,
      range: { min: 1, max: 3 },
      area: { shape: "line", length: 3 },
      power: 0.88,
      effects: [
        { type: "damage", scale: 0.88 },
        { type: "armor_pierce", amount: 0.2 },
      ],
      targeting: { team: "enemy", mode: "cell", lineOfSight: true, allowsEmpty: true, requiresCardinal: true },
      tags: ["melee", "physical", "aoe", "pierce"],
      poolWeight: 22,
    },
    {
      id: "mist_arrow",
      name: "凝霧狙擊",
      description: "遠距離集中一箭並令目標下回合少走一格；近身無法使用。",
      star: 2,
      apCost: 11,
      range: { min: 3, max: 6 },
      area: { shape: "single" },
      power: 0.96,
      effects: [
        { type: "damage", scale: 0.96 },
        { type: "move_down", amount: 1, duration: 1 },
      ],
      targeting: { team: "enemy", mode: "unit", lineOfSight: true },
      tags: ["ranged", "physical", "debuff"],
      poolWeight: 24,
    },
    {
      id: "cross_burst",
      name: "十字燈爆",
      description: "引爆目標格同上下左右；覆蓋靈活，但中心外傷害不算高。",
      star: 2,
      apCost: 14,
      range: { min: 1, max: 4 },
      area: { shape: "cross", radius: 1 },
      power: 0.78,
      effects: [{ type: "damage", scale: 0.78, element: "light" }],
      targeting: { team: "enemy", mode: "cell", lineOfSight: true, allowsEmpty: true },
      tags: ["ranged", "magic", "light", "aoe"],
      poolWeight: 18,
    },
    {
      id: "lantern_field",
      name: "暖燈結界",
      description: "於小範圍治療友軍；需要預先儲 AP，換取團隊續戰力。",
      star: 2,
      apCost: 16,
      range: { min: 0, max: 3 },
      area: { shape: "radius", radius: 1 },
      power: 0,
      effects: [{ type: "heal", maxHpRatio: 0.18, flat: 10 }],
      targeting: { team: "ally", mode: "cell", lineOfSight: true, allowsEmpty: true, allowsSelf: true },
      tags: ["ranged", "heal", "support", "aoe"],
      poolWeight: 15,
    },
    {
      id: "gale_step",
      name: "風踏架勢",
      description: "下次移動階段額外走兩格並提升閃避；本階段不造成傷害。",
      star: 2,
      apCost: 10,
      range: { min: 0, max: 0 },
      area: { shape: "self" },
      power: 0,
      effects: [
        { type: "move_up", amount: 2, duration: 1 },
        { type: "evasion", amount: 0.15, duration: 1 },
      ],
      targeting: { team: "self", mode: "self", lineOfSight: false },
      tags: ["utility", "mobility", "defense"],
      poolWeight: 21,
    },
    {
      id: "starfall_array",
      name: "星墜燈陣",
      description: "轟擊菱形大範圍；總傷害潛力極高，但容易打空而且要儲 AP。",
      star: 3,
      apCost: 30,
      range: { min: 2, max: 5 },
      area: { shape: "radius", radius: 2 },
      power: 0.82,
      effects: [{ type: "damage", scale: 0.82, element: "light" }],
      targeting: { team: "enemy", mode: "cell", lineOfSight: true, allowsEmpty: true },
      tags: ["ranged", "magic", "light", "aoe"],
      poolWeight: 19,
    },
    {
      id: "dragon_crescent",
      name: "蒼龍半月",
      description: "向前方斬出三格扇形巨浪；站位要求高，近距群戰極強。",
      star: 3,
      apCost: 22,
      range: { min: 1, max: 1 },
      area: { shape: "cone", length: 3, width: 1 },
      power: 1,
      effects: [{ type: "damage", scale: 1, element: "wind" }],
      targeting: { team: "enemy", mode: "cell", lineOfSight: false, allowsEmpty: true, requiresCardinal: true },
      tags: ["melee", "physical", "wind", "aoe"],
      poolWeight: 22,
    },
    {
      id: "thunder_pillar",
      name: "雷燈貫線",
      description: "雷光貫穿前方六格；威力高但只能沿正交直線施放。",
      star: 3,
      apCost: 24,
      range: { min: 1, max: 6 },
      area: { shape: "line", length: 6 },
      power: 1.14,
      effects: [{ type: "damage", scale: 1.14, element: "storm" }],
      targeting: { team: "enemy", mode: "cell", lineOfSight: true, allowsEmpty: true, requiresCardinal: true },
      tags: ["ranged", "magic", "storm", "aoe"],
      poolWeight: 17,
    },
    {
      id: "oathbreaker",
      name: "破曉誓斬",
      description: "將超過一回合嘅 AP 集中於單體重斬；射程短，爆發最高。",
      star: 3,
      apCost: 28,
      range: { min: 1, max: 1 },
      area: { shape: "single" },
      power: 2.15,
      effects: [
        { type: "damage", scale: 2.15, element: "light" },
        { type: "armor_pierce", amount: 0.35 },
      ],
      targeting: { team: "enemy", mode: "unit", lineOfSight: false },
      tags: ["melee", "physical", "light", "burst"],
      poolWeight: 16,
    },
    {
      id: "aurora_sanctuary",
      name: "極光聖域",
      description: "為大範圍友軍治療並提供短暫守護；完全放棄今輪輸出。",
      star: 3,
      apCost: 26,
      range: { min: 0, max: 4 },
      area: { shape: "radius", radius: 2 },
      power: 0,
      effects: [
        { type: "heal", maxHpRatio: 0.28, flat: 14 },
        { type: "guard", amount: 0.18, duration: 1 },
      ],
      targeting: { team: "ally", mode: "cell", lineOfSight: true, allowsEmpty: true, allowsSelf: true },
      tags: ["ranged", "heal", "support", "defense", "aoe"],
      poolWeight: 14,
    },
    ...FIGHTER_SKILL_SPECS.map(fighterRawSkill),
  ];

  const SKILL_PROGRESSION = deepFreeze({
    quick_slash: { classId: "warrior", speedGrade: "A", prerequisites: [] },
    steady_strike: { classId: "warrior", speedGrade: "B", prerequisites: ["quick_slash"] },
    lantern_shot: { classId: "warrior", speedGrade: "B", prerequisites: [] },
    crescent_sweep: { classId: "warrior", speedGrade: "C", prerequisites: ["quick_slash"] },
    guard_stance: { classId: "warrior", speedGrade: "C", prerequisites: [] },
    field_dressing: { classId: "warrior", speedGrade: "D", prerequisites: ["guard_stance"] },
    piercing_lance: { classId: "warrior", speedGrade: "C", prerequisites: ["steady_strike"] },
    mist_arrow: { classId: "warrior", speedGrade: "C", prerequisites: ["lantern_shot"] },
    cross_burst: { classId: "warrior", speedGrade: "D", prerequisites: ["lantern_shot"] },
    lantern_field: { classId: "warrior", speedGrade: "D", prerequisites: ["field_dressing"] },
    gale_step: { classId: "warrior", speedGrade: "S", prerequisites: ["guard_stance"] },
    starfall_array: { classId: "warrior", speedGrade: "F", prerequisites: ["cross_burst"] },
    dragon_crescent: { classId: "warrior", speedGrade: "E", prerequisites: ["crescent_sweep"] },
    thunder_pillar: { classId: "warrior", speedGrade: "E", prerequisites: ["mist_arrow"] },
    oathbreaker: { classId: "warrior", speedGrade: "F", prerequisites: ["piercing_lance", "dragon_crescent"] },
    aurora_sanctuary: { classId: "warrior", speedGrade: "F", prerequisites: ["lantern_field"] },
    ...Object.fromEntries(FIGHTER_SKILL_SPECS.map((skill) => [skill.id, {
      classId: "fighter",
      speedGrade: skill.speedGrade,
      prerequisites: skill.prerequisites,
      ...(skill.targetArc ? { targetArc: skill.targetArc } : {}),
      treeGroup: skill.treeGroup,
      treeColumn: skill.treeColumn,
      treeRow: skill.treeRow,
    }])),
  });

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function wholeNumber(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
    return Math.min(max, Math.max(min, Math.floor(finiteNumber(value, fallback))));
  }

  function validStar(value) {
    const star = Math.trunc(Number(value));
    return BOOK_STARS.includes(star) ? star : null;
  }

  function normalizeClassId(value, fallback = DEFAULT_CLASS_ID) {
    const id = String(value || "").trim().toLowerCase();
    return CLASS_IDS.includes(id) ? id : fallback;
  }

  function bookStarForQuestLevel(level) {
    const safeLevel = wholeNumber(level, 1, 1, 999);
    return safeLevel >= 10 ? 3 : safeLevel >= 5 ? 2 : 1;
  }

  function validCell(cell) {
    return Boolean(cell) && Number.isFinite(Number(cell.x)) && Number.isFinite(Number(cell.y));
  }

  function copyCell(cell) {
    return { x: Math.trunc(Number(cell.x)), y: Math.trunc(Number(cell.y)) };
  }

  function cellKey(cell) {
    return `${cell.x},${cell.y}`;
  }

  function sameCell(left, right) {
    return Boolean(left && right && Number(left.x) === Number(right.x) && Number(left.y) === Number(right.y));
  }

  function manhattan(a, b) {
    if (!validCell(a) || !validCell(b)) return Infinity;
    return Math.abs(Math.trunc(Number(a.x)) - Math.trunc(Number(b.x)))
      + Math.abs(Math.trunc(Number(a.y)) - Math.trunc(Number(b.y)));
  }

  function cloneSkill(source) {
    const progression = SKILL_PROGRESSION[source.id] || {};
    const selfTargeted = source.area?.shape === "self" || source.targeting?.team === "self";
    const targetArc = Array.isArray(progression.targetArc)
      ? progression.targetArc
      : selfTargeted ? ["self"] : DEFAULT_TARGET_ARC;
    return {
      id: String(source.id || ""),
      name: String(source.name || ""),
      description: String(source.description || ""),
      star: Math.trunc(Number(source.star)),
      apCost: Math.trunc(Number(source.apCost)),
      range: { ...(source.range || {}) },
      rangeCellsRelative: Array.isArray(source.rangeCellsRelative)
        ? source.rangeCellsRelative.map((cell) => [...cell]) : null,
      heightDifference: source.heightDifference ? { ...source.heightDifference } : null,
      area: { ...(source.area || {}) },
      effectArea: source.effectArea ? { ...source.effectArea } : null,
      power: finiteNumber(source.power),
      effects: Array.isArray(source.effects) ? source.effects.map((effect) => ({ ...effect })) : [],
      targeting: { ...(source.targeting || {}) },
      tags: Array.isArray(source.tags) ? [...source.tags].map(String) : [],
      poolWeight: finiteNumber(source.poolWeight),
      pool: { star: Math.trunc(Number(source.star)), weight: finiteNumber(source.poolWeight) },
      classId: normalizeClassId(progression.classId),
      speedGrade: String(progression.speedGrade || "F").toUpperCase(),
      prerequisites: Array.isArray(progression.prerequisites) ? progression.prerequisites.map(String) : [],
      targetArc: targetArc.map(String),
      treeGroup: String(progression.treeGroup || ""),
      treeColumn: Number.isInteger(progression.treeColumn) ? progression.treeColumn : null,
      treeRow: Number.isInteger(progression.treeRow) ? progression.treeRow : null,
      ap: source.ap ?? null,
      interrupt: source.interrupt ?? null,
      durability: source.durability ?? null,
      type: source.type || null,
      category: source.category || null,
      sourceNameJa: source.sourceNameJa || null,
      requiresStatus: source.requiresStatus || null,
      sourceNote: source.sourceNote || null,
      requirements: source.requirements || null,
      originalReference: source.originalReference ? { ...source.originalReference } : null,
      everrealm: source.everrealm ? { ...source.everrealm } : null,
      actionKind: source.actionKind || null,
      dealsDamage: source.dealsDamage === true,
      deliveryMode: source.deliveryMode || null,
      pathMode: source.pathMode || null,
      blocksByTerrain: source.blocksByTerrain === true,
      blocksByUnits: source.blocksByUnits === true,
      stopOnFirstUnit: source.stopOnFirstUnit === true,
      utilityEffects: Array.isArray(source.utilityEffects) ? source.utilityEffects.map((effect) => ({ ...effect })) : [],
      damage: source.damage ? { ...source.damage } : null,
      hitResolution: source.hitResolution ? { ...source.hitResolution } : null,
      sourceHitJudgement: source.sourceHitJudgement || null,
      guildBookStars: Array.isArray(source.guildBookStars) ? source.guildBookStars.map((star) => Math.trunc(Number(star))).filter((star) => star > 0) : [],
    };
  }

  // Skill-book ranks use the source notation: four minor stars lead into one
  // major star, then the pattern repeats. Keep this formatter in the shared
  // skill module so commission cards, inventory, toasts and battle labels
  // cannot drift into separate glyph conventions.
  function formatSkillBookRank(value) {
    const rank = wholeNumber(value, 1, 1, MAX_SKILL_BOOK_RANK);
    return "★".repeat(Math.floor(rank / 5)) + "☆".repeat(rank % 5);
  }

  const SKILL_CATALOG = deepFreeze(RAW_SKILLS.map(cloneSkill));
  const SKILLS_BY_ID = new Map(SKILL_CATALOG.map((skill) => [skill.id, skill]));

  function canonicalSkillId(value) {
    const id = String(value || "").trim();
    return LEGACY_ID_ALIASES[id] || id;
  }

  function idsEquivalent(left, right) {
    return canonicalSkillId(left) === canonicalSkillId(right);
  }

  function stateHasSkill(unlocked, skillId) {
    const canonical = canonicalSkillId(skillId);
    return (Array.isArray(unlocked) ? unlocked : []).some((id) => canonicalSkillId(id) === canonical);
  }

  const LEGACY_SKILL_ALIASES = new Map();
  for (const [legacyId, canonicalId] of Object.entries(LEGACY_ID_ALIASES)) {
    const canonical = SKILLS_BY_ID.get(canonicalId);
    if (!canonical) continue;
    const legacyPrerequisites = canonical.prerequisites.map((id) => CANONICAL_ID_ALIASES[id] || id);
    // Preserve the old API's independent side-job roots while the promoted
    // canonical tree keeps the explicit source edge back to 正拳. This only
    // applies to legacy ids; the current catalog remains canonical.
    if (legacyId === "defense_stance" || legacyId === "paralysis_release") legacyPrerequisites.length = 0;
    const legacyEffects = legacyId === "roar"
      ? [{ type: "move_down", amount: 2, duration: 1 }]
      : canonical.effects;
    LEGACY_SKILL_ALIASES.set(legacyId, deepFreeze({
      ...canonical,
      id: legacyId,
      // The old imported catalog labelled rising_knuckle as a two-star
      // manual. Keep that presentation for old callers; canonical `rendan`
      // uses the current AP-band pool classification.
      ...(legacyId === "rising_knuckle" ? { star: 2, pool: { ...canonical.pool, star: 2 } } : {}),
      prerequisites: legacyPrerequisites,
      effects: legacyEffects,
      range: { ...canonical.range },
      targetArc: legacyId === "backfist" ? ["rear"] : canonical.targetArc,
      // Old callers used a broad one-cell arc for the legacy names.  Keep
      // those calls working while canonical ids use exact authored cells.
      legacyAlias: true,
    }));
  }

  function getSkill(skillOrId) {
    if (typeof skillOrId === "string") return SKILLS_BY_ID.get(skillOrId) || LEGACY_SKILL_ALIASES.get(skillOrId) || null;
    if (skillOrId && typeof skillOrId === "object") return skillOrId;
    return null;
  }

  function getSkillsByStar(star, classOrOptions) {
    const safeStar = validStar(star);
    if (!safeStar) return [];
    const requestedClass = typeof classOrOptions === "string"
      ? normalizeClassId(classOrOptions, null)
      : classOrOptions && classOrOptions.classId != null
        ? normalizeClassId(classOrOptions.classId, null)
        : null;
    return SKILL_CATALOG.filter((skill) => skill.star === safeStar && (!requestedClass || skill.classId === requestedClass));
  }

  function getSkillsByClass(classId) {
    const safeClass = normalizeClassId(classId, null);
    return safeClass ? SKILL_CATALOG.filter((skill) => skill.classId === safeClass) : [];
  }

  // Guild envelope ranks are owned by the canonical Fighter acquisition data,
  // not by Guild. They intentionally remain separate from the existing
  // one-to-three-star runtime book rarity used by the original skill-book UI.
  function getFighterGuildBookPool(star) {
    const safeStar = Math.trunc(Number(star));
    if (safeStar < 1 || safeStar > 5) return [];
    return SKILL_CATALOG.filter((skill) => skill.classId === "fighter" && skill.guildBookStars.includes(safeStar));
  }

  function speedGradeIndex(value) {
    const index = SPEED_GRADES.indexOf(String(value || "").toUpperCase());
    return index >= 0 ? index : SPEED_GRADES.length;
  }

  function compareSpeedGrades(left, right) {
    return speedGradeIndex(left) - speedGradeIndex(right);
  }

  function cardinalDirection(origin, target) {
    if (!validCell(origin) || !validCell(target)) return null;
    const dx = Math.trunc(Number(target.x)) - Math.trunc(Number(origin.x));
    const dy = Math.trunc(Number(target.y)) - Math.trunc(Number(origin.y));
    if (dx === 0 && dy === 0) return null;
    if (Math.abs(dx) >= Math.abs(dy)) return { x: Math.sign(dx), y: 0 };
    return { x: 0, y: Math.sign(dy) };
  }

  function isCardinallyAligned(origin, target) {
    if (!validCell(origin) || !validCell(target)) return false;
    const dx = Math.trunc(Number(target.x)) - Math.trunc(Number(origin.x));
    const dy = Math.trunc(Number(target.y)) - Math.trunc(Number(origin.y));
    return (dx === 0) !== (dy === 0);
  }

  function facingRelativeCell(origin, target, facing = "down") {
    const dx = Math.trunc(Number(target.x)) - Math.trunc(Number(origin.x));
    const dy = Math.trunc(Number(target.y)) - Math.trunc(Number(origin.y));
    switch (String(facing || "down").toLowerCase()) {
      case "up": return [-dx, -dy];
      case "right": return [dy, dx];
      case "left": return [-dy, -dx];
      default: return [dx, dy];
    }
  }

  function worldCellFromRelative(origin, relative, facing = "down") {
    const lateral = Number(relative?.[0]) || 0;
    const depth = Number(relative?.[1]) || 0;
    let dx = lateral;
    let dy = depth;
    switch (String(facing || "down").toLowerCase()) {
      case "up": dx = -lateral; dy = -depth; break;
      case "right": dx = depth; dy = lateral; break;
      case "left": dx = -depth; dy = -lateral; break;
      default: break;
    }
    return { x: Math.trunc(Number(origin.x)) + dx, y: Math.trunc(Number(origin.y)) + dy };
  }

  function exactRangeCells(skill, origin, facing = "down") {
    const relative = skill?.rangeCellsRelative || skill?.range?.rangeCellsRelative;
    if (!Array.isArray(relative)) return null;
    return relative.map((cell) => worldCellFromRelative(origin, cell, facing));
  }

  function isTargetInRange(skillOrId, origin, target, options = {}) {
    const skill = getSkill(skillOrId);
    if (!skill || !validCell(origin) || !validCell(target)) return false;
    // Authored relative cells are the complete geometry, including for
    // compatibility aliases.  An alias may change the public id or target
    // arc, but it must never widen a canonical Fighter range into a generic
    // adjacent-cell fallback.
    const exact = exactRangeCells(skill, origin, options.facing || "down");
    if (exact) return exact.some((cell) => sameCell(cell, target));
    if (skill.range?.type === "unknown" || skill.range?.min == null || skill.range?.max == null) return false;
    const min = wholeNumber(skill.range && skill.range.min);
    const max = wholeNumber(skill.range && skill.range.max);
    const dx = Math.abs(Math.trunc(Number(target.x)) - Math.trunc(Number(origin.x)));
    const dy = Math.abs(Math.trunc(Number(target.y)) - Math.trunc(Number(origin.y)));
    // Happiness Online-style one-cell melee reaches the forward and side
    // diagonals as well as the three cardinal front/side cells.  Facing-arc
    // validation still removes the three cells behind the actor.
    const distance = skill.tags?.includes("melee") && max === 1 ? Math.max(dx, dy) : dx + dy;
    if (distance < min || distance > max) return false;
    if (skill.area && skill.area.shape === "self" && distance !== 0) return false;
    if (skill.targeting && skill.targeting.requiresCardinal && !isCardinallyAligned(origin, target)) return false;
    return true;
  }

  function boundsFromOptions(options) {
    const grid = options && options.grid;
    const width = wholeNumber(grid && grid.width, wholeNumber(options && options.width));
    const height = wholeNumber(grid && grid.height, wholeNumber(options && options.height));
    return width > 0 && height > 0 ? { width, height } : null;
  }

  function cellInside(cell, bounds) {
    return !bounds || (cell.x >= 0 && cell.y >= 0 && cell.x < bounds.width && cell.y < bounds.height);
  }

  function patternCells(skillOrId, origin, target, options = {}) {
    const skill = getSkill(skillOrId);
    if (!skill || !validCell(origin) || !validCell(target)) return [];
    const from = copyCell(origin);
    const aim = copyCell(target);
    const area = skill.area || { shape: "single" };
    const cells = [];
    if (area.shape === "self") {
      cells.push(from);
    } else if (area.shape === "single") {
      cells.push(aim);
    } else if (area.shape === "relative_cells" || area.shape === "impact_area") {
      for (const relative of area.relativeCells || []) cells.push(worldCellFromRelative(from, relative, options.facing || "down"));
    } else if (area.shape === "line_to_target") {
      const direction = facingRelativeCell(from, aim, options.facing || "down");
      const route = orthogonalRelativePath(direction[0], direction[1]);
      for (const relative of route) cells.push(worldCellFromRelative(from, relative, options.facing || "down"));
    } else if (area.shape === "cross") {
      const radius = wholeNumber(area.radius, 1, 1, 20);
      cells.push(aim);
      for (let step = 1; step <= radius; step += 1) {
        cells.push(
          { x: aim.x, y: aim.y - step },
          { x: aim.x - step, y: aim.y },
          { x: aim.x + step, y: aim.y },
          { x: aim.x, y: aim.y + step },
        );
      }
    } else if (area.shape === "radius") {
      const radius = wholeNumber(area.radius, 1, 1, 20);
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (Math.abs(dx) + Math.abs(dy) <= radius) cells.push({ x: aim.x + dx, y: aim.y + dy });
        }
      }
    } else if (area.shape === "line" || area.shape === "cone") {
      const direction = cardinalDirection(from, aim) || (skill.targeting.team === "self"
        ? { up: { x: 0, y: -1 }, right: { x: 1, y: 0 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 } }[options.facing || "right"]
        : null);
      if (!direction) return [];
      const perpendicular = { x: -direction.y, y: direction.x };
      const length = wholeNumber(area.length, skill.range && skill.range.max, 1, 20);
      const width = wholeNumber(area.width, 1, 0, 10);
      for (let depth = 1; depth <= length; depth += 1) {
        const center = { x: from.x + direction.x * depth, y: from.y + direction.y * depth };
        if (area.shape === "line") {
          cells.push(center);
          continue;
        }
        const spread = Math.min(width, depth - 1);
        for (let lateral = -spread; lateral <= spread; lateral += 1) {
          cells.push({
            x: center.x + perpendicular.x * lateral,
            y: center.y + perpendicular.y * lateral,
          });
        }
      }
    }

    const bounds = boundsFromOptions(options);
    const result = [];
    const seen = new Set();
    for (const cell of cells) {
      if (!cellInside(cell, bounds)) continue;
      const key = cellKey(cell);
      if (seen.has(key)) continue;
      seen.add(key);
      if (options.excludeBlocked && isBlockedCell(cell, options)) continue;
      result.push(cell);
    }
    return result;
  }

  function isBlockedCell(cell, options) {
    const grid = options && options.grid;
    if (grid && typeof grid.isBlocked === "function") return Boolean(grid.isBlocked(copyCell(cell)));
    const blocked = grid && grid.blocked != null ? grid.blocked : options && options.blocked;
    if (blocked instanceof Set) return blocked.has(cellKey(cell));
    if (Array.isArray(blocked)) {
      return blocked.some((value) => typeof value === "string"
        ? value === cellKey(cell)
        : validCell(value) && cellKey(copyCell(value)) === cellKey(cell));
    }
    return false;
  }

  function orthogonalRelativePath(lateral, depth) {
    const path = [];
    let x = 0;
    let y = 0;
    const horizontal = Math.sign(lateral);
    const forward = Math.sign(depth);
    if (depth > 0) {
      while (y < depth) { y += 1; path.push([x, y]); }
      while (x !== lateral) { x += horizontal; path.push([x, y]); }
    } else if (depth < 0) {
      while (x !== lateral) { x += horizontal; path.push([x, y]); }
      while (y > depth) { y -= 1; path.push([x, y]); }
    } else {
      while (x !== lateral) { x += horizontal; path.push([x, y]); }
    }
    return path;
  }

  function heightValue(cell, context = {}) {
    if (!cell) return 0;
    if (Number.isFinite(Number(cell.height))) return Number(cell.height);
    const getter = context.heightAt || context.grid?.heightAt;
    if (typeof getter === "function") return finiteNumber(getter(copyCell(cell)), 0);
    const map = context.heightMap || context.grid?.heightMap || context.battlefield?.heightMap;
    if (map && typeof map === "object") return finiteNumber(map[cellKey(cell)], 0);
    return 0;
  }

  function hasHeightContext(context = {}) {
    return Boolean(context.heightAt || context.grid?.heightAt || context.heightMap || context.grid?.heightMap || context.battlefield?.heightMap);
  }

  function heightValidation(skillOrId, origin, target, context = {}) {
    const skill = getSkill(skillOrId);
    const rule = skill?.heightDifference;
    if (!skill || !rule || rule.status === "not_applicable") return { ok: true, reason: null, delta: 0 };
    const delta = heightValue(target, context) - heightValue(origin, context);
    const hasContext = hasHeightContext(context);
    if (!hasContext) return { ok: true, reason: null, delta, uncertain: rule.status === "uncertain" };
    if (rule.status === "uncertain" && delta !== 0) return { ok: false, reason: "height-uncertain", delta, uncertain: true };
    if (rule.status === "uncertain_up" && delta > 0) return { ok: false, reason: "height-uncertain", delta, uncertain: true };
    const up = rule.up == null ? null : rule.up === "unlimited" ? Infinity : Number(rule.up);
    const down = rule.down == null ? null : rule.down === "unlimited" ? Infinity : Number(rule.down);
    if (delta > 0 && up == null) return { ok: false, reason: "height-uncertain", delta, uncertain: true };
    if (delta < 0 && down == null) return { ok: false, reason: "height-uncertain", delta, uncertain: true };
    if (up != null && delta > up) return { ok: false, reason: "height-out-of-range", delta };
    if (down != null && -delta > down) return { ok: false, reason: "height-out-of-range", delta };
    return { ok: true, reason: null, delta };
  }

  function isSkillHeightValid(skillOrId, origin, target, context = {}) {
    return heightValidation(skillOrId, origin, target, context).ok;
  }

  function validateSkillTarget(skillOrId, origin, target, context = {}) {
    const skill = getSkill(skillOrId);
    if (!skill) return { ok: false, reason: "skill-not-found", cells: [] };
    if (!validCell(origin) || !validCell(target)) return { ok: false, reason: "invalid-cell", cells: [] };
    if (!isTargetInRange(skill, origin, target, context)) {
      const hasExactRange = Array.isArray(skill.rangeCellsRelative || skill.range?.rangeCellsRelative);
      return { ok: false, reason: hasExactRange ? "out-of-range" : skill.range?.type === "unknown" ? "range-uncertain" : "out-of-range", cells: [] };
    }
    const height = heightValidation(skill, origin, target, context);
    if (!height.ok) return { ok: false, reason: height.reason, cells: [], height: height.delta };
    const bounds = boundsFromOptions(context);
    if (bounds && (!cellInside(copyCell(origin), bounds) || !cellInside(copyCell(target), bounds))) {
      return { ok: false, reason: "outside-grid", cells: [] };
    }
    const targetUnit = context.targetUnit || null;
    if (skill.targeting.mode === "unit" && !targetUnit && !skill.targeting.allowsEmpty) {
      return { ok: false, reason: "empty-target", cells: [] };
    }
    if (targetUnit && context.actorTeam != null && targetUnit.team != null) {
      const sameTeam = String(targetUnit.team) === String(context.actorTeam);
      if (skill.targeting.team === "enemy" && sameTeam) return { ok: false, reason: "wrong-team", cells: [] };
      if (skill.targeting.team === "ally" && !sameTeam) return { ok: false, reason: "wrong-team", cells: [] };
      if (skill.targeting.team === "self" && context.actorId != null && String(targetUnit.id) !== String(context.actorId)) {
        return { ok: false, reason: "self-only", cells: [] };
      }
    }
    const cells = patternCells(skill, origin, target, context);
    return cells.length
      ? { ok: true, reason: null, cells }
      : { ok: false, reason: "empty-pattern", cells: [] };
  }

  function uniqueValidSkillIds(values, classId = null) {
    const result = [];
    const seen = new Set();
    for (const value of Array.isArray(values) ? values : []) {
      const id = String(value || "").trim();
      const skill = getSkill(id);
      const canonical = canonicalSkillId(id);
      if (!skill || (classId && skill.classId !== classId) || seen.has(canonical)) continue;
      seen.add(canonical);
      result.push(id);
    }
    return result;
  }

  function normalizeCountMap(source) {
    const result = {};
    if (!source || typeof source !== "object") return result;
    for (const [rawId, rawCount] of Object.entries(source)) {
      const id = String(rawId || "").trim();
      if (!getSkill(id)) continue;
      const count = wholeNumber(rawCount);
      if (count > 0) result[id] = count;
    }
    return result;
  }

  function normalizeBookCounts(source) {
    const result = { 1: 0, 2: 0, 3: 0 };
    if (!source || typeof source !== "object") return result;
    for (const star of BOOK_STARS) result[star] = wholeNumber(source[star] ?? source[String(star)]);
    return result;
  }

  function normalizeManualCounts(source) {
    const result = {};
    if (Array.isArray(source)) {
      for (const item of source) {
        const id = typeof item === "string" ? item : String(item && (item.skillId || item.id) || "");
        if (!getSkill(id)) continue;
        const quantity = typeof item === "string" ? 1 : wholeNumber(item.quantity ?? item.count, 1);
        if (quantity > 0) result[id] = Math.min(9999, wholeNumber(result[id]) + quantity);
      }
      return result;
    }
    if (!source || typeof source !== "object") return result;
    for (const [rawId, rawCount] of Object.entries(source)) {
      const id = String(rawId || "").trim();
      if (!getSkill(id)) continue;
      const count = wholeNumber(rawCount);
      if (count > 0) result[id] = Math.min(9999, count);
    }
    return result;
  }

  function inferClassId(source, options) {
    const supplied = options.classId ?? source.classId ?? source.playerClass ?? source.jobClass;
    if (supplied != null) return normalizeClassId(supplied);
    const oldUnlocks = Array.isArray(source.unlockedSkillIds) ? source.unlockedSkillIds : source.unlocked;
    const valid = uniqueValidSkillIds(oldUnlocks);
    const hasFighter = valid.some((id) => getSkill(id).classId === "fighter");
    const hasWarrior = valid.some((id) => getSkill(id).classId === "warrior");
    return hasFighter && !hasWarrior ? "fighter" : DEFAULT_CLASS_ID;
  }

  function deckIds(slots) {
    return (Array.isArray(slots) ? slots : []).filter(Boolean);
  }

  function normalizeDeckSlots(values, capacity, unlockedSet, classId) {
    const slots = Array.from({ length: capacity }, () => null);
    const seen = new Set();
    for (let index = 0; index < Math.min(capacity, Array.isArray(values) ? values.length : 0); index += 1) {
      const value = values[index];
      const id = String(value && typeof value === "object" ? value.skillId || value.id || "" : value || "");
      const skill = getSkill(id);
      if (!skill || skill.classId !== classId || skill.tags.includes("passive") || !stateHasSkill([...unlockedSet], id) || seen.has(canonicalSkillId(id))) continue;
      slots[index] = id;
      seen.add(canonicalSkillId(id));
    }
    return slots;
  }

  function normalizeDeckUpgradeMilestones(values) {
    const normalized = [];
    const seen = new Set();
    for (const value of Array.isArray(values) ? values : []) {
      const id = String(value || "").trim();
      if (!Object.hasOwn(DECK_CAPACITY_MILESTONES, id) || seen.has(id)) continue;
      seen.add(id);
      normalized.push(id);
    }
    return normalized;
  }

  function normalizeSkillState(rawState, options = {}) {
    const source = rawState && typeof rawState === "object" ? rawState : {};
    const classId = inferClassId(source, options);
    const starterSource = options.starterSkills === false
      ? []
      : Array.isArray(options.starterSkills) ? options.starterSkills : COMPATIBILITY_STARTER_SKILLS[classId] || CLASS_STARTER_SKILLS[classId];
    const suppliedUnlocks = Array.isArray(source.unlockedSkillIds)
      ? source.unlockedSkillIds
      : Array.isArray(source.unlocked) ? source.unlocked : null;
    let unlockedSkillIds = uniqueValidSkillIds(suppliedUnlocks == null ? starterSource : suppliedUnlocks, classId);
    if (!unlockedSkillIds.length && options.ensureStarter !== false) unlockedSkillIds = uniqueValidSkillIds(starterSource, classId);
    const unlockedSet = new Set(unlockedSkillIds);
    const suppliedEquipped = Array.isArray(source.equippedSkillIds)
      ? source.equippedSkillIds
      : Array.isArray(source.equipped) ? source.equipped : null;
    const oldDeckSize = Array.isArray(source.deckSlots) && source.deckSlots.length
      ? source.deckSlots.length
      : Array.isArray(suppliedEquipped) ? suppliedEquipped.length : 0;
    const hasExplicitCapacity = source.deckCapacity != null || options.deckCapacity != null;
    const deckUpgradeMilestones = normalizeDeckUpgradeMilestones(source.deckUpgradeMilestones);
    const milestoneCapacity = deckUpgradeMilestones.reduce(
      (capacity, id) => Math.max(capacity, DECK_CAPACITY_MILESTONES[id]),
      STARTING_DECK_CAPACITY,
    );
    const requestedCapacity = options.deckCapacity ?? source.deckCapacity
      ?? source.maxEquippedSkills ?? (oldDeckSize > STARTING_DECK_CAPACITY ? oldDeckSize : STARTING_DECK_CAPACITY);
    const deckCapacity = wholeNumber(
      Math.max(finiteNumber(requestedCapacity, STARTING_DECK_CAPACITY), milestoneCapacity),
      STARTING_DECK_CAPACITY,
      STARTING_DECK_CAPACITY,
      MAX_EQUIPPED_SKILLS,
    );
    let slotSource = Array.isArray(source.deckSlots)
      ? source.deckSlots
      : suppliedEquipped == null ? unlockedSkillIds : suppliedEquipped;
    let deckSlots = normalizeDeckSlots(slotSource, deckCapacity, unlockedSet, classId);
    if (!deckIds(deckSlots).length && unlockedSkillIds.length && options.ensureEquipped !== false) {
      deckSlots = normalizeDeckSlots(unlockedSkillIds, deckCapacity, unlockedSet, classId);
    }
    // Old saves only stored a flat equipped list. Preserve up to six existing slots
    // by inferring their previous capacity, while every genuinely new save starts at three.
    if (!hasExplicitCapacity && oldDeckSize > deckCapacity) slotSource = slotSource.slice(0, deckCapacity);
    return {
      skillSchemaVersion: 2,
      classId,
      unlockedSkillIds,
      deckCapacity,
      deckUpgradeMilestones,
      deckSlots,
      equippedSkillIds: deckIds(deckSlots),
      masteryShards: wholeNumber(source.masteryShards, 0, 0, 999999),
      duplicateCounts: normalizeCountMap(source.duplicateCounts),
      books: normalizeBookCounts(source.books || source.skillBooks),
      manualCounts: normalizeManualCounts(source.manualCounts || source.skillManuals || source.manuals || source.manualItems),
      drawSerial: wholeNumber(source.drawSerial, 0, 0, 999999999),
    };
  }

  function createSkillState(options = {}) {
    return normalizeSkillState(null, options);
  }

  function cloneState(state) {
    return {
      ...state,
      unlockedSkillIds: [...state.unlockedSkillIds],
      equippedSkillIds: [...state.equippedSkillIds],
      deckSlots: [...state.deckSlots],
      deckUpgradeMilestones: [...state.deckUpgradeMilestones],
      duplicateCounts: { ...state.duplicateCounts },
      books: { ...state.books },
      manualCounts: { ...state.manualCounts },
    };
  }

  function withDeckSlots(state, slots) {
    const next = cloneState(state);
    next.deckSlots = Array.from({ length: state.deckCapacity }, (_, index) => slots[index] || null);
    next.equippedSkillIds = deckIds(next.deckSlots);
    return next;
  }

  function setEquippedSkills(rawState, skillIds) {
    const state = normalizeSkillState(rawState);
    const unlocked = new Set(state.unlockedSkillIds);
    const requested = uniqueValidSkillIds(skillIds, state.classId);
    const passiveId = requested.find((id) => getSkill(id)?.tags.includes("passive"));
    if (passiveId) return { ok: false, reason: "passive", skillId: passiveId, state };
    const lockedId = requested.find((id) => !stateHasSkill([...unlocked], id));
    if (lockedId) return { ok: false, reason: "locked", skillId: lockedId, state };
    if (requested.length > state.deckCapacity) return { ok: false, reason: "full", capacity: state.deckCapacity, state };
    const slots = [...requested, ...Array.from({ length: state.deckCapacity - requested.length }, () => null)];
    return { ok: true, reason: null, state: withDeckSlots(state, slots) };
  }

  function equipSkill(rawState, skillId, slot) {
    const state = normalizeSkillState(rawState);
    const id = String(skillId || "");
    const skill = getSkill(id);
    if (!skill) return { ok: false, reason: "not-found", state };
    if (skill.classId !== state.classId) return { ok: false, reason: "wrong-class", state };
    if (skill.tags.includes("passive")) return { ok: false, reason: "passive", state };
    if (!stateHasSkill(state.unlockedSkillIds, id)) return { ok: false, reason: "locked", state };
    const slots = [...state.deckSlots];
    const existingIndex = slots.findIndex((slotId) => idsEquivalent(slotId, id));
    if (slot == null) {
      if (existingIndex >= 0) return { ok: false, reason: "already-equipped", state };
      const emptyIndex = slots.indexOf(null);
      if (emptyIndex < 0) return { ok: false, reason: "full", capacity: state.deckCapacity, state };
      slots[emptyIndex] = id;
    } else {
      const index = Math.trunc(Number(slot));
      if (!Number.isFinite(index) || index < 0 || index >= state.deckCapacity) {
        return { ok: false, reason: "invalid-slot", state };
      }
      if (existingIndex >= 0 && existingIndex !== index) slots[existingIndex] = null;
      slots[index] = id;
    }
    return {
      ok: true,
      reason: null,
      state: withDeckSlots(state, slots),
    };
  }

  function unequipSkill(rawState, skillId) {
    const state = normalizeSkillState(rawState);
    const id = String(skillId || "");
    const index = state.deckSlots.findIndex((slotId) => idsEquivalent(slotId, id));
    if (index < 0) return { ok: false, reason: "not-equipped", state };
    const slots = [...state.deckSlots];
    slots[index] = null;
    return {
      ok: true,
      reason: null,
      state: withDeckSlots(state, slots),
    };
  }

  function upgradeDeckCapacity(rawState, amount = 1) {
    const state = normalizeSkillState(rawState);
    const increase = wholeNumber(amount, 1, 1, MAX_EQUIPPED_SKILLS);
    if (state.deckCapacity >= MAX_EQUIPPED_SKILLS) {
      return { ok: false, reason: "max-capacity", capacity: state.deckCapacity, state };
    }
    const nextCapacity = Math.min(MAX_EQUIPPED_SKILLS, state.deckCapacity + increase);
    const next = cloneState(state);
    next.deckCapacity = nextCapacity;
    next.deckSlots = [...state.deckSlots, ...Array.from({ length: nextCapacity - state.deckCapacity }, () => null)];
    next.equippedSkillIds = deckIds(next.deckSlots);
    return {
      ok: true,
      reason: null,
      added: nextCapacity - state.deckCapacity,
      capacity: nextCapacity,
      state: next,
    };
  }

  function awardDeckCapacityMilestone(rawState, milestoneId) {
    const state = normalizeSkillState(rawState);
    const id = String(milestoneId || "").trim();
    if (!Object.hasOwn(DECK_CAPACITY_MILESTONES, id)) {
      return { ok: false, awarded: false, reason: "unknown-milestone", milestoneId: id, state };
    }
    const targetCapacity = DECK_CAPACITY_MILESTONES[id];
    if (state.deckUpgradeMilestones.includes(id)) {
      return {
        ok: true,
        awarded: false,
        reason: "already-awarded",
        milestoneId: id,
        targetCapacity,
        capacity: state.deckCapacity,
        state,
      };
    }
    const next = cloneState(state);
    next.deckUpgradeMilestones.push(id);
    const previousCapacity = next.deckCapacity;
    next.deckCapacity = Math.max(previousCapacity, targetCapacity);
    if (next.deckSlots.length < next.deckCapacity) {
      next.deckSlots.push(...Array.from({ length: next.deckCapacity - next.deckSlots.length }, () => null));
    }
    next.equippedSkillIds = deckIds(next.deckSlots);
    return {
      ok: true,
      awarded: true,
      reason: null,
      milestoneId: id,
      targetCapacity,
      added: next.deckCapacity - previousCapacity,
      capacity: next.deckCapacity,
      state: next,
    };
  }

  function skillLearnability(rawState, skillId, options = {}) {
    const state = normalizeSkillState(rawState, {
      ...(options.classId ? { classId: options.classId } : {}),
      ...(options.starterSkills !== undefined ? { starterSkills: options.starterSkills } : {}),
      ...(options.ensureStarter !== undefined ? { ensureStarter: options.ensureStarter } : {}),
    });
    const skill = getSkill(String(skillId || ""));
    if (!skill) return { status: "conditionLocked", reason: "not-found", skill: null, state, missingPrerequisites: [] };
    if (skill.classId !== state.classId) return { status: "conditionLocked", reason: "wrong-class", skill, state, missingPrerequisites: [] };
    if (stateHasSkill(state.unlockedSkillIds, skill.id)) return { status: "learned", reason: null, skill, state, missingPrerequisites: [] };
    const missingPrerequisites = skill.prerequisites.filter((id) => !stateHasSkill(state.unlockedSkillIds, id));
    if (missingPrerequisites.length) return { status: "missingPrereq", reason: "missing-prerequisite", skill, state, missingPrerequisites };
    if (options.conditionMet === false) return { status: "conditionLocked", reason: "condition-locked", skill, state, missingPrerequisites: [] };
    return { status: "canLearn", reason: null, skill, state, missingPrerequisites: [] };
  }

  function effectiveSpeedGradeIndex(action) {
    const rawIndex = speedGradeIndex(action.speedGrade);
    const bonus = Math.max(0, Math.floor(finiteNumber(action.actionSpeedBonus ?? action.speedBonus, 0)));
    return Math.max(0, rawIndex - bonus);
  }

  function orderActionsBySpeed(actions) {
    return (Array.isArray(actions) ? actions : [])
      .map((action, index) => ({ ...action, _stableOrder: index }))
      .sort((left, right) => effectiveSpeedGradeIndex(left) - effectiveSpeedGradeIndex(right)
        || finiteNumber(left.weight, 0) - finiteNumber(right.weight, 0)
        || finiteNumber(right.initiative) - finiteNumber(left.initiative)
        || String(left.actorId || "").localeCompare(String(right.actorId || ""))
        || left._stableOrder - right._stableOrder)
      .map(({ _stableOrder, ...action }) => action);
  }

  function calculateSkillDamageMultiplier(skillOrId) {
    const skill = getSkill(skillOrId);
    if (!skill || !skill.dealsDamage) return 0;
    if (Number.isFinite(Number(skill.damage?.final_total_multiplier))) return Number(skill.damage.final_total_multiplier);
    const damageEffect = (skill.effects || []).find((effect) => effect.type === "damage");
    return Number(damageEffect?.scale ?? skill.power) || 0;
  }

  // The authored multiplier is the total skill output.  Remainders are put
  // on later hits so a two/three/five-hit combo never silently deals the full
  // skill multiplier once per hit.
  function splitDamageLaterHits(totalDamage, hitCount = 1) {
    const count = Math.max(1, Math.trunc(Number(hitCount) || 1));
    const total = Math.max(0, Math.trunc(Number(totalDamage) || 0));
    const base = Math.floor(total / count);
    const remainder = total - base * count;
    return Array.from({ length: count }, (_, index) => base + (index >= count - remainder ? 1 : 0));
  }

  function hashString(value) {
    const text = String(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let value = seed >>> 0;
    return function random() {
      value = (value + 0x6D2B79F5) >>> 0;
      let mixed = value;
      mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  function drawSeedParts(seedOrSerial, fallbackSerial = 0) {
    if (seedOrSerial && typeof seedOrSerial === "object") {
      return {
        seed: String(seedOrSerial.seed == null ? "mist-harbour-skill-book" : seedOrSerial.seed),
        serial: wholeNumber(seedOrSerial.serial, fallbackSerial),
      };
    }
    if (typeof seedOrSerial === "number") {
      return { seed: "mist-harbour-skill-book", serial: wholeNumber(seedOrSerial) };
    }
    return {
      seed: String(seedOrSerial == null ? "mist-harbour-skill-book" : seedOrSerial),
      serial: wholeNumber(fallbackSerial),
    };
  }

  function drawSkillFromBook(bookStar, seedOrSerial, fallbackSerial = 0) {
    const star = validStar(bookStar);
    if (!star) return null;
    const requestedClass = seedOrSerial && typeof seedOrSerial === "object" ? seedOrSerial.classId : null;
    const pool = getSkillsByStar(star, requestedClass ? { classId: requestedClass } : null);
    if (!pool.length) return null;
    const parts = drawSeedParts(seedOrSerial, fallbackSerial);
    const random = mulberry32(hashString(`${parts.seed}|${star}|${parts.serial}`));
    const totalWeight = pool.reduce((total, skill) => total + Math.max(0, skill.poolWeight), 0);
    if (totalWeight <= 0) return pool[Math.floor(random() * pool.length)] || pool[0];
    let roll = random() * totalWeight;
    for (const skill of pool) {
      roll -= Math.max(0, skill.poolWeight);
      if (roll < 0) return skill;
    }
    return pool[pool.length - 1];
  }

  function drawFighterGuildSkillBook(star, seedOrSerial, fallbackSerial = 0) {
    const pool = getFighterGuildBookPool(star);
    if (!pool.length) return null;
    const parts = drawSeedParts(seedOrSerial, fallbackSerial);
    const safeStar = Math.trunc(Number(star));
    const random = mulberry32(hashString(`${parts.seed}|fighter-guild|${safeStar}|${parts.serial}`));
    const totalWeight = pool.reduce((total, skill) => total + Math.max(0, skill.poolWeight), 0);
    if (totalWeight <= 0) return pool[Math.floor(random() * pool.length)] || pool[0];
    let roll = random() * totalWeight;
    for (const skill of pool) {
      roll -= Math.max(0, skill.poolWeight);
      if (roll < 0) return skill;
    }
    return pool[pool.length - 1];
  }

  function openSkillBook(bookStar, seedOrSerial, rawState) {
    const star = validStar(bookStar);
    const state = normalizeSkillState(rawState);
    if (!star) return { ok: false, reason: "invalid-star", state, skill: null };
    const request = seedOrSerial && typeof seedOrSerial === "object"
      ? { ...seedOrSerial, classId: state.classId }
      : { seed: seedOrSerial, serial: state.drawSerial, classId: state.classId };
    const skill = drawSkillFromBook(star, request, state.drawSerial);
    if (!skill) return { ok: false, reason: "empty-pool", state, skill: null };
    const next = cloneState(state);
    next.drawSerial = Math.min(999999999, state.drawSerial + 1);
    next.manualCounts[skill.id] = Math.min(9999, wholeNumber(next.manualCounts[skill.id]) + 1);
    const alreadyLearned = stateHasSkill(next.unlockedSkillIds, skill.id);
    return {
      ok: true,
      reason: null,
      star,
      skill,
      skillId: skill.id,
      duplicate: false,
      isDuplicate: false,
      alreadyLearned,
      manualCreated: true,
      shardsAwarded: 0,
      state: next,
    };
  }

  function grantSkillBooks(rawState, bookStar, quantity = 1) {
    const state = normalizeSkillState(rawState);
    const star = validStar(bookStar);
    if (!star) return { ok: false, reason: "invalid-star", state };
    const amount = wholeNumber(quantity);
    if (amount < 1) return { ok: false, reason: "invalid-quantity", state };
    const next = cloneState(state);
    next.books[star] = Math.min(9999, next.books[star] + amount);
    return { ok: true, reason: null, star, quantity: amount, state: next };
  }

  function grantSkillManuals(rawState, skillId, quantity = 1) {
    const state = normalizeSkillState(rawState);
    const skill = getSkill(String(skillId || ""));
    const amount = wholeNumber(quantity);
    if (!skill) return { ok: false, reason: "not-found", state, skill: null };
    if (amount < 1) return { ok: false, reason: "invalid-quantity", state, skill };
    const next = cloneState(state);
    next.manualCounts[skill.id] = Math.min(9999, wholeNumber(next.manualCounts[skill.id]) + amount);
    return { ok: true, reason: null, skill, quantity: amount, state: next };
  }

  function openOwnedSkillBook(bookStar, seedOrSerial, rawState) {
    const state = normalizeSkillState(rawState);
    const star = validStar(bookStar);
    if (!star) return { ok: false, reason: "invalid-star", state, skill: null };
    if (state.books[star] < 1) return { ok: false, reason: "no-book", state, skill: null };
    const paidState = cloneState(state);
    paidState.books[star] -= 1;
    return openSkillBook(star, seedOrSerial, paidState);
  }

  function learnSkillFromManual(rawState, skillId, options = {}) {
    const state = normalizeSkillState(rawState);
    const skill = getSkill(String(skillId || ""));
    if (!skill) return { ok: false, reason: "not-found", state, skill: null };
    if (wholeNumber(state.manualCounts[skill.id]) < 1) return { ok: false, reason: "no-manual", state, skill };
    if (skill.classId !== state.classId) return { ok: false, reason: "wrong-class", state, skill };
    const duplicate = stateHasSkill(state.unlockedSkillIds, skill.id);
    if (!duplicate) {
      const learnability = skillLearnability(state, skill.id, options);
      if (learnability.status !== "canLearn") {
        return { ok: false, reason: learnability.reason, state, skill, missingPrerequisites: learnability.missingPrerequisites };
      }
    }
    const next = cloneState(state);
    next.manualCounts[skill.id] -= 1;
    if (next.manualCounts[skill.id] <= 0) delete next.manualCounts[skill.id];
    let shardsAwarded = 0;
    if (duplicate) {
      shardsAwarded = DUPLICATE_SHARDS[skill.star];
      next.masteryShards = Math.min(999999, next.masteryShards + shardsAwarded);
      next.duplicateCounts[skill.id] = wholeNumber(next.duplicateCounts[skill.id]) + 1;
    } else {
      next.unlockedSkillIds.push(skill.id);
    }
    return { ok: true, reason: null, skill, duplicate, isDuplicate: duplicate, shardsAwarded, state: next };
  }

  function unlockSkillWithShards(rawState, skillId) {
    const state = normalizeSkillState(rawState);
    const skill = getSkill(String(skillId || ""));
    if (!skill || !SKILLS_BY_ID.has(canonicalSkillId(skill.id))) return { ok: false, reason: "not-found", state };
    if (stateHasSkill(state.unlockedSkillIds, skill.id)) return { ok: false, reason: "already-unlocked", state };
    const learnability = skillLearnability(state, skill.id);
    if (learnability.status !== "canLearn") return { ok: false, reason: learnability.reason, missingPrerequisites: learnability.missingPrerequisites, state };
    const cost = MASTERY_UNLOCK_COST[skill.star];
    if (state.masteryShards < cost) return { ok: false, reason: "shards", cost, state };
    const next = cloneState(state);
    next.masteryShards -= cost;
    next.unlockedSkillIds.push(skill.id);
    return { ok: true, reason: null, cost, skill, state: next };
  }

  function validateSkillCatalog(catalog = SKILL_CATALOG) {
    const errors = [];
    const warnings = [];
    const seen = new Set();
    const summary = {
      total: Array.isArray(catalog) ? catalog.length : 0,
      byStar: { 1: 0, 2: 0, 3: 0 },
      shapes: {},
      melee: 0,
      ranged: 0,
      damaging: 0,
      support: 0,
    };
    if (!Array.isArray(catalog)) return { ok: false, errors: ["catalog must be an array"], warnings, summary };
    for (let index = 0; index < catalog.length; index += 1) {
      const skill = catalog[index] || {};
      const label = skill.id || `#${index}`;
      if (!/^[a-z][a-z0-9_]*$/.test(String(skill.id || ""))) errors.push(`${label}: invalid id`);
      if (seen.has(skill.id)) errors.push(`${label}: duplicate id`);
      seen.add(skill.id);
      if (!String(skill.name || "").trim()) errors.push(`${label}: missing name`);
      if (!String(skill.description || "").trim()) errors.push(`${label}: missing description`);
      const tags = Array.isArray(skill.tags) ? skill.tags : [];
      const passive = tags.includes("passive");
      const star = validStar(skill.star);
      if (!star) {
        errors.push(`${label}: invalid star`);
      } else {
        summary.byStar[star] += 1;
        const band = AP_BANDS[star];
        if (passive && skill.apCost !== 0) errors.push(`${label}: passive AP cost must be 0`);
        else if (!passive && skill.classId !== "fighter" && (!Number.isInteger(skill.apCost) || skill.apCost < band.min || skill.apCost > band.max)) {
          errors.push(`${label}: AP cost ${skill.apCost} outside ${star}-star band ${band.min}-${band.max}`);
        }
      }
      const minRange = finiteNumber(skill.range && skill.range.min, -1);
      const maxRange = finiteNumber(skill.range && skill.range.max, -1);
      if (minRange < 0 || maxRange < minRange) errors.push(`${label}: invalid range`);
      const shape = String(skill.area && skill.area.shape || "");
      if (!AREA_SHAPES.includes(shape)) errors.push(`${label}: invalid area shape`);
      else summary.shapes[shape] = (summary.shapes[shape] || 0) + 1;
      if (!Array.isArray(skill.effects) || !skill.effects.length) errors.push(`${label}: missing effects`);
      if (!Number.isFinite(skill.power) || skill.power < 0) errors.push(`${label}: invalid power`);
      if (!skill.targeting || !["enemy", "ally", "self"].includes(skill.targeting.team)) errors.push(`${label}: invalid target team`);
      if (!(finiteNumber(skill.poolWeight, 0) > 0)) errors.push(`${label}: invalid pool weight`);
      if (tags.includes("melee")) summary.melee += 1;
      if (tags.includes("ranged")) summary.ranged += 1;
      if (skill.power > 0) summary.damaging += 1;
      if (tags.includes("support") || tags.includes("utility")) summary.support += 1;
    }
    for (const star of BOOK_STARS) {
      if (summary.byStar[star] < 4) warnings.push(`${star}-star pool has fewer than four skills`);
    }
    for (const requiredShape of ["single", "line", "cone", "cross", "radius"]) {
      if (!summary.shapes[requiredShape]) warnings.push(`catalog has no ${requiredShape} skill`);
    }
    if (!summary.melee) warnings.push("catalog has no melee skills");
    if (!summary.ranged) warnings.push("catalog has no ranged skills");
    if (!summary.support) warnings.push("catalog has no support skills");
    return { ok: errors.length === 0, errors, warnings, summary };
  }

  return {
    STARTING_AP,
    ROUND_AP_GAIN,
    MAX_AP,
    STARTING_DECK_CAPACITY,
    MAX_EQUIPPED_SKILLS,
    DECK_CAPACITY_MILESTONES,
    CLASS_IDS,
    DEFAULT_CLASS_ID,
    CLASS_STARTER_SKILLS,
    SPEED_GRADES,
    DEFAULT_TARGET_ARC,
    TARGET_ARCS,
    BOOK_STARS,
    MAX_SKILL_BOOK_RANK,
    AP_BANDS,
    DUPLICATE_SHARDS,
    MASTERY_UNLOCK_COST,
    AREA_SHAPES,
    DEFAULT_STARTER_SKILLS,
    SKILL_CATALOG,
    canonicalSkillId,
    getSkill,
    getSkillsByStar,
    getSkillsByClass,
    getFighterGuildBookPool,
    speedGradeIndex,
    compareSpeedGrades,
    orderActionsBySpeed,
    calculateSkillDamageMultiplier,
    splitDamageLaterHits,
    bookStarForQuestLevel,
    formatSkillBookRank,
    manhattan,
    isCardinallyAligned,
    isTargetInRange,
    patternCells,
    validateSkillTarget,
    isSkillHeightValid,
    heightValidation,
    normalizeSkillState,
    createSkillState,
    setEquippedSkills,
    equipSkill,
    unequipSkill,
    upgradeDeckCapacity,
    awardDeckCapacityMilestone,
    skillLearnability,
    drawSkillFromBook,
    drawFighterGuildSkillBook,
    openSkillBook,
    grantSkillBooks,
    grantSkillManuals,
    openOwnedSkillBook,
    learnSkillFromManual,
    unlockSkillWithShards,
    validateSkillCatalog,
  };
});
