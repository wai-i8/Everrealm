#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
import argparse, subprocess, shutil, sys, re

BASE_COMMIT = "66dbb471df8901a942f0ddc0252cc431623daffe"
BACKUP_DIR = ".everrealm-fix-backup-66dbb47"

parser = argparse.ArgumentParser(description="Apply Everrealm fixes against main @ 66dbb47.")
parser.add_argument("repo", nargs="?", default=".", help="Everrealm repository root")
parser.add_argument("--force", action="store_true", help="Allow applying when HEAD is not exactly 66dbb47.")
parser.add_argument("--no-tests", action="store_true", help="Skip Node tests after patching.")
args = parser.parse_args()

root = Path(args.repo).resolve()
if not (root / "game.js").exists() or not (root / "rpg-core.js").exists():
    raise SystemExit(f"Not an Everrealm repo root: {root}")

def run(*cmd, check=True):
    p = subprocess.run(cmd, cwd=root, text=True, capture_output=True)
    if check and p.returncode != 0:
        print(p.stdout)
        print(p.stderr, file=sys.stderr)
        raise SystemExit(f"Command failed: {' '.join(cmd)}")
    return p

git = shutil.which("git")
if git:
    head = run(git, "rev-parse", "HEAD").stdout.strip()
    if head != BASE_COMMIT and not args.force:
        raise SystemExit(
            f"HEAD is {head}, expected {BASE_COMMIT}.\n"
            "Pull/checkout the stated version first, or rerun with --force only if the source still matches."
        )
else:
    print("WARN: git not found; commit check skipped.")

changed = []

def backup(path: str):
    src = root / path
    dst = root / BACKUP_DIR / path
    dst.parent.mkdir(parents=True, exist_ok=True)
    if src.exists() and not dst.exists():
        shutil.copy2(src, dst)

def replace_once(path: str, old: str, new: str):
    fp = root / path
    text = fp.read_text(encoding="utf-8").replace("\r\n", "\n")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected source block exactly once, found {count}.")
    backup(path)
    fp.write_text(text.replace(old, new, 1), encoding="utf-8", newline="\n")
    if path not in changed:
        changed.append(path)

def insert_after_once(path: str, marker: str, insertion: str):
    fp = root / path
    text = fp.read_text(encoding="utf-8").replace("\r\n", "\n")
    count = text.count(marker)
    if count != 1:
        raise SystemExit(f"{path}: expected marker exactly once, found {count}.")
    backup(path)
    fp.write_text(text.replace(marker, marker + insertion, 1), encoding="utf-8", newline="\n")
    if path not in changed:
        changed.append(path)

# 1) Main-town refresh / saved-position fix.
replace_once(
    "rpg-core.js",
    '''        x: clamp(player.x, 40, 2760),
        y: clamp(player.y, 40, 1800),''',
    '''        // Map dimensions are no longer fixed to the legacy 2760x1800 world.
        // Preserve finite authored coordinates here; game.js validates the loaded
        // position against the active map's authoritative navigation and falls
        // back to that map's start only when the saved point is genuinely invalid.
        x: Number(player.x),
        y: Number(player.y),'''
)

replace_once(
    "tests/rpg-core.test.js",
    '''test("save sanitizer clamps values and removes duplicate flags", () => {
  const clean = Core.sanitizeSave({
    version: 1,
    player: {
      x: -500,
      y: 99999,
      hp: 22,
      level: 999,
      xp: 999999,
      coins: -20,
      potions: 70,
      weaponLevel: 9,
      upgrades: { vigor: 2, edge: -4, swift: 200 },
    },
    questStage: 99,
    pendingLevelUps: 99,
    crystals: ["north", "north", "bogus", "west"],
    openedChests: ["a", "a", "b"],
  });
  assert.equal(clean.player.x, 40);
  assert.equal(clean.player.y, 1800);''',
    '''test("save sanitizer preserves finite map coordinates while clamping gameplay values", () => {
  const clean = Core.sanitizeSave({
    version: 1,
    player: {
      x: -500,
      y: 99999,
      hp: 22,
      level: 999,
      xp: 999999,
      coins: -20,
      potions: 70,
      weaponLevel: 9,
      upgrades: { vigor: 2, edge: -4, swift: 200 },
    },
    questStage: 99,
    pendingLevelUps: 99,
    crystals: ["north", "north", "bogus", "west"],
    openedChests: ["a", "a", "b"],
  });
  assert.equal(clean.player.x, -500);
  assert.equal(clean.player.y, 99999);'''
)

insert_after_once(
    "tests/rpg-core.test.js",
    '''test("save sanitizer rejects unknown schemas and corrupt coordinates", () => {
  assert.equal(Core.sanitizeSave(null), null);
  assert.equal(Core.sanitizeSave({ version: 2, player: { x: 10, y: 10 } }), null);
  assert.equal(Core.sanitizeSave({ version: 1, player: { x: Number.NaN, y: 10 } }), null);
});
''',
    '''
test("save sanitizer does not truncate modern large-map positions", () => {
  const clean = Core.sanitizeSave({
    version: 1,
    player: { x: 6123.5, y: 3288.25, level: 1 },
  });
  assert.equal(clean.player.x, 6123.5);
  assert.equal(clean.player.y, 3288.25);
});
'''
)

# 2) Stable monster nameplate anchor across all locomotion frames.
insert_after_once(
    "locomotion.js",
    '''  function frameVisualBounds(id, index) {
    const bounds = visualBounds[id]?.[index];
    if (!bounds) return null;
    const m = STANDARD_MOBILE_UNIT_SPRITE;
    return { sx: bounds[0], sy: Math.floor(index / m.columns) * m.cellHeight + bounds[1], sw: bounds[2], sh: m.anchorY - bounds[1] };
  }
''',
    '''  function stableVisualBounds(id) {
    const frames = visualBounds[id];
    if (!Array.isArray(frames) || !frames.length) return null;
    const m = STANDARD_MOBILE_UNIT_SPRITE;
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    for (const bounds of frames) {
      if (!bounds || bounds.length < 3) continue;
      left = Math.min(left, Number(bounds[0]));
      top = Math.min(top, Number(bounds[1]));
      right = Math.max(right, Number(bounds[0]) + Number(bounds[2]));
    }
    if (![left, top, right].every(Number.isFinite)) return null;
    return {
      left,
      top,
      right,
      bottom: m.anchorY,
      width: Math.max(1, right - left),
      height: Math.max(1, m.anchorY - top),
    };
  }
'''
)

replace_once(
    "locomotion.js",
    '''  return Object.freeze({ STANDARD_MOBILE_UNIT_SPRITE, STANDARD_MOBILE_UNIT_VISUAL_BOUNDS, assets, sourceArt, create, update, frame, frameVisualBounds, layout, facingFromDelta, sampleMovement });''',
    '''  return Object.freeze({ STANDARD_MOBILE_UNIT_SPRITE, STANDARD_MOBILE_UNIT_VISUAL_BOUNDS, assets, sourceArt, create, update, frame, frameVisualBounds, stableVisualBounds, layout, facingFromDelta, sampleMovement });'''
)

insert_after_once(
    "tests/locomotion.test.js",
    '''test("player and monster locomotion frames own canonical world dimensions", () => {
  assert.deepEqual(Art.locomotionWorldFrame("fighter"), { width: 256, height: 256 });
  assert.deepEqual(Art.locomotionWorldFrame("warrior"), { width: 256, height: 256 });
  for (const id of ["raccoon", "turtle", "chick", "fox", "wild_boar", "bear", "coyote", "frog", "snake"]) {
    assert.deepEqual(Art.locomotionWorldFrame(id), { width: 102.4, height: 102.4 }, id);
  }
  assert.equal(Art.locomotionWorldFrame.length, 1);
});
''',
    '''
test("monster stable visual bounds use one animation-independent top anchor", () => {
  const chick = Locomotion.stableVisualBounds("chick");
  assert.ok(chick);
  assert.equal(chick.top, 80);
  assert.equal(chick.bottom, metadata.anchorY);
  for (let index = 0; index < metadata.columns * metadata.rows; index += 1) {
    const frame = Locomotion.frameVisualBounds("chick", index);
    assert.ok(frame.sy - Math.floor(index / metadata.columns) * metadata.cellHeight >= chick.top);
  }
  const fox = Locomotion.stableVisualBounds("fox");
  assert.ok(fox && Number.isFinite(fox.top));
});
'''
)

replace_once(
    "game.js",
    '''    // Player art has a stable authored name anchor. Monster locomotion frames
    // have different opaque bounds, so using their per-frame visual anchor makes
    // the name drift/fly while walking. Keep enemy labels tied to the interpolated
    // battle cell instead; they still follow movement without frame-to-frame wobble.
    const fallbackNameY = point.y - actorCell * (unit.boss ? .82 : unit.side === "ally" ? .68 : .76);
    const useArtNameAnchor = unit.side === "ally";
    const nameX = useArtNameAnchor && Number.isFinite(artBox?.nameAnchorX) ? artBox.nameAnchorX : point.x;
    const nameAnchorY = useArtNameAnchor && Number.isFinite(artBox?.nameAnchorY) ? artBox.nameAnchorY : fallbackNameY;
    const nameY = nameAnchorY - Math.max(2, actorCell * .025);''',
    '''    // Player art has its own stable authored anchor. Monster labels use one
    // stable union/top bound calculated across the whole locomotion atlas rather
    // than the currently displayed frame. This keeps small monsters (especially
    // the chick) close to the top of the visible sprite without nameplate bobbing
    // as Walk frames or facing rows change.
    const fallbackNameY = point.y - actorCell * (unit.boss ? .82 : unit.side === "ally" ? .68 : .76);
    const useArtNameAnchor = unit.side === "ally";
    const nameX = useArtNameAnchor && Number.isFinite(artBox?.nameAnchorX) ? artBox.nameAnchorX : point.x;
    let nameAnchorY = useArtNameAnchor && Number.isFinite(artBox?.nameAnchorY) ? artBox.nameAnchorY : fallbackNameY;
    if (!useArtNameAnchor) {
      const stableBounds = Locomotion.stableVisualBounds?.(unit.type);
      const sprite = Locomotion.STANDARD_MOBILE_UNIT_SPRITE;
      const authoredFrame = Art.locomotionWorldFrame?.(unit.type);
      if (stableBounds && sprite && Number.isFinite(stableBounds.top)) {
        const renderedScale = monsterScale * (unit.boss ? .98 : .92);
        const authoredHeight = Number(authoredFrame?.height) || 102.4;
        const visualScale = renderedScale * authoredHeight / sprite.cellHeight;
        nameAnchorY = baseline - (sprite.anchorY - stableBounds.top) * visualScale - 4 * visualScale;
      }
    }
    const nameY = nameAnchorY - Math.max(2, actorCell * .025);'''
)

replace_once(
    "tests/ui-shell.test.js",
    '''  assert.match(game, /const nameX = point\\.x/);
  assert.match(game, /const nameY = point\\.y - layout\\.cell \\*/);
  assert.match(game, /const barY = point\\.y \\+ layout\\.cell \\* \\.38/);
  const battleUnit = game.match(/function drawBattleUnit\\([\\s\\S]*?\\n  \\}/)?.[0] || "";
  assert.doesNotMatch(battleUnit, /artBox|nameAnchor|visualBounds/);''',
    '''  assert.match(game, /Locomotion\\.stableVisualBounds\\?\\.\\(unit\\.type\\)/);
  assert.match(game, /sprite\\.anchorY - stableBounds\\.top/);
  const battleUnit = game.match(/function drawBattleUnit\\([\\s\\S]*?\\n  \\}/)?.[0] || "";
  assert.match(battleUnit, /artBox/);
  assert.match(battleUnit, /nameAnchor/);'''
)

# 3) Independent Music / SFX mute state and matching speaker buttons.
replace_once(
    "game.js",
    '''  const SOUND_KEY = "everrealm-sound";
  const LEGACY_SOUND_KEY = "lanternbound-sound";
  const BGM_VOLUME_KEY = "everrealm-bgm-volume-v1";
  const SFX_VOLUME_KEY = "everrealm-sfx-volume-v1";''',
    '''  const SOUND_KEY = "everrealm-sound";
  const LEGACY_SOUND_KEY = "lanternbound-sound";
  const BGM_ENABLED_KEY = "everrealm-bgm-enabled-v1";
  const SFX_ENABLED_KEY = "everrealm-sfx-enabled-v1";
  const BGM_VOLUME_KEY = "everrealm-bgm-volume-v1";
  const SFX_VOLUME_KEY = "everrealm-sfx-volume-v1";'''
)

replace_once(
    "game.js",
    '''  const volumeMuteButton = document.getElementById("volumeMuteButton");
  const musicVolumeSlider = document.getElementById("musicVolumeSlider");
  const musicVolumeValue = document.getElementById("musicVolumeValue");
  const soundEffectsVolumeSlider = document.getElementById("soundEffectsVolumeSlider");
  const soundEffectsVolumeValue = document.getElementById("soundEffectsVolumeValue");''',
    '''  const volumeMuteButton = document.getElementById("volumeMuteButton");
  const musicVolumeSlider = document.getElementById("musicVolumeSlider");
  const musicVolumeValue = document.getElementById("musicVolumeValue");
  const soundEffectsMuteButton = document.getElementById("soundEffectsMuteButton");
  const soundEffectsVolumeSlider = document.getElementById("soundEffectsVolumeSlider");
  const soundEffectsVolumeValue = document.getElementById("soundEffectsVolumeValue");'''
)

replace_once(
    "game.js",
    '''  let soundEnabled = readPreference(SOUND_KEY, "on", LEGACY_SOUND_KEY) !== "off";
  let bgmVolume = Core.clamp(Number(readPreference(BGM_VOLUME_KEY, "0.70")), 0, 1);
  if (!Number.isFinite(bgmVolume)) bgmVolume = .7;
  let sfxVolume = Core.clamp(Number(readPreference(SFX_VOLUME_KEY, readPreference(BGM_VOLUME_KEY, "0.70"))), 0, 1);
  if (!Number.isFinite(sfxVolume)) sfxVolume = .7;
  const bgm = Bgm.createBgmManager({ enabled: soundEnabled, volume: bgmVolume });''',
    '''  const legacySoundPreference = readPreference(SOUND_KEY, "on", LEGACY_SOUND_KEY);
  let musicEnabled = readPreference(BGM_ENABLED_KEY, legacySoundPreference) !== "off";
  let sfxEnabled = readPreference(SFX_ENABLED_KEY, legacySoundPreference) !== "off";
  let bgmVolume = Core.clamp(Number(readPreference(BGM_VOLUME_KEY, "0.70")), 0, 1);
  if (!Number.isFinite(bgmVolume)) bgmVolume = .7;
  let sfxVolume = Core.clamp(Number(readPreference(SFX_VOLUME_KEY, readPreference(BGM_VOLUME_KEY, "0.70"))), 0, 1);
  if (!Number.isFinite(sfxVolume)) sfxVolume = .7;
  const bgm = Bgm.createBgmManager({ enabled: musicEnabled, volume: bgmVolume });'''
)

replace_once(
    "game.js",
    '''  function suspendGameAudio() {
    pageAudioSuspended = true;
    sound.suspend();
    bgm.suspend?.();
    battleBgmAudio?.pause();
  }

  function resumeGameAudio() {
    if (document.visibilityState !== "visible") return;
    pageAudioSuspended = false;
    sound.resume();
    bgm.resume?.();
    if (!soundEnabled) return;
    if (mode === "battle" && battle) {
      bgm.suspend?.();
      battleBgmAudio?.play().catch(() => {});
      return;
    }
    battleBgmAudio?.pause();
    bgm.resume?.();
    bgm.setMap(currentMapId);
  }

  function unlockGameAudioFromGesture() {
    if (!soundEnabled || document.visibilityState !== "visible") return;
    const battlePlaying = mode === "battle" && battle && battleBgmAudio && battleBgmAudio.paused === false;
    const mapPlaying = mode !== "battle" && (bgm.snapshot?.().activeInstances || 0) > 0;
    if (audioGestureUnlocked && (battlePlaying || mapPlaying)) return;
    audioGestureUnlocked = true;
    resumeGameAudio();
  }

  function startBattleBgm() {
    bgm.setEnabled(false);
    if (!battleBgmAudio || !soundEnabled || pageAudioSuspended || document.visibilityState !== "visible") return;
    try { battleBgmAudio.currentTime = 0; } catch (_) {}
    battleBgmAudio.play().catch(() => {});
  }
  function stopBattleBgm() {
    if (battleBgmAudio) {
      battleBgmAudio.pause();
      try { battleBgmAudio.currentTime = 0; } catch (_) {}
    }
    bgm.setEnabled(soundEnabled);
    if (soundEnabled) bgm.setMap(currentMapId);
    if (pageAudioSuspended) bgm.suspend?.();
  }''',
    '''  function suspendGameAudio() {
    pageAudioSuspended = true;
    sound.suspend();
    bgm.suspend?.();
    battleBgmAudio?.pause();
  }

  function resumeGameAudio() {
    if (document.visibilityState !== "visible") return;
    pageAudioSuspended = false;
    sound.resume();
    if (!musicEnabled) {
      bgm.suspend?.();
      battleBgmAudio?.pause();
      return;
    }
    bgm.resume?.();
    if (mode === "battle" && battle) {
      bgm.suspend?.();
      battleBgmAudio?.play().catch(() => {});
      return;
    }
    battleBgmAudio?.pause();
    bgm.resume?.();
    bgm.setMap(currentMapId);
  }

  function unlockGameAudioFromGesture() {
    if ((!musicEnabled && !sfxEnabled) || document.visibilityState !== "visible") return;
    const battlePlaying = mode === "battle" && battle && battleBgmAudio && battleBgmAudio.paused === false;
    const mapPlaying = mode !== "battle" && (bgm.snapshot?.().activeInstances || 0) > 0;
    if (audioGestureUnlocked && (battlePlaying || mapPlaying || !musicEnabled)) return;
    audioGestureUnlocked = true;
    resumeGameAudio();
  }

  function startBattleBgm() {
    bgm.setEnabled(false);
    if (!battleBgmAudio || !musicEnabled || pageAudioSuspended || document.visibilityState !== "visible") return;
    try { battleBgmAudio.currentTime = 0; } catch (_) {}
    battleBgmAudio.play().catch(() => {});
  }
  function stopBattleBgm() {
    if (battleBgmAudio) {
      battleBgmAudio.pause();
      try { battleBgmAudio.currentTime = 0; } catch (_) {}
    }
    bgm.setEnabled(musicEnabled);
    if (musicEnabled) bgm.setMap(currentMapId);
    if (pageAudioSuspended) bgm.suspend?.();
  }'''
)

replace_once(
    "game.js",
    '''      if (!soundEnabled || sfxVolume <= 0 || this.suspended || document.visibilityState !== "visible" || !audioGestureUnlocked) return null;''',
    '''      if (!sfxEnabled || sfxVolume <= 0 || this.suspended || document.visibilityState !== "visible" || !audioGestureUnlocked) return null;'''
)
replace_once(
    "game.js",
    '''      if (soundEnabled && document.visibilityState === "visible" && this.context?.state === "suspended") {''',
    '''      if (sfxEnabled && document.visibilityState === "visible" && this.context?.state === "suspended") {'''
)

replace_once(
    "game.js",
    '''  function syncSystemSoundControl() {
    const effectiveMusicVolume = soundEnabled ? bgmVolume : 0;
    const effectiveSfxVolume = soundEnabled ? sfxVolume : 0;
    if (musicVolumeSlider) musicVolumeSlider.value = String(Math.round(effectiveMusicVolume * 100));
    if (musicVolumeValue) musicVolumeValue.textContent = `${Math.round(effectiveMusicVolume * 100)}%`;
    if (soundEffectsVolumeSlider) soundEffectsVolumeSlider.value = String(Math.round(effectiveSfxVolume * 100));
    if (soundEffectsVolumeValue) soundEffectsVolumeValue.textContent = `${Math.round(effectiveSfxVolume * 100)}%`;
    if (volumeMuteButton) {
      volumeMuteButton.setAttribute("aria-pressed", String(!soundEnabled));
      volumeMuteButton.setAttribute("aria-label", soundEnabled ? "全部靜音" : "取消全部靜音");
      const icon = volumeMuteButton.querySelector("span");
      if (icon) icon.textContent = soundEnabled ? "🔊" : "🔇";
    }
    systemSettingsPopover?.style.setProperty("--music-volume", String(effectiveMusicVolume));
    systemSettingsPopover?.style.setProperty("--sfx-volume", String(effectiveSfxVolume));
  }

  function setBgmVolume(value, persist = true) {
    bgmVolume = Core.clamp(Number(value) || 0, 0, 1);
    bgm.setVolume?.(bgmVolume);
    if (battleBgmAudio) battleBgmAudio.volume = bgmVolume;
    if (persist) {
      try { localStorage.setItem(BGM_VOLUME_KEY, bgmVolume.toFixed(2)); } catch (_) {}
    }
    syncSystemSoundControl();
    return bgmVolume;
  }

  function setSfxVolume(value, persist = true) {
    sfxVolume = Core.clamp(Number(value) || 0, 0, 1);
    if (persist) {
      try { localStorage.setItem(SFX_VOLUME_KEY, sfxVolume.toFixed(2)); } catch (_) {}
    }
    syncSystemSoundControl();
    return sfxVolume;
  }

  function setSoundEnabled(enabled, persist = true) {
    soundEnabled = Boolean(enabled);
    if (mode === "battle") {
      bgm.setEnabled(false);
      if (battleBgmAudio) {
        if (soundEnabled && !pageAudioSuspended) battleBgmAudio.play().catch(() => {});
        else battleBgmAudio.pause();
      }
    } else {
      bgm.setEnabled(soundEnabled);
    }
    if (persist) {
      try { localStorage.setItem(SOUND_KEY, soundEnabled ? "on" : "off"); } catch (_) {}
    }
    syncSystemSoundControl();
    return soundEnabled;
  }''',
    '''  function syncSystemSoundControl() {
    if (musicVolumeSlider) musicVolumeSlider.value = String(Math.round(bgmVolume * 100));
    if (musicVolumeValue) musicVolumeValue.textContent = `${Math.round(bgmVolume * 100)}%`;
    if (soundEffectsVolumeSlider) soundEffectsVolumeSlider.value = String(Math.round(sfxVolume * 100));
    if (soundEffectsVolumeValue) soundEffectsVolumeValue.textContent = `${Math.round(sfxVolume * 100)}%`;
    if (volumeMuteButton) {
      volumeMuteButton.setAttribute("aria-pressed", String(!musicEnabled));
      volumeMuteButton.setAttribute("aria-label", musicEnabled ? "音樂靜音" : "取消音樂靜音");
      const icon = volumeMuteButton.querySelector("span");
      if (icon) icon.textContent = musicEnabled ? "🔊" : "🔇";
    }
    if (soundEffectsMuteButton) {
      soundEffectsMuteButton.setAttribute("aria-pressed", String(!sfxEnabled));
      soundEffectsMuteButton.setAttribute("aria-label", sfxEnabled ? "音效靜音" : "取消音效靜音");
      const icon = soundEffectsMuteButton.querySelector("span");
      if (icon) icon.textContent = sfxEnabled ? "🔊" : "🔇";
    }
    systemSettingsPopover?.style.setProperty("--music-volume", String(bgmVolume));
    systemSettingsPopover?.style.setProperty("--sfx-volume", String(sfxVolume));
  }

  function setBgmVolume(value, persist = true) {
    bgmVolume = Core.clamp(Number(value) || 0, 0, 1);
    bgm.setVolume?.(bgmVolume);
    if (battleBgmAudio) battleBgmAudio.volume = bgmVolume;
    if (persist) {
      try { localStorage.setItem(BGM_VOLUME_KEY, bgmVolume.toFixed(2)); } catch (_) {}
    }
    syncSystemSoundControl();
    return bgmVolume;
  }

  function setSfxVolume(value, persist = true) {
    sfxVolume = Core.clamp(Number(value) || 0, 0, 1);
    if (persist) {
      try { localStorage.setItem(SFX_VOLUME_KEY, sfxVolume.toFixed(2)); } catch (_) {}
    }
    syncSystemSoundControl();
    return sfxVolume;
  }

  function setMusicEnabled(enabled, persist = true) {
    musicEnabled = Boolean(enabled);
    if (mode === "battle") {
      bgm.setEnabled(false);
      if (battleBgmAudio) {
        if (musicEnabled && !pageAudioSuspended) battleBgmAudio.play().catch(() => {});
        else battleBgmAudio.pause();
      }
    } else {
      bgm.setEnabled(musicEnabled);
      if (musicEnabled && !pageAudioSuspended) bgm.setMap(currentMapId);
    }
    if (persist) {
      try { localStorage.setItem(BGM_ENABLED_KEY, musicEnabled ? "on" : "off"); } catch (_) {}
    }
    syncSystemSoundControl();
    return musicEnabled;
  }

  function setSfxEnabled(enabled, persist = true) {
    sfxEnabled = Boolean(enabled);
    if (!sfxEnabled) sound.suspend();
    else if (!pageAudioSuspended) sound.resume();
    if (persist) {
      try { localStorage.setItem(SFX_ENABLED_KEY, sfxEnabled ? "on" : "off"); } catch (_) {}
    }
    syncSystemSoundControl();
    return sfxEnabled;
  }'''
)

replace_once(
    "game.js",
    '''  volumeMuteButton?.addEventListener("click", () => {
    const enabled = setSoundEnabled(!soundEnabled);
    if (enabled) sound.tone(520, .1, { to: 760, gain: .03 });
  });
  musicVolumeSlider?.addEventListener("input", () => {
    const nextVolume = Core.clamp(Number(musicVolumeSlider.value) / 100, 0, 1);
    setBgmVolume(nextVolume);
    if (nextVolume > 0 && !soundEnabled) setSoundEnabled(true);
  });
  soundEffectsVolumeSlider?.addEventListener("input", () => {
    const nextVolume = Core.clamp(Number(soundEffectsVolumeSlider.value) / 100, 0, 1);
    setSfxVolume(nextVolume);
    if (nextVolume > 0 && !soundEnabled) setSoundEnabled(true);
  });''',
    '''  volumeMuteButton?.addEventListener("click", () => {
    setMusicEnabled(!musicEnabled);
  });
  soundEffectsMuteButton?.addEventListener("click", () => {
    const enabled = setSfxEnabled(!sfxEnabled);
    if (enabled) sound.tone(520, .1, { to: 760, gain: .03 });
  });
  musicVolumeSlider?.addEventListener("input", () => {
    const nextVolume = Core.clamp(Number(musicVolumeSlider.value) / 100, 0, 1);
    setBgmVolume(nextVolume);
  });
  soundEffectsVolumeSlider?.addEventListener("input", () => {
    const nextVolume = Core.clamp(Number(soundEffectsVolumeSlider.value) / 100, 0, 1);
    setSfxVolume(nextVolume);
  });'''
)

replace_once(
    "index.html",
    '''            <span class="system-volume-heading"><span>音樂</span><strong id="musicVolumeValue">70%</strong></span>
            <span class="system-volume-control"><input id="musicVolumeSlider" type="range" min="0" max="100" step="1" value="70" aria-label="音樂音量" /><button id="volumeMuteButton" class="system-volume-mute-button" type="button" aria-label="全部靜音" aria-pressed="false"><span aria-hidden="true">🔊</span></button></span>
          </div>
          <div class="system-volume-row">
            <span class="system-volume-heading"><span>音效</span><strong id="soundEffectsVolumeValue">70%</strong></span>
            <span class="system-volume-control"><input id="soundEffectsVolumeSlider" type="range" min="0" max="100" step="1" value="70" aria-label="音效音量" /></span>''',
    '''            <span class="system-volume-heading"><span>音樂</span><strong id="musicVolumeValue">70%</strong></span>
            <span class="system-volume-control"><input id="musicVolumeSlider" type="range" min="0" max="100" step="1" value="70" aria-label="音樂音量" /><button id="volumeMuteButton" class="system-volume-mute-button" type="button" aria-label="音樂靜音" aria-pressed="false"><span aria-hidden="true">🔊</span></button></span>
          </div>
          <div class="system-volume-row">
            <span class="system-volume-heading"><span>音效</span><strong id="soundEffectsVolumeValue">70%</strong></span>
            <span class="system-volume-control"><input id="soundEffectsVolumeSlider" type="range" min="0" max="100" step="1" value="70" aria-label="音效音量" /><button id="soundEffectsMuteButton" class="system-volume-mute-button" type="button" aria-label="音效靜音" aria-pressed="false"><span aria-hidden="true">🔊</span></button></span>'''
)

replace_once(
    "footstep-sfx.js",
    '''  const SOUND_KEY = "everrealm-sound";
  const SFX_VOLUME_KEY = "everrealm-sfx-volume-v1";
  const LEGACY_VOLUME_KEY = "everrealm-bgm-volume-v1";''',
    '''  const SFX_ENABLED_KEY = "everrealm-sfx-enabled-v1";
  const LEGACY_SOUND_KEY = "everrealm-sound";
  const OLDEST_SOUND_KEY = "lanternbound-sound";
  const SFX_VOLUME_KEY = "everrealm-sfx-volume-v1";
  const LEGACY_VOLUME_KEY = "everrealm-bgm-volume-v1";'''
)

replace_once(
    "footstep-sfx.js",
    '''      return read(SOUND_KEY, "on") !== "off" && volume() > 0;''',
    '''      const legacyEnabled = read(LEGACY_SOUND_KEY, read(OLDEST_SOUND_KEY, "on"));
      return read(SFX_ENABLED_KEY, legacyEnabled) !== "off" && volume() > 0;'''
)

replace_once(
    "tests/footstep-sfx.test.js",
    '''  const prefs = new Map([["everrealm-sound", "off"], ["everrealm-bgm-volume-v1", "0.70"]]);''',
    '''  const prefs = new Map([["everrealm-sfx-enabled-v1", "off"], ["everrealm-bgm-volume-v1", "0.70"]]);'''
)
replace_once(
    "tests/footstep-sfx.test.js",
    '''  prefs.set("everrealm-sound", "on");''',
    '''  prefs.set("everrealm-sfx-enabled-v1", "on");'''
)

replace_once(
    "docs/BGM_SYSTEM.md",
    '''- The speaker button remains a global on/off mute for both categories. Setting either slider to `0%` only mutes that category; it must not force the other category off.''',
    '''- BGM mute uses `everrealm-bgm-enabled-v1`; SFX mute uses `everrealm-sfx-enabled-v1`. Each settings row owns its own speaker button, so muting music never mutes footsteps/combat/UI effects and muting SFX never stops BGM. Legacy `everrealm-sound` / `lanternbound-sound` values are used only as the first-run migration fallback.
- Setting either slider to `0%` changes only that category's volume and does not change the other category or its mute state.'''
)

# Cache bust touched runtime modules.
replace_once("runtime-assets.js", '''    "rpg-core.js",''', '''    "rpg-core.js?v=20260913-01",''')
replace_once("runtime-assets.js", '''    "locomotion.js",''', '''    "locomotion.js?v=20260913-01",''')
replace_once("runtime-assets.js", '''    "footstep-sfx.js?v=20260913-01",''', '''    "footstep-sfx.js?v=20260913-02",''')
replace_once("runtime-assets.js", '''    "game.js?v=20260912-11",''', '''    "game.js?v=20260913-01",''')
replace_once(
    "index.html",
    '''        document.write(`<script src="${asset("runtime-assets.js")}"><\\/script>`);''',
    '''        document.write(`<script src="${asset("runtime-assets.js?v=20260913-01")}"><\\/script>`);'''
)

game_text = (root / "game.js").read_text(encoding="utf-8")
if re.search(r"\bsoundEnabled\b", game_text):
    raise SystemExit("game.js still contains soundEnabled after patch; refusing to finish.")

if not args.no_tests:
    node = shutil.which("node")
    if not node:
        print("WARN: node not found; tests skipped.")
    else:
        for path in ["rpg-core.js", "locomotion.js", "footstep-sfx.js", "game.js"]:
            run(node, "--check", path)
        run(node, "--test",
            "tests/rpg-core.test.js",
            "tests/locomotion.test.js",
            "tests/footstep-sfx.test.js",
            "tests/battle-game-integration.test.js",
            "tests/ui-shell.test.js")
        print("Focused tests: PASS")

print("\nApplied Everrealm fixes:")
for p in changed:
    print(" -", p)
print(f"\nBackup: {BACKUP_DIR}/")
print("Next:")
print("  git diff")
print("  npm test")
print('  git add -A && git commit -m "Fix save position, monster labels and audio controls"')
