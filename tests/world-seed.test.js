const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const script = fs.readFileSync(path.join(root, "scripts", "seed-world-config.mjs"), "utf8");
const realtimeDocs = fs.readFileSync(path.join(root, "docs", "REALTIME_SYSTEM.md"), "utf8");
const firestoreRules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const databaseRules = fs.readFileSync(path.join(root, "database.rules.json"), "utf8");
const firebaseRc = JSON.parse(fs.readFileSync(path.join(root, ".firebaserc"), "utf8"));
const firebaseJson = JSON.parse(fs.readFileSync(path.join(root, "firebase.json"), "utf8"));

test("WorldTime seed command is explicit, fixed-epoch and admin-only", () => {
  assert.equal(packageJson.scripts["seed:world"], "node scripts/seed-world-config.mjs");
  assert.match(script, /2026-09-16T14:00:00\.000Z/);
  assert.match(script, /Timestamp\.fromDate/);
  assert.match(script, /reference\.create\(expected\)/);
  assert.match(script, /existing\.exists && !force/);
  assert.match(script, /existingData = existing\.data\(\)/);
  assert.match(script, /verifyConfig\(existingData, expected\)/);
  assert.match(script, /overwritten: false/);
  assert.match(script, /const verified = await reference\.get\(\)/);
  assert.match(script, /verifyConfig\(verified\.data\(\), expected\)/);
  assert.match(script, /currentEverrealmTime: calculated\.display/);
  assert.match(script, /--force/);
  assert.match(script, /GOOGLE_APPLICATION_CREDENTIALS/);
  assert.doesNotMatch(script, /private_key|client_email|serviceAccount|AIzaSy/i);
});

test("WorldTime launch epoch and Firebase rules match the protected Phase 2 contract", () => {
  assert.match(realtimeDocs, /2026-09-16T14:00:00\.000Z/);
  assert.doesNotMatch(realtimeDocs, /2026-09-16T00:00:00\.000Z/);
  assert.match(firestoreRules, /match \/world\/config\s*\{[\s\S]*allow read: if request\.auth != null;[\s\S]*allow write: if false;/);
  assert.match(databaseRules, /"presence"[\s\S]*"\.write": "auth != null && auth\.uid == \$uid"/);
  assert.match(databaseRules, /"maps"[\s\S]*"players"[\s\S]*"\.write": "auth != null && auth\.uid == \$uid"/);
  assert.equal(firebaseRc.projects.default, "everrealm-f5a7d");
  assert.deepEqual(firebaseJson.database, { rules: "database.rules.json" });
  assert.doesNotMatch(fs.readFileSync(path.join(root, "README.md"), "utf8"), /firebase deploy --only hosting/);
});
