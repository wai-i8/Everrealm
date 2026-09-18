# Everrealm Trade System

## Scope

V1 trading is a direct player-to-player exchange launched from the same-map player interaction menu. It supports normal tradable inventory items, potions, spare equipment copies, Guild skill-book envelopes, skill books, unbound skill manuals and Gold. Parties and shared combat are separate systems.

## User flow

1. Select another player and choose `交易`. The sender sees a small `等待對方回覆` card; this pending invite is **not** an active trade.
2. The target accepts or rejects the trade invite. Only acceptance creates both players' active `tradeState/current` pointers and opens the trade panel.
3. Both players edit their own offer. Each side can see the other side's current items and Gold in realtime.
4. Each player presses `鎖定`. Locking freezes that player's offer.
5. Only after **both** offers are locked does `確認交易` become available.
6. Each player confirms once. The exchange executes only when both sides are confirmed.

If a player unlocks before final confirmation, both confirmation flags are cleared. Cancelling ends the session without moving any economy state.

## Trade state

Firestore owns the durable/live trade session state:

```text
tradeSessions/{tradeId}
{
  status: pending | active | completed | cancelled | rejected,
  initiatorUid,
  targetUid,
  participants: {
    a: { uid, name },
    b: { uid, name }
  },
  offers: {
    a: { coins, items, locked, confirmed },
    b: { coins, items, locked, confirmed }
  },
  createdAtMs,
  updatedAtMs
}
```

Per-player lightweight pointers/invites live under. `tradeState/current` exists only after acceptance; a pending invitation never counts as an active trade:

```text
players/{uid}/tradeState/current
players/{uid}/tradeInvites/{tradeId}
players/{uid}/outgoingInvite/current   # shared friend/trade/party sender lock
```

Clients may read only relevant trade state. All mutations go through the callable `tradeCommand`.

## Offer rules

Supported asset kinds are:

- normal inventory items
- healing potions
- spare equipment copies
- Guild skill-book envelopes
- skill books
- unbound skill manuals
- Gold

Main-quest bound manuals (`boundManualCounts`) are never exposed as tradable inventory and are rejected by server validation. The currently equipped equipment copy is reserved; only extra copies of that same equipment id may be offered.

The server validates ownership, stack/count limits, Gold balance, recipient capacity and tradeability again at final confirmation. It never trusts the browser's displayed offer.

## Atomic exchange

The second final confirmation triggers one Firestore transaction. It re-reads both canonical player saves and the current trade session, verifies both offers are still locked and confirmed, removes both outgoing offers, applies both incoming offers, increments each player's `stateRevision`, writes both player documents, marks the trade completed and clears active trade pointers.

If any ownership, balance, capacity or session-state check fails, the transaction aborts and no items or Gold move.

## Security boundary

- Browser UI is presentation and intent only.
- `tradeCommand` is the only writer for trade sessions, invites and trade pointers.
- Canonical `players/{uid}` saves remain the authority for inventory, equipment, skill items and Gold.
- Firestore rules allow participants to read their trade state but never write it directly.
- Friend status is not required for trading; accepting the explicit trade invite is the consent boundary.
- Party/follow/shared-battle state must not be inferred from trade state.
