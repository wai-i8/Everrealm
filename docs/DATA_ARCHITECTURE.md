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

Fixed Game Data should remain version-controlled with the client/server build. A future Firebase player record should save only player-owned state and stable references such as equipment IDs, item IDs, skill IDs and quest progress. Firestore/Realtime Database must not become a second copy of these fixed catalogs.
