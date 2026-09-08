# Everrealm Equipment System

Equipment is the primary player build surface. The equipment schema is owned
here; shared hit, damage, action-order and pending-action formulas remain in
[`docs/BATTLE_SYSTEM.md`](BATTLE_SYSTEM.md).

## Canonical item schema

Every normalized item has a stable `id`, readable name and description,
`requiredLevel`, optional `classId` restriction, canonical `occupiesSlots`,
and a `stats` object. Runtime equipment stats are:

- `attack` and `defense` — the unified ATK/DEF framework;
- `accuracy` and `evasion` — percentage-point modifiers;
- `weight` — a real timing stat, not cosmetic metadata;
- `moveRange` — the explicit grid Move modifier;
- `maxHp`, `speed`, and `critChance` — existing non-matrix build modifiers.

There are no runtime slash, impact, piercing, elemental, magic attack or
magic defense fields. Historical source fields may remain in reference data,
but `equipmentStats()` only sums the canonical schema above.

## Slots and full-body items

The canonical slots are `head`, `weapon`, `upperBody`, `lowerBody`, `hands`,
`feet`, and `charm`. An item can declare multiple `occupiesSlots`, such as a
one-piece martial uniform occupying both body slots. `equipmentStats()` counts
each equipped item by stable ID once, so a full-body item contributes its ATK,
DEF, Weight and other stats exactly once.

## Build interaction

`moveRange` is the one owner of equipment movement changes. A light martial
uniform can therefore grant `moveRange: 1`; no second Weight-to-Move threshold
formula is inferred. Weight primarily affects action timing together with the
chosen Skill Speed grade. The detailed ordering and unresolved balance
constants are defined in [`docs/BATTLE_SYSTEM.md`](BATTLE_SYSTEM.md).

Legacy saves may still use `body` or `armor` slot aliases; normalization maps
them to `upperBody`. Obsolete legacy combat attributes are ignored by save
sanitization rather than copied into generic ATK/DEF, preventing duplicate or
invented bonuses.
