# Everrealm BGM System

`audio-core.js` owns the small browser-native background music manager. It keeps
one looping `HTMLAudioElement`, switches source only when the map's music zone
changes, and exposes a mute toggle shared with the exploration sound control.

## Assets and routing

| zone | maps | asset |
| --- | --- | --- |
| Main Town | `world`, `guild`, `shop`, `clinic`, `general-store`, `inn` | `assets/audio/bgm/maintown.wav` |
| Mountain / Mine | `field`, `dungeon` | `assets/audio/bgm/mountainousareas.wav` |

Town interiors deliberately stay on the town track. Field and dungeon share the
mountain track, so crossing between those maps does not restart the music.

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
- The speaker button remains a global on/off mute for both categories. Setting either slider to `0%` only mutes that category; it must not force the other category off.
