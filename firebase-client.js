(function (root) {
  "use strict";

  const config = root.EverrealmFirebaseConfig;
  const SDK_VERSION = "11.10.0";
  const SDK_BASE = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;
  const SESSION_COLLECTION = "sessions";
  const SESSION_STORAGE_PREFIX = "everrealm-device-session-v1:";
  const useEmulators = new URLSearchParams(window.location.search).has("firebase-emulator");
  let authInstance = null;
  let authStateUser = null;
  let forceNextSessionClaim = false;
  let activeSessionUid = null;
  let activeSessionId = null;
  let sessionUnsubscribe = () => {};

  function assertConfig() {
    if (!config || config.projectId !== "everrealm-f5a7d" || !config.appId) {
      throw new Error("Everrealm Firebase Web configuration is missing or targets the wrong project.");
    }
  }

  function randomSessionId() {
    if (root.crypto?.randomUUID) return root.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    root.crypto?.getRandomValues?.(bytes);
    const random = bytes.some((value) => value !== 0)
      ? [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("")
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    return `er-${random}`;
  }

  function deviceSessionId(uid) {
    const safeUid = String(uid || "").trim();
    if (!safeUid) throw new Error("A Firebase UID is required for a device session.");
    const key = `${SESSION_STORAGE_PREFIX}${safeUid}`;
    try {
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const created = randomSessionId();
      localStorage.setItem(key, created);
      return created;
    } catch (_) {
      return randomSessionId();
    }
  }

  function stopSessionWatch() {
    try { sessionUnsubscribe(); } catch (_) {}
    sessionUnsubscribe = () => {};
    activeSessionUid = null;
    activeSessionId = null;
  }

  const ready = Promise.resolve().then(async () => {
    assertConfig();
    const [appSdk, authSdk, firestoreSdk] = await Promise.all([
      import(`${SDK_BASE}/firebase-app.js`),
      import(`${SDK_BASE}/firebase-auth.js`),
      import(`${SDK_BASE}/firebase-firestore.js`),
    ]);
    const firebaseApp = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(config);
    const auth = authSdk.getAuth(firebaseApp);
    const db = firestoreSdk.getFirestore(firebaseApp);
    authInstance = auth;
    if (useEmulators) {
      authSdk.connectAuthEmulator(auth, "http://127.0.0.1:19099", { disableWarnings: true });
      firestoreSdk.connectFirestoreEmulator(db, "127.0.0.1", 18085);
    }
    return Object.freeze({ appSdk, authSdk, firestoreSdk, firebaseApp, auth, db });
  });

  function authCall(method, ...args) {
    return ready.then(({ authSdk, auth }) => authSdk[method](auth, ...args));
  }

  function onAuthStateChanged(callback) {
    let active = true;
    let unsubscribe = () => {};
    ready.then(({ authSdk, auth }) => {
      if (active) {
        unsubscribe = authSdk.onAuthStateChanged(auth, (user) => {
          authStateUser = user || null;
          if (!user) stopSessionWatch();
          callback(user);
        });
      }
    }).catch((error) => {
      if (active) callback(null, error);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }

  async function activateSingleSession(uid, onInvalidated) {
    const safeUid = String(uid || "").trim();
    if (!safeUid) throw new Error("A Firebase UID is required for a device session.");
    const { db, firestoreSdk: sdk } = await ready;
    const sessionId = deviceSessionId(safeUid);
    const ref = sdk.doc(db, SESSION_COLLECTION, safeUid);
    const forceClaim = forceNextSessionClaim;
    forceNextSessionClaim = false;

    stopSessionWatch();

    if (forceClaim) {
      await sdk.setDoc(ref, { sessionId, updatedAt: sdk.serverTimestamp() });
    } else {
      const snapshot = await sdk.getDoc(ref);
      if (!snapshot.exists()) {
        await sdk.setDoc(ref, { sessionId, updatedAt: sdk.serverTimestamp() });
      } else if (String(snapshot.data()?.sessionId || "") !== sessionId) {
        return { active: false, reason: "replaced", sessionId };
      }
    }

    activeSessionUid = safeUid;
    activeSessionId = sessionId;
    let invalidated = false;
    sessionUnsubscribe = sdk.onSnapshot(ref, (snapshot) => {
      if (invalidated || activeSessionUid !== safeUid || activeSessionId !== sessionId) return;
      const remoteSessionId = snapshot.exists() ? String(snapshot.data()?.sessionId || "") : "";
      if (remoteSessionId === sessionId) return;
      invalidated = true;
      stopSessionWatch();
      onInvalidated?.({ uid: safeUid, sessionId, remoteSessionId, reason: "replaced" });
    }, (error) => {
      console.warn("Everrealm session watch failed.", error);
    });

    return { active: true, sessionId };
  }

  function signIn(email, password) {
    forceNextSessionClaim = true;
    return authCall("signInWithEmailAndPassword", String(email || "").trim(), String(password || "")).catch((error) => {
      forceNextSessionClaim = false;
      throw error;
    });
  }

  function createAccount(email, password) {
    forceNextSessionClaim = true;
    return authCall("createUserWithEmailAndPassword", String(email || "").trim(), String(password || "")).catch((error) => {
      forceNextSessionClaim = false;
      throw error;
    });
  }

  const api = {
    ready,
    onAuthStateChanged,
    activateSingleSession,
    deactivateSingleSession: stopSessionWatch,
    currentSessionId: () => activeSessionId,
    currentUser: () => authStateUser || authInstance?.currentUser || null,
    signIn,
    createAccount,
    sendPasswordReset: (email) => authCall("sendPasswordResetEmail", String(email || "").trim()),
    signOut: () => {
      stopSessionWatch();
      return ready.then(({ authSdk, auth }) => authSdk.signOut(auth));
    },
    firestore: () => ready.then(({ firestoreSdk, db }) => ({ db, sdk: firestoreSdk })),
  };

  root.EverrealmFirebase = Object.freeze(api);
  ready.catch((error) => {
    console.warn("Everrealm Firebase unavailable; account-required gameplay is unavailable.", error);
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
