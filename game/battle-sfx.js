(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.EverrealmBattleSfx = api;
    api.install(root);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SFX_ENABLED_KEY = "everrealm-sfx-enabled-v1";
  const LEGACY_SOUND_KEY = "everrealm-sound";
  const SFX_VOLUME_KEY = "everrealm-sfx-volume-v1";
  const LEGACY_VOLUME_KEY = "everrealm-bgm-volume-v1";
  const INSTALL_KEY = "__everrealmBattleSfxRuntimeV1";

  const ASSETS = Object.freeze({
    fighterPunch: "assets/audio/sfx/battle/fighter/fighter-punch.wav",
    fighterUtility: "assets/audio/sfx/battle/fighter/fighter-utility-skill.wav",
    miss: "assets/audio/sfx/battle/common/battle-miss.wav",
    chickAttack: "assets/audio/sfx/battle/chick/chick-attack.wav",
    chickFootstep: "assets/audio/sfx/battle/chick/chick-footstep.wav",
    chickDeath: "assets/audio/sfx/battle/chick/chick-death.wav",
  });

  const GAINS = Object.freeze({
    fighterPunch: 1,
    fighterUtility: 1,
    miss: 1,
    chickAttack: 1,
    chickFootstep: 1,
    chickDeath: 1,
  });

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function readStorage(root, key) {
    try { return root.localStorage?.getItem?.(key) ?? null; } catch (_) { return null; }
  }

  function sfxEnabled(root) {
    const direct = readStorage(root, SFX_ENABLED_KEY);
    const legacy = readStorage(root, LEGACY_SOUND_KEY);
    return (direct ?? legacy ?? "on") !== "off";
  }

  function sfxVolume(root) {
    const direct = readStorage(root, SFX_VOLUME_KEY);
    const legacy = readStorage(root, LEGACY_VOLUME_KEY);
    const value = Number(direct ?? legacy ?? .7);
    return Number.isFinite(value) ? clamp01(value) : .7;
  }

  function isVisible(root) {
    return !root.document || !root.document.visibilityState || root.document.visibilityState === "visible";
  }

  function isDamagingSkill(skill) {
    if (!skill) return false;
    if (skill.dealsDamage === true) return true;
    return Array.isArray(skill.effects) && skill.effects.some((effect) => effect?.type === "damage");
  }

  function isFighterSkill(skill) {
    return Boolean(skill && skill.classId === "fighter");
  }

  function isChickUnit(unit) {
    if (!unit) return false;
    if (String(unit.type || "").toLowerCase() === "chick") return true;
    return String(unit.id || "").toLowerCase().includes("chick");
  }

  function isChickBattleId(id, type) {
    return String(id || "").toLowerCase().includes("chick")
      || String(type || "").toLowerCase() === "chick";
  }

  function createSamplePlayer(root) {
    const pools = new Map();
    const cursors = new Map();
    const lastPlayed = new Map();

    function buildPool(id) {
      if (pools.has(id)) return pools.get(id);
      if (typeof root.Audio !== "function") {
        pools.set(id, []);
        return [];
      }
      // Keep ordinary one-shot effects overlap-safe.  The walking clip is a
      // ~1 second movement texture, so one voice is enough and avoids a noisy
      // stack when several render frames arrive close together.
      const size = id === "chickFootstep" ? 1 : 3;
      const src = ASSETS[id];
      const pool = Array.from({ length: size }, () => {
        const audio = new root.Audio(src);
        audio.preload = "auto";
        return audio;
      });
      pools.set(id, pool);
      return pool;
    }

    function playNow(id, options = {}) {
      if (!ASSETS[id] || !sfxEnabled(root) || sfxVolume(root) <= 0 || !isVisible(root)) return false;
      const now = Date.now();
      const cooldown = Math.max(0, Number(options.cooldown) || 0);
      const cooldownKey = options.cooldownKey || id;
      if (cooldown && now - (lastPlayed.get(cooldownKey) || 0) < cooldown) return false;
      const pool = buildPool(id);
      if (!pool.length) return false;
      lastPlayed.set(cooldownKey, now);
      const index = cursors.get(id) || 0;
      const audio = pool[index % pool.length];
      cursors.set(id, index + 1);
      try {
        audio.pause?.();
        audio.currentTime = 0;
        audio.volume = clamp01(sfxVolume(root) * (Number(options.gain) || GAINS[id] || 1));
        audio.playbackRate = Math.max(.5, Math.min(2, Number(options.rate) || 1));
        const pending = audio.play?.();
        if (pending && typeof pending.catch === "function") pending.catch(() => {});
        return true;
      } catch (_) {
        return false;
      }
    }

    function play(id, options = {}) {
      const delay = Math.max(0, Number(options.delay) || 0);
      if (!delay) return playNow(id, options);
      const timer = root.setTimeout || setTimeout;
      timer(() => playNow(id, options), delay);
      return true;
    }

    return Object.freeze({ play, playNow, pools });
  }

  function install(root = globalThis) {
    if (!root || root[INSTALL_KEY]) return root?.[INSTALL_KEY] || null;

    const player = createSamplePlayer(root);
    const runtime = {
      activeHeroSkill: null,
      heroActionSoundPlayed: false,
      heroActionStrikeIndex: -1,
      freshSkill: null,
      freshSkillToken: 0,
      chickWalkState: new Map(),
      chickVisualState: new Map(),
      deadChicks: typeof WeakSet === "function" ? new WeakSet() : null,
      player,
      beginAction({ skill = null } = {}) {
        runtime.activeHeroSkill = skill || null;
        runtime.heroActionSoundPlayed = false;
        runtime.heroActionStrikeIndex = -1;
      },
      endAction() {
        runtime.activeHeroSkill = null;
        runtime.heroActionSoundPlayed = false;
        runtime.heroActionStrikeIndex = -1;
      },
      playMiss() {
        return player.play("miss", { delay: 90, cooldown: 170, cooldownKey: "battle-miss" });
      },
      playChickDeath() {
        return player.play("chickDeath", { gain: GAINS.chickDeath });
      },
    };
    root[INSTALL_KEY] = runtime;

    const Skills = root.EverrealmSkills;
    if (Skills && typeof Skills.getSkill === "function" && typeof Skills.orderActionsBySpeed === "function") {
      const originalGetSkill = Skills.getSkill.bind(Skills);
      const originalOrderActionsBySpeed = Skills.orderActionsBySpeed.bind(Skills);

      Skills.getSkill = function (...args) {
        const skill = originalGetSkill(...args);
        if (skill) {
          runtime.freshSkill = skill;
          const token = ++runtime.freshSkillToken;
          const clear = () => {
            if (runtime.freshSkillToken === token) runtime.freshSkill = null;
          };
          if (typeof root.queueMicrotask === "function") root.queueMicrotask(clear);
          else Promise.resolve().then(clear);
        }
        return skill;
      };

      Skills.orderActionsBySpeed = function (actions) {
        const list = Array.isArray(actions) ? actions : [];
        // beginActionResolution() is the only ordering call whose entries do
        // not yet have a `kind` field.  The getSkill() immediately before it
        // gives us the player's chosen skill without reaching into game.js.
        const battleStartOrder = list.some((action) => action?.actorId === "battle-player")
          && !list.some((action) => Object.prototype.hasOwnProperty.call(action || {}, "kind"));
        if (battleStartOrder) {
          runtime.activeHeroSkill = runtime.freshSkill || null;
          runtime.heroActionSoundPlayed = false;
          runtime.heroActionStrikeIndex = -1;
        }
        return originalOrderActionsBySpeed(actions);
      };
    }

    const Tactics = root.EverrealmTactics;
    if (Tactics && typeof Tactics.rollHit === "function") {
      const originalRollHit = Tactics.rollHit.bind(Tactics);
      Tactics.rollHit = function (...args) {
        const result = originalRollHit(...args);
        if (result && result.hit === false) {
          // Delay the miss cue slightly so it reads clearly after the attack
          // sound instead of landing on exactly the same audio frame.
          player.play("miss", { delay: 90, cooldown: 170, cooldownKey: "battle-miss" });
        }
        return result;
      };
    }

    if (Tactics && typeof Tactics.applyDamage === "function") {
      const originalApplyDamage = Tactics.applyDamage.bind(Tactics);
      Tactics.applyDamage = function (unit, ...args) {
        const wasAlive = Boolean(unit && unit.hp > 0 && unit.alive !== false);
        const result = originalApplyDamage(unit, ...args);
        if (wasAlive && result?.defeated && isChickUnit(unit)) {
          const alreadyPlayed = runtime.deadChicks?.has(unit) || false;
          if (!alreadyPlayed) {
            runtime.deadChicks?.add(unit);
            player.play("chickDeath", { gain: GAINS.chickDeath });
          }
        }
        return result;
      };
    }

    const originalArt = root.EverrealmArt;
    if (originalArt && typeof originalArt.drawCharacter === "function" && typeof originalArt.drawEnemy === "function") {
      const wrappedArt = {
        ...originalArt,
        drawCharacter(ctx, options = {}) {
          const phase = root.document?.getElementById?.("gameStage")?.dataset?.battlePhase;
          if (phase === "resolving_action"
            && options.actor === "player"
            && options.state === "attack"
            && isFighterSkill(runtime.activeHeroSkill)) {
            const strikeIndex = Number(options.actionStrikeIndex);
            if (Number.isInteger(strikeIndex) && strikeIndex >= 0) {
              if (strikeIndex !== runtime.heroActionStrikeIndex) {
                runtime.heroActionStrikeIndex = strikeIndex;
                runtime.heroActionSoundPlayed = true;
                player.play(isDamagingSkill(runtime.activeHeroSkill) ? "fighterPunch" : "fighterUtility");
              }
            } else if (!Number.isInteger(strikeIndex) && !runtime.heroActionSoundPlayed) {
              // The wind-up cue is the first strike's sound. Mark strike 0 as
              // consumed so the same action does not replay the SFX when the
              // authoritative resolver flips from wind-up to strike index 0.
              runtime.heroActionSoundPlayed = true;
              runtime.heroActionStrikeIndex = 0;
              player.play(isDamagingSkill(runtime.activeHeroSkill) ? "fighterPunch" : "fighterUtility");
            }
          }
          return originalArt.drawCharacter(ctx, options);
        },
        drawEnemy(ctx, options = {}) {
          if (String(options.type || "").toLowerCase() === "chick") {
            // x/y are stable while an action animation is playing, which gives
            // us a lightweight per-unit key even though drawEnemy() does not
            // receive the battle unit id.
            const key = `chick:${Math.round(Number(options.x) || 0)}:${Math.round(Number(options.y) || 0)}`;
            const previous = runtime.chickVisualState.get(key) || "idle";
            const next = String(options.state || "idle");
            if (next === "attack" && previous !== "attack") {
              player.play("chickAttack", { cooldown: 120, cooldownKey: `chick-attack:${key}` });
            }
            runtime.chickVisualState.set(key, next);
          }
          return originalArt.drawEnemy(ctx, options);
        },
      };
      root.EverrealmArt = Object.freeze(wrappedArt);
    }

    const originalLocomotion = root.EverrealmLocomotion;
    if (originalLocomotion && typeof originalLocomotion.sampleMovement === "function") {
      const originalSampleMovement = originalLocomotion.sampleMovement.bind(originalLocomotion);
      const wrappedLocomotion = {
        ...originalLocomotion,
        sampleMovement(movement, id, seconds, fallbackFacing, unitType) {
          const result = originalSampleMovement(movement, id, seconds, fallbackFacing);
          if (isChickBattleId(id, unitType)) {
            const previous = runtime.chickWalkState.get(id) || "idle";
            const next = result?.state || "idle";
            if (next === "walk" && previous !== "walk") {
              player.play("chickFootstep", {
                rate: .98 + Math.random() * .04,
              });
            }
            runtime.chickWalkState.set(id, next);
          }
          return result;
        },
      };
      root.EverrealmLocomotion = Object.freeze(wrappedLocomotion);
    }

    return runtime;
  }

  return Object.freeze({
    ASSETS,
    GAINS,
    clamp01,
    sfxEnabled,
    sfxVolume,
    isDamagingSkill,
    isFighterSkill,
    isChickUnit,
    isChickBattleId,
    createSamplePlayer,
    install,
  });
});
