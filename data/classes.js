(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmClassData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const LEVEL_CAP = 45;
  const LEVEL_EXP_REQUIREMENTS = Object.freeze({
    1: 250, 2: 260, 3: 270, 4: 290, 5: 310,
    6: 340, 7: 370, 8: 410, 9: 450, 10: 500,
    11: 550, 12: 610, 13: 670, 14: 2000, 15: 2050,
    16: 2100, 17: 2150, 18: 2200, 19: 4000, 20: 4050,
    21: 4100, 22: 4150, 23: 4200, 24: 6000, 25: 6050,
    26: 6100, 27: 6150, 28: 6200, 29: 8000, 30: 8050,
    31: 8100, 32: 8150, 33: 8200, 34: 10000, 35: 12000,
    36: 14500, 37: 17000, 38: 19000, 39: 20500, 40: 21500,
    41: 22200, 42: 22900, 43: 23600, 44: 24300, 45: 25000,
  });

  const DEFAULT_CLASS_ID = "fighter";
  const CLASS_IDS = Object.freeze(["warrior", "fighter"]);

  function buildLevelTable(classId) {
    return Object.freeze(Array.from({ length: LEVEL_CAP }, (_, index) => {
      const steps = index;
      const fighter = classId === "fighter";
      return Object.freeze({
        level: index + 1,
        maxHp: 88 + steps * (fighter ? 7 : 8) + Math.floor(steps / 5) * (fighter ? 3 : 4),
        attack: 0,
        defence: 0,
        moveRange: fighter ? 5 : 3,
      });
    }));
  }

  const CLASS_LEVEL_TABLES = Object.freeze({
    warrior: buildLevelTable("warrior"),
    fighter: buildLevelTable("fighter"),
  });

  const CLASS_DEFINITIONS = Object.freeze({
    warrior: Object.freeze({ id: "warrior", starterEquipment: Object.freeze({ weapon: "novice_blade", upperBody: "traveller_coat" }), starterSkills: Object.freeze(["quick_slash", "lantern_shot", "guard_stance"]) }),
    fighter: Object.freeze({ id: "fighter", starterEquipment: Object.freeze({ weapon: "novice_gloves", upperBody: "traveller_coat" }), starterSkills: Object.freeze(["kentotsu"]) }),
  });

  function normalizeClassId(value) {
    const id = String(value || "").trim();
    return CLASS_IDS.includes(id) ? id : DEFAULT_CLASS_ID;
  }

  function classStatsAtLevel(classId, level) {
    const id = normalizeClassId(classId);
    const safeLevel = Math.max(1, Math.min(LEVEL_CAP, Math.floor(Number(level) || 1)));
    return { ...CLASS_LEVEL_TABLES[id][safeLevel - 1] };
  }

  function starterEquipment(classId) {
    return { ...CLASS_DEFINITIONS[normalizeClassId(classId)].starterEquipment };
  }

  function starterSkills(classId) {
    return [...CLASS_DEFINITIONS[normalizeClassId(classId)].starterSkills];
  }

  return { LEVEL_CAP, LEVEL_EXP_REQUIREMENTS, DEFAULT_CLASS_ID, CLASS_IDS, CLASS_LEVEL_TABLES, CLASS_DEFINITIONS, normalizeClassId, classStatsAtLevel, starterEquipment, starterSkills };
});
