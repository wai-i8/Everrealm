import { applicationDefault, getApp, getApps, initializeApp } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "everrealm-f5a7d";
const WORLD_CONFIG_PATH = "world/config";
const EPOCH_ISO = "2026-09-16T14:00:00.000Z";
const REAL_SECONDS_PER_GAME_HOUR = 150;
const MINUTES_PER_DAY = 24 * 60;

function parseArguments(argv) {
  const unknown = argv.filter((argument) => argument !== "--force");
  if (unknown.length) {
    throw new Error("Unknown argument(s): " + unknown.join(", ") + ". Use only --force when intentionally resetting the world.");
  }
  return { force: argv.includes("--force") };
}

function expectedConfig() {
  return {
    version: 1,
    epochRealTime: Timestamp.fromDate(new Date(EPOCH_ISO)),
    epochGameDay: 1,
    epochGameHour: 0,
    epochGameMinute: 0,
    realSecondsPerGameHour: REAL_SECONDS_PER_GAME_HOUR,
  };
}

function timestampMillis(value) {
  if (value && typeof value.toMillis === "function") return value.toMillis();
  return NaN;
}

function printableConfig(config) {
  const epoch = timestampMillis(config?.epochRealTime);
  return {
    version: config?.version ?? null,
    epochRealTime: Number.isFinite(epoch) ? new Date(epoch).toISOString() : null,
    epochGameDay: config?.epochGameDay ?? null,
    epochGameHour: config?.epochGameHour ?? null,
    epochGameMinute: config?.epochGameMinute ?? null,
    realSecondsPerGameHour: config?.realSecondsPerGameHour ?? null,
  };
}

function verifyConfig(actual, expected) {
  const actualKeys = Object.keys(actual || {}).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error("world/config fields differ. Expected " + expectedKeys.join(", ") + "; got " + actualKeys.join(", ") + ".");
  }
  for (const key of expectedKeys) {
    if (key === "epochRealTime") {
      if (timestampMillis(actual[key]) !== timestampMillis(expected[key])) {
        throw new Error("world/config." + key + " is not the authoritative Firestore Timestamp " + EPOCH_ISO + ".");
      }
    } else if (actual[key] !== expected[key]) {
      throw new Error("world/config." + key + " is " + JSON.stringify(actual[key]) + "; expected " + JSON.stringify(expected[key]) + ".");
    }
  }
  return true;
}

function currentWorldTime(config = expectedConfig(), now = Date.now()) {
  const epoch = timestampMillis(config?.epochRealTime);
  const realSecondsPerGameHour = Number(config?.realSecondsPerGameHour);
  if (!Number.isFinite(epoch) || !Number.isFinite(realSecondsPerGameHour) || realSecondsPerGameHour <= 0) {
    throw new Error("Cannot calculate current Everrealm time from an invalid world/config.");
  }
  const minuteMs = realSecondsPerGameHour * 1000 / 60;
  const elapsedMinutes = Math.max(0, Math.floor((now - epoch) / minuteMs));
  const baseMinutes = (Math.max(1, Number(config?.epochGameDay) || 1) - 1) * MINUTES_PER_DAY
    + (Math.max(0, Number(config?.epochGameHour) || 0) * 60)
    + Math.max(0, Number(config?.epochGameMinute) || 0);
  const totalMinutes = baseMinutes + elapsedMinutes;
  const day = Math.floor(totalMinutes / MINUTES_PER_DAY) + 1;
  const minuteOfDay = totalMinutes % MINUTES_PER_DAY;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return {
    day,
    hour,
    minute,
    display: "Day " + day + "   " + String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0"),
  };
}

async function main() {
  const { force } = parseArguments(process.argv.slice(2));
  if (force) {
    console.warn("WARNING: --force will overwrite the existing authoritative Everrealm world/config epoch.");
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT) {
    console.warn("Using Application Default Credentials. Set GOOGLE_APPLICATION_CREDENTIALS to a local service-account file or authenticate with gcloud ADC; no credential is read from the repository.");
  }

  const app = getApps().length ? getApp() : initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  });
  const firestore = getFirestore(app);
  const reference = firestore.doc(WORLD_CONFIG_PATH);
  const expected = expectedConfig();

  try {
    const existing = await reference.get();
    if (existing.exists && !force) {
      const existingData = existing.data() || {};
      let verified = false;
      let verificationError = null;
      try {
        verifyConfig(existingData, expected);
        verified = true;
      } catch (error) {
        verificationError = error.message;
      }
      let currentEverrealmTime = null;
      let currentEverrealmTimeError = null;
      try {
        currentEverrealmTime = currentWorldTime(existingData).display;
      } catch (error) {
        currentEverrealmTimeError = error.message;
      }
      console.log(JSON.stringify({
        projectId: PROJECT_ID,
        path: WORLD_CONFIG_PATH,
        exists: true,
        overwritten: false,
        verified,
        verificationError,
        values: printableConfig(existingData),
        expectedValues: printableConfig(expected),
        currentEverrealmTime,
        currentEverrealmTimeError,
        message: "world/config already exists; no write performed.",
      }, null, 2));
      return;
    }
    if (existing.exists) await reference.set(expected);
    else await reference.create(expected);

    const verified = await reference.get();
    if (!verified.exists) throw new Error("world/config was not found after seeding.");
    verifyConfig(verified.data(), expected);

    const calculated = currentWorldTime(expected);
    console.log(JSON.stringify({
      projectId: PROJECT_ID,
      path: WORLD_CONFIG_PATH,
      epochRealTime: EPOCH_ISO,
      epochRealTimeType: "Firestore Timestamp",
      values: printableConfig(expected),
      verified: true,
      currentEverrealmTime: calculated.display,
    }, null, 2));
  } finally {
    await app.delete();
  }
}

main().catch((error) => {
  console.error("WorldTime seed failed: " + error.message);
  process.exitCode = 1;
});
