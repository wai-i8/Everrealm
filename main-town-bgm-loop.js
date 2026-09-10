(function (root) {
  "use strict";

  const api = root.LanternBgm;
  const AudioContextCtor = root.AudioContext || root.webkitAudioContext;
  if (!api || typeof api.createBgmManager !== "function" || !AudioContextCtor) return;

  const MAIN_TOWN_MAP_ID = "world";
  const MAIN_TOWN_BGM_URL = "assets/audio/bgm/maintown.mp3";
  const LOOP_START_SECONDS = 14.209977;
  const LOOP_END_SECONDS = 118.119274;
  const MAIN_TOWN_GAIN = 0.58;

  class MainTownLoopPlayer {
    constructor() {
      this.context = null;
      this.buffer = null;
      this.loadPromise = null;
      this.source = null;
      this.gain = null;
      this.requestSerial = 0;
      this.failed = false;
      this.unlockInstalled = false;
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
      if (this.buffer) return this.buffer;
      if (this.loadPromise) return this.loadPromise;
      const context = this.ensureContext();
      this.loadPromise = fetch(MAIN_TOWN_BGM_URL, { cache: "force-cache" })
        .then((response) => {
          if (!response.ok) throw new Error(`Main Town BGM HTTP ${response.status}`);
          return response.arrayBuffer();
        })
        .then((bytes) => context.decodeAudioData(bytes))
        .then((buffer) => {
          this.buffer = buffer;
          return buffer;
        })
        .catch((error) => {
          this.failed = true;
          this.loadPromise = null;
          console.warn("Main Town seamless-loop BGM failed; falling back to the normal BGM manager.", error);
          throw error;
        });
      return this.loadPromise;
    }

    async start() {
      if (this.failed) throw new Error("Main Town seamless-loop player is unavailable.");
      const request = ++this.requestSerial;
      const context = this.ensureContext();

      if (this.source) {
        if (context.state === "suspended") context.resume().catch(() => {});
        return;
      }

      const buffer = await this.load();
      if (request !== this.requestSerial || this.source) return;

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = Math.min(LOOP_START_SECONDS, Math.max(0, buffer.duration - 0.01));
      source.loopEnd = Math.min(LOOP_END_SECONDS, buffer.duration);
      source.connect(this.gain);
      source.onended = () => {
        if (this.source === source) this.source = null;
      };
      this.source = source;

      // Start at 0 once. Web Audio then loops only LOOP_START -> LOOP_END.
      source.start(0, 0);
      if (context.state === "suspended") context.resume().catch(() => {});
    }

    suspend() {
      if (this.context?.state === "running") this.context.suspend().catch(() => {});
    }

    resume() {
      if (!this.source) return this.start();
      if (this.context?.state === "suspended") this.context.resume().catch(() => {});
      return Promise.resolve();
    }

    stop() {
      this.requestSerial += 1;
      if (!this.source) return;
      const source = this.source;
      this.source = null;
      source.onended = null;
      try { source.stop(); } catch (_) {}
      try { source.disconnect(); } catch (_) {}
    }

    snapshot() {
      return {
        active: Boolean(this.source),
        contextState: this.context?.state || "uninitialized",
        loopStart: LOOP_START_SECONDS,
        loopEnd: LOOP_END_SECONDS,
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
      if (fallbackToBaseMainTown) {
        useBaseForCurrentMap();
        return;
      }

      // The stock manager must stay silent in Main Town or both tracks would play.
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
              // Repeated setMap("world") calls (e.g. after battle) must resume,
              // not restart the one-shot intro.
              activateMainTown();
              return;
            }
            if (previousMapId === MAIN_TOWN_MAP_ID) mainTown.stop();
            base.setEnabled?.(enabled);
            return target.setMap?.call(target, mapId);
          };
        }

        if (property === "setEnabled") {
          return (nextEnabled) => {
            enabled = Boolean(nextEnabled);
            if (currentMapId === MAIN_TOWN_MAP_ID) {
              activateMainTown();
              return;
            }
            return target.setEnabled?.call(target, enabled);
          };
        }

        if (property === "snapshot") {
          return () => {
            const baseSnapshot = typeof target.snapshot === "function" ? target.snapshot() : {};
            return {
              ...baseSnapshot,
              enabled,
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
