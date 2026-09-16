# Everrealm Phase 2 Realtime System

## Scope

Phase 2 uses the existing Firebase project and app with this Realtime Database endpoint:

```text
https://everrealm-f5a7d-default-rtdb.firebaseio.com/
```

Realtime Database is transient only. Firestore remains the permanent save store for inventory, equipment, coins, EXP, quests, progression and all existing `players/{uid}` data. The one-active-device/session policy remains owned by Firestore and is unchanged.

Phase 2 does not synchronize combat, tactical cells, damage, skills, enemy state, turns, battle results, parties, chat, trading, economy or Cloud Functions.

## Presence records

Each authenticated player owns one presence record:

```text
presence/{uid}
{
  online: true,
  mapId: string,
  lastSeen: RTDB server timestamp,
  connectionId: string
}
```

The client arms `onDisconnect().remove()` for both the presence record and the current map player record. Logout, session invalidation and leaving the game remove them immediately as well.

## Same-map player records

Only the current map is subscribed. The local player's record is:

```text
maps/{mapId}/players/{uid}
{
  uid: string,
  name: string,
  classId: string,
  x: number,
  y: number,
  facing: "up" | "right" | "down" | "left",
  state: "exploring" | "battle",
  updatedAt: RTDB server timestamp
}
```

Exploration coordinates are throttled and are never written once per render frame. Battle state keeps the same exploration `x`, `y` and `facing`; tactical battle coordinates are not published. A low-frequency heartbeat keeps an in-battle record fresh without publishing battle movement.

Remote records are rendered only on the subscribed map. Their positions are interpolated toward the newest RTDB target. A remote player in `battle` remains visible at their last exploration position and receives the dedicated crossed-swords Canvas marker. No collision or combat authority is attached to remote records.

## WorldTime

Firestore stores a read-only shared configuration at `world/config`:

```text
{
  version: 1,
  epochRealTime: Firestore Timestamp,
  epochGameDay: 1,
  epochGameHour: 0,
  epochGameMinute: 0,
  realSecondsPerGameHour: 150
}
```

The client reads RTDB `.info/serverTimeOffset` and estimates:

```text
serverNow = Date.now() + serverTimeOffset
```

Current time is derived from `serverNow - epochRealTime`. One game minute is 2.5 real seconds, one game hour is 150 real seconds, and one real hour is one Everrealm day. The client never writes the current minute or hour back to Firebase.

The launch seed uses this exact UTC top-of-hour timestamp:

```text
2026-09-16T14:00:00.000Z
```

as a Firestore Timestamp for `epochRealTime`, producing `Day 1   00:00`. The developer-only seed command refuses to overwrite an existing document unless `--force` is explicitly supplied for an approved reset.

The public API is `getTime()`, `getDay()`, `getHour()` and `getMinute()`. `isNight()` and day/night lighting are intentionally not part of this system.

## Security

Authenticated clients may read same-map player collections and presence records. A client may write only its own UID's presence and player record. RTDB rules validate the required fields and constrain `state` to `exploring` or `battle`. Firestore allows authenticated reads of `world/config` and denies client writes.
