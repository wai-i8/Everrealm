# Everrealm Phase 2 Realtime System

## Scope

Phase 2 uses the existing Firebase project and app with this Realtime Database endpoint:

```text
https://everrealm-f5a7d-default-rtdb.firebaseio.com/
```

Realtime Database is transient only. Firestore remains the permanent save store for inventory, equipment, coins, EXP, quests, progression and all existing `players/{uid}` data. The one-active-device/session policy remains owned by Firestore and is unchanged.

Phase 2 does not synchronize combat, tactical cells, damage, skills, enemy state, turns, battle results, parties, trading, economy or Cloud Functions. A lightweight authenticated world-chat feed is layered on RTDB after the movement/presence foundation and remains non-authoritative gameplay data.

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

## World chat

The first chat channel is a single global world feed:

```text
chat/world/messages/{messageId}
{
  uid: string,
  name: string,
  text: string,
  createdAt: RTDB server timestamp
}
```

Only authenticated users may read the feed, and a client may create only a message whose `uid` matches `auth.uid`. Messages are plain text, limited to 200 characters, and the client applies a short send cooldown. The runtime listens to at most 500 messages from the current gameplay session start time onward, so logging in / entering gameplay does not replay historical world chat. The database is not client-pruned; server-side retention cleanup can be added later without granting clients delete authority.

The existing lower-left system log renders world chat through a dedicated `世界` filter. Desktop uses the same HTML input with Enter/submit; touch devices use the native software keyboard. Chat pointer/touch events are contained by the chat controls and do not trigger click-to-move.

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

Phase 3 Step 9A deliberately leaves this realtime path untouched: local movement still publishes through the existing throttled RTDB record, and remote interpolation remains presentation-only. Separately, routine Firestore saves derive a server-owned `expansion.positionAuthority` checkpoint. That checkpoint is not sourced from RTDB and does not add a Function call to each movement update.
