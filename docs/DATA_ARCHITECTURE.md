# Game Data Architecture

## Purpose

Everrealm separates fixed game definitions from runtime/player state. A fixed entity is defined once under `data/`; gameplay modules consume it by stable ID and must not duplicate names, stats, prices, icons or rewards inside `game.js`.

## Canonical data owners

- `data/classes.js` — class IDs, level tables, starter equipment/skills.
- `data/items.js` — item/material identity, presentation metadata and legacy item-ID migration.
- `data/equipment.js` — active and legacy-only equipment records, shop membership and icon/art metadata.
- `data/monsters.js` — monster identities, combat skills, drops, ecology and exploration tuning.
- `data/quests.js` — current fixed Guild Commission definitions.
- `data/skills/warrior.js` / `data/skills/fighter.js` — player skill definitions.

Runtime logic remains in `expansion-core.js`, `map/monster-blueprints.js`, `guild-commission-core.js`, `skill-core.js` and `game.js`.

## Stable IDs and migration

Existing stable equipment, monster, skill and quest IDs are not renamed merely for style. Item/material IDs use snake_case as the canonical form. Historical hyphenated item IDs are accepted only through `ITEM_ID_ALIASES` and are normalized while a save is loaded; quantities from multiple aliases are merged before the next save. Legacy equipment remains readable through `ALL_EQUIPMENT_CATALOG` but is marked `legacyOnly` and is not part of the active shop catalog.

## Save/Firebase boundary

Fixed Game Data remains version-controlled with the build. Firebase Auth supplies the account identity and Firestore stores only the existing player-owned version-1 save payload at `players/{uid}`; it does not copy the fixed catalogs. The client removes persistence metadata before reading a cloud payload and the cloud writer adds only the server-managed `updatedAt` field.

`firebase-client.js` is the small browser SDK boundary, `cloud-save.js` owns the Firestore document contract, and `save-persistence.js` owns local compatibility, migration and write ordering. `game.js` owns gameplay serialization/application but does not define a second cloud schema.

The local keys are `everrealm-save-v1`, the readable legacy key `lanternbound-save-v1`, an ownership marker `everrealm-save-owner-v1`, and per-account caches under `everrealm-save-cache-v1:{uid}`. An unauthenticated save stays local. On first sign-in, an existing unclaimed local save requires an explicit claim choice; an existing cloud document is authoritative and is never overwritten by stale local state. Account promotion archives the previous primary before writing the new scoped save and writes the owner marker last, with rollback on failure.

Firestore rules allow a user to read or write only their own `players/{uid}` document. Realtime Database and Hosting are intentionally not part of this phase; transient presence/room state remains a future system boundary.
