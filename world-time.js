(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(null);
  else root.EverrealmWorldTime = factory(root.EverrealmFirebase);
})(typeof globalThis !== "undefined" ? globalThis : this, function (defaultFirebase) {
  "use strict";

  const MINUTES_PER_HOUR = 60;
  const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
  const DEFAULT_REAL_SECONDS_PER_GAME_HOUR = 150;
  const CALENDAR_START_YEAR = 101;
  const DAYS_PER_YEAR = 365;
  const DAYS_PER_MONTH = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function epochMillis(value) {
    if (value && typeof value.toMillis === "function") return value.toMillis();
    if (value && typeof value.seconds === "number") {
      return value.seconds * 1000 + Math.floor(Number(value.nanoseconds) || 0) / 1e6;
    }
    if (value instanceof Date) return value.getTime();
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      return Number.isFinite(parsed) ? parsed : NaN;
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : NaN;
  }

  function normalizeConfig(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const epochRealTime = epochMillis(source.epochRealTime);
    const epochGameDay = Math.max(1, Math.floor(finiteNumber(source.epochGameDay, 1)));
    const epochGameHour = Math.max(0, Math.min(23, Math.floor(finiteNumber(source.epochGameHour, 0))));
    const epochGameMinute = Math.max(0, Math.min(59, Math.floor(finiteNumber(source.epochGameMinute, 0))));
    const realSecondsPerGameHour = finiteNumber(source.realSecondsPerGameHour, DEFAULT_REAL_SECONDS_PER_GAME_HOUR);
    if (!Number.isFinite(epochRealTime) || realSecondsPerGameHour <= 0) {
      throw new Error("Everrealm world/config contains an invalid epoch or clock speed.");
    }
    return Object.freeze({
      version: Math.max(1, Math.floor(finiteNumber(source.version, 1))),
      epochRealTime,
      epochGameDay,
      epochGameHour,
      epochGameMinute,
      realSecondsPerGameHour,
    });
  }

  function calendarDateFromDay(day) {
    const safeDay = Math.max(1, Math.floor(finiteNumber(day, 1)));
    const dayIndex = safeDay - 1;
    const year = CALENDAR_START_YEAR + Math.floor(dayIndex / DAYS_PER_YEAR);
    let dayOfYear = dayIndex % DAYS_PER_YEAR;
    let month = 1;
    for (const daysInMonth of DAYS_PER_MONTH) {
      if (dayOfYear < daysInMonth) break;
      dayOfYear -= daysInMonth;
      month += 1;
    }
    return Object.freeze({ year, month, date: dayOfYear + 1 });
  }

  function calculateTime(config, serverNow) {
    const normalized = normalizeConfig(config);
    const minuteMs = normalized.realSecondsPerGameHour * 1000 / MINUTES_PER_HOUR;
    const elapsedMinutes = Math.max(0, Math.floor((Number(serverNow) - normalized.epochRealTime) / minuteMs));
    const baseMinutes = (normalized.epochGameDay - 1) * MINUTES_PER_DAY
      + normalized.epochGameHour * MINUTES_PER_HOUR
      + normalized.epochGameMinute;
    const totalMinutes = baseMinutes + elapsedMinutes;
    const day = Math.floor(totalMinutes / MINUTES_PER_DAY) + 1;
    const minuteOfDay = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    const hour = Math.floor(minuteOfDay / MINUTES_PER_HOUR);
    const minute = minuteOfDay % MINUTES_PER_HOUR;
    const calendar = calendarDateFromDay(day);
    return Object.freeze({
      day,
      year: calendar.year,
      month: calendar.month,
      date: calendar.date,
      hour,
      minute,
      totalMinutes,
      serverNow: Number(serverNow),
      realSecondsPerGameHour: normalized.realSecondsPerGameHour,
      display: `${calendar.year}年 ${calendar.month}月${calendar.date}日   ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    });
  }

  function create(options = {}) {
    const firebase = options.firebase || defaultFirebase;
    const now = typeof options.now === "function" ? options.now : () => Date.now();
    let config = null;
    let serverTimeOffset = 0;
    let loadPromise = null;
    let offsetUnsubscribe = () => {};

    async function watchServerTimeOffset() {
      if (!firebase || typeof firebase.realtime !== "function") return;
      const { database, sdk } = await firebase.realtime();
      const infoRef = sdk.ref(database, ".info/serverTimeOffset");
      offsetUnsubscribe();
      offsetUnsubscribe = sdk.onValue(infoRef, (snapshot) => {
        serverTimeOffset = finiteNumber(snapshot.val(), 0);
      });
    }

    async function load() {
      if (loadPromise) return loadPromise;
      loadPromise = (async () => {
        if (!firebase || typeof firebase.firestore !== "function") throw new Error("Firebase Firestore is unavailable.");
        const [firestoreResult] = await Promise.all([
          firebase.firestore(),
          watchServerTimeOffset().catch((error) => {
            console.warn("Everrealm server time offset unavailable; using local time until it reconnects.", error);
          }),
        ]);
        const { db, sdk } = firestoreResult;
        const snapshot = await sdk.getDoc(sdk.doc(db, "world", "config"));
        if (!snapshot.exists()) throw new Error("Firestore world/config has not been seeded.");
        config = normalizeConfig(snapshot.data());
        return config;
      })().catch((error) => {
        console.warn("Everrealm shared world clock unavailable.", error);
        return null;
      });
      return loadPromise;
    }

    function serverNow() {
      return now() + serverTimeOffset;
    }

    function getTime() {
      return config ? calculateTime(config, serverNow()) : null;
    }

    function destroy() {
      offsetUnsubscribe();
      offsetUnsubscribe = () => {};
      loadPromise = null;
      config = null;
    }

    return Object.freeze({
      load,
      destroy,
      getConfig: () => config,
      getServerTimeOffset: () => serverTimeOffset,
      getServerNow: serverNow,
      getTime,
      getDay: () => getTime()?.day ?? null,
      getHour: () => getTime()?.hour ?? null,
      getMinute: () => getTime()?.minute ?? null,
    });
  }

  return Object.freeze({
    MINUTES_PER_HOUR,
    MINUTES_PER_DAY,
    DEFAULT_REAL_SECONDS_PER_GAME_HOUR,
    CALENDAR_START_YEAR,
    DAYS_PER_YEAR,
    DAYS_PER_MONTH,
    epochMillis,
    calendarDateFromDay,
    normalizeConfig,
    calculateTime,
    create,
  });
});
