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
- `speed` and `critChance` — existing non-matrix build modifiers.

`maxHp` remains a legacy schema key for save/data compatibility but equipment
never contributes Max HP at runtime. Current equipment records keep it at `0`;
class/level progression owns the HP curve.

There are no runtime slash, impact, piercing, elemental, magic attack or
magic defense fields. Historical source fields may remain in reference data,
but `equipmentStats()` only sums the canonical schema above.

## Fighter / STRUGARDEN numeric conversion

Everrealm Fighter gear uses the original 《幸福 Online／STRUGARDEN》 impact (`衝`) axis as the numeric source, but keeps Everrealm's single ATK/DEF model:

- fist / claw weapons: original `衝` attack becomes Everrealm `attack × 5`;
- Fighter armour offensive bonus: original `衝` attack becomes Everrealm `attack × 5`;
- Fighter armour defence: original `衝防` is retained as the Everrealm `defense` value;
- `requiredLevel` and shop `cost` follow the corresponding original table where the mapping is confirmed;
- runtime does **not** retain slash / impact / pierce matrices after conversion.

Current weapon anchors are:

| Item | Required Lv | Cost | Everrealm ATK |
| --- | ---: | ---: | ---: |
| `novice_gloves` | 1 | 0 | 95 |
| `metal_knuckles` | 6 | 450 | 115 |
| `giz_armguard` | 12 | 1800 | 135 |
| `heavy_knuckles` | 18 | 4050 | 165 |
| `superheavy_knuckles` | 24 | 7200 | 195 |

Armour conversion anchors include `topknot_cap` (`衝防 14 → DEF 14`), the Lv5 `disciple` set (`衝攻 +2`, `衝防 12 → ATK +10 / DEF 12`), the Lv14 `training` set (`衝攻 +3`, `衝防 16 → ATK +15 / DEF 16`) and the Lv23 `conditioning` set (`衝攻 +4`, `衝防 21 → ATK +20 / DEF 21`). These are **conversion-time** rules; the player-facing sheet simply adds the resulting integer equipment stats.

For balance comparisons, the complete original-style five armour slots (head + upper + lower + hands + feet) produce Fighter anchors of `ATK 155 / DEF 62` at Lv6 and `ATK 195 / DEF 81` at Lv14. The shop exposes weapon, head, upper-body, lower-body, hands, feet and one-piece martial-uniform categories; all ten hand/feet records are now active shop inventory.

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
chosen Skill Speed grade. It remains an internal combat/timing stat and is **not** shown in the weapon/equipment shop product stat summary; shop-facing copy only surfaces player-useful purchase stats such as ATK/DEF and other intentionally exposed modifiers. The detailed ordering and unresolved balance
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


## Shop ownership and resale

Buying gear only adds the item to ownership; the shop never auto-equips it.
`requiredLevel` is checked when equipping, not when purchasing, so a player may
buy higher-level gear in advance. Class restrictions still prevent invalid gear
from being equipped. Equipped gear can be removed with `unequipItem()` and must
be unequipped before it can be sold.

The equipment shop and general item shop expose separate `購買` / `出售` modes.
Sell value is one third of the normal purchase price, rounded down with a
minimum of 1 coin for priced items. Ordinary materials without a catalog price
use the current simple material resale baseline. Inventory detail may also
permanently `銷毀` an unwanted owned item after an explicit confirmation;
protected/UI/currency identifiers are never destructible.

## Active catalog and legacy saves

`data/equipment.js` explicitly separates `EQUIPMENT_CATALOG` (currently obtainable/starting gear) from `LEGACY_EQUIPMENT_CATALOG`. `ALL_EQUIPMENT_CATALOG` is used only where save compatibility is required. Legacy-only gear is never added back to the current shop simply because an old save owns it. Static icon/art metadata is stored with the equipment record rather than duplicated in `game.js`.
