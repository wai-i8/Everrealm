(function (root) {
  "use strict";

  const config = root.EverrealmFirebaseConfig;
  const SDK_VERSION = "11.10.0";
  const SDK_BASE = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;
  const useEmulators = new URLSearchParams(window.location.search).has("firebase-emulator");
  let authInstance = null;
  let authStateUser = null;

  function assertConfig() {
    if (!config || config.projectId !== "everrealm-f5a7d" || !config.appId) {
      throw new Error("Everrealm Firebase Web configuration is missing or targets the wrong project.");
    }
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

  const api = {
    ready,
    onAuthStateChanged,
    currentUser: () => authStateUser || authInstance?.currentUser || null,
    signIn: (email, password) => authCall("signInWithEmailAndPassword", String(email || "").trim(), String(password || "")),
    createAccount: (email, password) => authCall("createUserWithEmailAndPassword", String(email || "").trim(), String(password || "")),
    sendPasswordReset: (email) => authCall("sendPasswordResetEmail", String(email || "").trim()),
    signOut: () => ready.then(({ authSdk, auth }) => authSdk.signOut(auth)),
    firestore: () => ready.then(({ firestoreSdk, db }) => ({ db, sdk: firestoreSdk })),
  };

  root.EverrealmFirebase = Object.freeze(api);
  ready.catch((error) => {
    console.warn("Everrealm Firebase unavailable; account-required gameplay is unavailable.", error);
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
