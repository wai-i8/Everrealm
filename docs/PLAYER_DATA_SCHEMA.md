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
- `combatScaleVersion` — optional balance-migration marker; version `2` means
  the global HP/ATK/DEF scale has been applied. Saves without it are migrated
  by multiplying the persisted current HP once on load.

Historical `activeContracts` and `contractRotation` fields are accepted only by virtue of being ignored; new saves no longer write them. Historical hyphenated item IDs are normalized by `data/items.js` when loading and are saved back in canonical snake_case form.

## Firebase boundary

Firebase Auth email/password accounts use `uid` as the player identity. The current Phase 3 Firestore document is deliberately the same sanitized version-1 payload as the local save, stored at `players/{uid}`:

```text
players/{uid}
  version: 1
  combatScaleVersion: 2 (after the one-time balance migration)
  player: { name, gender, x, y, hp, level, xp, coins, potions, weaponLevel, upgrades }
  pendingLevelUps
  openedChests[]
  playTime
  expansion: { classId, ownedEquipment[], equipped, inventory, skills,
               guildCommission, guildMarks, guildRenown, monsterKills,
               dungeonClears, defeatedDungeonBosses[], checkpoint, currentMapId,
               positionAuthority }
  updatedAt: server timestamp (cloud metadata; never applied as gameplay state)
```

The browser never accepts a cloud document for another `uid`; Firestore rules enforce the same ownership check server-side. Gameplay requires a resolved Firebase Auth session, and the authenticated UID is the only identity used for `players/{uid}`. A per-user `sessions/{uid}` record stores the active browser/device session ID. An explicit login claims that record; any previously active device watching the same record is immediately returned to the login screen and signed out. Existing cloud state is authoritative on account load.

Phase 3 Step 5 closes all browser writes to `players/{uid}`. The browser may read its own player document, but create/update/delete are denied by Firestore rules; permanent mutations must go through authenticated Callable Functions using the Admin SDK. Routine cloud persistence goes through `playerStateCommand`. During Step 9A, exploration `x/y` remain compatibility/client-observed fields so live movement and save behaviour do not change, while the server derives a separate `expansion.positionAuthority` anchor from server time, canonical map state and the configured exploration speed. Plausible same-map movement advances that anchor; an impossible jump increments server-owned anomaly metadata without moving the trusted anchor. The first save for an old document and the first save after a server-authorized map change bootstrap a fresh same-map anchor. Step 9A is intentionally observation-only: it does not reject movement or alter RTDB interpolation. Monotonic `playTime` and the client-tracked remaining weak-potion travel budget remain accepted routine-save fields. HP, level, XP, coins, potions, inventory, equipment, skills, guild/quest progression, battle state, authoritative map state and other protected progression are ignored by routine client saves and are written only by server commands. Fresh-account creation/reset is rebuilt server-side from canonical starter rules instead of trusting client-provided protected values.

A historical local save is offered only for explicit one-time migration when the cloud document is absent. Migration is handled by the server migration path rather than a direct Firestore write, then the historical gameplay keys are deleted after a successful claim. A failed callable save remains retryable in memory and never pretends to have been persisted locally.

Fixed catalogs under `data/` remain version-controlled Game Data and are referenced only by stable IDs. Realtime Database contains only transient Phase 2 presence and same-map player records; inventory, equipment, coins, EXP, quests, progression and the permanent save remain in Firestore. Step 9A adds only the Firestore-side trusted position checkpoint foundation; later Step 9B/9C enforcement consumes it without turning RTDB movement into per-step server RPC.

## Account character name

新帳戶註冊必須由玩家輸入角色名稱（trim 後最多 24 字）。註冊成功時先同步到 Firebase Auth `displayName` 作 fresh-account identity；首次建立正式旅程時，該名稱必須寫入 canonical `players/{uid}.player.name`。其後 gameplay UI、battle、HUD、Status 同雲端 save 一律以 `player.name` 為角色名 source of truth，唔再由 hard-coded default 覆蓋已存在名稱。

## Phase 3 Step 9B — authoritative map transitions

`expansion.positionAuthority` is now enforced for map changes when a trusted
same-map anchor exists. `mapCommand("transition")` checks that anchor against
the authored exit/door region for the requested adjacent map. Client `player.x`
/`player.y` cannot be used to bypass this check. On success the server chooses
the canonical arrival coordinates, writes them to `player.x/y`, switches
`currentMapId`, and re-anchors `positionAuthority` on the destination map.
Legacy saves without an authority anchor may transition once and are then
bootstrapped into the protected path.
