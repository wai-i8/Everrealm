# Player Data Schema

Player data is runtime/persistent state, not fixed Game Data. It must reference the canonical IDs in `data/` instead of copying equipment, item, monster, skill or quest definitions.

## Current save boundary

The Firestore player document keeps the existing version-1 envelope for compatibility. Permanent state is split into:

- `player`: name, position, HP, level, XP, coins, potions and existing upgrade fields;
- `expansion.classId`;
- `expansion.ownedEquipment[]` and `expansion.equipped` — equipment IDs only;
- `expansion.inventory` — canonical item IDs to quantities;
- `expansion.skills` — learned/manual/deck state keyed by skill ID;
- `expansion.guildCommission` — current commission state/progress;
- `expansion.monsterKills`, dungeon progression and checkpoint.

Historical `activeContracts` and `contractRotation` fields are accepted only by virtue of being ignored; new saves no longer write them. Historical hyphenated item IDs are normalized by `data/items.js` when loading and are saved back in canonical snake_case form.

## Firebase boundary

Firebase Auth email/password accounts use `uid` as the player identity. The current Phase 3 Firestore document is deliberately the same sanitized version-1 payload as the local save, stored at `players/{uid}`:

```text
players/{uid}
  version: 1
  player: { name, x, y, hp, level, xp, coins, potions, weaponLevel, upgrades }
  pendingLevelUps
  openedChests[]
  playTime
  expansion: { classId, ownedEquipment[], equipped, inventory, skills,
               guildCommission, guildMarks, guildRenown, monsterKills,
               dungeonClears, defeatedDungeonBosses[], checkpoint, currentMapId }
  updatedAt: server timestamp (cloud metadata; never applied as gameplay state)
```

The browser never accepts a cloud document for another `uid`; Firestore rules enforce the same ownership check server-side. Gameplay requires a resolved Firebase Auth session, and the authenticated UID is the only identity used for `players/{uid}`. Existing cloud state is authoritative on account load. A historical local save is offered only for explicit migration when the cloud document is absent; a declined migration remains untouched until the player either retries migration or logs out. Successful migration deletes the historical gameplay keys after `createIfAbsent` succeeds. Normal authenticated saves are queued directly to Firestore with no local gameplay mirror or fallback; a failed cloud write remains retryable in memory and never pretends to have been persisted locally.

Fixed catalogs under `data/` remain version-controlled Game Data and are referenced only by stable IDs. Realtime Database, presence, rooms and server-authoritative reward validation are future work, not part of this client-only phase.
