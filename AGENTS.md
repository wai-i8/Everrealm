# Project Instructions

This is the **永恆國度 · Everrealm** browser RPG project.
Preserve existing behaviour unless the current task explicitly changes the design.

## Source of truth

- Global gameplay direction, exploration UX, UI, skills / DECK, progression and cross-system design:
  `GAME_DESIGN.md`

- Battle / tactical combat / synchronized movement / collision / targeting / deterministic facing-relative orthogonal attack paths / projectiles / AP / skill height limits / combat AI / combat height rules:
  `docs/BATTLE_SYSTEM.md`

- Maps / scenes / entrances / teleport / exploration collision / encounters / biome / exploration-to-battlefield generation:
  `docs/MAP_SYSTEM.md`

- Pets / familiars / capture / familiar training / familiar battle integration / production helper:
  `docs/PET_SYSTEM.md`

- Production / gathering / crafting / recipes / production spirits:
  `docs/PRODUCTION_SYSTEM.md`

- Art assets / NPC visual design / battlefield art / Standard Mobile Unit 28-frame locomotion sprites / atlases / transparency / cropping / anchors / visual QA:
  `ART_PIPELINE.md`

- Run / test instructions and project overview:
  `README.md`

- Historical / original-game research references used for inspiration or verification:
  `docs/references/`
  These are evidence/reference documents only and do **not** override current Everrealm design specs.


Read only the documentation relevant to the current task.
If a task spans systems, read only the affected system documents plus the shared source they explicitly depend on.


## Reusable project skills

- `.codex/skills/everrealm-sprite-locomotion/SKILL.md`
  - Use for recurring Standard Mobile Unit locomotion work: 28-frame sprite generation/rebuild, normalize/repack, anchor/bleed fixes, exploration integration, battle walk animation and runtime visual QA.
  - This Skill defines procedure only. `ART_PIPELINE.md`, `docs/BATTLE_SYSTEM.md` and other routed system documents remain the specification sources of truth.
  - Prefer invoking it explicitly with `$everrealm-sprite-locomotion` when the task matches.

## Project directories

- `assets/` — Runtime artwork and visual assets: characters, NPCs, monsters, animations, terrain, battlefield art, environment objects, UI art, item/equipment icons.
- `tests/` — Automated regression and gameplay tests.
- `tools/` — Asset cleanup, atlas repacking, alpha auditing and other development utilities.
- `docs/` — Detailed specifications for large standalone systems.
- `docs/references/` — Historical/original-game research references. These preserve source evidence and explicit data graphs but are not current Everrealm gameplay specs.

For exact asset filenames, atlas layouts and art-processing rules, use `ART_PIPELINE.md`.

## Cross-system ownership

- `MAP_SYSTEM.md` decides what environment / terrain / obstacle / height context a battlefield contains.
- `BATTLE_SYSTEM.md` decides what those cells, obstacles and heights do mechanically in combat.
- `ART_PIPELINE.md` decides how those environments, tiles and props look and how their assets are produced; it also owns the shared Standard Mobile Unit `4×7 / 28-frame` Idle+Walk sprite contract.
- `PET_SYSTEM.md` plugs Familiar units into the existing battle / map / production systems; it must not duplicate their core resolvers.
- `PRODUCTION_SYSTEM.md` owns production rules; map placement / interaction of resource nodes and workstations belongs to `MAP_SYSTEM.md`.

### Map source-of-truth routing

- Shared map behavior, constants, helpers, registry or transition linking → read `docs/MAP_SYSTEM.md`, then edit `map/`.
- A specific map's semantic/layout rule → read `docs/MAP_SYSTEM.md` plus its matching `docs/maps/*.md`.
- A map's exact runtime dimensions, tiles, objects, NPCs, enemies or spawn points → edit only that map's owning file under `maps/**/*.js`.
- A permanent semantic/layout rule change → update the relevant map Markdown as well as its owning JS.
- `world.js` and `expansion-world.js` are thin legacy API wrappers; they are not map-definition sources of truth.

Do not duplicate the same rule in multiple documents.

## Working rules

- Fix root causes; do not hide problems with one-off coordinates, per-frame hacks, teleports, masks or unrelated hard-coding.
- Avoid unrelated refactors.
- Reuse shared movement, collision, battle, map and rendering logic instead of duplicating rules.
- Preserve save compatibility where practical.
- Keep system data data-driven; do not scatter per-skill, per-map, per-sprite or per-item special cases through UI code.
- Standard Linear skills must use the shared `facingOrthogonalPriority` attack-path resolver in `docs/BATTLE_SYSTEM.md`; do not hard-code a separate path for each skill or target cell.
- Skill range data may define target cells and height limits, but target selection is not the same as attack path or actual impact.
- For standard-sized players, ordinary monsters and Familiars, use the shared `ART_PIPELINE.md` Standard Mobile Unit locomotion contract; do not solve atlas problems with per-frame/per-unit magic offsets.
- AI-generated sprite sheets are source material, not trusted runtime atlases: normalize individual frames, use the fixed shared anchor/canvas, then repack and validate.
- Exploration and battle movement must use the same directional locomotion asset; a static sprite sliding between battle cells is not an acceptable final result.
- For code changes, run the relevant automated tests.
- For UI, sprite, map, battlefield, animation or other visual changes, run the game and visually inspect the actual result.
- When visual verification matters, use screenshots and iterate again if the result is still visibly wrong.
- Passing automated tests is not enough for a visual task if the runtime still looks incorrect.

### Codex runtime / test verification environment

- Real visual/runtime verification and relevant automated tests are still required. Distinguish a tooling failure from a game or test failure, and only use these fallbacks when the error clearly matches the documented environment failure.
- CDP/browser: the smoke runner can fail when the sandbox blocks the DevTools WebSocket. Do not repeatedly retry that route or report this as a runtime bug; switch to the approved elevated local PowerShell/browser method that worked here. From the Everrealm root, run `& .\tests\cdp-smoke.ps1 -Scenario <relevant-scenario> -ScreenshotName <output.png>` with the scenario appropriate to the current task, then inspect the generated screenshot under `test-results/runtime/`.
- Node/npm: in this known Windows/Codex environment, run project tests directly with the approved elevated local execution method; do not first invoke Node/npm through the restricted/sandbox path on each new task or thread. Use the Everrealm root as the working directory and the standard command `npm test`. If a restricted Node/npm invocation nevertheless produces the known `EPERM: operation not permitted, lstat 'C:\Users\lauka'` error, stop immediately and use elevated execution; do not retry individual test files or direct `require()` calls through the same restricted path. This rule applies only to that known environment/tooling failure and must never be used to bypass genuine test failures. Re-evaluate it only if the execution environment is explicitly known to have changed; do not make a speculative fresh restricted attempt on every ordinary new thread.
- Git: if `git status` says `not a git repository`, the project may simply be uninitialized. Do not treat it as a code/runtime failure or initialize Git unless explicitly requested.
- These are current-environment fallbacks, not permanent limitations. If the environment changes, make one fresh attempt first. Never use a fallback to mask genuine failing tests.

## Document conflicts

Priority:

1. Current user request.
2. The dedicated system document in `docs/` for that domain.
3. `GAME_DESIGN.md` for global / cross-system player-facing design.
4. `ART_PIPELINE.md` for visual / asset implementation.
5. `README.md` for setup and navigation.

For a cross-system issue, follow each document only inside its owned domain rather than treating one file as globally overriding unrelated domains.

## Documentation maintenance

- Permanent global gameplay / UI / progression rule change → update `GAME_DESIGN.md`.
- Permanent battle rule / resolver / combat terrain behaviour change → update `docs/BATTLE_SYSTEM.md`.
- Permanent map / biome / encounter / battlefield-generation rule change → update `docs/MAP_SYSTEM.md`.
- Permanent Familiar rule change → update `docs/PET_SYSTEM.md`.
- Permanent production rule change → update `docs/PRODUCTION_SYSTEM.md`.
- Permanent art style / asset / atlas / sprite / locomotion-contract / battlefield-art / visual-pipeline rule change → update `ART_PIPELINE.md`.
- New large standalone system → create `docs/<SYSTEM_NAME>.md`, then add routing here and an index entry in `README.md`.
- New reusable recurring workflow → create a focused project Skill under `.codex/skills/<skill-name>/SKILL.md`; keep design truth in the routed project docs, then add the Skill to the reusable-skills index here and in `README.md`.
- Historical/reference research → store under `docs/references/`; keep original-game facts separate from Everrealm adaptations and never let a reference file silently override a current system spec.
- Ordinary bug fixes that restore the intended specification → do not add changelog-style notes to design documents.
