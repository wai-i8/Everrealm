# Player Data Schema

Player data is runtime/persistent state, not fixed Game Data. It must reference the canonical IDs in `data/` instead of copying equipment, item, monster, skill or quest definitions.

## Current local save boundary

The local save keeps the existing version-1 envelope for compatibility. Permanent state is split into:

- `player`: name, position, HP, level, XP, coins, potions and existing upgrade fields;
- `expansion.classId`;
- `expansion.ownedEquipment[]` and `expansion.equipped` — equipment IDs only;
- `expansion.inventory` — canonical item IDs to quantities;
- `expansion.skills` — learned/manual/deck state keyed by skill ID;
- `expansion.guildCommission` — current commission state/progress;
- `expansion.monsterKills`, dungeon progression and checkpoint.

Historical `activeContracts` and `contractRotation` fields are accepted only by virtue of being ignored; new saves no longer write them. Historical hyphenated item IDs are normalized by `data/items.js` when loading and are saved back in canonical snake_case form.

## Firebase boundary

When Firebase is added, Firebase Auth `uid` should become the player/account identity. Long-lived player progression belongs in Firestore; transient room/presence/X/Y data belongs in Realtime Database. Fixed catalogs under `data/` remain version-controlled Game Data and are referenced only by stable IDs.

A future Firestore split can use documents/subcollections such as `players/{uid}/profile`, progression, inventory/equipment, skills and quests. Server-authoritative rewards should validate writes before changing coins, XP, inventory or rare equipment.
