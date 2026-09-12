# Everrealm — stone/tile footstep SFX patch

Base: `main` @ `91ebb9f0e25ba4d373d015db62a4433e96c19c8a`

## Changed / new files
- `runtime-assets.js` — loads `footstep-sfx.js` immediately after `locomotion.js` and before `game.js`.
- `footstep-sfx.js` — isolated player footstep runtime; `game.js` is not modified.
- `assets/audio/sfx/footsteps/stone/stone-01.ogg` … `stone-04.ogg` — hard-surface recordings/variations.
- `assets/audio/sfx/footsteps/stone/LICENSE.txt` — CC0 provenance.
- `tests/footstep-sfx.test.js` — cadence, mute/volume, surface and wrapper behaviour tests.

## Behaviour
- Stone/tile footsteps play on: `world`, `guild`, `shop`, `clinic`, `general-store`, `inn`.
- `field`, `dungeon` and `mine` stay silent for now, instead of incorrectly reusing stone sounds. They can later receive dirt/grass/cave sets through the same surface map.
- A first contact occurs after about 100 ms of actual movement; subsequent contacts occur every ~300 ms, matching the current 10 fps / 6-frame walk cycle (two contacts per ~0.6 s loop).
- Cadence follows collision-resolved player movement. Standing still or pushing against a blocked direction does not continuously emit steps.
- Four variants avoid immediate sample repeats and add a small runtime playback-rate variance (0.97–1.03).
- Reuses the existing `everrealm-sound` on/off preference and `everrealm-bgm-volume-v1` volume setting, so no duplicate settings UI is introduced.
- Samples preload after the first pointer/key gesture and playback suspends while the page is hidden.

## Audio source
The Freesound recording discussed during design is CC0 but its original download is login-gated. This patch therefore ships a redistributable CC0 Kenney hard-surface recording instead, rather than depending on a remote/login-only asset.
