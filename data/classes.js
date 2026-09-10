(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmClassData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const LEVEL_CAP = 40;
  const DEFAULT_CLASS_ID = "warrior";
  const CLASS_IDS = Object.freeze(["warrior", "fighter"]);

  function buildLevelTable(classId) {
    return Object.freeze(Array.from({ length: LEVEL_CAP }, (_, index) => {
      const steps = index;
      const fighter = classId === "fighter";
      return Object.freeze({
        level: index + 1,
        maxHp: 88 + steps * (fighter ? 7 : 8) + Math.floor(steps / 5) * (fighter ? 3 : 4),
        attack: 14,
        defence: 2,
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

  return { LEVEL_CAP, DEFAULT_CLASS_ID, CLASS_IDS, CLASS_LEVEL_TABLES, CLASS_DEFINITIONS, normalizeClassId, classStatsAtLevel, starterEquipment, starterSkills };
});
