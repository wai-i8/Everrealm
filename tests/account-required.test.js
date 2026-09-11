const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const persistence = fs.readFileSync(path.join(root, "save-persistence.js"), "utf8");
const firebaseClient = fs.readFileSync(path.join(root, "firebase-client.js"), "utf8");
const cloudSave = fs.readFileSync(path.join(root, "cloud-save.js"), "utf8");
const responsiveCss = fs.readFileSync(path.join(root, "responsive-ui-redesign.css"), "utf8");
const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");

test("startup keeps gameplay controls hidden until Firebase Auth and Firestore resolve", () => {
  assert.match(html, /id="exploreSidebar"[^>]*hidden/);
  assert.match(html, /id="titleActions"[^>]*hidden/);
  assert.match(html, /id="continueButton"[^>]*hidden/);
  assert.match(game, /let authStateResolved = false/);
  assert.match(game, /titleActions\.hidden = !canPlay/);
  assert.match(game, /continueButton\.hidden = !canPlay \|\| !savePersistence\?\.hasCloudSave/);
  assert.match(game, /exploreSidebar\.hidden = !\(canPlay && mode !== "title"\)/);
  assert.match(responsiveCss, /#gameStage > #exploreSidebar\[hidden\]\s*\{[\s\S]*?display: none !important;/);
  assert.doesNotMatch(game, /const savedGameAvailable = hasSave/);
});

test("signed-out users cannot enter gameplay through New Game or Continue", () => {
  assert.match(game, /function newGame\([\s\S]*?if \(!requireAuthenticatedGameplay\(\)\) return false;/);
  assert.match(game, /function requestNewGame\(\)[\s\S]*?if \(!requireAuthenticatedGameplay\(\)\) return;/);
  assert.match(game, /function loadGame\([\s\S]*?if \(!requireAuthenticatedGameplay\(\)\) return false;/);
  assert.match(game, /function saveGame\([\s\S]*?if \(!isGameplayAuthorized\(\)\) return false;/);
  assert.match(game, /if \(!user\) \{[\s\S]*?openAuthPanel\("login", true\);/);
});

test("gameplay uses Firebase currentUser.uid for the Firestore session", () => {
  assert.match(firebaseClient, /currentUser: \(\) => authStateUser \|\| authInstance\?\.currentUser \|\| null/);
  assert.match(game, /function authenticatedUid\(\)[\s\S]*?return authenticatedUser\(\)\?\.uid \|\| null;/);
  assert.match(game, /resolveUser\(authenticatedUid\(\)\)/);
  assert.match(game, /savePersistence\?\.save\(payload, \{ uid: authenticatedUid\(\) \}\)/);
  assert.match(cloudSave, /sdk\.doc\(db, PLAYER_COLLECTION, safeUid\)/);
});

test("normal gameplay persistence has no local character fallback or mirror", () => {
  assert.doesNotMatch(game, /localStorage\.(getItem|setItem|removeItem)\([^)]*(save|owner|cache)/i);
  assert.doesNotMatch(persistence, /function writeUnauthenticated/);
  assert.doesNotMatch(persistence, /function promotePrimary/);
  assert.doesNotMatch(persistence, /function writeScoped/);
  assert.match(persistence, /cloud-error/);
  assert.match(persistence, /pendingPayload = clone\(payload\)/);
});

test("logout flushes cloud state before clearing memory, removing gameplay keys, and signing out", () => {
  const start = game.indexOf("async function signOutAccount");
  const end = game.indexOf("\n  async function useLegacySave", start);
  const logout = game.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(logout.indexOf("flushCloud") < logout.indexOf("clearLegacyGameplayKeys"));
  assert.ok(logout.indexOf("clearLegacyGameplayKeys") < logout.indexOf("clearGameplayState"));
  assert.ok(logout.indexOf("clearGameplayState") < logout.indexOf("Firebase.signOut"));
  assert.match(logout, /進度未被捨棄/);
});

test("successful logout returns to the signed-out login experience", () => {
  assert.match(game, /function clearGameplayState\(\)[\s\S]*?mode = "title"/);
  assert.match(game, /function syncAuthenticatedUser\(user\)[\s\S]*?if \(!user\) \{[\s\S]*?clearGameplayState\(\);[\s\S]*?openAuthPanel\("login", true\);/);
  assert.match(game, /authPanel\.dataset\.authRequired = required \? "true" : "false"/);
});

test("Auth restoration resolves the same UID from Firestore instead of browser saves", () => {
  assert.match(firebaseClient, /authStateUser = user \|\| null/);
  assert.match(game, /Firebase\.onAuthStateChanged\(\(user, error\) => \{[\s\S]*?void syncAuthenticatedUser\(user\);/);
  assert.match(persistence, /remote = await cloud\.load\(safeUid\)/);
  assert.match(persistence, /applySaveData\(remote\.data, \{ silent: true, source: "cloud" \}\)/);
  assert.doesNotMatch(game, /if \(!autoplay && mode === "title" && hasSave/);
});

test("legacy migration is explicit, create-if-absent, and cleans only after success", () => {
  assert.match(persistence, /readLegacySave/);
  assert.match(persistence, /setStatus\("legacy-claim"\)/);
  assert.match(persistence, /cloud\.createIfAbsent\(safeUid, local\.data\)/);
  assert.match(persistence, /if \(!migration\.created && migration\.data\)/);
  assert.match(persistence, /applySaveData\(migration\.data \|\| local\.data, \{ silent: true, source: "migration" \}\)/);
  assert.match(persistence, /clearLegacyGameplayKeys\(\);/);
  assert.match(persistence, /setStatus\("cloud-error", error\)/);
});

test("Firestore failure never claims local persistence succeeded", () => {
  assert.match(game, /未能儲存到雲端；今次進度留喺記憶體/);
  assert.match(persistence, /return \{ saved: false, error \}/);
  assert.match(persistence, /pendingPayload = clone\(payload\)/);
  assert.doesNotMatch(game, /localStorage\.setItem\(SAVE_KEY/);
});

test("Firestore ownership rules remain UID-scoped and preference storage remains local", () => {
  assert.match(rules, /request\.auth != null && request\.auth\.uid == userId/);
  for (const key of ["SOUND_KEY", "ZOOM_KEY", "HUD_COLLAPSED_KEY"]) assert.match(game, new RegExp(key));
  assert.doesNotMatch(game, /everrealm-save-v1|everrealm-save-owner-v1|everrealm-save-cache-v1|lanternbound-save-v1/);
});
