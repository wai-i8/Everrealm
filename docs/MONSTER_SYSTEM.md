# Monster System

## Purpose

Monster identity, ecology, combat data, rewards, exploration presentation tuning and Codex records use one canonical machine-readable catalog: `data/monsters.js`. `map/monster-blueprints.js` is the runtime hydration/resolver layer. Map files own only placement and encounter context; `game.js` consumes hydrated catalog data and does not invent species stats.

## Canonical roster

The current roster is exactly nine stable IDs:

`chick`, `fox`, `raccoon`, `wild_boar`, `bear`, `turtle`, `coyote`, `frog`, `snake`.

Every entry contains a stable name, family, normal level band, habitat maps/zones, base stats, species multipliers, move range, battle role, AI profile, skills, rewards, quest tags, Codex copy and locomotion status. `fox` and `coyote` are separate species: foxes are fast flankers while coyotes are pack hunters.

Each monster record may contain an `exploration` block for movement speed, radius, aggro distance and presentation colour. Battle action speed remains separate and comes from each skill's shared `speedGrade` (`S` through `F`), resolved by the battle action-order resolver.

## Stats and level scaling

`monsterStatsAtLevel(id, level, options)` derives levelled HP, attack, defence and move range from `baseStats`, `multipliers`, the level and optional elite modifier. The resolver clamps normal runtime levels to the project cap and keeps the result deterministic. Species multipliers are data, not per-species branches in the renderer or UI.

`hydrateMonsterSpawn(spawn)` is the save/map boundary. It normalizes legacy IDs, preserves placement fields, adds levelled tactical stats, rewards and skill references, and never mutates its input.

## Battle skills

Skills are plain catalog records with AP cost, shared speed grade, relative range cells, area shape, target mode, delivery mode, height limit, damage model and effects. Melee skills use the same facing-relative orthogonal geometry contract as player linear skills (`pathMode: facingOrthogonalPriority`); projectile and pathless area skills state their delivery mode explicitly. Snake has fast venom bite, slower poison spit and poison cloud. Turtle has Shell Defense. Bear has a high-impact slam and charge.

Enemy action planning selects catalog skills, passes speed/AP/range into the existing tactical planner, orders actions through `Skills.orderActionsBySpeed`, and applies status effects through `FighterEffects`. No separate monster speed resolver is allowed.

## Rewards and retreat

XP uses the level-sensitive multiplier:

`round(baseXp × clamp(1 + 0.20 × (monsterLevel - playerLevel), 0.10, 1.60))`.

Retreat uses:

`clamp(0.40 + 0.15 × (playerLevel - highestLivingEnemyLevel), 0.05, 1.00)`.

Boss and elite encounters use the normal encounter formula; no monster carries a main-story gate flag and no exploration route is blocked by story state. Retreat rules remain owned by the battle system.

## Migration and stable IDs

`data/monsters.js` owns `LEGACY_MONSTER_MIGRATION`, which is the only compatibility table for old saves and old authored maps. New map spawns and new contracts must use canonical IDs. Guild contracts and defeat events use `objective.target` / `monster_id` with canonical IDs; localized names are presentation only. Codex cards enumerate `CANONICAL_MONSTER_IDS` and aggregate legacy kill counters for old saves.

## Maps and encounters

The Mountain Field uses chick, fox, raccoon, turtle, wild_boar and coyote. The Mine uses raccoon, frog, wild_boar, turtle, snake and bear. Spawn level, elite and chest guard remain map-owned. Encounter companions are optional `encounterParty` data on the blueprint, not a type chain in the battle UI.

## Art status

`assets/monster-sources/` stores the original single-image references. The six
new canonical sets are normalized under
`assets/locomotion/sources/<monster>/`, packed into runtime atlases under
`assets/locomotion/`, and audited against the Standard Mobile Unit
`4×7 / 28-frame` contract. `chick`, `fox` and `raccoon` retain their existing
approved atlases; all nine canonical ordinary monsters resolve to their own
runtime locomotion asset and no longer use the legacy four-facing fallback.
