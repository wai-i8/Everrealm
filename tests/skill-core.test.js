const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Skills = require("../skill-core.js");
const FighterData = require("../fighter-skill-data.js");

test("UMD build exposes LanternSkills in a browser-like global", () => {
  const filename = path.join(__dirname, "..", "skill-core.js");
  const dataFilename = path.join(__dirname, "..", "fighter-skill-data.js");
  const dataSource = fs.readFileSync(dataFilename, "utf8");
  const source = fs.readFileSync(filename, "utf8");
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.runInNewContext(dataSource, sandbox, { filename: dataFilename });
  vm.runInNewContext(source, sandbox, { filename });
  assert.equal(typeof sandbox.LanternSkills.openSkillBook, "function");
  assert.equal(sandbox.LanternSkills.SKILL_CATALOG.length, Skills.SKILL_CATALOG.length);
  assert.equal(sandbox.LanternSkills.getSkill("quick_slash").name, "瞬刃");
});

test("catalog contains broad, immutable class-aware one-to-three-star pools", () => {
  const warriorSkills = Skills.getSkillsByClass("warrior");
  const fighterSkills = Skills.getSkillsByClass("fighter");
  const fighterGroups = Object.fromEntries(
    [...new Set(fighterSkills.map((skill) => skill.treeGroup))]
      .map((group) => [group, fighterSkills.filter((skill) => skill.treeGroup === group).length]),
  );

  assert.equal(Skills.SKILL_CATALOG.length, 81);
  assert.equal(warriorSkills.length, 16);
  assert.equal(fighterSkills.length, 65);
  assert.deepEqual(fighterGroups, {
    body_passive: 10,
    root: 1,
    kentotsu_line: 10,
    jinken_line: 9,
    kick: 4,
    kick_ki_hybrid: 1,
    evade_counter: 4,
    ki_ranged: 13,
    side_warrior: 5,
    side_guardian: 5,
    ultimate: 3,
  });
  assert.equal(Object.isFrozen(Skills.SKILL_CATALOG), true);
  assert.equal(Object.isFrozen(Skills.SKILL_CATALOG[0].effects), true);
  assert.deepEqual(
    Skills.BOOK_STARS.map((star) => Skills.getSkillsByStar(star).length),
    [24, 37, 20],
  );
  assert.deepEqual(warriorSkills.map((skill) => skill.id), Skills.SKILL_CATALOG.slice(0, 16).map((skill) => skill.id));
  assert.deepEqual(fighterSkills.map((skill) => skill.id), Skills.SKILL_CATALOG.slice(16).map((skill) => skill.id));
  assert.ok(Skills.SKILL_CATALOG.every((skill) => skill.tags.includes("passive")
    ? skill.speedGrade === "PSV"
    : Skills.SPEED_GRADES.includes(skill.speedGrade)));
  assert.ok(Skills.SKILL_CATALOG.every((skill) => Skills.CLASS_IDS.includes(skill.classId)));
  assert.deepEqual(Skills.getSkill("backfist").targetArc, ["rear"]);
  assert.ok(Skills.SKILL_CATALOG.every((skill) => skill.pool.star === skill.star));
  assert.ok(Skills.SKILL_CATALOG.every((skill) => skill.pool.weight > 0));
});

test("built-in catalog passes AP and content balance validation", () => {
  const result = Skills.validateSkillCatalog();
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.summary.byStar, { 1: 24, 2: 37, 3: 20 });
  assert.ok(result.summary.melee >= 4);
  assert.ok(result.summary.ranged >= 4);
  assert.ok(result.summary.support >= 3);
  assert.ok(result.summary.damaging >= 10);
});

test("AP bands support cheap combos and saved-AP three-star finishers", () => {
  assert.equal(Skills.STARTING_AP, 10);
  assert.equal(Skills.ROUND_AP_GAIN, 10);
  assert.equal(Skills.MAX_AP, 200);
  for (const skill of Skills.SKILL_CATALOG) {
    if (skill.tags.includes("passive")) {
      assert.equal(skill.apCost, 0, skill.id);
      continue;
    }
    if (skill.classId === "fighter") continue;
    const band = Skills.AP_BANDS[skill.star];
    assert.ok(skill.apCost >= band.min && skill.apCost <= band.max, skill.id);
  }
  assert.deepEqual(Skills.AP_BANDS, {
    1: { min: 3, max: 16 },
    2: { min: 10, max: 45 },
    3: { min: 20, max: 100 },
  });
  assert.deepEqual(
    Object.fromEntries(Skills.getSkillsByClass("warrior").map((skill) => [skill.id, skill.apCost])),
    {
      quick_slash: 4,
      steady_strike: 6,
      lantern_shot: 7,
      crescent_sweep: 8,
      guard_stance: 5,
      field_dressing: 8,
      piercing_lance: 12,
      mist_arrow: 11,
      cross_burst: 14,
      lantern_field: 16,
      gale_step: 10,
      starfall_array: 30,
      dragon_crescent: 22,
      thunder_pillar: 24,
      oathbreaker: 28,
      aurora_sanctuary: 26,
    },
  );
  assert.deepEqual(
    Object.fromEntries(
      ["straight_punch", "rapid_fist", "backfist", "rising_knuckle", "chi_blast", "tiger_chain"]
        .map((id) => [id, Skills.getSkill(id).apCost]),
    ),
    {
      straight_punch: 3,
      rapid_fist: 6,
      backfist: 12,
      rising_knuckle: 12,
      chi_blast: 32,
      tiger_chain: 24,
    },
  );
  assert.equal(Skills.getSkill("quick_slash").apCost, 4);
  assert.equal(Skills.getSkill("oathbreaker").apCost, 28);
  assert.ok(Skills.getSkill("oathbreaker").power > Skills.getSkill("quick_slash").power * 2);
});

test("fighter PSV column is a data-driven ten-skill passive chain", () => {
  const expectedIds = [
    "psv_tesshin",
    "psv_ukimi",
    "psv_koushin",
    "psv_shintou_mekkyaku",
    "psv_seishin_touitsu",
    "psv_soshin_sokutai",
    "psv_hishin_jutai",
    "psv_koushin_gekitai",
    "psv_boushin_goutai",
    "psv_sokushin_keitai",
  ];
  const psvSkills = Skills.getSkillsByClass("fighter").filter((skill) => skill.treeGroup === "body_passive");

  assert.deepEqual(psvSkills.map((skill) => skill.id), expectedIds);
  assert.ok(psvSkills.every((skill) => skill.apCost === 0));
  assert.ok(psvSkills.every((skill) => skill.speedGrade === "PSV"));
  assert.ok(psvSkills.every((skill) => skill.tags.includes("passive")));
  assert.deepEqual(psvSkills.map((skill) => skill.prerequisites), [
    [],
    ["psv_tesshin"],
    ["psv_ukimi"],
    ["psv_koushin"],
    ["psv_shintou_mekkyaku"],
    ["psv_seishin_touitsu"],
    ["psv_soshin_sokutai"],
    ["psv_hishin_jutai"],
    ["psv_koushin_gekitai"],
    ["psv_boushin_goutai"],
  ]);
});

test("fighter right-side subjob columns are two isolated five-skill chains", () => {
  const chains = [
    ["bougyo", "denkangeki", "ruka_hanki_ken", "ruka_kouitsu_ken", "kenshaku"],
    ["hijo_tenketsu", "shincha_tenketsu", "kaimoku_tenketsu", "boumin_daha", "kikou_gedoku"],
  ];

  for (const chain of chains) {
    chain.forEach((id, index) => {
      assert.deepEqual(Skills.getSkill(id).prerequisites, index === 0 ? ["kentotsu"] : [chain[index - 1]], id);
    });
  }
  assert.deepEqual(chains.map((chain) => Skills.getSkill(chain[0]).treeColumn), [8, 9]);
});

test("fighter central tree preserves every canonical branch and multi-parent merge", () => {
  const expected = Object.fromEntries(
    FighterData.skills
      .filter((skill) => skill.type !== "PSV" && skill.category !== "side_warrior" && skill.category !== "side_guardian")
      .map((skill) => [skill.id, skill.requires]),
  );
  const centralSkills = Skills.getSkillsByClass("fighter")
    .filter((skill) => skill.treeColumn >= 1 && skill.treeColumn <= 7);
  const actual = Object.fromEntries(centralSkills.map((skill) => [skill.id, skill.prerequisites]));

  assert.equal(centralSkills.length, 45);
  assert.deepEqual(actual, expected);
  assert.deepEqual(Skills.getSkill("lusedes_tan").prerequisites, ["byakkorendan", "gouhoukyaku"]);
});

test("legacy rising_knuckle id now represents the two-hit 連擊", () => {
  const skill = Skills.getSkill("rising_knuckle");
  const damage = skill.effects.find((effect) => effect.type === "damage");

  assert.equal(skill.name, "連擊");
  assert.equal(skill.apCost, 12);
  assert.equal(skill.speedGrade, "B");
  assert.equal(damage?.hits, 2);
});

test("guild quest levels map monotonically to one-to-three-star books", () => {
  assert.equal(Skills.bookStarForQuestLevel(1), 1);
  assert.equal(Skills.bookStarForQuestLevel(4), 1);
  assert.equal(Skills.bookStarForQuestLevel(5), 2);
  assert.equal(Skills.bookStarForQuestLevel(9), 2);
  assert.equal(Skills.bookStarForQuestLevel(10), 3);
  assert.equal(Skills.bookStarForQuestLevel(40), 3);
});

test("range checks include dead zones, self skills, and cardinal restrictions", () => {
  const origin = { x: 3, y: 3 };
  assert.equal(Skills.isTargetInRange("lantern_shot", origin, { x: 4, y: 3 }), false);
  assert.equal(Skills.isTargetInRange("lantern_shot", origin, { x: 6, y: 3 }), true);
  assert.equal(Skills.isTargetInRange("lantern_shot", origin, { x: 9, y: 3 }), false);
  assert.equal(Skills.isTargetInRange("guard_stance", origin, origin), true);
  assert.equal(Skills.isTargetInRange("guard_stance", origin, { x: 3, y: 4 }), false);
  assert.equal(Skills.isTargetInRange("thunder_pillar", origin, { x: 3, y: 8 }), true);
  assert.equal(Skills.isTargetInRange("thunder_pillar", origin, { x: 4, y: 7 }), false);
  assert.equal(Skills.isTargetInRange("straight_punch", origin, { x: 4, y: 2 }), true, "one-cell fists include a diagonal front cell");
  assert.equal(Skills.isTargetInRange("straight_punch", origin, { x: 5, y: 2 }), false);
});

test("single, line, cone, cross and radius patterns return deterministic cells", () => {
  const origin = { x: 3, y: 3 };
  assert.deepEqual(Skills.patternCells("quick_slash", origin, { x: 4, y: 3 }), [{ x: 4, y: 3 }]);
  assert.deepEqual(
    Skills.patternCells("piercing_lance", origin, { x: 3, y: 2 }),
    [{ x: 3, y: 2 }, { x: 3, y: 1 }, { x: 3, y: 0 }],
  );
  assert.deepEqual(
    Skills.patternCells("crescent_sweep", origin, { x: 4, y: 3 }),
    [{ x: 4, y: 3 }, { x: 5, y: 2 }, { x: 5, y: 3 }, { x: 5, y: 4 }],
  );
  assert.equal(Skills.patternCells("cross_burst", origin, { x: 5, y: 3 }).length, 5);
  assert.equal(Skills.patternCells("starfall_array", origin, { x: 5, y: 3 }).length, 13);
});

test("patterns can be clipped to a grid and optionally omit blocked cells", () => {
  const cells = Skills.patternCells(
    "cross_burst",
    { x: 2, y: 2 },
    { x: 0, y: 0 },
    { width: 4, height: 4, blocked: new Set(["1,0"]), excludeBlocked: true },
  );
  assert.deepEqual(cells, [{ x: 0, y: 0 }, { x: 0, y: 1 }]);

  const gridCells = Skills.patternCells(
    "cross_burst",
    { x: 2, y: 2 },
    { x: 0, y: 0 },
    { grid: { width: 4, height: 4, blocked: new Set(["0,1"]) }, excludeBlocked: true },
  );
  assert.deepEqual(gridCells, [{ x: 0, y: 0 }, { x: 1, y: 0 }]);
});

test("target validation explains missing units, wrong teams and valid area aims", () => {
  const origin = { x: 1, y: 1 };
  assert.equal(Skills.validateSkillTarget("quick_slash", origin, { x: 2, y: 1 }).reason, "empty-target");
  assert.equal(Skills.validateSkillTarget("quick_slash", origin, { x: 4, y: 1 }).reason, "out-of-range");
  assert.equal(
    Skills.validateSkillTarget("quick_slash", origin, { x: 2, y: 1 }, {
      actorTeam: "heroes",
      targetUnit: { id: "friend", team: "heroes" },
    }).reason,
    "wrong-team",
  );
  const valid = Skills.validateSkillTarget("cross_burst", origin, { x: 3, y: 1 }, { width: 8, height: 8 });
  assert.equal(valid.ok, true);
  assert.equal(valid.cells.length, 5);
});

test("skill state normalization repairs invalid unlocks, equipment, counts and serials", () => {
  const state = Skills.normalizeSkillState({
    unlockedSkillIds: ["quick_slash", "bad", "quick_slash", "mist_arrow"],
    equippedSkillIds: ["bad", "mist_arrow", "mist_arrow", "oathbreaker"],
    deckCapacity: 3,
    masteryShards: -20,
    duplicateCounts: { quick_slash: 3.9, bad: 99, mist_arrow: -3 },
    books: { 1: "2", 2: -4, 3: 1.8, 9: 500 },
    manualCounts: { quick_slash: "2", bad: 99, mist_arrow: -3 },
    drawSerial: -10,
  });
  assert.deepEqual(state.unlockedSkillIds, ["quick_slash", "mist_arrow"]);
  assert.deepEqual(state.equippedSkillIds, ["mist_arrow"]);
  assert.equal(state.masteryShards, 0);
  assert.deepEqual(state.duplicateCounts, { quick_slash: 3 });
  assert.deepEqual(state.books, { 1: 2, 2: 0, 3: 1 });
  assert.deepEqual(state.manualCounts, { quick_slash: 2 });
  assert.equal(state.classId, "warrior");
  assert.equal(state.deckCapacity, 3);
  assert.deepEqual(state.deckSlots, [null, "mist_arrow", null]);
  assert.equal(state.drawSerial, 0);
});

test("new players receive a class-aware starter loadout in a three-slot deck", () => {
  const warrior = Skills.createSkillState();
  assert.equal(warrior.classId, "warrior");
  assert.deepEqual(warrior.unlockedSkillIds, ["quick_slash", "lantern_shot", "guard_stance"]);
  assert.deepEqual(warrior.equippedSkillIds, warrior.unlockedSkillIds);
  assert.equal(warrior.deckCapacity, Skills.STARTING_DECK_CAPACITY);
  assert.deepEqual(warrior.deckSlots, warrior.unlockedSkillIds);

  const fighter = Skills.createSkillState({ classId: "fighter" });
  assert.equal(fighter.classId, "fighter");
  assert.deepEqual(fighter.unlockedSkillIds, ["straight_punch"]);
  assert.deepEqual(fighter.equippedSkillIds, ["straight_punch"]);
  assert.deepEqual(fighter.deckSlots, ["straight_punch", null, null]);
});

test("deck helpers enforce unlocks, class, uniqueness and capacity upgrades", () => {
  const unlocked = Skills.getSkillsByClass("warrior").slice(0, 7).map((skill) => skill.id);
  const source = Skills.normalizeSkillState({
    unlockedSkillIds: unlocked,
    equippedSkillIds: unlocked.slice(0, 3),
    deckCapacity: 3,
  });
  assert.equal(Skills.equipSkill(source, unlocked[3]).reason, "full");
  assert.equal(Skills.equipSkill(source, "starfall_array").reason, "locked");
  assert.equal(Skills.equipSkill(source, "straight_punch").reason, "wrong-class");

  const replaced = Skills.equipSkill(source, unlocked[3], 2);
  assert.equal(replaced.ok, true);
  assert.equal(replaced.state.equippedSkillIds.includes(unlocked[3]), true);
  assert.equal(replaced.state.equippedSkillIds.includes(unlocked[2]), false);
  assert.equal(source.equippedSkillIds.includes(unlocked[3]), false);

  const removed = Skills.unequipSkill(replaced.state, unlocked[3]);
  assert.equal(removed.ok, true);
  assert.equal(removed.state.equippedSkillIds.includes(unlocked[3]), false);
  assert.equal(Skills.setEquippedSkills(source, unlocked.slice(0, 4)).reason, "full");

  const expanded = Skills.upgradeDeckCapacity(source, 3);
  assert.equal(expanded.ok, true);
  assert.equal(expanded.state.deckCapacity, 6);
  assert.equal(expanded.state.deckSlots.length, 6);
  assert.equal(Skills.setEquippedSkills(expanded.state, unlocked.slice(0, 6)).ok, true);
  assert.equal(Skills.upgradeDeckCapacity(expanded.state, 1).reason, "max-capacity");
});

test("passive fighter skills remain learned but can never enter the DECK", () => {
  const passiveIds = ["iron_body", "sleep_recovery"];
  const normalized = Skills.normalizeSkillState({
    classId: "fighter",
    unlockedSkillIds: [...passiveIds, "straight_punch"],
    deckSlots: [passiveIds[0], passiveIds[1], "straight_punch"],
    deckCapacity: 3,
  });

  assert.ok(passiveIds.every((id) => normalized.unlockedSkillIds.includes(id)));
  assert.deepEqual(normalized.deckSlots, [null, null, "straight_punch"]);
  assert.deepEqual(normalized.equippedSkillIds, ["straight_punch"]);

  for (const id of passiveIds) {
    const result = Skills.equipSkill(normalized, id, 0);
    assert.equal(result.ok, false, id);
    assert.equal(result.state.equippedSkillIds.includes(id), false, id);
  }

  const setResult = Skills.setEquippedSkills(normalized, ["straight_punch", ...passiveIds]);
  assert.equal(setResult.state.equippedSkillIds.includes(passiveIds[0]), false);
  assert.equal(setResult.state.equippedSkillIds.includes(passiveIds[1]), false);
});

test("DECK capacity milestones award stable four, five and six-slot upgrades exactly once", () => {
  assert.deepEqual(Skills.DECK_CAPACITY_MILESTONES, {
    "main:fog-gate-open": 4,
    "guild:rank-2": 5,
    "main:light-eater-defeated": 6,
  });
  const base = Skills.createSkillState();
  assert.equal(base.deckCapacity, 3);
  assert.deepEqual(base.deckUpgradeMilestones, []);

  const four = Skills.awardDeckCapacityMilestone(base, "main:fog-gate-open");
  assert.equal(four.ok, true);
  assert.equal(four.awarded, true);
  assert.equal(four.added, 1);
  assert.equal(four.state.deckCapacity, 4);
  assert.equal(four.state.deckSlots.length, 4);
  assert.deepEqual(four.state.deckUpgradeMilestones, ["main:fog-gate-open"]);
  assert.equal(base.deckCapacity, 3, "award must not mutate its input");

  const duplicate = Skills.awardDeckCapacityMilestone(four.state, "main:fog-gate-open");
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.awarded, false);
  assert.equal(duplicate.reason, "already-awarded");
  assert.equal(duplicate.state.deckCapacity, 4);
  assert.deepEqual(duplicate.state.deckUpgradeMilestones, ["main:fog-gate-open"]);

  const five = Skills.awardDeckCapacityMilestone(duplicate.state, "guild:rank-2");
  const six = Skills.awardDeckCapacityMilestone(five.state, "main:light-eater-defeated");
  assert.equal(five.state.deckCapacity, 5);
  assert.equal(six.state.deckCapacity, 6);
  assert.equal(six.state.deckSlots.length, 6);
  assert.deepEqual(six.state.deckUpgradeMilestones, [
    "main:fog-gate-open",
    "guild:rank-2",
    "main:light-eater-defeated",
  ]);
});

test("DECK milestone state normalizes, survives save data and never shrinks out of order", () => {
  const restored = Skills.normalizeSkillState(JSON.parse(JSON.stringify({
    classId: "fighter",
    unlockedSkillIds: ["straight_punch"],
    equippedSkillIds: ["straight_punch"],
    deckCapacity: 3,
    deckUpgradeMilestones: [
      "main:light-eater-defeated",
      "bad-id",
      "main:light-eater-defeated",
    ],
  })));
  assert.equal(restored.deckCapacity, 6, "earned milestone must override a stale saved capacity");
  assert.equal(restored.deckSlots.length, 6);
  assert.deepEqual(restored.deckUpgradeMilestones, ["main:light-eater-defeated"]);

  const lateLowerReward = Skills.awardDeckCapacityMilestone(restored, "main:fog-gate-open");
  assert.equal(lateLowerReward.awarded, true, "the milestone itself should still be recorded");
  assert.equal(lateLowerReward.added, 0);
  assert.equal(lateLowerReward.state.deckCapacity, 6);
  assert.deepEqual(lateLowerReward.state.deckUpgradeMilestones, [
    "main:light-eater-defeated",
    "main:fog-gate-open",
  ]);
  assert.equal(Skills.awardDeckCapacityMilestone(restored, "unknown").reason, "unknown-milestone");
});

test("seeded book draws are stable and serials provide a varied sequence", () => {
  for (const star of Skills.BOOK_STARS) {
    const first = Skills.drawSkillFromBook(star, { seed: "guild-test", serial: 17 });
    const again = Skills.drawSkillFromBook(star, { seed: "guild-test", serial: 17 });
    assert.equal(first.id, again.id);
    assert.equal(first.star, star);
    const sequence = new Set(
      Array.from({ length: 24 }, (_, serial) => Skills.drawSkillFromBook(star, { seed: "guild-test", serial }).id),
    );
    assert.ok(sequence.size > 1, `star ${star} draw sequence should vary`);
  }
  assert.equal(Skills.drawSkillFromBook(9, "bad"), null);
  assert.ok(Array.from({ length: 12 }, (_, serial) => Skills.drawSkillFromBook(1, { seed: "fighter", serial, classId: "fighter" }))
    .every((skill) => skill.classId === "fighter"));
});

test("opening a generic book creates a named manual without learning it", () => {
  const seed = { seed: "new-unlock", serial: 4, classId: "warrior" };
  const drawn = Skills.drawSkillFromBook(2, seed);
  const other = Skills.getSkillsByStar(2).find((skill) => skill.id !== drawn.id);
  const source = Skills.normalizeSkillState({
    unlockedSkillIds: [other.id],
    equippedSkillIds: [other.id],
    drawSerial: 8,
  });
  const result = Skills.openSkillBook(2, seed, source);
  assert.equal(result.ok, true);
  assert.equal(result.skill.id, drawn.id);
  assert.equal(result.manualCreated, true);
  assert.equal(result.shardsAwarded, 0);
  assert.equal(result.state.unlockedSkillIds.includes(drawn.id), false);
  assert.equal(result.state.manualCounts[drawn.id], 1);
  assert.equal(result.state.drawSerial, 9);
  assert.equal(source.unlockedSkillIds.includes(drawn.id), false);
});

test("confirming a learned skill manual consumes it and awards duplicate shards", () => {
  for (const star of Skills.BOOK_STARS) {
    const seed = { seed: `duplicate-${star}`, serial: 2, classId: "warrior" };
    const drawn = Skills.drawSkillFromBook(star, seed);
    const source = Skills.normalizeSkillState({
      unlockedSkillIds: [drawn.id],
      equippedSkillIds: [drawn.id],
      masteryShards: 7,
      manualCounts: { [drawn.id]: 1 },
    });
    const result = Skills.learnSkillFromManual(source, drawn.id);
    assert.equal(result.isDuplicate, true);
    assert.equal(result.shardsAwarded, Skills.DUPLICATE_SHARDS[star]);
    assert.equal(result.state.masteryShards, 7 + Skills.DUPLICATE_SHARDS[star]);
    assert.equal(result.state.duplicateCounts[drawn.id], 1);
    assert.equal(source.masteryShards, 7);
  }
});

test("owned generic books are consumed into named manuals and refuse empty inventory", () => {
  const base = Skills.createSkillState();
  const granted = Skills.grantSkillBooks(base, 3, 2);
  assert.equal(granted.ok, true);
  assert.equal(granted.state.books[3], 2);
  assert.equal(base.books[3], 0);

  const opened = Skills.openOwnedSkillBook(3, { seed: "owned", serial: 1 }, granted.state);
  assert.equal(opened.ok, true);
  assert.equal(opened.skill.star, 3);
  assert.equal(opened.state.books[3], 1);
  assert.equal(opened.state.manualCounts[opened.skill.id], 1);
  const second = Skills.openOwnedSkillBook(3, { seed: "owned", serial: 2 }, opened.state);
  assert.equal(second.ok, true);
  assert.equal(second.state.books[3], 0);
  assert.equal(Skills.openOwnedSkillBook(3, "owned", second.state).reason, "no-book");
});

test("manual learning requires confirmation-time prerequisites and preserves blocked manuals", () => {
  const blocked = Skills.normalizeSkillState({
    classId: "fighter",
    unlockedSkillIds: ["straight_punch"],
    equippedSkillIds: ["straight_punch"],
    manualCounts: { tiger_chain: 1 },
  });
  const denied = Skills.learnSkillFromManual(blocked, "tiger_chain");
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, "missing-prerequisite");
  assert.deepEqual(denied.missingPrerequisites, ["scatter_burst"]);
  assert.equal(denied.state.manualCounts.tiger_chain, 1);

  const ready = Skills.normalizeSkillState({
    classId: "fighter",
    unlockedSkillIds: ["straight_punch", "rapid_fist", "rising_knuckle", "delayed_punch", "scatter_burst"],
    equippedSkillIds: ["straight_punch"],
    manualCounts: { tiger_chain: 1 },
  });
  assert.equal(Skills.skillLearnability(ready, "tiger_chain").status, "canLearn");
  const learned = Skills.learnSkillFromManual(ready, "tiger_chain");
  assert.equal(learned.ok, true);
  assert.equal(learned.state.unlockedSkillIds.includes("tiger_chain"), true);
  assert.equal(learned.state.manualCounts.tiger_chain, undefined);
  assert.equal(ready.unlockedSkillIds.includes("tiger_chain"), false);
});

test("speed grades order simultaneous actions before initiative and stable actor id", () => {
  assert.ok(Skills.compareSpeedGrades("S", "A") < 0);
  assert.ok(Skills.compareSpeedGrades("A", "B") < 0);
  assert.equal(Skills.compareSpeedGrades("C", "C"), 0);
  assert.deepEqual(
    Skills.orderActionsBySpeed([
      { actorId: "monster-b", speedGrade: "B", initiative: 99 },
      { actorId: "hero", speedGrade: "A", initiative: 1 },
      { actorId: "monster-a", speedGrade: "B", initiative: 99 },
      { actorId: "slow", speedGrade: "F", initiative: 999 },
    ]).map((action) => action.actorId),
    ["hero", "monster-a", "monster-b", "slow"],
  );
});

test("mastery shards can deliberately unlock a missing skill", () => {
  const target = Skills.getSkill("thunder_pillar");
  const cost = Skills.MASTERY_UNLOCK_COST[target.star];
  const source = Skills.normalizeSkillState({
    unlockedSkillIds: ["quick_slash", "lantern_shot", "mist_arrow"],
    equippedSkillIds: ["quick_slash"],
    masteryShards: cost + 4,
  });
  const result = Skills.unlockSkillWithShards(source, target.id);
  assert.equal(result.ok, true);
  assert.equal(result.state.masteryShards, 4);
  assert.equal(result.state.unlockedSkillIds.includes(target.id), true);
  assert.equal(source.masteryShards, cost + 4);
  assert.equal(Skills.unlockSkillWithShards(result.state, target.id).reason, "already-unlocked");
});

test("catalog validator reports malformed custom skills instead of throwing", () => {
  const result = Skills.validateSkillCatalog([{
    id: "Bad id",
    name: "",
    description: "",
    star: 1,
    apCost: 99,
    range: { min: 5, max: 1 },
    area: { shape: "square" },
    power: -1,
    effects: [],
    targeting: { team: "nobody" },
    poolWeight: 0,
  }]);
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 9);
});
