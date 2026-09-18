# Everrealm Social System

## Scope

Social covers selecting another realtime player in exploration, confirmed friends, unrestricted one-to-one whispers, direct trading and party invitations. Trading and party/shared-combat remain server-authoritative systems specified outside the social presentation layer.

## Player selection

Remote players remain presentation-only entities from the same-map RTDB feed. Desktop uses left click and touch devices use a normal tap. The interactive region is deliberately limited to the rendered name plus a screen-sized ellipse around the head / upper body. Feet and the surrounding tile are never part of the social hit target, so crowded areas still leave ground available for click-to-move.

The hit target centre follows the rendered character through camera pan and zoom, but its radius stays approximately constant in screen pixels. Touch targets are slightly larger than mouse targets. When several targets overlap, the nearest valid head/name target wins.

Selecting a player opens a compact interaction popup with:

- 查看資料
- 加好友 / 接受好友 / 好友狀態
- 密語
- 交易
- 邀請組隊

好友、交易、組隊共用一個 server-authoritative outgoing invite lock：同一時間每名玩家只可以有一個待回覆邀請。發出後顯示等待回覆卡；接受、拒絕、取消或目標離線時才解除。

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

密語唔要求好友關係。任何已存在嘅玩家都可以成為一對一密語對象；`ensure-whisper` 由 Cloud Function 驗證兩個玩家 document 後建立 deterministic thread membership，同時喺雙方 Firestore 建立 `whisperPeers` 索引。

```text
players/{uid}/whisperPeers/{peerUid}
chat/whispers/{threadId}
  members/{uid}: true
  names/{uid}: string
  updatedAt: number
  messages/{messageId}
  { uid, toUid, name, text, createdAt }
```

只有 thread members 可以讀取 RTDB thread；browser 只可以以自己 `auth.uid` 寫訊息。好友關係唔係權限條件。左下角 `世界 / 密語` composer 會保留目前密語對象，直到玩家轉返世界頻道或揀另一個玩家。

待回覆邀請另外記喺：

```text
players/{uid}/outgoingInvite/current
{ type: friend | trade | party, targetUid, targetName, referenceId, createdAtMs }
```

呢個 document 只由 Cloud Functions 寫；client 只讀，用嚟呈現等待視窗同跨三種邀請嘅全域 lock。

## Security boundary

- Firestore owns the durable friend graph and request state.
- Cloud Functions own every friend mutation and RTDB thread membership change.
- RTDB owns transient/private chat messages and same-map remote-player presentation.
- Remote-player presence, coordinates or names are never trusted for inventory, economy, battle or progression authority.
- Trading uses its own Firestore session/pointer model and server-authoritative callable; it does not piggyback on friendship state.
- Party/follow/shared battle has its own authoritative state. Party member coordinates used by gameplay remain unchanged; clients may use a presentation-only formation around the local player to hide normal network interpolation lag.
