# 霧都主城 · Main Town

- `map_id: world`
- runtime owner：`maps/main-town.js`
- navigation owner：`map/main-town-navigation.js`
- coordinate space：the original supplied image pixels, origin top-left, x right and y down

## 1. Canonical flattened scene pair

Main Town is a flattened scene defined by a paired display image and authoring image. The pair must stay in the same pixel coordinate space; runtime must never estimate interaction geometry from the visible art.

| purpose | canonical file |
| --- | --- |
| player-visible master art | `assets/main-town/maintown.jpg` |
| navigation / interaction authoring | `assets/main-town/maintown_walkable.jpg` |
| authored package metadata | `assets/main-town/main-town-navigation.json` |
| synchronous browser artifact | `map/main-town-navigation.generated.js` |

Both supplied images are `7680 × 4320`. The JPG files remain the source of truth. The development compiler classifies their painted colour regions and writes compact RLE data into the generated JavaScript so a zero-build browser can load navigation synchronously without `fetch()`, Canvas pixel readback or an authoring-image overlay.

Runtime preserves this native image space as the Main Town world: one source pixel is one world pixel before the shared camera zoom. The gameplay camera crops a viewport-sized source rectangle around the player and draws that crop directly to the final Canvas output; it does not fit the full 7680 × 4320 image into the viewport. Do not apply the legacy compact-map baseline, a second image scale, CSS enlargement, or a separate click coordinate scale. Rendering, feet anchors, movement collision, and screen-to-world input all use the same camera transform. DPR may enlarge the Canvas backing store for output quality, but never changes world size or camera crop.

The compiler tolerates the supplied JPG compression colours and normalizes only the small anti-aliased seam directly connecting a painted region to the white road. It does not infer scenery, invert a collision mask, or make an unmarked background area walkable. If package data is missing, malformed or dimensionally invalid, the resolver is fail-closed and all ordinary movement is blocked.

## 2. Authoring colour contract

`maintown_walkable.jpg` is the only canonical navigation / interaction source:

- **White** — walkable ground.
- **Cyan** — an authored transition region. The six regions are also valid arrival/approach ground so a player can enter the region and activate its transition.
- **Pink** — the Main Town deck configuration interaction region. It is reachable authoring ground, not an NPC, dialogue target or scene exit.
- **Every other colour or unmarked pixel** — blocked and non-interactive.

The runtime uses the same feet-disk resolver for click-to-move pathfinding, movement substeps, transition arrival and the pink interaction region. The visible JPG is never used as a collision source.

Main Town click-to-move uses 1px line-clear sampling and four-way waypoints. This matches the runtime's axis-by-axis collision substeps and preserves narrow authored corridors without stepping across a one-pixel blocked edge.

## 3. Fixed cyan mapping

The mapping is spatially and semantically fixed; it must not be exchanged or reconstructed from legacy coordinates.

| authoring region | runtime portal | destination |
| --- | --- | --- |
| left-upper cyan | `world-to-shop` | Weapon / Equipment Shop (`shop`) |
| upper-middle cyan | `world-to-guild` | Guild (`guild`) |
| right-upper cyan | `world-to-clinic` | Hospital / Clinic (`clinic`) |
| left-lower cyan | `world-to-general-store` | Item / General Store (`general-store`) |
| right-lower cyan | `world-to-inn` | Inn (`inn`) |
| rightmost cyan | `world-to-field` | East Exit / 城東出口 (`field`) |

The five building regions are `physical-door` transitions. The rightmost region is the `physical-passage` to the East Exit. All exact rectangles, region values and connectivity anchors are generated into `main-town-navigation.json`; `maps/main-town.js` only connects that package to the shared transition API.

The pink region is `deck-configuration` and drives `harbour-gate-deck-console` / `deck-loadout`. It opens the editable battle-skill configuration surface. It is not a transition, NPC, street character, dialogue point or scene exit. Its semantic adapter has `render: false`; the authoring region is the canonical trigger and no old deck sign/bitmap/object is rendered or used as a second trigger.

## 4. Spawn and anti-bounce contract

Each building portal stores the authored transition rectangle, a clear exterior approach anchor and the existing interior `entrance` spawn. The five interior maps retain their cyan exit regions and spawn a few pixels inside the room rather than on the exit. Returning to Main Town uses a clear white exterior anchor outside the corresponding cyan rectangle. East Exit uses a clear white point west of its rightmost region in both directions.

The shared automatic-transition latch is re-armed only after the player has left the current region. Closing the deck panel does not retrigger it while the player remains on the pink region; the interaction is region-backed and has no dialogue or portal side effect.

## 5. Ownership and change rule

- `maintown.jpg` owns all player-visible town, buildings, roads, wall, fountain and scenery pixels.
- `maintown_walkable.jpg` owns all Main Town walkability, six cyan transitions and the pink deck interaction.
- `main-town-navigation.json` records hashes, dimensions, colour semantics, mapping and QA metadata; it is generated from the pair.
- `map/main-town-navigation.generated.js` is generated runtime data and must not be edited by hand.
- `maps/main-town.js` owns only semantic map shape, portal linkage, spawn/facing contracts and the hidden deck interaction adapter.
- Old Main Town PNG masks, old trigger coordinates, old deck-board visuals and old bitmap interaction sources are disabled/non-canonical. A future geometry change must replace the supplied pair, rerun the compiler, update the package and repeat navigation, transition and runtime QA.
