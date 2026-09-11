# Everrealm Equipment System

Equipment is the primary player build surface. The equipment schema is owned
here; canonical machine-readable records live in `data/equipment.js`, while
`expansion-core.js` owns normalization, purchase/equip and stat aggregation logic.
Shared hit, damage, action-order and pending-action formulas remain in
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

## Fighter / STRUGARDEN numeric conversion

Everrealm Fighter gear uses the original 《幸福 Online／STRUGARDEN》 impact (`衝`) axis as the numeric source, but keeps Everrealm's single ATK/DEF model:

- fist / claw weapons: original `衝` attack becomes Everrealm `attack` directly;
- Fighter armour offensive bonus: original `衝` attack becomes Everrealm `attack` directly;
- Fighter armour defence: `defense = round(original 衝 defense / 5)`;
- `requiredLevel` and shop `cost` follow the corresponding original table where the mapping is confirmed;
- runtime does **not** retain slash / impact / pierce matrices after conversion.

Current weapon anchors are:

| Item | Required Lv | Cost | Everrealm ATK |
| --- | ---: | ---: | ---: |
| `novice_gloves` | 1 | 0 | 19 |
| `metal_knuckles` | 6 | 450 | 23 |
| `giz_armguard` | 12 | 1800 | 27 |
| `heavy_knuckles` | 18 | 4050 | 33 |
| `superheavy_knuckles` | 24 | 7200 | 39 |

Armour conversion anchors include `topknot_cap` (`衝防 14 → DEF 3`), the Lv5 `disciple` set (`衝攻 +2`, `衝防 12 → ATK +2 / DEF +2`), the Lv14 `training` set (`+3`, `16 → DEF 3`) and the Lv23 `conditioning` set (`+4`, `21 → DEF 4`). These are **conversion-time** rules; the player-facing sheet simply adds the resulting integer equipment stats.

For balance comparisons, the complete original-style five armour slots (head + upper + lower + hands + feet) produce the agreed Fighter anchors of roughly `ATK 31 / DEF 11` at Lv6 and `ATK 39 / DEF 15` at Lv14. The current V1 shop surface still exposes only weapon/head/upper/lower/full-body categories; legacy hand/feet records remain available for save compatibility and balance reference until that shop scope is intentionally changed.

Player class levels contribute `0` Base ATK and `0` Base DEF. Equipment is therefore the normal source of the visible attack/defence numbers; class level growth itself does not silently add hidden ATK/DEF.

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

If progression loss lowers the player below an equipped item's `requiredLevel`,
runtime must immediately unequip that item from every slot it occupies while
leaving the item owned in the player's inventory. Full-body items therefore
clear both body slots together; an over-level item must never continue
contributing stats after a level-down.


## Active catalog and legacy saves

`data/equipment.js` explicitly separates `EQUIPMENT_CATALOG` (currently obtainable/starting gear) from `LEGACY_EQUIPMENT_CATALOG`. `ALL_EQUIPMENT_CATALOG` is used only where save compatibility is required. Legacy-only gear is never added back to the current shop simply because an old save owns it. Static icon/art metadata is stored with the equipment record rather than duplicated in `game.js`.
