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

  function validateSkillFrom(skill, enemy, origin, facing, target, grid, units) {
    if (!skill || !origin || !target?.cell) return false;
    const validation = Skills.validateSkillTarget(skill, origin, target.cell, {
      grid,
      heightMap: grid?.heightMap,
      facing,
      actorTeam: enemy.side || "enemy",
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

  function skillValue(skill) {
    return finite(skill?.aiValue, 50)
      + finite(skill?.damageModel?.scale, 1) * 18
      + effectValue(skill)
      - finite(skill?.apCost, 0) * .45;
  }

  function reachableStates(grid, enemy, units) {
    const turnCost = Math.max(0, finite(enemy.turnCost, .5));
    const tiles = Tactics.reachableTiles(grid, enemy.cell, Math.max(0, finite(enemy.moveRange, 0)), units, {
      includeStart: true,
      ignoreUnitId: enemy.id,
      turnCost,
      initialFacing: enemy.facing,
    });
    return tiles.map((tile) => ({
      cell: { x: tile.x, y: tile.y },
      path: tile.path?.length ? tile.path.map(copyCell) : [copyCell(enemy.cell)],
      cost: finite(tile.cost, 0),
      facing: finalFacing(tile.path, enemy.facing),
    }));
  }

  function attackCandidates({ grid, enemy, target, units, skills }) {
    const currentAp = Math.max(0, finite(enemy.ap, 0));
    const states = reachableStates(grid, enemy, units);
    const candidates = [];
    for (const skill of skills) {
      if (!skill || skill.dealsDamage === false || skill.actionKind === "guard" || currentAp < finite(skill.apCost, 0)) continue;
      for (const state of states) {
        if (!validateSkillFrom(skill, enemy, state.cell, state.facing, target, grid, units)) continue;
        const distance = Tactics.manhattan(state.cell, target.cell);
        const rangeBonus = finite(skill.range?.max, 1) > 1 ? distance * 2.5 : 0;
        const noMoveBonus = state.cost <= 1e-9 ? 36 : 0;
        candidates.push({
          kind: "attack",
          skill,
          ...state,
          target,
          score: 100 + skillValue(skill) + noMoveBonus + rangeBonus - state.cost * 2.5,
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
      const preferred = Math.max(1, finite(skill.range?.max, 1));
      for (const state of states) {
        const distance = Tactics.manhattan(state.cell, target.cell);
        // Setup does not predict a free final-facing turn. It only chooses a
        // useful range band; next round's normal movement/facing resolver still
        // decides whether the authored skill geometry is actually legal.
        const rangeError = Math.abs(distance - preferred);
        const tooClosePenalty = distance < Math.max(1, finite(skill.range?.min, 1)) ? 18 : 0;
        const currentCellBonus = state.cost <= 1e-9 && rangeError === 0 ? 14 : 0;
        candidates.push({
          kind: "setup",
          skill,
          ...state,
          target,
          score: 54 + skillValue(skill) * .58 + currentCellBonus - rangeError * 10 - tooClosePenalty - state.cost * .8,
        });
      }
    }
    return candidates;
  }

  function meleePursuit({ grid, enemy, target, units }) {
    const turnCost = Math.max(0, finite(enemy.turnCost, .5));
    const fullPath = Tactics.findPath(grid, enemy.cell, target.cell, units, {
      ignoreUnitId: enemy.id,
      allowGoalOccupied: true,
      turnCost,
      initialFacing: enemy.facing,
    });
    if (!fullPath.length) return null;
    // The target's occupied cell is the pursuit goal. Truncation plus the
    // shared occupancy resolver prevents overlap while allowing another route
    // around a monster already standing on one adjacent side of the player.
    const pathWithoutTarget = fullPath.slice(0, -1);
    const path = Tactics.truncatePathByCost(pathWithoutTarget, Math.max(0, finite(enemy.moveRange, 0)), {
      turnCost,
      initialFacing: enemy.facing,
    });
    const route = path.length ? path : [copyCell(enemy.cell)];
    return {
      kind: "pursue",
      skill: null,
      target,
      cell: copyCell(route[route.length - 1]),
      path: route,
      cost: Tactics.movementPathCost(route, { turnCost, initialFacing: enemy.facing }),
      facing: finalFacing(route, enemy.facing),
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
      type: "wait", move: copyCell(enemy.cell), path: [copyCell(enemy.cell)], facing: enemy.facing,
      targetId: null, attackTargetId: null, skill: null, reason: "no-target",
    };
    const target = [...livingTargets].sort((a, b) => Tactics.manhattan(enemy.cell, a.cell) - Tactics.manhattan(enemy.cell, b.cell) || String(a.id).localeCompare(String(b.id)))[0];
    const allUnits = [...new Map([enemy, ...units, ...livingTargets].filter(Boolean).map((unit) => [unit.id, unit])).values()];
    const usableSkills = (skills || []).filter(Boolean);

    const attacks = attackCandidates({ grid, enemy, target, units: allUnits, skills: usableSkills });
    const currentCellAttacks = attacks.filter((candidate) => sameCell(candidate.cell, enemy.cell)).sort(comparePlan);
    let chosen = currentCellAttacks[0] || null;

    if (!chosen) {
      const attackAfterMove = attacks.sort(comparePlan)[0] || null;
      const setup = setupCandidates({ grid, enemy, target, units: allUnits, skills: usableSkills, apGain }).sort(comparePlan)[0] || null;

      // If a stronger, longer-range skill becomes affordable next round, a
      // monster should not burn most of this turn's movement just to force a
      // cheap Range-1 hit.  It may stage at the premium skill's useful range
      // band and bank AP instead.  This is deliberately geometry/AP-driven,
      // not a species-specific "kite" or "charge" branch.
      const setupIsRangedUpgrade = Boolean(attackAfterMove && setup
        && finite(setup.skill?.range?.max, 1) > finite(attackAfterMove.skill?.range?.max, 1)
        && finite(setup.skill?.apCost, 0) > finite(attackAfterMove.skill?.apCost, 0));
      const longMeleeCommit = Boolean(attackAfterMove
        && finite(attackAfterMove.skill?.range?.max, 1) <= 1
        && attackAfterMove.cost >= Math.max(2, finite(enemy.moveRange, 0) * .45));

      chosen = setupIsRangedUpgrade && longMeleeCommit ? setup : (attackAfterMove || setup);
    }

    if (!chosen) chosen = meleePursuit({ grid, enemy, target, units: allUnits });
    if (!chosen) return {
      type: "wait", move: copyCell(enemy.cell), path: [copyCell(enemy.cell)], facing: enemy.facing,
      targetId: target.id, attackTargetId: null, skill: null, reason: "blocked",
    };

    const attacking = chosen.kind === "attack";
    const moved = !sameCell(chosen.cell, enemy.cell);
    return {
      type: attacking ? (moved ? "move-attack" : "attack") : moved ? "move" : "wait",
      move: copyCell(chosen.cell),
      path: chosen.path.map(copyCell),
      facing: chosen.facing || enemy.facing,
      targetId: target.id,
      attackTargetId: attacking ? target.id : null,
      skill: attacking ? chosen.skill : null,
      setupSkill: chosen.kind === "setup" ? chosen.skill : null,
      movementCost: chosen.cost,
      score: chosen.score,
      reason: chosen.kind,
    };
  }

  return { planEnemyAction, validateSkillFrom, skillValue };
});
