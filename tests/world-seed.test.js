const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const script = fs.readFileSync(path.join(root, "scripts", "seed-world-config.mjs"), "utf8");

test("WorldTime seed command is explicit, fixed-epoch and admin-only", () => {
  assert.equal(packageJson.scripts["seed:world"], "node scripts/seed-world-config.mjs");
  assert.match(script, /2026-09-16T14:00:00\.000Z/);
  assert.match(script, /Timestamp\.fromDate/);
  assert.match(script, /reference\.create\(expected\)/);
  assert.match(script, /--force/);
  assert.match(script, /GOOGLE_APPLICATION_CREDENTIALS/);
  assert.doesNotMatch(script, /private_key|client_email|serviceAccount|AIzaSy/i);
});
