# Everrealm BGM System

`audio-core.js` owns the small browser-native background music manager. It keeps
one looping `HTMLAudioElement`, switches source only when the map's music zone
changes, and exposes a mute toggle shared with the exploration sound control.

## Assets and routing

| zone | maps | asset |
| --- | --- | --- |
| Main Town | `world` | `assets/audio/bgm/maintown-v2-02-loop.mp3` |
| Mountain / Mine | `field`, `dungeon` | `assets/audio/bgm/mountainousareas-v1-02-loop.mp3` |
| Guild | `guild` | `assets/audio/bgm/guild-v1-01-loop.mp3` |
| Hospital | `clinic` | `assets/audio/bgm/hospital-v1-01-loop.mp3` |
| Other interiors | `shop`, `general-store`, `inn` | `assets/audio/bgm/building.mp3` |

Field and dungeon share the mountain track, so crossing between those maps does
not restart the music. Other indoor buildings likewise share the building
track, while the guild and hospital have their own music zones.

## Runtime contract

- `loop` is always enabled for an active track.
- A map transition calls `setMap`; same-zone transitions preserve the current
  playback position and do not create a second audio instance.
- Disabling sound pauses and mutes the active element; enabling it resumes the
  current zone after the browser permits playback.
- Autoplay rejection is caught so audio policy cannot break gameplay. If a refresh/load is restored while music is enabled, the first subsequent pointer/keyboard user gesture retries the active map track immediately; playback must not wait for a later map transition.
- The debug snapshot reports the selected source, paused/muted state, loop state
  and `activeInstances`; it must never report more than one active instance.

## Volume control

System settings expose separate persistent `0–100%` sliders for background music and sound effects.

- BGM uses `everrealm-bgm-volume-v1` and applies the normalized value to both the map BGM manager and the battle BGM element.
- SFX uses `everrealm-sfx-volume-v1` and applies the normalized value to generated gameplay tones plus sampled effects such as footsteps. Existing saves migrate naturally because SFX falls back to the old BGM value until the dedicated SFX preference is first written.
- BGM mute uses `everrealm-bgm-enabled-v1`; SFX mute uses `everrealm-sfx-enabled-v1`. Each settings row owns its own speaker button, so muting music never mutes footsteps/combat/UI effects and muting SFX never stops BGM. Legacy `everrealm-sound` / `lanternbound-sound` values are used only as the first-run migration fallback.
- Setting either slider to `0%` changes only that category's volume and does not change the other category or its mute state.
