# Everrealm Social System

## Scope

V1 social covers three things only: selecting another realtime player in exploration, a confirmed friend graph, and one-to-one whispers between friends. Trading, parties and shared combat are intentionally outside this version.

## Player selection

Remote players remain presentation-only entities from the same-map RTDB feed. Desktop uses left click and touch devices use a normal tap. The interactive region is deliberately limited to the rendered name plus a screen-sized ellipse around the head / upper body. Feet and the surrounding tile are never part of the social hit target, so crowded areas still leave ground available for click-to-move.

The hit target centre follows the rendered character through camera pan and zoom, but its radius stays approximately constant in screen pixels. Touch targets are slightly larger than mouse targets. When several targets overlap, the nearest valid head/name target wins.

Selecting a player opens a compact interaction popup with:

- 查看資料
- 加好友 / 接受好友 / 好友狀態
- 密語 (friends only)

Trading and party commands are not shown until those systems exist.

## Friend graph

Friend mutations are server-authoritative through `socialCommand`. The browser can read only its own social subcollections and cannot directly write them.

```text
players/{uid}/friends/{friendUid}
{
  uid,
  name,
  threadId,
  since
}

players/{uid}/friendRequests/{requesterUid}
players/{uid}/friendRequestsSent/{targetUid}
```

A request must be explicitly accepted. Acceptance creates symmetric friend documents for both players and deletes pending request state. Removing a friend deletes both sides. Friend UIDs are canonical Firebase Auth UIDs; display names are copied from canonical player saves for presentation.

## Whispers

Each accepted friendship owns one deterministic private RTDB thread. The thread id is derived server-side from the sorted pair of UIDs and is not player-selected.

```text
chat/whispers/{threadId}
  members/{uid}: true
  names/{uid}: string
  updatedAt: number
  messages/{messageId}
  {
    uid,
    toUid,
    name,
    text,
    createdAt
  }
```

Only thread members can read the thread. A client may append only a message whose `uid` equals `auth.uid`, whose `toUid` is the other member, and whose text is at most 200 characters. Membership metadata is written only by Cloud Functions. If an old friendship is missing RTDB membership metadata, `ensure-whisper` revalidates both Firestore friendship documents before repairing the thread.

The lower-left chat UI has `世界` and `密語` filters. Choosing a friend makes the composer target that friend until the user switches back to `世界` or selects another friend. V1 subscribes to whisper messages from the current gameplay session start onward, matching the existing world-chat no-history-on-login behaviour.

## Security boundary

- Firestore owns the durable friend graph and request state.
- Cloud Functions own every friend mutation and RTDB thread membership change.
- RTDB owns transient/private chat messages and same-map remote-player presentation.
- Remote-player presence, coordinates or names are never trusted for inventory, economy, battle or progression authority.
- Trading, parties, following and shared battle are deferred systems and must not piggyback on friendship state.
