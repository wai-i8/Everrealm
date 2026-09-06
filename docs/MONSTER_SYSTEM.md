# Monster System

## Purpose

Monster identity, ecology, combat data, rewards and Codex records use one canonical catalog: `map/monster-blueprints.js`. Map files own only placement and encounter context; `game.js` consumes hydrated catalog data and does not invent species stats.

## Canonical roster

The current roster is exactly nine stable IDs:

`chick`, `fox`, `raccoon`, `wild_boar`, `bear`, `turtle`, `coyote`, `frog`, `snake`.

Every entry contains a stable name, family, normal level band, habitat maps/zones, base stats, species multipliers, move range, battle role, AI profile, skills, rewards, quest tags, Codex copy and locomotion status. `fox` and `coyote` are separate species: foxes are fast flankers while coyotes are pack hunters.

The catalog deliberately has no generic monster speed stat. Exploration speed is a runtime movement tuning value, while battle action speed comes from each skill's shared `speedGrade` (`S` through `F`) and is resolved by the existing battle action-order resolver.

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

The main story gatekeeper may still set `mainBoss: true` to disable retreat. Other boss/elite encounters use the formula and show a failure message without silently teleporting the player.

## Migration and stable IDs

`LEGACY_MONSTER_MIGRATION` is the only compatibility table for old saves and old authored maps. New map spawns and new contracts must use canonical IDs. Guild contracts and defeat events use `objective.target` / `monster_id` with canonical IDs; localized names are presentation only. Codex cards enumerate `CANONICAL_MONSTER_IDS` and aggregate legacy kill counters for old saves.

## Maps and encounters

The Mountain Field uses chick, fox, raccoon, turtle, wild_boar, coyote and a canonical bear gatekeeper. The Mine uses raccoon, frog, wild_boar, turtle, snake and bear. Spawn level, elite, crystal, chest guard and main-boss flags remain map-owned. Encounter companions are optional `encounterParty` data on the blueprint, not a type chain in the battle UI.

## Art status

`assets/monster-sources/` stores the six user-provided single-image references for snake, fox, wild boar, frog, turtle and bear. These are source art, not runtime locomotion atlases. The six entries are marked `locomotion.status: source-only` until directional frames can be authored, normalized, packed into the Standard Mobile Unit `4×7 / 28-frame` contract and audited. `chick`, `fox` and `raccoon` may use the existing approved atlases; the remaining monsters use an explicit legacy facing fallback during this foundation phase and must not be described as locomotion-complete.
