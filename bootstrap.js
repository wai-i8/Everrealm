(function (root) {
  "use strict";

  const Firebase = root.EverrealmFirebase;
  const manifest = root.EverrealmRuntimeAssets;
  const asset = root.EverrealmDev?.asset || ((url) => url);
  const stage = document.getElementById("gameStage");
  const titleAccountStatus = document.getElementById("titleAccountStatus");
  const titleAccountText = document.getElementById("titleAccountText");
  const accountButton = document.getElementById("accountButton");
  const titleLogoutButton = document.getElementById("titleLogoutButton");
  const titleActions = document.getElementById("titleActions");
  const authPanel = document.getElementById("authPanel");
  const authForm = document.getElementById("authForm");
  const authKicker = document.getElementById("authKicker");
  const authTitle = document.getElementById("authTitle");
  const authMessage = document.getElementById("authMessage");
  const authCharacterNameRow = document.getElementById("authCharacterNameRow");
  const authCharacterName = document.getElementById("authCharacterName");
  const authEmail = document.getElementById("authEmail");
  const authPassword = document.getElementById("authPassword");
  const authConfirmRow = document.getElementById("authConfirmRow");
  const authConfirmPassword = document.getElementById("authConfirmPassword");
  const authSubmitButton = document.getElementById("authSubmitButton");
  const authSwitchButton = document.getElementById("authSwitchButton");
  const authForgotButton = document.getElementById("authForgotButton");
  const authCloseButton = document.getElementById("authCloseButton");

  let authMode = "login";
  let authUnsubscribe = () => {};
  let runtimePromise = null;
  let handedOff = false;
  let authOperationPending = false;
  let deferredAuthUser = null;
  let runtimePrefetchStarted = false;

  // Start fetching the title/login track before the full game runtime. On a
  // signed-in refresh this gives the loading screen music immediately instead
  // of waiting for every gameplay module to finish loading.
  const BOOT_TITLE_BGM_SRC = asset("assets/audio/bgm/login-v1-01-loop.mp3?v=20260919-fourfix-01");
  const bootTitleBgm = root.__everrealmBootTitleBgm || (typeof Audio === "function" ? new Audio(BOOT_TITLE_BGM_SRC) : null);
  let bootTitleBgmWanted = false;
  if (bootTitleBgm) {
    root.__everrealmBootTitleBgm = bootTitleBgm;
    bootTitleBgm.loop = true;
    bootTitleBgm.preload = "auto";
    let storedVolume = .7;
    try {
      const parsed = Number(localStorage.getItem("everrealm-bgm-volume-v1"));
      if (Number.isFinite(parsed)) storedVolume = Math.max(0, Math.min(1, parsed));
    } catch (_) {}
    bootTitleBgm.volume = storedVolume;
    try { bootTitleBgm.load(); } catch (_) {}
  }

  function startBootTitleBgm() {
    bootTitleBgmWanted = true;
    if (!bootTitleBgm || document.visibilityState !== "visible" || bootTitleBgm.paused === false) return Promise.resolve(false);
    try {
      return Promise.resolve(bootTitleBgm.play()).then(() => true).catch(() => false);
    } catch (_) {
      return Promise.resolve(false);
    }
  }

  function prepareBootTitleBgm({ timeoutMs = 3200 } = {}) {
    if (!bootTitleBgm) return Promise.resolve(false);
    // Let the tiny login track win the initial network race before the large
    // gameplay script batch starts.  Without this gate browsers can defer the
    // media request behind dozens of scripts, making the title music audible
    // only after the loading counter has already finished.
    if (bootTitleBgm.readyState >= 3) return startBootTitleBgm();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        bootTitleBgm.removeEventListener("canplay", finish);
        bootTitleBgm.removeEventListener("canplaythrough", finish);
        clearTimeout(timer);
        Promise.resolve(startBootTitleBgm()).finally(() => resolve(true));
      };
      const timer = setTimeout(finish, Math.max(400, Number(timeoutMs) || 3200));
      bootTitleBgm.addEventListener("canplay", finish, { once: true });
      bootTitleBgm.addEventListener("canplaythrough", finish, { once: true });
      try { bootTitleBgm.load(); } catch (_) { finish(); }
    });
  }

  function retryBootTitleBgmFromGesture() {
    if (!bootTitleBgmWanted || handedOff) return;
    startBootTitleBgm();
  }

  root.addEventListener("pointerdown", retryBootTitleBgmFromGesture, { capture: true, passive: true });
  root.addEventListener("touchstart", retryBootTitleBgmFromGesture, { capture: true, passive: true });
  root.addEventListener("keydown", retryBootTitleBgmFromGesture, { capture: true });

  // Try from the very start of bootstrap, before authentication and before the
  // large runtime batch. Browsers that allow persisted media playback can
  // therefore keep the login track running through the whole loading screen.
  startBootTitleBgm();

  function authErrorMessage(error) {
    const code = String(error?.code || "");
    const messages = {
      "auth/invalid-credential": "Email 或密碼不正確。",
      "auth/invalid-email": "請輸入有效的 Email。",
      "auth/email-already-in-use": "此 Email 已經註冊帳戶。",
      "auth/weak-password": "密碼至少需要 6 個字元。",
      "auth/too-many-requests": "嘗試次數太多，請稍後再試。",
      "auth/network-request-failed": "網絡連線失敗，請檢查連線後再試。",
    };
    return messages[code] || "帳戶服務暫時未能完成操作，請稍後再試。";
  }

  function setAuthMessage(message = "", kind = "") {
    if (!authMessage) return;
    authMessage.textContent = message;
    authMessage.dataset.kind = kind;
  }

  function setAuthMode(modeName = "login") {
    authMode = modeName === "register" ? "register" : "login";
    const registering = authMode === "register";
    authKicker.textContent = registering ? "CREATE ACCOUNT" : "ACCOUNT";
    authTitle.textContent = registering ? "建立旅程帳戶" : "登入旅程";
    authCharacterNameRow.hidden = !registering;
    authCharacterName.required = registering;
    authConfirmRow.hidden = !registering;
    authConfirmPassword.required = registering;
    authSubmitButton.querySelector("span").textContent = registering ? "建立帳戶" : "登入";
    authSwitchButton.querySelector("span").textContent = registering ? "返回登入" : "建立帳戶";
    authPassword.autocomplete = registering ? "new-password" : "current-password";
    setAuthMessage("");
  }

  function openAuthPanel(modeName = "login", required = true) {
    if (!authPanel || handedOff) return;
    setAuthMode(modeName);
    authPanel.dataset.authRequired = required ? "true" : "false";
    authCloseButton.hidden = required;
    authPanel.hidden = false;
    requestAnimationFrame(() => authEmail?.focus?.({ preventScroll: true }));
  }

  function closeAuthPanel() {
    if (!authPanel) return;
    authPanel.hidden = true;
    authPanel.dataset.authRequired = "false";
    authCloseButton.hidden = false;
  }

  function scheduleRuntimePrefetch() {
    if (runtimePrefetchStarted || runtimePromise) return;
    runtimePrefetchStarted = true;
    const sources = Array.isArray(manifest?.scripts) ? manifest.scripts.map(asset) : [];
    let cursor = 0;
    const nextBatch = () => {
      if (runtimePromise || cursor >= sources.length) return;
      const end = Math.min(sources.length, cursor + 10);
      while (cursor < end) {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "script";
        link.href = sources[cursor++];
        document.head.appendChild(link);
      }
      if (cursor < sources.length) {
        if ("requestIdleCallback" in root) root.requestIdleCallback(nextBatch, { timeout: 1500 });
        else root.setTimeout(nextBatch, 250);
      }
    };
    if ("requestIdleCallback" in root) root.requestIdleCallback(nextBatch, { timeout: 1200 });
    else root.setTimeout(nextBatch, 300);
  }

  function setSignedOutUi() {
    if (handedOff) return;
    stage.dataset.authState = "signed-out";
    titleActions.hidden = true;
    titleAccountStatus.dataset.authState = "signed-out";
    titleAccountText.textContent = "需要登入才可以開始遊戲";
    accountButton.hidden = false;
    titleLogoutButton.hidden = true;
    openAuthPanel("login", true);
    scheduleRuntimePrefetch();
  }

  function setLoadingUi(user, loaded = 0, total = 0) {
    startBootTitleBgm();
    closeAuthPanel();
    titleActions.hidden = true;
    accountButton.hidden = true;
    titleLogoutButton.hidden = true;
    titleAccountStatus.dataset.authState = "signed-in";
    stage.dataset.authState = "loading";
    const progress = total > 0 ? ` · ${loaded}/${total}` : "";
    titleAccountText.textContent = `${user?.email || "已登入"} · 載入旅程中${progress}`;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.async = false;
      script.src = asset(src);
      script.dataset.everrealmRuntime = "1";
      script.addEventListener("load", () => resolve(src), { once: true });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      document.body.appendChild(script);
    });
  }

  // Classic dynamically-inserted scripts with async=false keep execution order,
  // while the browser is still free to fetch several of them concurrently.
  function loadOrderedBatch(sources, onProgress) {
    if (!sources.length) return Promise.resolve();
    let loaded = 0;
    return new Promise((resolve, reject) => {
      const pending = sources.map((src) => {
        const script = document.createElement("script");
        script.async = false;
        script.src = asset(src);
        script.dataset.everrealmRuntime = "1";
        const promise = new Promise((done, fail) => {
          script.addEventListener("load", () => {
            loaded += 1;
            onProgress?.(loaded, sources.length);
            done(src);
          }, { once: true });
          script.addEventListener("error", () => fail(new Error(`Failed to load ${src}`)), { once: true });
        });
        document.body.appendChild(script);
        return promise;
      });
      Promise.all(pending).then(() => resolve(), reject);
    });
  }

  function cleanupBootUiHandlers() {
    root.removeEventListener("pointerdown", retryBootTitleBgmFromGesture, { capture: true });
    root.removeEventListener("touchstart", retryBootTitleBgmFromGesture, { capture: true });
    root.removeEventListener("keydown", retryBootTitleBgmFromGesture, { capture: true });
    authForm?.removeEventListener("submit", handleAuthSubmit);
    authSwitchButton?.removeEventListener("click", handleAuthSwitch);
    authForgotButton?.removeEventListener("click", handlePasswordReset);
    accountButton?.removeEventListener("click", handleAccountOpen);
    authCloseButton?.removeEventListener("click", handleAuthClose);
  }

  function scheduleWarmAssets() {
    const urls = Array.isArray(manifest?.warmAssets)
      ? manifest.warmAssets.map((src) => new URL(asset(src), document.baseURI).href)
      : [];
    if (!urls.length) return;
    const run = () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.active?.postMessage?.({ type: "WARM_ASSETS", urls });
        }).catch(() => {});
      }
      // Browser-native low-priority prefetch also covers the first visit before
      // a service worker has taken control.
      for (const href of urls.slice(0, 8)) {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = href;
        document.head.appendChild(link);
      }
    };
    if ("requestIdleCallback" in root) root.requestIdleCallback(run, { timeout: 2500 });
    else root.setTimeout(run, 1200);
  }

  function startRuntime(user) {
    if (runtimePromise) return runtimePromise;
    const scripts = Array.isArray(manifest?.scripts) ? [...manifest.scripts] : [];
    if (!scripts.length) {
      const error = new Error("Everrealm runtime asset manifest failed to load.");
      setAuthMessage(error.message, "error");
      return Promise.reject(error);
    }
    const gameIndex = scripts.findIndex((src) => /^game\.js(?:\?|$)/.test(String(src)));
    if (gameIndex < 0) {
      const error = new Error("Everrealm game runtime entry is missing.");
      setAuthMessage(error.message, "error");
      return Promise.reject(error);
    }
    const dependencies = scripts.slice(0, gameIndex);
    const entry = scripts[gameIndex];
    const total = scripts.length;
    setLoadingUi(user, 0, total);

    runtimePromise = prepareBootTitleBgm()
      .then(() => loadOrderedBatch(dependencies, (loaded) => setLoadingUi(user, loaded, total)))
      .then(() => {
        authUnsubscribe();
        handedOff = true;
        return loadScript(entry);
      })
      .then(() => {
        cleanupBootUiHandlers();
        root.dispatchEvent(new CustomEvent("everrealm-runtime-ready"));
        scheduleWarmAssets();
      })
      .catch((error) => {
        console.error("Everrealm runtime failed to load.", error);
        titleAccountStatus.dataset.authState = "error";
        titleAccountText.textContent = "遊戲載入失敗，請重新整理後再試";
        if (!handedOff) {
          accountButton.hidden = false;
          setAuthMessage("遊戲檔案未能完成載入，請重新整理後再試。", "error");
        }
        throw error;
      });
    return runtimePromise;
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (runtimePromise) return;
    // This call is still inside the trusted submit gesture, so browsers that
    // block autoplay can unlock the login track before the async sign-in wait.
    startBootTitleBgm();
    const email = authEmail.value.trim();
    const password = authPassword.value;
    const characterName = authMode === "register" ? String(authCharacterName.value || "").trim().slice(0, 24) : "";
    if (authMode === "register" && !characterName) {
      setAuthMessage("請輸入角色名稱。", "error");
      authCharacterName.focus({ preventScroll: true });
      return;
    }
    if (authMode === "register" && password !== authConfirmPassword.value) {
      setAuthMessage("兩次輸入的密碼不一致。", "error");
      return;
    }
    authSubmitButton.disabled = true;
    authSwitchButton.disabled = true;
    authForgotButton.disabled = true;
    authOperationPending = true;
    deferredAuthUser = null;
    setAuthMessage("處理中…");
    try {
      if (authMode === "register") await Firebase.createAccount(email, password, { displayName: characterName });
      else await Firebase.signIn(email, password);
      authOperationPending = false;
      closeAuthPanel();
      const user = Firebase.currentUser?.() || deferredAuthUser;
      deferredAuthUser = null;
      if (user) void startRuntime(user);
    } catch (error) {
      authOperationPending = false;
      deferredAuthUser = null;
      setAuthMessage(authErrorMessage(error), "error");
      authSubmitButton.disabled = false;
      authSwitchButton.disabled = false;
      authForgotButton.disabled = false;
    }
  }

  function handleAuthSwitch() {
    if (runtimePromise) return;
    setAuthMode(authMode === "register" ? "login" : "register");
  }

  async function handlePasswordReset() {
    const email = authEmail.value.trim();
    if (!email) {
      setAuthMessage("先輸入 Email，再寄出重設電郵。", "error");
      authEmail.focus({ preventScroll: true });
      return;
    }
    authForgotButton.disabled = true;
    try {
      await Firebase.sendPasswordReset(email);
      setAuthMessage("重設密碼電郵已寄出，請檢查收件匣。", "good");
    } catch (error) {
      setAuthMessage(authErrorMessage(error), "error");
    } finally {
      if (!runtimePromise) authForgotButton.disabled = false;
    }
  }

  function handleAccountOpen() { openAuthPanel("login", true); }
  function handleAuthClose() {
    if (authPanel?.dataset.authRequired === "true") return;
    closeAuthPanel();
  }

  if (!Firebase?.onAuthStateChanged || !manifest?.scripts) {
    titleAccountStatus.dataset.authState = "error";
    titleAccountText.textContent = "登入模組載入失敗";
    return;
  }

  authForm?.addEventListener("submit", handleAuthSubmit);
  authSwitchButton?.addEventListener("click", handleAuthSwitch);
  authForgotButton?.addEventListener("click", handlePasswordReset);
  accountButton?.addEventListener("click", handleAccountOpen);
  authCloseButton?.addEventListener("click", handleAuthClose);

  authUnsubscribe = Firebase.onAuthStateChanged((user, error) => {
    if (handedOff) return;
    if (error) {
      titleAccountStatus.dataset.authState = "error";
      titleAccountText.textContent = "未能確認帳戶";
      openAuthPanel("login", true);
      setAuthMessage(authErrorMessage(error), "error");
      return;
    }
    if (!user) {
      if (!authOperationPending) setSignedOutUi();
      return;
    }
    if (authOperationPending) {
      deferredAuthUser = user;
      setLoadingUi(user);
      return;
    }
    setLoadingUi(user);
    void startRuntime(user);
  });

  root.EverrealmBoot = Object.freeze({
    runtimeReady: () => runtimePromise || Promise.resolve(false),
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
