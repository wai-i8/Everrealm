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
    foxAttack: "assets/audio/sfx/battle/fox/fox-attack-generated-v1.wav",
    foxFootstep: "assets/audio/sfx/battle/fox/fox-footstep-generated-v1.wav",
    foxDeath: "assets/audio/sfx/battle/fox/fox-death-generated-v1.wav",
    raccoonAttack: "assets/audio/sfx/battle/raccoon/raccoon-attack-generated-v1.wav",
    raccoonFootstep: "assets/audio/sfx/battle/raccoon/raccoon-footstep-generated-v1.wav",
    raccoonDeath: "assets/audio/sfx/battle/raccoon/raccoon-death-generated-v1.wav",
    frogAttack: "assets/audio/sfx/battle/frog/frog-attack-generated-v1.wav",
    frogFootstep: "assets/audio/sfx/battle/frog/frog-footstep-generated-v1.wav",
    frogDeath: "assets/audio/sfx/battle/frog/frog-death-generated-v1.wav",
    blackcatAttack: "assets/audio/sfx/battle/blackcat/blackcat-attack-generated-v1.wav",
    blackcatFootstep: "assets/audio/sfx/battle/blackcat/blackcat-footstep-generated-v1.wav",
    blackcatDeath: "assets/audio/sfx/battle/blackcat/blackcat-death-generated-v1.wav",
    coyoteAttack: "assets/audio/sfx/battle/coyote/coyote-attack-generated-v1.wav",
    coyoteFootstep: "assets/audio/sfx/battle/coyote/coyote-footstep-generated-v1.wav",
    coyoteDeath: "assets/audio/sfx/battle/coyote/coyote-death-generated-v1.wav",
    turtleAttack: "assets/audio/sfx/battle/turtle/turtle-attack-generated-v1.wav",
    turtleFootstep: "assets/audio/sfx/battle/turtle/turtle-footstep-generated-v1.wav",
    turtleDeath: "assets/audio/sfx/battle/turtle/turtle-death-generated-v1.wav",
    snakeAttack: "assets/audio/sfx/battle/snake/snake-attack-generated-v1.wav",
    snakeFootstep: "assets/audio/sfx/battle/snake/snake-footstep-generated-v1.wav",
    snakeDeath: "assets/audio/sfx/battle/snake/snake-death-generated-v1.wav",
    bearAttack: "assets/audio/sfx/battle/bear/bear-attack-generated-v1.wav",
    bearFootstep: "assets/audio/sfx/battle/bear/bear-footstep-generated-v1.wav",
    bearDeath: "assets/audio/sfx/battle/bear/bear-death-generated-v1.wav",
  });

  const MONSTER_SFX_IDS = Object.freeze({
    chick: Object.freeze({ attack: "chickAttack", footstep: "chickFootstep", death: "chickDeath" }),
    fox: Object.freeze({ attack: "foxAttack", footstep: "foxFootstep", death: "foxDeath" }),
    raccoon: Object.freeze({ attack: "raccoonAttack", footstep: "raccoonFootstep", death: "raccoonDeath" }),
    frog: Object.freeze({ attack: "frogAttack", footstep: "frogFootstep", death: "frogDeath" }),
    blackcat: Object.freeze({ attack: "blackcatAttack", footstep: "blackcatFootstep", death: "blackcatDeath" }),
    coyote: Object.freeze({ attack: "coyoteAttack", footstep: "coyoteFootstep", death: "coyoteDeath" }),
    turtle: Object.freeze({ attack: "turtleAttack", footstep: "turtleFootstep", death: "turtleDeath" }),
    snake: Object.freeze({ attack: "snakeAttack", footstep: "snakeFootstep", death: "snakeDeath" }),
    bear: Object.freeze({ attack: "bearAttack", footstep: "bearFootstep", death: "bearDeath" }),
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

  function monsterType(value) {
    const explicit = typeof value === "string" ? value : value?.type;
    const normalized = String(explicit || "").toLowerCase();
    if (MONSTER_SFX_IDS[normalized]) return normalized;
    const id = String(typeof value === "string" ? value : value?.id || "").toLowerCase();
    return Object.keys(MONSTER_SFX_IDS).find((type) => id.includes(type)) || null;
  }

  function monsterSfxId(value, kind) {
    const type = monsterType(value);
    return type ? MONSTER_SFX_IDS[type]?.[kind] || null : null;
  }

  function isMonsterUnit(unit) {
    return Boolean(monsterType(unit));
  }

  function isChickUnit(unit) {
    return monsterType(unit) === "chick";
  }

  function isChickBattleId(id, type) {
    return monsterType(type || id) === "chick";
  }

  function isMonsterBattleId(id, type) {
    return Boolean(monsterType(type || id));
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
      monsterWalkState: new Map(),
      monsterVisualState: new Map(),
      deadMonsters: typeof WeakSet === "function" ? new WeakSet() : null,
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
      playMonster(typeOrUnit, kind, options = {}) {
        const id = monsterSfxId(typeOrUnit, kind);
        if (!id) return false;
        const gain = kind === "footstep" ? .72 : kind === "death" ? .9 : .82;
        return player.play(id, { gain, ...options });
      },
      playMonsterDeath(unit) {
        if (!isMonsterUnit(unit)) return false;
        if (unit && typeof unit === "object" && runtime.deadMonsters?.has(unit)) return false;
        if (unit && typeof unit === "object") runtime.deadMonsters?.add(unit);
        return runtime.playMonster(unit, "death");
      },
      playChickDeath() {
        return runtime.playMonster("chick", "death", { gain: GAINS.chickDeath });
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
        if (wasAlive && result?.defeated && isMonsterUnit(unit)) runtime.playMonsterDeath(unit);
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
          const type = monsterType(options.type);
          if (type) {
            // x/y are stable while an action animation is playing, which gives
            // us a lightweight per-unit key even though drawEnemy() does not
            // receive the battle unit id.
            const key = `${type}:${Math.round(Number(options.x) || 0)}:${Math.round(Number(options.y) || 0)}`;
            const previous = runtime.monsterVisualState.get(key) || "idle";
            const next = String(options.state || "idle");
            if (next === "attack" && previous !== "attack") {
              runtime.playMonster(type, "attack", { cooldown: 120, cooldownKey: `monster-attack:${key}` });
            }
            runtime.monsterVisualState.set(key, next);
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
          if (isMonsterBattleId(id, unitType)) {
            const type = monsterType(unitType) || monsterType(id);
            const previous = runtime.monsterWalkState.get(id) || "idle";
            const next = result?.state || "idle";
            if (next === "walk" && previous !== "walk") {
              runtime.playMonster(type, "footstep", {
                rate: .98 + Math.random() * .04,
              });
            }
            runtime.monsterWalkState.set(id, next);
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
    MONSTER_SFX_IDS,
    GAINS,
    clamp01,
    sfxEnabled,
    sfxVolume,
    isDamagingSkill,
    isFighterSkill,
    monsterType,
    monsterSfxId,
    isMonsterUnit,
    isMonsterBattleId,
    isChickUnit,
    isChickBattleId,
    createSamplePlayer,
    install,
  });
});
