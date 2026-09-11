const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

let rulesTesting;
try {
  rulesTesting = require("@firebase/rules-unit-testing");
} catch (error) {
  console.error("Failed to load @firebase/rules-unit-testing:");
  console.error(error && error.stack ? error.stack : error);
  throw error;
}

test("players rules isolate unauthenticated, USER_A, and USER_B contexts", async () => {
  const { initializeTestEnvironment, assertFails, assertSucceeds } = rulesTesting;
  const testEnv = await initializeTestEnvironment({
    projectId: "everrealm-f5a7d",
    firestore: {
      host: "127.0.0.1",
      port: 18085,
      rules: fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8"),
    },
  });
  try {
    const unauthenticated = testEnv.unauthenticatedContext().firestore();
    const userA = testEnv.authenticatedContext("USER_A").firestore();
    const userB = testEnv.authenticatedContext("USER_B").firestore();
    const playerA = userA.collection("players").doc("USER_A");
    const playerB = userB.collection("players").doc("USER_B");

    // Seed both owner documents through their matching authenticated contexts.
    await assertSucceeds(playerA.set({ version: 1, owner: "USER_A" }));
    await assertSucceeds(playerB.set({ version: 1, owner: "USER_B" }));

    // 1. Unauthenticated access is denied for both reads and writes.
    await assertFails(unauthenticated.collection("players").doc("USER_A").get());
    await assertFails(unauthenticated.collection("players").doc("USER_A").set({ version: 1 }));
    // 2. User A can access players/USER_A.
    await assertSucceeds(playerA.get());
    await assertSucceeds(playerA.set({ version: 1, owner: "USER_A", updated: true }));
    // 3. User A cannot access players/USER_B.
    await assertFails(userA.collection("players").doc("USER_B").get());
    await assertFails(userA.collection("players").doc("USER_B").set({ version: 1, owner: "USER_A" }));
    // 4. User B can access players/USER_B.
    await assertSucceeds(playerB.get());
    await assertSucceeds(playerB.set({ version: 1, owner: "USER_B", updated: true }));
    // 5. User B cannot access players/USER_A.
    await assertFails(userB.collection("players").doc("USER_A").get());
    await assertFails(userB.collection("players").doc("USER_A").set({ version: 1, owner: "USER_B" }));
  } finally {
    await testEnv.clearFirestore();
    await testEnv.cleanup();
  }
});
