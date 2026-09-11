(function (root, factory) {
  const tactics = root.LanternTactics || (typeof require === "function" ? require("./tactics-core.js") : null);
  const skills = root.LanternSkills || (typeof require === "function" ? require("./skill-core.js") : null);
  const api = factory(tactics, skills);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmMonsterAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Tactics, Skills) {
  "use strict";

  const FACING_ORDER = Object.freeze(["up", "right", "down", "left"]);
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const alive = (unit) => unit && unit.alive !== false && (unit.hp === undefined || unit.hp > 0) && unit.cell;
  const sameCell = (a, b) => Boolean(a && b && a.x === b.x && a.y === b.y);
  const copyCell = (cell) => ({ x: Number(cell.x), y: Number(cell.y) });

  function finalFacing(path, fallback) {
    const route = Array.isArray(path) ? path : [];
    return route.length > 1 ? Tactics.facingFromStep(route[route.length - 2], route[route.length - 1], fallback) : fallback;
  }

  function commandsFor(path, initialFacing, desiredFacing) {
    const route = Array.isArray(path) && path.length ? path : [];
    const commands = route.slice(1).map((to) => ({ type: "move", to: copyCell(to) }));
    const travelFacing = finalFacing(route, initialFacing) || initialFacing;
    if (desiredFacing && desiredFacing !== travelFacing) commands.push({ type: "face", facing: desiredFacing });
    return commands;
  }

  function validateSkillFrom(skill, enemy, origin, facing, target, grid, units) {
    if (!skill || !origin || !target?.cell) return false;
    const validation = Skills.validateSkillTarget(skill, origin, target.cell, {
      grid,
      heightMap: grid?.heightMap,
      facing,
      actorTeam: enemy.side || enemy.team || "enemy",
      actorId: enemy.id,
      targetUnit: { ...target, team: target.side || target.team || "ally" },
    });
    if (!validation.ok) return false;
    if (!["linear", "arc"].includes(skill.deliveryMode)) return true;
    const path = Tactics.facingOrthogonalPriority(origin, target.cell, facing);
    const trace = Tactics.traceAttackPath({
      origin,
      target: target.cell,
      path,
      facing,
      grid,
      units,
      actorId: enemy.id,
      deliveryMode: skill.deliveryMode,
      blocksByTerrain: skill.blocksByTerrain,
      blocksByUnits: skill.blocksByUnits,
      arcHeight: skill.arcHeight,
    });
    return trace.stoppedReason !== "terrain" && (!trace.actualTarget || trace.actualTarget.id === target.id);
  }

  function effectValue(skill) {
    let value = 0;
    for (const effect of skill?.effects || []) {
      if (effect.type === "poison") value += 28;
      else if (effect.type === "move_down") value += 20;
      else if (effect.type === "knockback") value += 16;
      else if (effect.type === "knockdown") value += 24 * finite(effect.chance, 1);
      else value += 8;
    }
    return value;
  }

  function speedValue(skill) {
    const index = typeof Skills?.speedGradeIndex === "function" ? Skills.speedGradeIndex(skill?.speedGrade) : 6;
    return Math.max(0, 7 - Math.min(7, index)) * 3;
  }

  function estimateSkillDamage(skill, enemy, target) {
    if (!skill?.dealsDamage) return 0;
    return Tactics.calculateDamage(enemy, target, {
      multiplier: finite(skill?.damageModel?.scale, 1),
      minimum: Tactics.MIN_DIRECT_DAMAGE,
    });
  }

  function skillValue(skill, enemy = null, target = null) {
    const cost = Math.max(1, finite(skill?.apCost, 0));
    const authored = finite(skill?.aiValue, 50) * .35;
    const effects = effectValue(skill);
    const speed = speedValue(skill);
    if (!enemy || !target) {
      return authored + finite(skill?.damageModel?.scale, 1) * 18 + effects + speed - cost * .35;
    }
    const rawDamage = estimateSkillDamage(skill, enemy, target);
    const hp = Math.max(1, finite(target.hp, rawDamage));
    const usefulDamage = Math.min(rawDamage, hp);
    const overkill = Math.max(0, rawDamage - hp);
    const killBonus = rawDamage >= hp ? 42 + Math.max(0, 20 - cost) * 1.5 : 0;
    const efficiency = usefulDamage / cost;
    return authored
      + usefulDamage * 1.6
      + efficiency * 5
      + effects
      + speed
      + killBonus
      - overkill * .65
      - cost * .25;
  }

  function facingStatesForTile(tile, enemy) {
    const moveLimit = Math.max(0, finite(enemy.moveRange, 0));
    const turnCost = Math.max(0, finite(enemy.turnCost, .5));
    const path = tile.path?.length ? tile.path.map(copyCell) : [copyCell(enemy.cell)];
    const baseFacing = finalFacing(path, enemy.facing) || enemy.facing || "down";
    const baseCost = finite(tile.cost, 0);
    const states = [];
    for (const facing of FACING_ORDER) {
      const faceCost = Tactics.facingTurnCost(baseFacing, facing, turnCost);
      const totalCost = baseCost + faceCost;
      if (totalCost > moveLimit + 1e-9) continue;
      states.push({
        cell: { x: tile.x, y: tile.y },
        path,
        commands: commandsFor(path, enemy.facing, facing),
        cost: totalCost,
        facing,
        turnCost: faceCost,
      });
    }
    return states;
  }

  function reachableStates(grid, enemy, units) {
    const turnCost = Math.max(0, finite(enemy.turnCost, .5));
    const tiles = Tactics.reachableTiles(grid, enemy.cell, Math.max(0, finite(enemy.moveRange, 0)), units, {
      includeStart: true,
      ignoreUnitId: enemy.id,
      turnCost,
      initialFacing: enemy.facing,
    });
    const states = [];
    const seen = new Set();
    for (const tile of tiles) {
      for (const state of facingStatesForTile(tile, enemy)) {
        const key = `${state.cell.x},${state.cell.y}:${state.facing}`;
        const previous = seen.has(key);
        if (previous) continue;
        seen.add(key);
        states.push(state);
      }
    }
    return states;
  }

  function meleePursuitRoute({ grid, enemy, target, units }) {
    const turnCost = Math.max(0, finite(enemy.turnCost, .5));
    const fullPath = Tactics.findPath(grid, enemy.cell, target.cell, units, {
      ignoreUnitId: enemy.id,
      allowGoalOccupied: true,
      turnCost,
      initialFacing: enemy.facing,
    });
    if (!fullPath.length) return null;
    const approach = fullPath.slice(0, -1);
    const attackCost = Tactics.movementPathCost(approach, { turnCost, initialFacing: enemy.facing });
    const route = Tactics.truncatePathByCost(fullPath, Math.max(0, finite(enemy.moveRange, 0)), {
      turnCost,
      initialFacing: enemy.facing,
    });
    const safeRoute = route.length ? route : [copyCell(enemy.cell)];
    const intendedFacing = fullPath.length > 1
      ? Tactics.facingFromStep(fullPath[fullPath.length - 2], fullPath[fullPath.length - 1], enemy.facing)
      : enemy.facing;
    const attackOrigin = approach.length ? approach[approach.length - 1] : enemy.cell;
    return {
      fullPath,
      approach,
      attackCost,
      path: safeRoute,
      commands: commandsFor(safeRoute, enemy.facing, finalFacing(safeRoute, enemy.facing)),
      cell: copyCell(safeRoute[safeRoute.length - 1]),
      facing: intendedFacing || finalFacing(safeRoute, enemy.facing) || enemy.facing,
      attackOrigin: copyCell(attackOrigin),
      attackFacing: intendedFacing || enemy.facing,
      previewCell: sameCell(safeRoute[safeRoute.length - 1], target.cell) ? copyCell(attackOrigin) : copyCell(safeRoute[safeRoute.length - 1]),
      cost: Tactics.movementPathCost(safeRoute, { turnCost, initialFacing: enemy.facing }),
    };
  }

  function isPureMelee(skill) {
    return finite(skill?.range?.max, 1) === 1 && finite(skill?.range?.min, 1) === 1 && skill?.deliveryMode === "contact";
  }

  function attackCandidates({ grid, enemy, target, units, skills }) {
    const currentAp = Math.max(0, finite(enemy.ap, 0));
    const states = reachableStates(grid, enemy, units);
    const candidates = [];
    let sharedMeleeRoute = null;

    for (const skill of skills) {
      if (!skill || skill.dealsDamage === false || skill.actionKind === "guard" || currentAp < finite(skill.apCost, 0)) continue;

      // Happiness-style pure melee ALWAYS pursues the TARGET'S OCCUPIED CELL,
      // even when the monster can already hit from its current square.  This
      // preserves pressure/pinning: if the player stays put, enemy collision
      // stops the monster adjacent and it attacks; if the player moves away in
      // the simultaneous movement phase, the monster can step into the vacated
      // square and keep following instead of standing still once in range.
      if (isPureMelee(skill)) {
        sharedMeleeRoute ||= meleePursuitRoute({ grid, enemy, target, units });
        const route = sharedMeleeRoute;
        if (route && route.attackCost <= Math.max(0, finite(enemy.moveRange, 0)) + 1e-9
          && validateSkillFrom(skill, enemy, route.attackOrigin, route.attackFacing, target, grid, units)) {
          candidates.push({
            kind: "attack",
            skill,
            target,
            cell: route.cell,
            path: route.path,
            commands: route.commands,
            facing: route.facing,
            attackOrigin: route.attackOrigin,
            attackFacing: route.attackFacing,
            previewCell: route.previewCell,
            cost: route.cost,
            score: 100 + skillValue(skill, enemy, target) - route.attackCost * 2.2,
          });
          continue;
        }
        // Only fall back to an in-place facing attack when no occupied-goal
        // route can legally be built (for example, pathological blocked maps).
      }

      for (const state of states) {
        if (!validateSkillFrom(skill, enemy, state.cell, state.facing, target, grid, units)) continue;
        if (isPureMelee(skill) && !sameCell(state.cell, enemy.cell)) continue;
        const distance = Tactics.manhattan(state.cell, target.cell);
        const maxRange = Math.max(1, finite(skill.range?.max, 1));
        // A skill with reach should actually USE that reach. This is not a
        // species-specific kite rule: the preferred spacing comes directly
        // from the selected skill's authored maximum range.
        const rangeBonus = maxRange > 1 ? (distance / maxRange) * 18 : 0;
        const noMoveBonus = state.cost <= 1e-9 ? 5 : 0;
        candidates.push({
          kind: "attack",
          skill,
          ...state,
          target,
          attackOrigin: copyCell(state.cell),
          attackFacing: state.facing,
          score: 100 + skillValue(skill, enemy, target) + noMoveBonus + rangeBonus - state.cost * 1.4,
        });
      }
    }
    return candidates;
  }

  function setupCandidates({ grid, enemy, target, units, skills, apGain = 10 }) {
    const currentAp = Math.max(0, finite(enemy.ap, 0));
    const nextAp = currentAp + Math.max(0, finite(apGain, 10));
    const states = reachableStates(grid, enemy, units);
    const candidates = [];
    for (const skill of skills) {
      const cost = Math.max(0, finite(skill?.apCost, 0));
      if (!skill || skill.dealsDamage === false || cost <= currentAp || cost > nextAp) continue;
      for (const state of states) {
        // Setup is based on the AUTHORED attack cells, not a generic Manhattan
        // range band.  A boar stages on a real charge line; a snake stages on
        // a real venom-spit cell/facing.
        if (!validateSkillFrom(skill, enemy, state.cell, state.facing, target, grid, units)) continue;
        const distance = Tactics.manhattan(state.cell, target.cell);
        const maxRange = Math.max(1, finite(skill.range?.max, 1));
        const distanceBonus = maxRange > 1 ? Math.min(distance, maxRange) * 2 : 0;
        const currentCellBonus = state.cost <= 1e-9 ? 8 : 0;
        candidates.push({
          kind: "setup",
          skill,
          ...state,
          target,
          score: 62 + skillValue(skill, enemy, target) * .58 + distanceBonus + currentCellBonus - state.cost * 1.15,
        });
      }
    }
    return candidates;
  }

  function meleePursuit({ grid, enemy, target, units }) {
    const route = meleePursuitRoute({ grid, enemy, target, units });
    if (!route) return null;
    return {
      kind: "pursue",
      skill: null,
      target,
      cell: route.cell,
      path: route.path,
      commands: route.commands,
      cost: route.cost,
      facing: route.facing,
      previewCell: route.previewCell,
      score: 1,
    };
  }

  function comparePlan(a, b) {
    return b.score - a.score
      || a.cost - b.cost
      || finite(a.skill?.apCost, Infinity) - finite(b.skill?.apCost, Infinity)
      || String(a.skill?.id || "").localeCompare(String(b.skill?.id || ""))
      || a.cell.y - b.cell.y
      || a.cell.x - b.cell.x;
  }

  function planEnemyAction({ grid, enemy, targets = [], units = [], skills = [], apGain = 10 } = {}) {
    if (!grid || !alive(enemy)) return null;
    const livingTargets = targets.filter(alive);
    if (!livingTargets.length) return {
      type: "wait", move: copyCell(enemy.cell), path: [copyCell(enemy.cell)], commands: [], facing: enemy.facing,
      targetId: null, attackTargetId: null, skill: null, reason: "no-target",
    };
    const target = [...livingTargets].sort((a, b) => Tactics.manhattan(enemy.cell, a.cell) - Tactics.manhattan(enemy.cell, b.cell) || String(a.id).localeCompare(String(b.id)))[0];
    const allUnits = [...new Map([enemy, ...units, ...livingTargets].filter(Boolean).map((unit) => [unit.id, unit])).values()];
    const usableSkills = (skills || []).filter(Boolean);

    const attacks = attackCandidates({ grid, enemy, target, units: allUnits, skills: usableSkills }).sort(comparePlan);
    const setup = setupCandidates({ grid, enemy, target, units: allUnits, skills: usableSkills, apGain }).sort(comparePlan)[0] || null;
    const bestAttack = attacks[0] || null;

    let chosen = bestAttack;
    if (bestAttack && setup) {
      const setupIsRangedUpgrade = finite(setup.skill?.range?.max, 1) > finite(bestAttack.skill?.range?.max, 1)
        && finite(setup.skill?.apCost, 0) > finite(bestAttack.skill?.apCost, 0);
      const longMeleeCommit = isPureMelee(bestAttack.skill)
        && finite(bestAttack.cost, 0) >= Math.max(2, finite(enemy.moveRange, 0) * .45);
      if (setupIsRangedUpgrade && longMeleeCommit) chosen = setup;
    } else if (!chosen) chosen = setup;

    if (!chosen) chosen = meleePursuit({ grid, enemy, target, units: allUnits });
    if (!chosen) return {
      type: "wait", move: copyCell(enemy.cell), path: [copyCell(enemy.cell)], commands: [], facing: enemy.facing,
      targetId: target.id, attackTargetId: null, skill: null, reason: "blocked",
    };

    const attacking = chosen.kind === "attack";
    const moved = !sameCell(chosen.cell, enemy.cell) || (chosen.commands || []).some((command) => command.type === "move");
    return {
      type: attacking ? (moved ? "move-attack" : "attack") : moved ? "move" : (chosen.commands || []).length ? "turn" : "wait",
      move: copyCell(chosen.cell),
      path: chosen.path.map(copyCell),
      commands: (chosen.commands || []).map((command) => ({ ...command, to: command.to ? copyCell(command.to) : undefined })),
      facing: chosen.facing || enemy.facing,
      attackOrigin: chosen.attackOrigin ? copyCell(chosen.attackOrigin) : null,
      attackFacing: chosen.attackFacing || chosen.facing || enemy.facing,
      previewCell: chosen.previewCell ? copyCell(chosen.previewCell) : copyCell(chosen.cell),
      targetId: target.id,
      attackTargetId: attacking ? target.id : null,
      skill: attacking ? chosen.skill : null,
      setupSkill: chosen.kind === "setup" ? chosen.skill : null,
      movementCost: chosen.cost,
      score: chosen.score,
      reason: chosen.kind,
    };
  }

  return { planEnemyAction, validateSkillFrom, skillValue, estimateSkillDamage, reachableStates };
});
