(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmMonsterSkillData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const HEIGHT_ONE = Object.freeze({ up: 1, down: 1, status: "confirmed" });
  const MELEE_FIVE = Object.freeze([
    Object.freeze([-1, 1]), Object.freeze([0, 1]), Object.freeze([1, 1]),
    Object.freeze([-1, 0]), Object.freeze([1, 0]),
  ]);
  const POUNCE_TWO = Object.freeze([
    Object.freeze([-1, 2]), Object.freeze([0, 2]), Object.freeze([1, 2]),
    Object.freeze([-1, 1]), Object.freeze([0, 1]), Object.freeze([1, 1]),
  ]);
  const STRAIGHT_TWO = Object.freeze([Object.freeze([0, 1]), Object.freeze([0, 2])]);
  const STRAIGHT_THREE = Object.freeze([Object.freeze([0, 1]), Object.freeze([0, 2]), Object.freeze([0, 3])]);
  const SNAKE_SPIT = Object.freeze([
    Object.freeze([-1, 4]), Object.freeze([0, 4]), Object.freeze([1, 4]),
    Object.freeze([-1, 3]), Object.freeze([0, 3]), Object.freeze([1, 3]),
    Object.freeze([0, 2]), Object.freeze([0, 1]),
  ]);
  const SURROUND_EIGHT = Object.freeze([
    Object.freeze([-1, -1]), Object.freeze([0, -1]), Object.freeze([1, -1]),
    Object.freeze([-1, 0]), Object.freeze([1, 0]),
    Object.freeze([-1, 1]), Object.freeze([0, 1]), Object.freeze([1, 1]),
  ]);
  const BEAR_QUAKE = Object.freeze([
    Object.freeze([0, 2]),
    Object.freeze([-1, 1]), Object.freeze([0, 1]), Object.freeze([1, 1]),
  ]);

  function freezeSkill(skill) {
    const rangeCellsRelative = Object.freeze((skill.rangeCellsRelative || []).map((cell) => Object.freeze([...cell])));
    const area = Object.freeze({ ...(skill.area || { shape: "single" }), ...(skill.area?.relativeCells ? { relativeCells: Object.freeze(skill.area.relativeCells.map((cell) => Object.freeze([...cell]))) } : {}) });
    const effects = Object.freeze((skill.effects || []).map((effect) => Object.freeze({ ...effect })));
    return Object.freeze({
      ...skill,
      range: Object.freeze({ ...(skill.range || {}), rangeCellsRelative, heightDifference: HEIGHT_ONE }),
      rangeCellsRelative,
      heightDifference: HEIGHT_ONE,
      area,
      effectArea: Object.freeze({ type: area.shape === "relative_cells" ? "all_pattern_cells" : "selected_target_only" }),
      targeting: Object.freeze({ team: "enemy", mode: "unit", lineOfSight: false, ...(skill.targeting || {}) }),
      pathMode: "facingOrthogonalPriority",
      effects,
    });
  }

  const SKILLS = Object.freeze({
    peck: freezeSkill({
      id: "peck", name: "啄擊", description: "快速啄擊身前與左右近身位置。",
      apCost: 4, speedGrade: "C",
      range: { min: 1, max: 1, type: "relative_cells", sourcePattern: "■■■\n■↑■", rangeDescription: "可攻擊前左、前、前右、左、右，共5格。" },
      rangeCellsRelative: MELEE_FIVE,
      area: { shape: "single" }, deliveryMode: "contact", actionKind: "attack", dealsDamage: true,
      damageModel: { scale: 0.78 }, effects: [], aiValue: 48,
    }),

    quick_bite: freezeSkill({
      id: "quick_bite", name: "迅咬", description: "高速近身咬擊。",
      apCost: 5, speedGrade: "B",
      range: { min: 1, max: 1, type: "relative_cells", sourcePattern: "■■■\n■↑■", rangeDescription: "可攻擊前左、前、前右、左、右，共5格。" },
      rangeCellsRelative: MELEE_FIVE,
      area: { shape: "single" }, deliveryMode: "contact", actionKind: "attack", dealsDamage: true,
      damageModel: { scale: 0.9 }, effects: [], aiValue: 56,
    }),

    coyote_bite: freezeSkill({
      id: "coyote_bite", name: "迅咬", description: "郊狼的高速近身咬擊。",
      apCost: 6, speedGrade: "B",
      range: { min: 1, max: 1, type: "relative_cells", sourcePattern: "■■■\n■↑■", rangeDescription: "可攻擊前左、前、前右、左、右，共5格。" },
      rangeCellsRelative: MELEE_FIVE,
      area: { shape: "single" }, deliveryMode: "contact", actionKind: "attack", dealsDamage: true,
      damageModel: { scale: 1.0 }, effects: [], aiValue: 64,
    }),

    fox_pounce: freezeSkill({
      id: "fox_pounce", name: "飛撲", description: "向前方一至兩格範圍發動撲擊。",
      apCost: 12, speedGrade: "C",
      range: { min: 1, max: 2, type: "relative_cells", sourcePattern: "■■■\n■■■\n口↑口", rangeDescription: "可攻擊前方第1至第2格的三格闊區域，共6格。" },
      rangeCellsRelative: POUNCE_TWO,
      area: { shape: "single" }, deliveryMode: "leap", actionKind: "attack", dealsDamage: true,
      damageModel: { scale: 1.25 }, effects: [], aiValue: 82,
    }),

    raccoon_claw: freezeSkill({
      id: "raccoon_claw", name: "爪擊", description: "穩定的近身爪擊。",
      apCost: 5, speedGrade: "C",
      range: { min: 1, max: 1, type: "relative_cells", sourcePattern: "■■■\n■↑■", rangeDescription: "可攻擊前左、前、前右、左、右，共5格。" },
      rangeCellsRelative: MELEE_FIVE,
      area: { shape: "single" }, deliveryMode: "contact", actionKind: "attack", dealsDamage: true,
      damageModel: { scale: 0.95 }, effects: [], aiValue: 58,
    }),

    flurry_claw: freezeSkill({
      id: "flurry_claw", name: "連環抓", description: "以連續爪擊造成較高近身傷害。",
      apCost: 11, speedGrade: "D",
      range: { min: 1, max: 1, type: "relative_cells", sourcePattern: "■■■\n■↑■", rangeDescription: "可攻擊前左、前、前右、左、右，共5格。" },
      rangeCellsRelative: MELEE_FIVE,
      area: { shape: "single" }, deliveryMode: "contact", actionKind: "attack", dealsDamage: true,
      damageModel: { scale: 1.35 }, effects: [], aiValue: 80,
    }),

    tusk_strike: freezeSkill({
      id: "tusk_strike", name: "獠牙撞擊", description: "用獠牙作近距離撞擊。",
      apCost: 6, speedGrade: "D",
      range: { min: 1, max: 1, type: "relative_cells", sourcePattern: "■■■\n■↑■", rangeDescription: "可攻擊前左、前、前右、左、右，共5格。" },
      rangeCellsRelative: MELEE_FIVE,
      area: { shape: "single" }, deliveryMode: "contact", actionKind: "attack", dealsDamage: true,
      damageModel: { scale: 1.0 }, effects: [], aiValue: 60,
    }),

    boar_charge: freezeSkill({
      id: "boar_charge", name: "衝鋒", description: "沿正前方直線撞向一至三格內的目標。",
      apCost: 14, speedGrade: "E",
      range: { min: 1, max: 3, type: "relative_cells", sourcePattern: "口■口\n口■口\n口■口\n口↑口", rangeDescription: "只可攻擊正前方第1、第2、第3格。" },
      rangeCellsRelative: STRAIGHT_THREE,
      area: { shape: "single" }, deliveryMode: "linear", blocksByTerrain: true, blocksByUnits: true, stopOnFirstUnit: true,
      actionKind: "attack", dealsDamage: true,
      damageModel: { scale: 1.55 }, effects: [{ type: "knockback", amount: 1 }], aiValue: 96,
    }),

    tongue_strike: freezeSkill({
      id: "tongue_strike", name: "舌擊", description: "伸出長舌攻擊正前方一至兩格。",
      apCost: 7, speedGrade: "C",
      range: { min: 1, max: 2, type: "relative_cells", sourcePattern: "口■口\n口■口\n口↑口", rangeDescription: "只可攻擊正前方第1或第2格。" },
      rangeCellsRelative: STRAIGHT_TWO,
      area: { shape: "single" }, deliveryMode: "linear", blocksByTerrain: true, blocksByUnits: true, stopOnFirstUnit: true,
      actionKind: "attack", dealsDamage: true, damageModel: { scale: 0.85 }, effects: [], aiValue: 66,
    }),

    slime_shot: freezeSkill({
      id: "slime_shot", name: "黏液彈", description: "向正前方射出黏液，命中後降低移動力。",
      apCost: 15, speedGrade: "D",
      range: { min: 1, max: 3, type: "relative_cells", sourcePattern: "口■口\n口■口\n口■口\n口↑口", rangeDescription: "只可攻擊正前方第1至第3格。" },
      rangeCellsRelative: STRAIGHT_THREE,
      area: { shape: "single" }, deliveryMode: "linear", blocksByTerrain: true, blocksByUnits: true, stopOnFirstUnit: true,
      actionKind: "attack", dealsDamage: true, damageModel: { scale: 1.1 }, effects: [{ type: "move_down", amount: 1, duration: 1 }], aiValue: 94,
    }),

    hunting_pounce: freezeSkill({
      id: "hunting_pounce", name: "獵殺飛撲", description: "高速向前撲擊一至兩格範圍內的目標。",
      apCost: 13, speedGrade: "C",
      range: { min: 1, max: 2, type: "relative_cells", sourcePattern: "■■■\n■■■\n口↑口", rangeDescription: "可攻擊前方第1至第2格的三格闊區域，共6格。" },
      rangeCellsRelative: POUNCE_TWO,
      area: { shape: "single" }, deliveryMode: "leap", actionKind: "attack", dealsDamage: true,
      damageModel: { scale: 1.45 }, effects: [], aiValue: 100,
    }),

    shell_ram: freezeSkill({
      id: "shell_ram", name: "甲殼撞擊", description: "以厚重龜殼作近身撞擊。",
      apCost: 6, speedGrade: "D",
      range: { min: 1, max: 1, type: "relative_cells", sourcePattern: "■■■\n■↑■", rangeDescription: "可攻擊前左、前、前右、左、右，共5格。" },
      rangeCellsRelative: MELEE_FIVE,
      area: { shape: "single" }, deliveryMode: "contact", actionKind: "attack", dealsDamage: true,
      damageModel: { scale: 0.9 }, effects: [], aiValue: 60,
    }),

    spinning_shell: freezeSkill({
      id: "spinning_shell", name: "旋殼迴擊", description: "反轉龜殼高速旋轉，攻擊自身周圍八格並擊退目標。",
      apCost: 16, speedGrade: "E",
      range: { min: 1, max: 1, type: "relative_cells", sourcePattern: "■■■\n■↑■\n■■■", rangeDescription: "以自身為中心，攻擊周圍8格。" },
      rangeCellsRelative: SURROUND_EIGHT,
      area: { shape: "relative_cells", relativeCells: SURROUND_EIGHT, sourcePattern: "■■■\n■↑■\n■■■", areaDescription: "自身周圍8格全部屬於攻擊區。" },
      deliveryMode: "pathless-area", actionKind: "attack", dealsDamage: true,
      damageModel: { scale: 1.35 }, effects: [{ type: "knockback", amount: 1 }], aiValue: 104,
    }),

    venom_fang: freezeSkill({
      id: "venom_fang", name: "毒牙", description: "高速近身咬擊並施加中毒。",
      apCost: 8, speedGrade: "B",
      range: { min: 1, max: 1, type: "relative_cells", sourcePattern: "■■■\n■↑■", rangeDescription: "可攻擊前左、前、前右、左、右，共5格。" },
      rangeCellsRelative: MELEE_FIVE,
      area: { shape: "single" }, deliveryMode: "contact", actionKind: "attack", dealsDamage: true,
      damageModel: { scale: 0.9 }, effects: [{ type: "poison", duration: 2, maxHpRatio: 0.05 }], aiValue: 92,
    }),

    venom_spit: freezeSkill({
      id: "venom_spit", name: "毒液噴吐", description: "在遠距離噴出毒液並施加較持久中毒。",
      apCost: 18, speedGrade: "D",
      range: { min: 1, max: 4, type: "relative_cells", sourcePattern: "■■■\n■■■\n口■口\n口■口\n口↑口", rangeDescription: "可選8格：前4左/中/右、前3左/中/右、前2、前1。" },
      rangeCellsRelative: SNAKE_SPIT,
      area: { shape: "single" }, deliveryMode: "linear", blocksByTerrain: true, blocksByUnits: true, stopOnFirstUnit: true,
      actionKind: "attack", dealsDamage: true, damageModel: { scale: 0.8 }, effects: [{ type: "poison", duration: 3, maxHpRatio: 0.05 }], aiValue: 122,
    }),

    heavy_palm: freezeSkill({
      id: "heavy_palm", name: "重掌", description: "以沉重熊掌作近身重擊。",
      apCost: 7, speedGrade: "C",
      range: { min: 1, max: 1, type: "relative_cells", sourcePattern: "■■■\n■↑■", rangeDescription: "可攻擊前左、前、前右、左、右，共5格。" },
      rangeCellsRelative: MELEE_FIVE,
      area: { shape: "single" }, deliveryMode: "contact", actionKind: "attack", dealsDamage: true,
      damageModel: { scale: 1.1 }, effects: [], aiValue: 70,
    }),

    quake_palm: freezeSkill({
      id: "quake_palm", name: "震地掌", description: "向前方拍擊地面，震擊前方扇形範圍。",
      apCost: 18, speedGrade: "E",
      range: { min: 1, max: 2, type: "relative_cells", sourcePattern: "口■口\n■■■\n口↑口", rangeDescription: "攻擊前左、前、前右，以及正前方第2格，共4格。" },
      rangeCellsRelative: BEAR_QUAKE,
      area: { shape: "relative_cells", relativeCells: BEAR_QUAKE, sourcePattern: "口■口\n■■■\n口↑口", areaDescription: "前方4格震擊區。" },
      deliveryMode: "pathless-area", actionKind: "attack", dealsDamage: true,
      damageModel: { scale: 1.6 }, effects: [], aiValue: 128,
    }),
  });

  function getSkill(id) { return SKILLS[String(id || "").trim()] || null; }
  return { SKILLS, getSkill };
});
