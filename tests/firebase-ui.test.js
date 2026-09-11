const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const config = fs.readFileSync(path.join(root, "firebase-config.js"), "utf8");
const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const firebaseJson = JSON.parse(fs.readFileSync(path.join(root, "firebase.json"), "utf8"));

test("Firebase client assets are loaded before game runtime and expose account controls", () => {
  for (const asset of ["firebase-config.js", "firebase-client.js", "cloud-save.js", "save-persistence.js"]) {
    assert.ok(html.indexOf(`"${asset}"`) >= 0, `${asset} should be in the runtime manifest`);
  }
  assert.ok(html.indexOf('"firebase-client.js"') < html.indexOf('"game.js'), "Firebase client must load before game.js");
  for (const id of ["accountButton", "authPanel", "authForm", "legacySavePanel", "systemLogoutButton"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(game, /savePersistence = SavePersistence\?\.create/);
  assert.match(game, /await savePersistence\?\.flushCloud\(\)/);
});

test("Firebase configuration is public Web config only and rules enforce document ownership", () => {
  assert.match(config, /projectId: "everrealm-f5a7d"/);
  assert.match(config, /appId:/);
  assert.doesNotMatch(config, /databaseURL|private_key|client_email|serviceAccount/i);
  assert.match(rules, /match \/players\/{userId}/);
  assert.match(rules, /request\.auth\.uid == userId/);
  assert.deepEqual(firebaseJson.firestore, {
    rules: "firestore.rules",
    indexes: "firestore.indexes.json",
  });
});
