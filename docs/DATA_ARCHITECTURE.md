# Game Data Architecture

## Purpose

Everrealm separates fixed game definitions from runtime/player state. A fixed entity is defined once under `data/`; gameplay modules consume it by stable ID and must not duplicate names, stats, prices, icons or rewards inside `game.js`.

## Canonical data owners

- `data/classes.js` — class IDs, level tables, Lv45 cap, canonical level EXP requirements, starter equipment/skills.
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

`firebase-client.js` is the small browser SDK boundary, `cloud-save.js` owns the Firestore document contract, and `save-persistence.js` owns cloud resolution, the explicit one-time legacy migration and queued Firestore writes. `game.js` owns gameplay serialization/application but does not define a second cloud schema. Gameplay startup is closed until Firebase Auth has resolved and the authenticated UID has a cloud-ready Firestore session.

Normal runtime never reads or writes gameplay localStorage. The historical keys `everrealm-save-v1`, `lanternbound-save-v1`, `everrealm-save-owner-v1` and `everrealm-save-cache-v1:{uid}` are retained only as migration inputs/cleanup targets. If an authenticated UID has no cloud document and a valid historical local save exists, the player must explicitly choose whether to migrate it; successful `createIfAbsent` migration removes those gameplay keys. Existing cloud data always wins, migration failures preserve the old keys, and Firestore failures never create a persistent local fallback.

Firestore rules allow a user to read or write only their own `players/{uid}` document. Realtime Database and Hosting are intentionally not part of this phase; transient presence/room state remains a future system boundary.
