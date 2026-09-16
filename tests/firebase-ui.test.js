const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const manifest = fs.readFileSync(path.join(root, "runtime-assets.js"), "utf8");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const config = fs.readFileSync(path.join(root, "firebase-config.js"), "utf8");
const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const firebaseJson = JSON.parse(fs.readFileSync(path.join(root, "firebase.json"), "utf8"));

test("Firebase client assets are loaded before game runtime and expose account controls", () => {
  for (const asset of ["firebase-config.js", "firebase-client.js", "cloud-save.js", "save-persistence.js"]) {
    assert.ok(manifest.indexOf(`"${asset}`) >= 0, `${asset} should be in the runtime manifest`);
  }
  assert.ok(manifest.indexOf('"firebase-client.js') < manifest.indexOf('"game.js'), "Firebase client must load before game.js");
  for (const id of ["titleActions", "accountButton", "authPanel", "authForm", "legacySavePanel", "systemLogoutButton"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(game, /savePersistence = SavePersistence\?\.create/);
  assert.match(game, /await savePersistence\?\.flushCloud\(\)/);
  assert.match(game, /function isGameplayAuthorized\(\)/);
  assert.match(game, /if \(!requireAuthenticatedGameplay\(\)\) return false/);
  assert.match(game, /continueButton\.hidden = true/);
  assert.match(game, /需要登入才可以開始遊戲/);
});

test("Firebase configuration is public Web config only and rules enforce document ownership", () => {
  assert.match(config, /projectId: "everrealm-f5a7d"/);
  assert.match(config, /appId:/);
  assert.match(config, /databaseURL: "https:\/\/everrealm-f5a7d-default-rtdb\.firebaseio\.com\//);
  assert.doesNotMatch(config, /private_key|client_email|serviceAccount/i);
  assert.match(rules, /match \/players\/{userId}/);
  assert.match(rules, /request\.auth\.uid == userId/);
  assert.deepEqual(firebaseJson.firestore, {
    rules: "firestore.rules",
    indexes: "firestore.indexes.json",
  });
});

test("Realtime Database wiring is transient-only and uses the confirmed rules/config", () => {
  const databaseRules = JSON.parse(fs.readFileSync(path.join(root, "database.rules.json"), "utf8"));
  assert.match(fs.readFileSync(path.join(root, "firebase-client.js"), "utf8"), /firebase-database\.js/);
  assert.match(fs.readFileSync(path.join(root, "firebase-client.js"), "utf8"), /connectDatabaseEmulator/);
  assert.match(JSON.stringify(databaseRules), /exploring/);
  assert.match(JSON.stringify(databaseRules), /battle/);
  assert.equal(firebaseJson.database.rules, "database.rules.json");
  assert.equal(firebaseJson.emulators.database.port, 19000);
  assert.match(fs.readFileSync(path.join(root, "firestore.rules"), "utf8"), /match \/world\/config/);
});
