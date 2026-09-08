(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternTactics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DIRECTIONS = Object.freeze([
    Object.freeze({ x: 0, y: -1, name: "up" }),
    Object.freeze({ x: -1, y: 0, name: "left" }),
    Object.freeze({ x: 1, y: 0, name: "right" }),
    Object.freeze({ x: 0, y: 1, name: "down" }),
  ]);

  const FACING_VECTORS = Object.freeze({
    up: Object.freeze({ x: 0, y: -1 }),
    down: Object.freeze({ x: 0, y: 1 }),
    left: Object.freeze({ x: -1, y: 0 }),
    right: Object.freeze({ x: 1, y: 0 }),
  });

  const POSITIONAL_MULTIPLIERS = Object.freeze({ front: 1, side: 1.15, rear: 1.35 });

  function cellKey(cell) {
    return `${cell.x},${cell.y}`;
  }

  function copyCell(cell) {
    return { x: Math.trunc(Number(cell.x)), y: Math.trunc(Number(cell.y)) };
  }

  function validCell(cell) {
    return Boolean(cell) && Number.isFinite(Number(cell.x)) && Number.isFinite(Number(cell.y));
  }

  function createGrid(width, height, blockedCells = []) {
    const safeWidth = Math.trunc(Number(width));
    const safeHeight = Math.trunc(Number(height));
    if (safeWidth < 1 || safeHeight < 1) throw new RangeError("Grid dimensions must be positive integers.");
    const grid = { width: safeWidth, height: safeHeight, blocked: new Set() };
    for (const value of blockedCells || []) {
      const cell = typeof value === "string" ? parseCellKey(value) : value;
      if (validCell(cell) && isInside(grid, cell)) grid.blocked.add(cellKey(copyCell(cell)));
    }
    return grid;
  }

  function parseCellKey(value) {
    const match = /^(-?\d+),(-?\d+)$/.exec(String(value));
    return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
  }

  function isInside(grid, cell) {
    if (!grid || !validCell(cell)) return false;
    const x = Math.trunc(Number(cell.x));
    const y = Math.trunc(Number(cell.y));
    return x >= 0 && y >= 0 && x < grid.width && y < grid.height;
  }

  function manhattan(a, b) {
    if (!validCell(a) || !validCell(b)) return Infinity;
    return Math.abs(Math.trunc(a.x) - Math.trunc(b.x)) + Math.abs(Math.trunc(a.y) - Math.trunc(b.y));
  }

  function facingVector(facing) {
    const vector = FACING_VECTORS[String(facing || "").toLowerCase()] || FACING_VECTORS.down;
    return { x: vector.x, y: vector.y };
  }

  function facingFromStep(from, to, fallback = "down") {
    if (!validCell(from) || !validCell(to)) return String(fallback || "down");
    const dx = Math.trunc(Number(to.x)) - Math.trunc(Number(from.x));
    const dy = Math.trunc(Number(to.y)) - Math.trunc(Number(from.y));
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return dx > 0 ? "right" : "left";
    if (dy !== 0) return dy > 0 ? "down" : "up";
    return String(fallback || "down");
  }

  function relativePosition(defenderCell, defenderFacing, attackerCell) {
    const defender = cellOf(defenderCell);
    const attacker = cellOf(attackerCell);
    if (!defender || !attacker || sameCell(defender, attacker)) return "front";
    const forward = facingVector(defenderFacing);
    const dot = (attacker.x - defender.x) * forward.x + (attacker.y - defender.y) * forward.y;
    if (dot < 0) return "rear";
    if (dot > 0) return "front";
    return "side";
  }

  function isInFacingArc(origin, target, facing) {
    const source = cellOf(origin);
    const destination = cellOf(target);
    if (!source || !destination) return false;
    if (sameCell(source, destination)) return true;
    return relativePosition(source, facing, destination) !== "rear";
  }

  function positionalAttack(attacker, defender, options = {}) {
    const attackerCell = cellOf(attacker);
    const defenderCell = cellOf(defender);
    const position = relativePosition(defenderCell, defender && defender.facing, attackerCell);
    const defaults = POSITIONAL_MULTIPLIERS;
    const multiplier = Math.max(0, finiteStat(options[position], defaults[position]));
    return { position, multiplier };
  }

  function sameCell(a, b) {
    return Boolean(a && b && Number(a.x) === Number(b.x) && Number(a.y) === Number(b.y));
  }

  function cellOf(value) {
    if (!value) return null;
    return validCell(value.cell) ? copyCell(value.cell) : validCell(value) ? copyCell(value) : null;
  }

  function unitIsAlive(unit) {
    return Boolean(unit) && unit.alive !== false && !(Number.isFinite(unit.hp) && unit.hp <= 0);
  }

  function terrainIsBlocked(grid, cell) {
    if (!isInside(grid, cell)) return true;
    if (typeof grid.isBlocked === "function" && grid.isBlocked(copyCell(cell))) return true;
    if (typeof grid.blocked === "function") return Boolean(grid.blocked(copyCell(cell)));
    const key = cellKey(cell);
    if (grid.blocked instanceof Set) return grid.blocked.has(key);
    if (Array.isArray(grid.blocked)) {
      return grid.blocked.some((value) => (typeof value === "string" ? value === key : validCell(value) && cellKey(copyCell(value)) === key));
    }
    return false;
  }

  function occupiedKeys(occupants, ignoreUnitId) {
    const keys = new Set();
    if (!occupants) return keys;
    for (const value of occupants instanceof Set ? occupants : occupants) {
      if (typeof value === "string") {
        keys.add(value);
        continue;
      }
      if (!unitIsAlive(value) || (ignoreUnitId != null && String(value.id) === String(ignoreUnitId))) continue;
      const cell = cellOf(value);
      if (cell) keys.add(cellKey(cell));
    }
    return keys;
  }

  function localRelativeCell(origin, target, facing = "down") {
    const dx = Math.trunc(Number(target.x)) - Math.trunc(Number(origin.x));
    const dy = Math.trunc(Number(target.y)) - Math.trunc(Number(origin.y));
    switch (normalizeFacing(facing)) {
      case "up": return { lateral: -dx, depth: -dy };
      case "right": return { lateral: dy, depth: dx };
      case "left": return { lateral: -dy, depth: -dx };
      default: return { lateral: dx, depth: dy };
    }
  }

  function localToWorld(origin, lateral, depth, facing = "down") {
    let dx = lateral;
    let dy = depth;
    switch (normalizeFacing(facing)) {
      case "up": dx = -lateral; dy = -depth; break;
      case "right": dx = depth; dy = lateral; break;
      case "left": dx = -depth; dy = -lateral; break;
      default: break;
    }
    return { x: Math.trunc(Number(origin.x)) + dx, y: Math.trunc(Number(origin.y)) + dy };
  }

  // Shared deterministic route for ordinary Linear skills.  The route does
  // not include the caster, but always includes the intended target cell.
  function facingOrthogonalPriority(originOrOptions, target, facing = "down") {
    let origin = originOrOptions;
    let destination = target;
    let direction = facing;
    if (originOrOptions && originOrOptions.origin) {
      ({ origin, target: destination, facing: direction = "down" } = originOrOptions);
    }
    if (!validCell(origin) || !validCell(destination)) return [];
    const relative = localRelativeCell(origin, destination, direction);
    const path = [];
    let lateral = 0;
    let depth = 0;
    const push = () => path.push(localToWorld(origin, lateral, depth, direction));
    if (relative.depth > 0) {
      while (depth < relative.depth) { depth += 1; push(); }
      while (lateral !== relative.lateral) { lateral += Math.sign(relative.lateral); push(); }
    } else if (relative.depth < 0) {
      while (lateral !== relative.lateral) { lateral += Math.sign(relative.lateral); push(); }
      while (depth > relative.depth) { depth -= 1; push(); }
    } else {
      while (lateral !== relative.lateral) { lateral += Math.sign(relative.lateral); push(); }
    }
    return path;
  }

  function traceAttackPath(options = {}) {
    const origin = cellOf(options.origin || options.caster);
    const target = cellOf(options.target || options.intendedTarget);
    if (!origin || !target) return { path: [], intendedTarget: null, actualTarget: null, firstImpactCell: null, blocked: false, stoppedReason: "invalid-cell" };
    const deliveryMode = options.deliveryMode || "linear";
    const path = deliveryMode === "pathless"
      ? []
      : Array.isArray(options.path) && options.path.length ? options.path.filter(validCell).map(copyCell)
        : facingOrthogonalPriority(origin, target, options.facing || options.caster?.facing || "down");
    const units = Array.isArray(options.units) ? options.units : [];
    const ignoreUnitId = options.actorId ?? options.caster?.id;
    const result = {
      path,
      intendedTarget: copyCell(target),
      actualTarget: null,
      firstImpactCell: null,
      blocked: false,
      blockedBy: null,
      stoppedReason: null,
      friendlyFire: options.friendlyFire === true,
    };
    if (deliveryMode === "pathless") return result;
    for (const cell of path) {
      if (options.blocksByTerrain !== false && options.grid && terrainIsBlocked(options.grid, cell)) {
        result.firstImpactCell = copyCell(cell);
        result.blocked = true;
        result.stoppedReason = "terrain";
        break;
      }
      const unit = options.blocksByUnits === false ? null : units.find((candidate) => unitIsAlive(candidate)
        && (ignoreUnitId == null || String(candidate.id) !== String(ignoreUnitId))
        && sameCell(cellOf(candidate), cell));
      if (unit) {
        result.firstImpactCell = copyCell(cell);
        result.actualTarget = unit;
        result.blocked = true;
        result.blockedBy = unit;
        result.stoppedReason = "unit";
        break;
      }
    }
    return result;
  }

  function isWalkable(grid, cell, occupants = [], options = {}) {
    if (terrainIsBlocked(grid, cell)) return false;
    return !occupiedKeys(occupants, options.ignoreUnitId).has(cellKey(copyCell(cell)));
  }

  function neighbours(grid, cell) {
    const result = [];
    for (const direction of DIRECTIONS) {
      const next = { x: cell.x + direction.x, y: cell.y + direction.y };
      if (isInside(grid, next)) result.push(next);
    }
    return result;
  }

  function reconstructPath(parents, endKey) {
    const path = [];
    let key = endKey;
    while (key != null) {
      path.push(parseCellKey(key));
      key = parents.get(key);
    }
    return path.reverse();
  }

  function movementPathCost(path, turnCost = .5) {
    const route = Array.isArray(path) ? path.filter(validCell).map(copyCell) : [];
    const options = typeof turnCost === "object" && turnCost
      ? turnCost
      : { turnCost, initialFacing: arguments[2] };
    const turn = Math.max(0, finiteStat(options.turnCost, .5));
    let cost = 0;
    let previousDirection = normalizeFacing(options.initialFacing);
    for (let index = 1; index < route.length; index += 1) {
      if (manhattan(route[index - 1], route[index]) !== 1) return Infinity;
      const direction = facingFromStep(route[index - 1], route[index]);
      cost += 1;
      if (previousDirection && direction !== previousDirection) cost += turn;
      previousDirection = direction;
    }
    return cost;
  }

  function truncatePathByCost(path, budget, turnCost = .5) {
    const route = Array.isArray(path) ? path.filter(validCell).map(copyCell) : [];
    if (!route.length) return [];
    const options = typeof turnCost === "object" && turnCost
      ? turnCost
      : { turnCost, initialFacing: arguments[3] };
    const limit = Math.max(0, finiteStat(budget, 0));
    const result = [route[0]];
    for (let index = 1; index < route.length; index += 1) {
      const candidate = [...result, route[index]];
      if (movementPathCost(candidate, options) > limit + 1e-9) break;
      result.push(route[index]);
    }
    return result;
  }

  function normalizeFacing(value) {
    const facing = String(value || "").toLowerCase();
    return Object.prototype.hasOwnProperty.call(FACING_VECTORS, facing) ? facing : null;
  }

  function movementEvents(path, options = {}) {
    const route = Array.isArray(path) ? path.filter(validCell).map(copyCell) : [];
    const turnCost = Math.max(0, finiteStat(options.turnCost, .5));
    let facing = normalizeFacing(options.initialFacing);
    if (!facing && route.length > 1 && manhattan(route[0], route[1]) === 1) {
      // Callers which pre-date facing-aware movement did not pay an implicit
      // opening turn. Infer their first travel direction to preserve that API.
      facing = facingFromStep(route[0], route[1]);
    }
    const initialFacing = facing;
    const events = [];
    let totalCost = 0;
    for (let index = 1; index < route.length; index += 1) {
      const from = route[index - 1];
      const to = route[index];
      const distance = manhattan(from, to);
      if (distance === 0) {
        events.push({ type: "wait", from: copyCell(from), to: copyCell(to), duration: 1, routeIndex: index });
        totalCost += 1;
        continue;
      }
      if (distance !== 1) {
        events.push({ type: "invalid", from: copyCell(from), to: copyCell(to), duration: 0, routeIndex: index });
        break;
      }
      const direction = facingFromStep(from, to, facing || "down");
      if (facing && direction !== facing && turnCost > 0) {
        events.push({
          type: "turn",
          cell: copyCell(from),
          fromFacing: facing,
          facing: direction,
          duration: turnCost,
          routeIndex: index,
        });
        totalCost += turnCost;
      }
      facing = direction;
      events.push({
        type: "move",
        from: copyCell(from),
        to: copyCell(to),
        facing: direction,
        duration: 1,
        routeIndex: index,
      });
      totalCost += 1;
    }
    return {
      path: route,
      initialFacing,
      finalTravelFacing: facing,
      events,
      totalCost,
    };
  }

  function reachableTilesWithTurns(grid, start, moveRange, occupants, options) {
    const origin = copyCell(start);
    const limit = Math.max(0, finiteStat(moveRange, 0));
    const turnCost = Math.max(0, finiteStat(options.turnCost, .5));
    const occupied = occupiedKeys(occupants, options.ignoreUnitId);
    occupied.delete(cellKey(origin));
    const initialFacing = normalizeFacing(options.initialFacing);
    const startState = `${cellKey(origin)}|${initialFacing || "none"}`;
    const costs = new Map([[startState, 0]]);
    const parents = new Map([[startState, null]]);
    const cells = new Map([[startState, origin]]);
    const directions = new Map([[startState, initialFacing]]);
    const open = [startState];

    const statePath = (stateKey) => {
      const path = [];
      let key = stateKey;
      while (key != null) {
        path.push(copyCell(cells.get(key)));
        key = parents.get(key);
      }
      return path.reverse();
    };

    while (open.length) {
      open.sort((left, right) => costs.get(left) - costs.get(right)
        || cells.get(left).y - cells.get(right).y
        || cells.get(left).x - cells.get(right).x
        || String(directions.get(left) || "").localeCompare(String(directions.get(right) || "")));
      const stateKey = open.shift();
      const current = cells.get(stateKey);
      const currentCost = costs.get(stateKey);
      const previousDirection = directions.get(stateKey);
      for (const next of neighbours(grid, current)) {
        const key = cellKey(next);
        if (terrainIsBlocked(grid, next) || occupied.has(key)) continue;
        const direction = facingFromStep(current, next);
        const nextCost = currentCost + 1 + (previousDirection && direction !== previousDirection ? turnCost : 0);
        if (nextCost > limit + 1e-9) continue;
        const nextState = `${key}|${direction}`;
        const known = costs.get(nextState);
        if (known != null && known < nextCost - 1e-9) continue;
        if (known != null && Math.abs(known - nextCost) < 1e-9) {
          const candidatePath = [...statePath(stateKey), copyCell(next)];
          const knownPath = statePath(nextState);
          if (compareStraightFirstPaths(candidatePath, knownPath, initialFacing) >= 0) continue;
        }
        costs.set(nextState, nextCost);
        parents.set(nextState, stateKey);
        cells.set(nextState, copyCell(next));
        directions.set(nextState, direction);
        if (!open.includes(nextState)) open.push(nextState);
      }
    }

    const bestByCell = new Map();
    for (const [stateKey, cost] of costs) {
      const cell = cells.get(stateKey);
      const key = cellKey(cell);
      const candidate = { x: cell.x, y: cell.y, cost, path: statePath(stateKey) };
      const known = bestByCell.get(key);
      if (!known || candidate.cost < known.cost - 1e-9
        || (Math.abs(candidate.cost - known.cost) < 1e-9
          && compareStraightFirstPaths(candidate.path, known.path, initialFacing) < 0)) {
        bestByCell.set(key, candidate);
      }
    }
    const tiles = [...bestByCell.values()].sort(compareReachableTiles);
    return options.includeStart === false ? tiles.filter((tile) => tile.cost > 0) : tiles;
  }

  function comparePaths(left, right) {
    const length = Math.min(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
      const order = left[index].y - right[index].y || left[index].x - right[index].x;
      if (order) return order;
    }
    return left.length - right.length;
  }

  function pathTurnIndices(path, initialFacing = null) {
    const route = Array.isArray(path) ? path : [];
    let previousDirection = normalizeFacing(initialFacing);
    const turns = [];
    for (let index = 1; index < route.length; index += 1) {
      if (manhattan(route[index - 1], route[index]) !== 1) continue;
      const direction = facingFromStep(route[index - 1], route[index]);
      if (previousDirection && direction !== previousDirection) turns.push(index);
      previousDirection = direction;
    }
    return turns;
  }

  function compareStraightFirstPaths(left, right, initialFacing = null) {
    const leftTurns = pathTurnIndices(left, initialFacing);
    const rightTurns = pathTurnIndices(right, initialFacing);
    if (leftTurns.length !== rightTurns.length) return leftTurns.length - rightTurns.length;
    for (let index = 0; index < leftTurns.length; index += 1) {
      // A later turn means the current straight segment was completed first.
      if (leftTurns[index] !== rightTurns[index]) return rightTurns[index] - leftTurns[index];
    }
    return comparePaths(left, right);
  }

  function reachableTiles(grid, start, moveRange, occupants = [], options = {}) {
    if (!validCell(start) || !isInside(grid, start) || terrainIsBlocked(grid, start)) return [];
    if (finiteStat(options.turnCost, 0) > 0) {
      return reachableTilesWithTurns(grid, start, moveRange, occupants, options);
    }
    const origin = copyCell(start);
    const limit = Math.max(0, Math.trunc(Number(moveRange) || 0));
    const occupied = occupiedKeys(occupants, options.ignoreUnitId);
    occupied.delete(cellKey(origin));
    const originKey = cellKey(origin);
    const queue = [origin];
    const distances = new Map([[originKey, 0]]);
    const parents = new Map([[originKey, null]]);

    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      const cost = distances.get(cellKey(current));
      if (cost >= limit) continue;
      for (const next of neighbours(grid, current)) {
        const key = cellKey(next);
        if (distances.has(key) || terrainIsBlocked(grid, next) || occupied.has(key)) continue;
        distances.set(key, cost + 1);
        parents.set(key, cellKey(current));
        queue.push(next);
      }
    }

    const tiles = [...distances.entries()].map(([key, cost]) => {
      const cell = parseCellKey(key);
      return { x: cell.x, y: cell.y, cost, path: reconstructPath(parents, key) };
    });
    tiles.sort(compareReachableTiles);
    return options.includeStart === false ? tiles.filter((tile) => tile.cost > 0) : tiles;
  }

  function compareReachableTiles(a, b) {
    return a.cost - b.cost || a.y - b.y || a.x - b.x;
  }

  function findPath(grid, start, goal, occupants = [], options = {}) {
    if (!validCell(start) || !validCell(goal) || !isInside(grid, start) || !isInside(grid, goal)) return [];
    const origin = copyCell(start);
    const destination = copyCell(goal);
    if (terrainIsBlocked(grid, origin) || terrainIsBlocked(grid, destination)) return [];
    const startKey = cellKey(origin);
    const goalKey = cellKey(destination);
    if (startKey === goalKey) return [origin];

    const occupied = occupiedKeys(occupants, options.ignoreUnitId);
    occupied.delete(startKey);
    if (options.allowGoalOccupied) occupied.delete(goalKey);
    if (occupied.has(goalKey)) return [];

    if (finiteStat(options.turnCost, 0) > 0) {
      const turnCost = Math.max(0, finiteStat(options.turnCost, .5));
      const maximumCost = Number.isFinite(options.maxDistance)
        ? Math.max(0, Number(options.maxDistance))
        : grid.width * grid.height * (1 + turnCost);
      const candidates = reachableTilesWithTurns(grid, origin, maximumCost, occupied, {
        includeStart: true,
        turnCost,
        initialFacing: options.initialFacing,
      }).filter((tile) => tile.x === destination.x && tile.y === destination.y);
      return candidates[0]?.path || [];
    }

    const maxDistance = Number.isFinite(options.maxDistance)
      ? Math.max(0, Math.trunc(options.maxDistance))
      : Infinity;
    const queue = [origin];
    const distances = new Map([[startKey, 0]]);
    const parents = new Map([[startKey, null]]);

    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      const currentKey = cellKey(current);
      const distance = distances.get(currentKey);
      if (distance >= maxDistance) continue;
      for (const next of neighbours(grid, current)) {
        const key = cellKey(next);
        if (distances.has(key) || terrainIsBlocked(grid, next) || occupied.has(key)) continue;
        parents.set(key, currentKey);
        distances.set(key, distance + 1);
        if (key === goalKey) return reconstructPath(parents, goalKey);
        queue.push(next);
      }
    }
    return [];
  }

  function resolveLegacySimultaneousMovement({ grid, units = [], routes = {}, priorityUnitId = null } = {}) {
    const actors = (Array.isArray(units) ? units : []).filter(unitIsAlive).filter((unit) => cellOf(unit));
    const routeFor = (id) => routes instanceof Map ? routes.get(id) : routes && routes[id];
    const normalizedRoutes = new Map();
    for (const actor of actors) {
      const start = cellOf(actor);
      const supplied = Array.isArray(routeFor(actor.id)) ? routeFor(actor.id).filter(validCell).map(copyCell) : [];
      if (!supplied.length || !sameCell(supplied[0], start)) supplied.unshift(copyCell(start));
      normalizedRoutes.set(actor.id, supplied);
    }
    const positions = new Map(actors.map((unit) => [unit.id, cellOf(unit)]));
    const snapshot = () => Object.fromEntries([...positions].map(([id, cell]) => [id, copyCell(cell)]));
    const frames = [snapshot()];
    const cancelled = new Set();
    const maximumSteps = Math.max(0, ...[...normalizedRoutes.values()].map((route) => route.length - 1));

    for (let step = 1; step <= maximumSteps; step += 1) {
      const intentions = new Map();
      for (const actor of actors) {
        const current = positions.get(actor.id);
        const route = normalizedRoutes.get(actor.id);
        const proposed = cancelled.has(actor.id) ? current : route[Math.min(step, route.length - 1)];
        if (!proposed || manhattan(current, proposed) > 1 || (grid && terrainIsBlocked(grid, proposed))) {
          cancelled.add(actor.id);
          intentions.set(actor.id, copyCell(current));
        } else intentions.set(actor.id, copyCell(proposed));
      }

      const stopAtCurrentCell = (id) => {
        const current = positions.get(id);
        const proposed = intentions.get(id);
        cancelled.add(id);
        if (sameCell(proposed, current)) return false;
        intentions.set(id, copyCell(current));
        return true;
      };

      let changed = true;
      let collisionPasses = 0;
      while (changed && collisionPasses < actors.length * 4 + 4) {
        collisionPasses += 1;
        changed = false;

        // Several actors may propose the same cell only when it will be empty
        // after this frame. The priority actor may win that empty cell; every
        // other contender stops at its own previous cell. A unit already
        // staying on the target always keeps it, regardless of priority.
        const targetGroups = new Map();
        for (const actor of actors) {
          const key = cellKey(intentions.get(actor.id));
          if (!targetGroups.has(key)) targetGroups.set(key, []);
          targetGroups.get(key).push(actor.id);
        }
        for (const ids of targetGroups.values()) {
          if (ids.length < 2) continue;
          const stationary = ids.filter((id) => sameCell(intentions.get(id), positions.get(id)));
          const priority = stationary.length === 0
            ? ids.find((id) => priorityUnitId != null && String(id) === String(priorityUnitId))
            : null;
          for (const id of ids) {
            cancelled.add(id);
            if (priority != null && id === priority) continue;
            changed = stopAtCurrentCell(id) || changed;
          }
        }

        // A head-on exchange is not movement through one another. Both units
        // remain in their last legal cells and their remaining routes end.
        for (let firstIndex = 0; firstIndex < actors.length; firstIndex += 1) {
          for (let secondIndex = firstIndex + 1; secondIndex < actors.length; secondIndex += 1) {
            const first = actors[firstIndex].id;
            const second = actors[secondIndex].id;
            if (!sameCell(intentions.get(first), positions.get(second)) || !sameCell(intentions.get(second), positions.get(first))
              || sameCell(positions.get(first), positions.get(second))) continue;
            changed = stopAtCurrentCell(first) || changed;
            changed = stopAtCurrentCell(second) || changed;
          }
        }

        // Collision decisions can make a formerly moving occupant stay put.
        // Propagate that reservation backwards through followers so nobody can
        // end the frame on the same square as the stopped unit.
        const occupantByCell = new Map(actors.map((actor) => [cellKey(positions.get(actor.id)), actor.id]));
        for (const actor of actors) {
          const id = actor.id;
          const proposed = intentions.get(id);
          if (sameCell(proposed, positions.get(id))) continue;
          const occupantId = occupantByCell.get(cellKey(proposed));
          if (occupantId == null || occupantId === id) continue;
          if (!sameCell(intentions.get(occupantId), positions.get(occupantId))) continue;
          changed = stopAtCurrentCell(id) || changed;
          cancelled.add(occupantId);
        }
      }

      // Valid input positions are unique, and the resolver must preserve that
      // invariant on every frame. Keep this guard close to the state update so
      // future collision-rule changes cannot silently reintroduce overlap.
      const finalCells = new Set();
      for (const actor of actors) {
        const key = cellKey(intentions.get(actor.id));
        if (finalCells.has(key)) {
          throw new Error(`Movement collision resolver produced an occupied cell: ${key}`);
        }
        finalCells.add(key);
      }

      for (const actor of actors) positions.set(actor.id, copyCell(intentions.get(actor.id)));
      frames.push(snapshot());
    }
    return { actors: actors.map((unit) => unit.id), frames, cancelled: [...cancelled] };
  }

  function resolveTimedSimultaneousMovement({
    grid,
    units = [],
    routes = {},
    priorityUnitId = null,
    turnCost = .5,
    finalFacings = {},
  } = {}) {
    const actors = (Array.isArray(units) ? units : []).filter(unitIsAlive).filter((unit) => cellOf(unit));
    const valueFor = (collection, id) => collection instanceof Map ? collection.get(id) : collection && collection[id];
    const cancelled = new Set();
    const states = new Map();

    for (const actor of actors) {
      const start = cellOf(actor);
      const routeValue = valueFor(routes, actor.id);
      const suppliedPath = Array.isArray(routeValue) ? routeValue : routeValue?.path;
      const route = Array.isArray(suppliedPath) ? suppliedPath.filter(validCell).map(copyCell) : [];
      if (!route.length || !sameCell(route[0], start)) route.unshift(copyCell(start));
      const actorTurnCost = Math.max(0, finiteStat(routeValue?.turnCost, finiteStat(actor.turnCost, turnCost)));
      const schedule = movementEvents(route, { initialFacing: actor.facing, turnCost: actorTurnCost });
      const requestedFinalFacing = normalizeFacing(routeValue?.finalFacing || valueFor(finalFacings, actor.id));
      states.set(actor.id, {
        id: actor.id,
        position: copyCell(start),
        renderCell: copyCell(start),
        facing: schedule.initialFacing || normalizeFacing(actor.facing) || "down",
        requestedFinalFacing,
        schedule,
        eventIndex: 0,
        active: null,
        completedPath: [copyCell(start)],
        elapsedCost: 0,
        blocked: false,
        blockReason: null,
        blockedBy: new Set(),
        routeCancelled: false,
        completed: false,
      });
    }

    const log = [];
    const addLog = (time, state, type, details = {}) => {
      log.push({ time, unitId: state.id, type, ...details });
    };

    const markBlocked = (state, reason, blockers = [], time = 0) => {
      if (!state) return;
      const firstBlock = !state.blocked;
      state.blocked = true;
      state.completed = false;
      state.routeCancelled = true;
      state.blockReason = state.blockReason || reason;
      for (const id of blockers) {
        if (id != null && String(id) !== String(state.id)) state.blockedBy.add(id);
      }
      cancelled.add(state.id);
      if (firstBlock) addLog(time, state, "blocked", { reason, blockedBy: [...state.blockedBy] });
    };

    const finishIfDone = (state, time) => {
      if (state.completed || state.blocked || state.routeCancelled || state.active || state.eventIndex < state.schedule.events.length) return;
      state.completed = true;
      if (state.requestedFinalFacing) state.facing = state.requestedFinalFacing;
      addLog(time, state, "complete", { cell: copyCell(state.position), facing: state.facing });
    };

    const startNextEvent = (state, time) => {
      if (state.blocked || state.routeCancelled || state.active) return;
      while (state.eventIndex < state.schedule.events.length) {
        const event = state.schedule.events[state.eventIndex];
        if (event.type === "invalid") {
          markBlocked(state, "invalid-route", [], time);
          return;
        }
        if (event.duration <= 0) {
          if (event.type === "turn") state.facing = event.facing;
          state.eventIndex += 1;
          continue;
        }
        state.active = { ...event, startTime: time, endTime: time + event.duration };
        return;
      }
      finishIfDone(state, time);
    };

    for (const state of states.values()) startNextEvent(state, 0);

    const snapshot = (time, events = []) => {
      const positions = {};
      const renderCells = {};
      const facings = {};
      for (const state of states.values()) {
        positions[state.id] = copyCell(state.position);
        facings[state.id] = state.facing;
        if (state.active?.type === "move" && !state.blocked) {
          const duration = Math.max(1e-9, state.active.duration);
          const progress = Math.max(0, Math.min(1, (time - state.active.startTime) / duration));
          renderCells[state.id] = {
            x: state.active.from.x + (state.active.to.x - state.active.from.x) * progress,
            y: state.active.from.y + (state.active.to.y - state.active.from.y) * progress,
          };
        } else renderCells[state.id] = copyCell(state.position);
      }
      return { time, positions, renderCells, facings, events };
    };

    const timeline = [snapshot(0)];
    let time = 0;
    let guard = 0;
    while (guard < 10000) {
      guard += 1;
      const activeStates = [...states.values()].filter((state) => state.active && !state.blocked && !state.routeCancelled);
      if (!activeStates.length) break;
      const nextTime = Math.min(...activeStates.map((state) => state.active.endTime));
      const completedNow = activeStates.filter((state) => Math.abs(state.active.endTime - nextTime) < 1e-9);
      const tickLogStart = log.length;

      // A completed turn changes facing before movement due at this same
      // instant is checked. It still leaves the unit occupying its old cell.
      for (const state of completedNow) {
        const action = state.active;
        if (action.type !== "turn") continue;
        state.facing = action.facing;
        state.elapsedCost += action.duration;
        state.eventIndex += 1;
        state.active = null;
        addLog(nextTime, state, "turn", { facing: state.facing, cost: action.duration });
      }
      for (const state of completedNow) {
        const action = state.active;
        if (!action || action.type !== "wait") continue;
        state.elapsedCost += action.duration;
        state.eventIndex += 1;
        state.active = null;
        addLog(nextTime, state, "wait", { cell: copyCell(state.position), cost: action.duration });
      }

      const completingMovers = completedNow.filter((state) => state.active?.type === "move");
      const completingIds = new Set(completingMovers.map((state) => state.id));
      const intentions = new Map([...states.values()].map((state) => [state.id, copyCell(state.position)]));
      const collisionPeers = new Map();
      const rememberPeers = (id, peers) => {
        if (!collisionPeers.has(id)) collisionPeers.set(id, new Set());
        for (const peer of peers) if (String(peer) !== String(id)) collisionPeers.get(id).add(peer);
      };

      for (const state of completingMovers) {
        const target = state.active.to;
        if (!target || manhattan(state.position, target) !== 1) {
          markBlocked(state, "invalid-route", [], nextTime);
        } else if (grid && terrainIsBlocked(grid, target)) {
          markBlocked(state, "terrain", [], nextTime);
        } else intentions.set(state.id, copyCell(target));
      }

      const stopAtCurrentCell = (id, peers = [], reason = "unit-collision") => {
        const state = states.get(id);
        const proposed = intentions.get(id);
        rememberPeers(id, peers);
        markBlocked(state, reason, peers, nextTime);
        intentions.set(id, copyCell(state.position));
        return !sameCell(proposed, state.position);
      };

      let changed = true;
      let collisionPasses = 0;
      while (changed && collisionPasses < actors.length * 4 + 4) {
        collisionPasses += 1;
        changed = false;
        const targetGroups = new Map();
        for (const state of states.values()) {
          const key = cellKey(intentions.get(state.id));
          if (!targetGroups.has(key)) targetGroups.set(key, []);
          targetGroups.get(key).push(state.id);
        }
        for (const ids of targetGroups.values()) {
          if (ids.length < 2) continue;
          const stationary = ids.filter((id) => !completingIds.has(id) || sameCell(intentions.get(id), states.get(id).position));
          const priority = stationary.length === 0
            ? ids.find((id) => priorityUnitId != null && String(id) === String(priorityUnitId))
            : null;
          for (const id of ids) {
            cancelled.add(id);
            states.get(id).routeCancelled = true;
            if (priority != null && id === priority) continue;
            changed = stopAtCurrentCell(id, ids.filter((other) => other !== id), stationary.length ? "unit-collision" : "contested") || changed;
          }
        }

        const stateList = [...states.values()];
        for (let firstIndex = 0; firstIndex < stateList.length; firstIndex += 1) {
          for (let secondIndex = firstIndex + 1; secondIndex < stateList.length; secondIndex += 1) {
            const first = stateList[firstIndex];
            const second = stateList[secondIndex];
            if (!completingIds.has(first.id) || !completingIds.has(second.id)
              || !sameCell(intentions.get(first.id), second.position)
              || !sameCell(intentions.get(second.id), first.position)
              || sameCell(first.position, second.position)) continue;
            changed = stopAtCurrentCell(first.id, [second.id]) || changed;
            changed = stopAtCurrentCell(second.id, [first.id]) || changed;
          }
        }

        const occupantByCell = new Map([...states.values()].map((state) => [cellKey(state.position), state.id]));
        for (const state of states.values()) {
          const proposed = intentions.get(state.id);
          if (sameCell(proposed, state.position)) continue;
          const occupantId = occupantByCell.get(cellKey(proposed));
          if (occupantId == null || occupantId === state.id) continue;
          const occupant = states.get(occupantId);
          if (!sameCell(intentions.get(occupantId), occupant.position)) continue;
          changed = stopAtCurrentCell(state.id, [occupantId]) || changed;
          stopAtCurrentCell(occupantId, [state.id]);
        }
      }

      const finalCells = new Set();
      for (const state of states.values()) {
        const key = cellKey(intentions.get(state.id));
        if (finalCells.has(key)) throw new Error(`Timed movement collision resolver produced an occupied cell: ${key}`);
        finalCells.add(key);
      }

      for (const state of completingMovers) {
        const action = state.active;
        if (!action) continue;
        state.elapsedCost += action.duration;
        if (!state.blocked && sameCell(intentions.get(state.id), action.to)) {
          state.position = copyCell(action.to);
          state.facing = action.facing;
          state.completedPath.push(copyCell(action.to));
          state.eventIndex += 1;
          addLog(nextTime, state, "move", {
            from: copyCell(action.from), to: copyCell(action.to), facing: state.facing, cost: action.duration,
          });
        }
        state.active = null;
      }

      // A unit may be hit while it is still turning or half-way through a
      // step. It never vacated its logical source cell, so discard that action
      // and charge only the elapsed fraction before STOP.
      for (const state of states.values()) {
        if (!state.blocked || !state.active) continue;
        state.elapsedCost += Math.max(0, nextTime - state.active.startTime);
        state.active = null;
      }

      for (const state of states.values()) startNextEvent(state, nextTime);
      time = nextTime;
      timeline.push(snapshot(time, log.slice(tickLogStart)));
    }
    if (guard >= 10000) throw new Error("Timed movement resolver exceeded its safety limit.");

    const unitResults = {};
    for (const state of states.values()) {
      finishIfDone(state, time);
      unitResults[state.id] = {
        id: state.id,
        start: copyCell(state.schedule.path[0] || state.position),
        cell: copyCell(state.position),
        completedPath: state.completedPath.map(copyCell),
        facing: state.facing,
        blocked: state.blocked,
        blockReason: state.blockReason,
        blockedBy: [...state.blockedBy],
        completed: state.completed,
        elapsedCost: state.elapsedCost,
      };
    }
    return {
      actors: actors.map((unit) => unit.id),
      frames: timeline.map((frame) => frame.positions),
      frameTimes: timeline.map((frame) => frame.time),
      timeline,
      events: log,
      cancelled: [...cancelled],
      unitResults,
    };
  }

  function resolveSimultaneousMovement(options = {}) {
    return options && (options.timed === true || options.temporal === true)
      ? resolveTimedSimultaneousMovement(options)
      : resolveLegacySimultaneousMovement(options);
  }

  function attackTiles(grid, origin, maxRange = 1, minRange = 1) {
    if (!validCell(origin) || !isInside(grid, origin)) return [];
    const center = copyCell(origin);
    const maximum = Math.max(0, Math.trunc(Number(maxRange) || 0));
    const minimum = Math.min(maximum, Math.max(0, Math.trunc(Number(minRange) || 0)));
    const cells = [];
    for (let y = Math.max(0, center.y - maximum); y <= Math.min(grid.height - 1, center.y + maximum); y += 1) {
      for (let x = Math.max(0, center.x - maximum); x <= Math.min(grid.width - 1, center.x + maximum); x += 1) {
        const distance = manhattan(center, { x, y });
        if (distance >= minimum && distance <= maximum) cells.push({ x, y, distance });
      }
    }
    cells.sort((a, b) => a.distance - b.distance || a.y - b.y || a.x - b.x);
    return cells;
  }

  function isInAttackRange(origin, target, maxRange = 1, minRange = 1) {
    const distance = manhattan(origin, target);
    const maximum = Math.max(0, Math.trunc(Number(maxRange) || 0));
    const minimum = Math.min(maximum, Math.max(0, Math.trunc(Number(minRange) || 0)));
    return distance >= minimum && distance <= maximum;
  }

  function buildTurnOrder(units) {
    return (Array.isArray(units) ? units : [])
      .map((unit, index) => ({ unit, index }))
      .filter(({ unit }) => unitIsAlive(unit))
      .sort((a, b) => {
        const initiativeA = finiteStat(a.unit.initiative, finiteStat(a.unit.speed, 0));
        const initiativeB = finiteStat(b.unit.initiative, finiteStat(b.unit.speed, 0));
        const priorityA = finiteStat(a.unit.turnPriority, 0);
        const priorityB = finiteStat(b.unit.turnPriority, 0);
        return initiativeB - initiativeA || priorityB - priorityA || String(a.unit.id).localeCompare(String(b.unit.id)) || a.index - b.index;
      })
      .map(({ unit }) => unit);
  }

  function advanceTurn(order, currentIndex = -1, round = 1) {
    if (!Array.isArray(order) || order.length === 0) return { index: -1, round, unit: null, wrapped: false };
    const safeIndex = Number.isFinite(currentIndex) ? Math.trunc(currentIndex) : -1;
    const index = (safeIndex + 1 + order.length) % order.length;
    const wrapped = safeIndex >= 0 && index <= safeIndex;
    return { index, round: wrapped ? round + 1 : round, unit: order[index], wrapped };
  }

  function chooseEnemyAction({ grid, enemy, targets = [], units = [] } = {}) {
    const start = cellOf(enemy);
    if (!grid || !start || !unitIsAlive(enemy)) return null;
    const livingTargets = targets.filter(unitIsAlive).filter((target) => cellOf(target));
    const moveRange = Math.max(0, Math.trunc(finiteStat(enemy.moveRange, 3)));
    const allUnits = uniqueUnits([enemy, ...units, ...livingTargets]);
    const waitAction = {
      type: "wait",
      move: copyCell(start),
      path: [copyCell(start)],
      targetId: null,
      attackTargetId: null,
    };
    if (livingTargets.length === 0) return waitAction;

    const maximumRange = Math.max(1, Math.trunc(finiteStat(enemy.attackRange, 1)));
    const minimumRange = Math.min(maximumRange, Math.max(1, Math.trunc(finiteStat(enemy.minAttackRange, 1))));
    const turnCost = Math.max(0, finiteStat(enemy.turnCost, .5));
    const initialFacing = normalizeFacing(enemy.facing);
    const routes = [];
    for (const target of livingTargets) {
      const targetCell = cellOf(target);
      if (maximumRange === 1 && minimumRange === 1) {
        const fullPath = findPath(grid, start, targetCell, allUnits, {
          ignoreUnitId: enemy.id,
          allowGoalOccupied: true,
          turnCost,
          initialFacing,
        });
        if (!fullPath.length) continue;
        const attackApproach = fullPath.slice(0, -1);
        routes.push({
          target,
          destination: targetCell,
          path: fullPath,
          bandDistance: 1,
          pathCost: movementPathCost(fullPath, { turnCost, initialFacing }),
          attackCost: movementPathCost(attackApproach, { turnCost, initialFacing }),
          pursueOccupiedGoal: true,
        });
        continue;
      }
      for (const destination of attackTiles(grid, targetCell, maximumRange, minimumRange)) {
        if (!isWalkable(grid, destination, allUnits, { ignoreUnitId: enemy.id })) continue;
        const path = findPath(grid, start, destination, allUnits, {
          ignoreUnitId: enemy.id, turnCost, initialFacing,
        });
        if (!path.length) continue;
        const pathCost = movementPathCost(path, { turnCost, initialFacing });
        routes.push({ target, destination, path, bandDistance: destination.distance, pathCost, attackCost: pathCost, pursueOccupiedGoal: false });
      }
    }
    routes.sort((a, b) => a.pathCost - b.pathCost
      || a.path.length - b.path.length
      || finiteStat(a.target.hp, Infinity) - finiteStat(b.target.hp, Infinity)
      || compareIds(a.target.id, b.target.id)
      || a.bandDistance - b.bandDistance
      || a.destination.y - b.destination.y
      || a.destination.x - b.destination.x);
    const best = routes[0];
    if (!best) return waitAction;
    const path = truncatePathByCost(best.path, moveRange, { turnCost, initialFacing });
    const move = copyCell(path[path.length - 1]);
    const moved = !sameCell(move, start);
    const canReachAttackBand = best.attackCost <= moveRange + 1e-9;
    return {
      type: canReachAttackBand ? (moved ? "move-attack" : "attack") : moved ? "move" : "wait",
      move,
      path,
      targetId: best.target.id,
      attackTargetId: canReachAttackBand ? best.target.id : null,
      movementCost: movementPathCost(path, { turnCost, initialFacing }),
      facing: path.length > 1 ? facingFromStep(path[path.length - 2], path[path.length - 1], enemy.facing) : enemy.facing,
    };
  }

  function compareIds(a, b) {
    return String(a).localeCompare(String(b));
  }

  function uniqueUnits(units) {
    const result = [];
    const seen = new Set();
    for (const unit of units) {
      if (!unit) continue;
      const key = unit.id == null ? unit : `id:${unit.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(unit);
    }
    return result;
  }

  function finiteStat(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function sumModifiers(value) {
    if (Array.isArray(value)) return value.reduce((sum, entry) => sum + finiteStat(entry, 0), 0);
    return finiteStat(value, 0);
  }

  // Accuracy/evasion are percentage points. Accuracy intentionally remains
  // unbounded until after evasion is applied so accuracy bonuses can counter
  // evasive builds.
  function resolveHitChance(options = {}) {
    const baseAccuracy = finiteStat(options.baseAccuracy, finiteStat(options.accuracy, 100));
    const baseEvasion = finiteStat(options.baseEvasion, finiteStat(options.evasion, 0));
    const effectiveAccuracy = baseAccuracy
      + sumModifiers(options.accuracyBonuses)
      - sumModifiers(options.accuracyPenalties);
    const effectiveEvasion = baseEvasion
      + sumModifiers(options.evasionBonuses)
      - sumModifiers(options.evasionPenalties);
    const rawHitChance = (effectiveAccuracy / 100) * (1 - effectiveEvasion / 100);
    return {
      baseAccuracy,
      baseEvasion,
      effectiveAccuracy,
      effectiveEvasion,
      rawHitChance,
      hitChance: Math.min(1, Math.max(0, rawHitChance)),
    };
  }

  function calculateHitChance(options = {}) {
    return resolveHitChance(options).hitChance;
  }

  function rollHit(options = {}, random = Math.random) {
    const resolved = resolveHitChance(options);
    const source = typeof random === "function" ? random() : random;
    const roll = Math.min(.999999999, Math.max(0, finiteStat(source, 0)));
    return { ...resolved, roll, hit: roll < resolved.hitChance };
  }

  function createSeededRng(seed = 0) {
    let state = 2166136261;
    for (const character of String(seed)) {
      state ^= character.charCodeAt(0);
      state = Math.imul(state, 16777619);
    }
    state >>>= 0;
    return function seededRandom() {
      state = (state + 0x6D2B79F5) | 0;
      let value = Math.imul(state ^ (state >>> 15), 1 | state);
      value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createPendingAction(options = {}) {
    const durability = options.skillDurability != null && Number.isFinite(Number(options.skillDurability))
      ? Math.max(0, Number(options.skillDurability))
      : null;
    return {
      id: String(options.id || `${options.actorId || "actor"}:${options.skillId || "action"}`),
      actorId: options.actorId ?? options.actor?.id ?? null,
      targetId: options.targetId ?? options.target?.id ?? null,
      targetCell: options.targetCell ? { x: Number(options.targetCell.x), y: Number(options.targetCell.y) } : null,
      skillId: options.skillId ?? null,
      deliveryMode: options.deliveryMode || "pathless",
      attackPath: Array.isArray(options.attackPath) ? options.attackPath.map((cell) => ({ x: Number(cell.x), y: Number(cell.y) })) : [],
      rangeMin: options.rangeMin == null ? null : Math.max(0, Number(options.rangeMin) || 0),
      rangeMax: options.rangeMax == null ? null : Math.max(0, Number(options.rangeMax) || 0),
      targetArc: Array.isArray(options.targetArc) ? [...options.targetArc] : null,
      blocksByTerrain: options.blocksByTerrain,
      blocksByUnits: options.blocksByUnits,
      skillDurability: durability,
      accumulatedInterrupt: 0,
      remainingSkillDurability: durability,
      interrupted: false,
      status: "pending",
    };
  }

  function applyInterrupt(action, amount) {
    if (!action || action.interrupted) return action;
    const parsedAmount = typeof amount === "string" && amount.includes("*")
      ? amount.split("*").reduce((product, part) => product * finiteStat(part, 0), 1)
      : finiteStat(amount, 0);
    const interrupt = Math.max(0, parsedAmount);
    action.accumulatedInterrupt = Math.max(0, finiteStat(action.accumulatedInterrupt, 0) + interrupt);
    action.remainingSkillDurability = action.skillDurability == null
      ? null
      : Math.max(0, action.skillDurability - action.accumulatedInterrupt);
    if (action.skillDurability != null && action.accumulatedInterrupt >= action.skillDurability) {
      action.interrupted = true;
      action.status = "interrupted";
    }
    return action;
  }

  function isPendingActionInterrupted(action) {
    return Boolean(action?.interrupted)
      || (action?.skillDurability != null && Number(action.accumulatedInterrupt || 0) >= Number(action.skillDurability));
  }

  function resolveUnitFromState(state, id, direct) {
    if (direct) return direct;
    if (typeof state?.resolveUnit === "function") return state.resolveUnit(id);
    if (Array.isArray(state?.units)) return state.units.find((unit) => unit?.id === id) || null;
    if (state?.units && typeof state.units === "object") return state.units[id] || null;
    return null;
  }

  function revalidatePendingAction(action, state = {}) {
    if (!action) return { ok: false, reason: "missing-action", action };
    if (isPendingActionInterrupted(action)) {
      action.interrupted = true;
      action.status = "interrupted";
      return { ok: false, reason: "interrupted", action };
    }
    const actor = resolveUnitFromState(state, action.actorId, state.actor);
    const target = resolveUnitFromState(state, action.targetId, state.target);
    const alive = (unit) => unit && unit.alive !== false && (unit.hp === undefined || unit.hp > 0);
    if (!alive(actor)) return { ok: false, reason: "actor-defeated", action, actor, target };
    if (action.targetId != null && !alive(target)) return { ok: false, reason: "target-defeated", action, actor, target };
    if (typeof state.canAct === "function" && !state.canAct(actor, action)) return { ok: false, reason: "action-prevented", action, actor, target };
    if (typeof state.rangeResolver === "function" && !state.rangeResolver({ action, actor, target })) return { ok: false, reason: "out-of-range", action, actor, target };
    if (typeof state.pathResolver === "function" && !state.pathResolver({ action, actor, target })) return { ok: false, reason: "invalid-path", action, actor, target };
    if (action.deliveryMode === "linear" && actor?.cell && target?.cell && state.grid) {
      const selectedCell = target?.cell || action.targetCell;
      const path = facingOrthogonalPriority(actor.cell, selectedCell, actor.facing);
      const trace = traceAttackPath({
        origin: actor.cell,
        target: selectedCell,
        path,
        facing: actor.facing,
        grid: state.grid,
        units: state.units || [],
        actorId: actor.id,
        deliveryMode: "linear",
        blocksByTerrain: action.blocksByTerrain,
        blocksByUnits: action.blocksByUnits,
      });
      const hitIntendedTarget = action.targetId == null || trace.actualTarget?.id === action.targetId;
      const invalidated = trace.stoppedReason === "terrain" || !hitIntendedTarget;
      if (invalidated) {
        return { ok: false, reason: "invalid-path", action, actor, target, path, trace };
      }
      action.attackPath = trace.path.map((cell) => ({ ...cell }));
      action.resolvedTargetId = trace.actualTarget?.id || null;
    }
    action.status = "validated";
    return { ok: true, reason: null, action, actor, target };
  }

  function calculateDamage(attacker, defender, options = {}) {
    const attack = Math.max(0, finiteStat(options.attack, finiteStat(attacker && (attacker.attack ?? attacker.power), 0)));
    const defence = Math.max(0, finiteStat(options.defence, finiteStat(defender && (defender.defence ?? defender.defense), 0)));
    const bonus = finiteStat(options.bonus, 0);
    const multiplier = Math.max(0, finiteStat(options.multiplier, 1));
    const criticalMultiplier = options.critical ? Math.max(1, finiteStat(options.criticalMultiplier, 1.5)) : 1;
    const guardMultiplier = options.guarded ? Math.max(0, finiteStat(options.guardMultiplier, 0.65)) : 1;
    const minimum = Math.max(0, Math.trunc(finiteStat(options.minimum, 1)));
    return Math.max(minimum, Math.floor(Math.max(0, attack + bonus) * multiplier * criticalMultiplier * guardMultiplier - defence));
  }

  function applyDamage(unit, amount) {
    const hpBefore = Math.max(0, Math.trunc(finiteStat(unit && unit.hp, 0)));
    const requested = Math.max(0, Math.trunc(finiteStat(amount, 0)));
    const damage = Math.min(hpBefore, requested);
    const hpAfter = hpBefore - damage;
    return {
      unit: { ...unit, hp: hpAfter, alive: hpAfter > 0 },
      damage,
      hpBefore,
      hpAfter,
      defeated: hpBefore > 0 && hpAfter === 0,
    };
  }

  return {
    DIRECTIONS,
    FACING_VECTORS,
    POSITIONAL_MULTIPLIERS,
    cellKey,
    createGrid,
    isInside,
    isWalkable,
    manhattan,
    neighbours,
    reachableTiles,
    findPath,
    movementPathCost,
    truncatePathByCost,
    movementEvents,
    resolveSimultaneousMovement,
    resolveTimedSimultaneousMovement,
    attackTiles,
    isInAttackRange,
    facingVector,
    facingFromStep,
    localRelativeCell,
    facingOrthogonalPriority,
    traceAttackPath,
    relativePosition,
    isInFacingArc,
    positionalAttack,
    buildTurnOrder,
    advanceTurn,
    chooseEnemyAction,
    resolveHitChance,
    calculateHitChance,
    rollHit,
    createSeededRng,
    createPendingAction,
    applyInterrupt,
    isPendingActionInterrupted,
    revalidatePendingAction,
    calculateDamage,
    applyDamage,
  };
});
