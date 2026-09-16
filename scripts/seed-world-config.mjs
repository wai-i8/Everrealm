import { applicationDefault, getApp, getApps, initializeApp } from "firebase-admin/app";
import { Timestamp, getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "everrealm-f5a7d";
const WORLD_CONFIG_PATH = "world/config";
const EPOCH_ISO = "2026-09-16T14:00:00.000Z";
const REAL_SECONDS_PER_GAME_HOUR = 150;
const MINUTES_PER_DAY = 24 * 60;
const MINUTE_MS = REAL_SECONDS_PER_GAME_HOUR * 1000 / 60;

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

function currentWorldTime(now = Date.now()) {
  const epoch = Date.parse(EPOCH_ISO);
  const elapsedMinutes = Math.max(0, Math.floor((now - epoch) / MINUTE_MS));
  const day = Math.floor(elapsedMinutes / MINUTES_PER_DAY) + 1;
  const minuteOfDay = elapsedMinutes % MINUTES_PER_DAY;
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
      throw new Error("world/config already exists. Refusing to overwrite it; use --force only for an intentional reset.");
    }
    if (existing.exists) await reference.set(expected);
    else await reference.create(expected);

    const verified = await reference.get();
    if (!verified.exists) throw new Error("world/config was not found after seeding.");
    verifyConfig(verified.data(), expected);

    const calculated = currentWorldTime();
    console.log(JSON.stringify({
      projectId: PROJECT_ID,
      path: WORLD_CONFIG_PATH,
      epochRealTime: EPOCH_ISO,
      epochRealTimeType: "Firestore Timestamp",
      values: {
        version: expected.version,
        epochGameDay: expected.epochGameDay,
        epochGameHour: expected.epochGameHour,
        epochGameMinute: expected.epochGameMinute,
        realSecondsPerGameHour: expected.realSecondsPerGameHour,
      },
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
