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
