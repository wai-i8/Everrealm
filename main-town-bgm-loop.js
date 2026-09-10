(function (root) {
  "use strict";

  const api = root.LanternBgm;
  const AudioContextCtor = root.AudioContext || root.webkitAudioContext;
  if (!api || typeof api.createBgmManager !== "function" || !AudioContextCtor) return;

  const MAIN_TOWN_MAP_ID = "world";
  const MAIN_TOWN_INTRO_URL = "assets/audio/bgm/maintown.mp3?v=20260910-03";
  const MAIN_TOWN_LOOP_URL = "assets/audio/bgm/maintown-loop.mp3?v=20260910-03";
  const INTRO_END_SECONDS = 39.636462585034014;
  const MAIN_TOWN_GAIN = 0.58;

  class MainTownLoopPlayer {
    constructor() {
      this.context = null;
      this.gain = null;
      this.introBuffer = null;
      this.loopBuffer = null;
      this.loadPromise = null;
      this.introSource = null;
      this.loopSource = null;
      this.failed = false;
      this.unlockInstalled = false;
      this.requestSerial = 0;
    }

    ensureContext() {
      if (!this.context) {
        this.context = new AudioContextCtor();
        this.gain = this.context.createGain();
        this.gain.gain.value = MAIN_TOWN_GAIN;
        this.gain.connect(this.context.destination);
        this.installUnlockHandlers();
      }
      return this.context;
    }

    installUnlockHandlers() {
      if (this.unlockInstalled || typeof document === "undefined") return;
      this.unlockInstalled = true;
      const unlock = () => {
        if (!this.context || this.context.state !== "suspended") return;
        this.context.resume().then(() => {
          document.removeEventListener("pointerdown", unlock, true);
          document.removeEventListener("touchstart", unlock, true);
          document.removeEventListener("keydown", unlock, true);
        }).catch(() => {});
      };
      document.addEventListener("pointerdown", unlock, true);
      document.addEventListener("touchstart", unlock, true);
      document.addEventListener("keydown", unlock, true);
    }

    async load() {
      if (this.introBuffer && this.loopBuffer) return { introBuffer: this.introBuffer, loopBuffer: this.loopBuffer };
      if (this.loadPromise) return this.loadPromise;
      const context = this.ensureContext();
      const decode = async (url) => {
        const response = await fetch(url, { cache: "force-cache" });
        if (!response.ok) throw new Error(`BGM HTTP ${response.status}: ${url}`);
        const bytes = await response.arrayBuffer();
        return await context.decodeAudioData(bytes);
      };
      this.loadPromise = Promise.all([
        decode(MAIN_TOWN_INTRO_URL),
        decode(MAIN_TOWN_LOOP_URL),
      ]).then(([introBuffer, loopBuffer]) => {
        this.introBuffer = introBuffer;
        this.loopBuffer = loopBuffer;
        return { introBuffer, loopBuffer };
      }).catch((error) => {
        this.failed = true;
        this.loadPromise = null;
        console.warn("Main Town phrase-blend BGM failed; falling back to the normal BGM manager.", error);
        throw error;
      });
      return this.loadPromise;
    }

    createSource(buffer) {
      const source = this.ensureContext().createBufferSource();
      source.buffer = buffer;
      source.connect(this.gain);
      return source;
    }

    clearFinished(sourceName, source) {
      if (this[sourceName] === source) this[sourceName] = null;
    }

    async start() {
      if (this.failed) throw new Error("Main Town loop player is unavailable.");
      const request = ++this.requestSerial;
      const context = this.ensureContext();

      if (this.introSource || this.loopSource) {
        if (context.state === "suspended") context.resume().catch(() => {});
        return;
      }

      const { introBuffer, loopBuffer } = await this.load();
      if (request !== this.requestSerial) return;
      if (this.introSource || this.loopSource) {
        if (context.state === "suspended") context.resume().catch(() => {});
        return;
      }

      const introDuration = Math.min(INTRO_END_SECONDS, Math.max(0.1, introBuffer.duration));
      const safeLead = 0.03;
      const startAt = context.currentTime + safeLead;

      const introSource = this.createSource(introBuffer);
      introSource.onended = () => this.clearFinished("introSource", introSource);
      introSource.start(startAt, 0, introDuration);
      this.introSource = introSource;

      const loopSource = this.createSource(loopBuffer);
      loopSource.loop = true;
      loopSource.loopStart = 0;
      loopSource.loopEnd = Math.max(0.01, loopBuffer.duration);
      loopSource.onended = () => this.clearFinished("loopSource", loopSource);
      loopSource.start(startAt + introDuration, 0);
      this.loopSource = loopSource;

      if (context.state === "suspended") context.resume().catch(() => {});
    }

    suspend() {
      if (this.context?.state === "running") this.context.suspend().catch(() => {});
    }

    resume() {
      if (!this.introSource && !this.loopSource) return this.start();
      if (this.context?.state === "suspended") this.context.resume().catch(() => {});
      return Promise.resolve();
    }

    stop() {
      this.requestSerial += 1;
      for (const name of ["introSource", "loopSource"]) {
        const source = this[name];
        this[name] = null;
        if (!source) continue;
        source.onended = null;
        try { source.stop(); } catch (_) {}
        try { source.disconnect(); } catch (_) {}
      }
    }

    snapshot() {
      return {
        active: Boolean(this.introSource || this.loopSource),
        contextState: this.context?.state || "uninitialized",
        introUrl: MAIN_TOWN_INTRO_URL,
        loopUrl: MAIN_TOWN_LOOP_URL,
        introEnd: INTRO_END_SECONDS,
        failed: this.failed,
      };
    }
  }

  const originalCreateBgmManager = api.createBgmManager.bind(api);

  function createBgmManager(options = {}) {
    const base = originalCreateBgmManager(options);
    const mainTown = new MainTownLoopPlayer();
    let enabled = options.enabled !== false;
    let currentMapId = null;
    let fallbackToBaseMainTown = false;
    let suspended = false;

    function useBaseForCurrentMap() {
      base.setEnabled?.(enabled);
      if (enabled && currentMapId != null) base.setMap?.(currentMapId);
    }

    function activateMainTown() {
      if (!enabled) {
        base.setEnabled?.(false);
        mainTown.suspend();
        return;
      }
      if (suspended) {
        base.suspend?.();
        mainTown.suspend();
        return;
      }
      if (fallbackToBaseMainTown) {
        base.resume?.();
        useBaseForCurrentMap();
        return;
      }

      base.setEnabled?.(false);
      mainTown.resume().catch(() => {
        if (currentMapId !== MAIN_TOWN_MAP_ID || !enabled) return;
        fallbackToBaseMainTown = true;
        mainTown.stop();
        useBaseForCurrentMap();
      });
    }

    return new Proxy(base, {
      get(target, property, receiver) {
        if (property === "setMap") {
          return (mapId) => {
            const previousMapId = currentMapId;
            currentMapId = mapId;
            if (mapId === MAIN_TOWN_MAP_ID) {
              activateMainTown();
              return;
            }
            if (previousMapId === MAIN_TOWN_MAP_ID) mainTown.stop();
            base.setEnabled?.(enabled);
            const result = target.setMap?.call(target, mapId);
            if (suspended) target.suspend?.call(target);
            return result;
          };
        }

        if (property === "setEnabled") {
          return (nextEnabled) => {
            enabled = Boolean(nextEnabled);
            if (currentMapId === MAIN_TOWN_MAP_ID) {
              activateMainTown();
              return;
            }
            const result = target.setEnabled?.call(target, enabled);
            if (suspended) target.suspend?.call(target);
            return result;
          };
        }

        if (property === "suspend") {
          return () => {
            suspended = true;
            mainTown.suspend();
            target.suspend?.call(target);
          };
        }

        if (property === "resume") {
          return () => {
            suspended = false;
            if (!enabled) return;
            if (currentMapId === MAIN_TOWN_MAP_ID) {
              activateMainTown();
              return;
            }
            target.resume?.call(target);
            if (currentMapId != null) target.setMap?.call(target, currentMapId);
          };
        }

        if (property === "snapshot") {
          return () => {
            const baseSnapshot = typeof target.snapshot === "function" ? target.snapshot() : {};
            return {
              ...baseSnapshot,
              enabled,
              suspended,
              currentMapId,
              mainTownLoop: mainTown.snapshot(),
            };
          };
        }

        const value = Reflect.get(target, property, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }

  root.LanternBgm = Object.assign({}, api, { createBgmManager });
})(typeof window !== "undefined" ? window : globalThis);
