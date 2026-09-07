const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const SaveSystem = require("../save-system.js");

const rpgRoot = path.resolve(__dirname, "..");
const gameSource = fs.readFileSync(path.join(rpgRoot, "game.js"), "utf8");
const indexSource = fs.readFileSync(path.join(rpgRoot, "index.html"), "utf8");

test("autosave checkpoint does nothing while state is unchanged", () => {
  let state = "initial";
  let writes = 0;
  const coordinator = SaveSystem.create({
    fingerprint: () => state,
    save: () => { writes += 1; return true; },
  });
  coordinator.markLoaded();
  coordinator.tick(5);
  coordinator.tick(5);
  assert.equal(writes, 0);
  assert.equal(coordinator.isDirty(), false);
});

test("dirty state saves once at the controlled five-second checkpoint and clears only on success", () => {
  let state = "initial";
  let writes = 0;
  const coordinator = SaveSystem.create({
    fingerprint: () => state,
    save: () => { writes += 1; return true; },
  });
  coordinator.markLoaded();
  state = "changed";
  coordinator.markDirty();
  coordinator.tick(4.99);
  assert.equal(writes, 0);
  coordinator.tick(.01);
  assert.equal(writes, 1);
  assert.equal(coordinator.isDirty(), false);
  coordinator.tick(5);
  assert.equal(writes, 1);
});

test("failed save remains dirty and retries on a later checkpoint", () => {
  let attempts = 0;
  const coordinator = SaveSystem.create({
    fingerprint: () => "changed",
    save: () => { attempts += 1; return attempts > 1; },
  });
  coordinator.markLoaded("initial");
  coordinator.markDirty();
  assert.equal(coordinator.tick(5).reason, "failed");
  assert.equal(coordinator.isDirty(), true);
  assert.equal(coordinator.tick(5).saved, true);
  assert.equal(coordinator.isDirty(), false);
  assert.equal(attempts, 2);
});

test("game uses one dirty checkpoint owner and no idle pause modal workflow", () => {
  assert.match(gameSource, /const SaveSystem = window\.EverrealmSaveSystem/);
  assert.match(gameSource, /persistence = SaveSystem\.create\(/);
  assert.match(gameSource, /persistence\?\.tick\(dt\)/);
  assert.match(gameSource, /function markPersistenceDirty\(\)/);
  assert.match(gameSource, /function saveImportant\(/);
  assert.doesNotMatch(gameSource, /autosaveTimer/);
  assert.doesNotMatch(gameSource, /togglePause|modeBeforePause|NIGHT WATCH PAUSED/);
  assert.doesNotMatch(indexSource, /pausePanel|NIGHT WATCH PAUSED|停一停/);
  assert.equal((gameSource.match(/persistence\?\.tick\(dt\)/g) || []).length, 1);
});

test("meaningful progression operations mark persistence dirty or use the important-event wrapper", () => {
  for (const pattern of [
    /function transitionMap\([\s\S]*?saveImportant\(false\)/,
    /function changeEquipment\([\s\S]*?saveImportant\(false\)/,
    /function changeSkillLoadout\([\s\S]*?saveImportant\(false\)/,
    /function confirmSkillManualLearning\([\s\S]*?saveImportant\(false\)/,
    /function claimGuildContract\([\s\S]*?saveImportant\(false\)/,
    /function useBagPotion\([\s\S]*?markPersistenceDirty\(\)/,
  ]) assert.match(gameSource, pattern);
});
