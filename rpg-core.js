(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TAU = Math.PI * 2;
  const EXPLORATION_MOVEMENT = Object.freeze({
    baseWorldUnitsPerSecond: 330,
    equipmentPointWorldUnitsPerSecond: 2.5,
    minimumWorldUnitsPerSecond: 175,
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function normalize(vector) {
    const length = Math.hypot(vector.x, vector.y);
    if (!length) return { x: 0, y: 0 };
    return { x: vector.x / length, y: vector.y / length };
  }

  function directionVector(direction) {
    if (direction === "up") return { x: 0, y: -1 };
    if (direction === "down") return { x: 0, y: 1 };
    if (direction === "left") return { x: -1, y: 0 };
    return { x: 1, y: 0 };
  }

  function circleRectOverlap(circle, rect) {
    const closestX = clamp(circle.x, rect.x, rect.x + rect.w);
    const closestY = clamp(circle.y, rect.y, rect.y + rect.h);
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    return dx * dx + dy * dy < circle.radius * circle.radius;
  }

  function circlesOverlap(a, b, padding = 0) {
    const radii = a.radius + b.radius + padding;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy < radii * radii;
  }

  function attackHitsTarget(attacker, facing, reach, halfAngle, target) {
    const offset = { x: target.x - attacker.x, y: target.y - attacker.y };
    const range = reach + (target.radius || 0);
    const length = Math.hypot(offset.x, offset.y);
    if (length > range || length === 0) return length <= range;
    const unit = { x: offset.x / length, y: offset.y / length };
    const face = typeof facing === "string" ? directionVector(facing) : normalize(facing);
    return unit.x * face.x + unit.y * face.y >= Math.cos(halfAngle);
  }

  function xpRequired(level) {
    const safeLevel = Math.max(1, Math.floor(level));
    return Math.floor(45 + safeLevel * 32 + Math.pow(safeLevel, 1.35) * 7);
  }

  function grantExperience(level, xp, amount) {
    let nextLevel = Math.max(1, Math.floor(level));
    let nextXp = Math.max(0, Number(xp) || 0) + Math.max(0, Number(amount) || 0);
    let levelsGained = 0;
    while (nextXp >= xpRequired(nextLevel) && nextLevel < 40) {
      nextXp -= xpRequired(nextLevel);
      nextLevel += 1;
      levelsGained += 1;
    }
    return { level: nextLevel, xp: Math.floor(nextXp), levelsGained };
  }

  function deriveStats(player) {
    const level = Math.max(1, player.level || 1);
    const upgrades = player.upgrades || {};
    const vigor = Math.max(0, upgrades.vigor || 0);
    const edge = Math.max(0, upgrades.edge || 0);
    const swift = Math.max(0, upgrades.swift || 0);
    const weaponLevel = clamp(Math.floor(player.weaponLevel || 1), 1, 4);
    return {
      maxHp: 88 + (level - 1) * 10 + vigor * 18,
      // Level controls HP/progression; generic ATK comes from equipment and
      // explicit upgrades, never from an automatic per-level bonus.
      attack: 14 + (weaponLevel - 1) * 2 + edge * 4,
      speed: EXPLORATION_MOVEMENT.baseWorldUnitsPerSecond * (1 + swift * 0.075),
      dashCooldown: Math.max(0.58, 1.05 - swift * 0.07),
      critChance: clamp(0.1 + edge * 0.025, 0.1, 0.28),
    };
  }

  function moveWithCollision(entity, dx, dy, isBlocked) {
    const result = { x: entity.x, y: entity.y, hitX: false, hitY: false };
    const movedX = { x: entity.x + dx, y: entity.y, radius: entity.radius };
    if (!isBlocked(movedX)) result.x = movedX.x;
    else result.hitX = true;
    const movedY = { x: result.x, y: entity.y + dy, radius: entity.radius };
    if (!isBlocked(movedY)) result.y = movedY.y;
    else result.hitY = true;
    return result;
  }

  function normalizePathBounds(bounds, start, goal, colliders, cellSize, radius, searchPadding) {
    if (bounds && typeof bounds === "object") {
      const minX = Number.isFinite(bounds.minX) ? bounds.minX : Number.isFinite(bounds.left) ? bounds.left : bounds.x;
      const minY = Number.isFinite(bounds.minY) ? bounds.minY : Number.isFinite(bounds.top) ? bounds.top : bounds.y;
      const maxX = Number.isFinite(bounds.maxX)
        ? bounds.maxX
        : Number.isFinite(bounds.right)
          ? bounds.right
          : Number(minX) + Number(bounds.w ?? bounds.width);
      const maxY = Number.isFinite(bounds.maxY)
        ? bounds.maxY
        : Number.isFinite(bounds.bottom)
          ? bounds.bottom
          : Number(minY) + Number(bounds.h ?? bounds.height);
      if ([minX, minY, maxX, maxY].every(Number.isFinite) && maxX >= minX && maxY >= minY) {
        return { minX, minY, maxX, maxY };
      }
    }

    let minX = Math.min(start.x, goal.x);
    let minY = Math.min(start.y, goal.y);
    let maxX = Math.max(start.x, goal.x);
    let maxY = Math.max(start.y, goal.y);
    for (const rect of colliders) {
      const width = Number(rect.w ?? rect.width);
      const height = Number(rect.h ?? rect.height);
      if (![rect.x, rect.y, width, height].every(Number.isFinite)) continue;
      minX = Math.min(minX, rect.x - radius);
      minY = Math.min(minY, rect.y - radius);
      maxX = Math.max(maxX, rect.x + width + radius);
      maxY = Math.max(maxY, rect.y + height + radius);
    }
    const directDistance = distance(start, goal);
    const padding = Number.isFinite(searchPadding)
      ? Math.max(cellSize, searchPadding)
      : Math.max(cellSize * 4, directDistance * 0.35);
    return { minX: minX - padding, minY: minY - padding, maxX: maxX + padding, maxY: maxY + padding };
  }

  function segmentIntersectsExpandedRect(a, b, rect, radius) {
    const width = Number(rect.w ?? rect.width);
    const height = Number(rect.h ?? rect.height);
    if (![rect.x, rect.y, width, height].every(Number.isFinite)) return false;
    const minX = rect.x - radius;
    const minY = rect.y - radius;
    const maxX = rect.x + width + radius;
    const maxY = rect.y + height + radius;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let near = 0;
    let far = 1;

    for (const [origin, delta, min, max] of [[a.x, dx, minX, maxX], [a.y, dy, minY, maxY]]) {
      if (Math.abs(delta) < 1e-9) {
        if (origin < min || origin > max) return false;
        continue;
      }
      let first = (min - origin) / delta;
      let second = (max - origin) / delta;
      if (first > second) [first, second] = [second, first];
      near = Math.max(near, first);
      far = Math.min(far, second);
      if (near > far) return false;
    }
    return far >= 0 && near <= 1;
  }

  function compressPathWaypoints(points) {
    const compact = [];
    for (const point of points) {
      const previous = compact[compact.length - 1];
      if (previous && distance(previous, point) < 1e-7) continue;
      compact.push({ x: point.x, y: point.y });
      while (compact.length >= 3) {
        const a = compact[compact.length - 3];
        const b = compact[compact.length - 2];
        const c = compact[compact.length - 1];
        const ab = { x: b.x - a.x, y: b.y - a.y };
        const bc = { x: c.x - b.x, y: c.y - b.y };
        const cross = ab.x * bc.y - ab.y * bc.x;
        const dot = ab.x * bc.x + ab.y * bc.y;
        if (Math.abs(cross) > 1e-7 || dot < 0) break;
        compact.splice(compact.length - 2, 1);
      }
    }
    return compact;
  }

  /**
   * Deterministic click-to-move path finder for continuous overworld coordinates.
   * The returned waypoints exclude start, include the exact goal, and are [] when
   * start already equals goal or no route exists. With `nearestReachable: true`,
   * an unreachable/blocked goal falls back to the closest reachable standable
   * search point (distance, then travel cost and coordinates break ties).
   */
  function findOverworldPath(start, goal, options = {}) {
    if (!start || !goal || ![start.x, start.y, goal.x, goal.y].every(Number.isFinite)) return [];
    if (distance(start, goal) < 1e-7) return [];

    const cellSize = Math.max(4, Number(options.cellSize) || 32);
    const radius = Math.max(0, Number(options.radius) || 0);
    const directions = options.directions === 4 || options.diagonal === false ? 4 : 8;
    const colliders = Array.isArray(options.colliders) ? options.colliders : [];
    const customWalkable = typeof options.isWalkable === "function" ? options.isWalkable : null;
    const bounds = normalizePathBounds(options.bounds, start, goal, colliders, cellSize, radius, options.searchPadding);
    const maxVisited = Math.max(1, Math.floor(Number(options.maxVisited) || 20000));
    const requestedSampleStep = Number(options.sampleStep);
    const sampleStep = Number.isFinite(requestedSampleStep)
      ? Math.max(1, requestedSampleStep)
      : Math.max(2, cellSize / 3);
    const requestedTerminalConnectDistance = Number(options.terminalConnectDistance);
    const terminalConnectDistance = Number.isFinite(requestedTerminalConnectDistance)
      ? Math.max(0, requestedTerminalConnectDistance)
      : Infinity;
    const nearestReachable = options.nearestReachable === true;

    function canStand(point) {
      if (
        point.x < bounds.minX + radius
        || point.x > bounds.maxX - radius
        || point.y < bounds.minY + radius
        || point.y > bounds.maxY - radius
      ) return false;
      for (const rect of colliders) {
        const width = Number(rect.w ?? rect.width);
        const height = Number(rect.h ?? rect.height);
        if (![rect.x, rect.y, width, height].every(Number.isFinite)) continue;
        if (
          point.x >= rect.x - radius
          && point.x <= rect.x + width + radius
          && point.y >= rect.y - radius
          && point.y <= rect.y + height + radius
        ) return false;
      }
      return !customWalkable || customWalkable({ x: point.x, y: point.y }) !== false;
    }

    function lineIsClear(a, b) {
      for (const rect of colliders) {
        if (segmentIntersectsExpandedRect(a, b, rect, radius)) return false;
      }
      const steps = Math.max(1, Math.ceil(distance(a, b) / sampleStep));
      for (let index = 1; index <= steps; index += 1) {
        const amount = index / steps;
        if (!canStand({ x: lerp(a.x, b.x, amount), y: lerp(a.y, b.y, amount) })) return false;
      }
      return true;
    }

    const startIsStandable = canStand(start);
    const goalIsStandable = canStand(goal);
    if (!startIsStandable || (!goalIsStandable && !nearestReachable)) return [];

    function terminalRoute(point) {
      if (!goalIsStandable) return null;
      if (directions === 8) return lineIsClear(point, goal) ? [goal] : null;
      const corners = [{ x: goal.x, y: point.y }, { x: point.x, y: goal.y }];
      for (const corner of corners) {
        if (distance(point, corner) > 1e-7 && !lineIsClear(point, corner)) continue;
        if (!lineIsClear(corner, goal)) continue;
        return distance(point, corner) < 1e-7 || distance(corner, goal) < 1e-7 ? [goal] : [corner, goal];
      }
      return null;
    }

    const direct = terminalRoute(start);
    if (direct) return compressPathWaypoints([start, ...direct]).slice(1);

    const cardinalSteps = [[0, -1], [-1, 0], [1, 0], [0, 1]];
    const diagonalSteps = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    const steps = directions === 8 ? [...cardinalSteps, ...diagonalSteps] : cardinalSteps;
    const heuristic = directions === 8
      ? (point) => distance(point, goal)
      : (point) => Math.abs(point.x - goal.x) + Math.abs(point.y - goal.y);

    const minIx = Math.ceil((bounds.minX + radius - start.x) / cellSize);
    const maxIx = Math.floor((bounds.maxX - radius - start.x) / cellSize);
    const minIy = Math.ceil((bounds.minY + radius - start.y) / cellSize);
    const maxIy = Math.floor((bounds.maxY - radius - start.y) / cellSize);
    if (minIx > maxIx || minIy > maxIy || 0 < minIx || 0 > maxIx || 0 < minIy || 0 > maxIy) return [];
    const gridHeight = maxIy - minIy + 1;
    const keyFor = (ix, iy) => (ix - minIx) * gridHeight + (iy - minIy);

    let sequence = 0;
    const startNode = {
      ix: 0,
      iy: 0,
      x: start.x,
      y: start.y,
      g: 0,
      h: heuristic(start),
      parent: null,
      sequence: sequence++,
    };
    const open = [startNode];
    const openByKey = new Map([[keyFor(0, 0), startNode]]);
    const closed = new Set();
    let visited = 0;
    let nearestNode = nearestReachable ? startNode : null;

    function compareNearestCandidates(a, b) {
      const aDistance = distance(a, goal);
      const bDistance = distance(b, goal);
      if (Math.abs(aDistance - bDistance) > 1e-7) return aDistance - bDistance;
      if (Math.abs(a.g - b.g) > 1e-7) return a.g - b.g;
      if (Math.abs(a.y - b.y) > 1e-7) return a.y - b.y;
      if (Math.abs(a.x - b.x) > 1e-7) return a.x - b.x;
      return a.sequence - b.sequence;
    }

    function considerNearestCandidate(node) {
      if (!nearestReachable || (nearestNode && compareNearestCandidates(node, nearestNode) >= 0)) return;
      nearestNode = node;
    }

    function routeToNode(destination) {
      const route = [];
      let node = destination;
      while (node) {
        route.push({ x: node.x, y: node.y });
        node = node.parent;
      }
      route.reverse();
      return compressPathWaypoints(route).slice(1);
    }

    function compareNodes(a, b) {
      const fDifference = (a.g + a.h) - (b.g + b.h);
      if (Math.abs(fDifference) > 1e-7) return fDifference;
      if (Math.abs(a.h - b.h) > 1e-7) return a.h - b.h;
      if (Math.abs(a.y - b.y) > 1e-7) return a.y - b.y;
      if (Math.abs(a.x - b.x) > 1e-7) return a.x - b.x;
      return a.sequence - b.sequence;
    }

    function heapPush(node) {
      let index = open.length;
      open.push(node);
      while (index > 0) {
        const parent = (index - 1) >> 1;
        if (compareNodes(open[parent], node) <= 0) break;
        open[index] = open[parent];
        index = parent;
      }
      open[index] = node;
    }

    function heapPop() {
      const first = open[0];
      const last = open.pop();
      if (open.length && last) {
        let index = 0;
        while (true) {
          const left = index * 2 + 1;
          if (left >= open.length) break;
          const right = left + 1;
          let child = left;
          if (right < open.length && compareNodes(open[right], open[left]) < 0) child = right;
          if (compareNodes(last, open[child]) <= 0) break;
          open[index] = open[child];
          index = child;
        }
        open[index] = last;
      }
      return first;
    }

    while (open.length && visited < maxVisited) {
      const current = heapPop();
      const currentKey = keyFor(current.ix, current.iy);
      if (openByKey.get(currentKey) !== current) continue;
      openByKey.delete(currentKey);
      if (closed.has(currentKey)) continue;
      closed.add(currentKey);
      visited += 1;

      const finish = current.h <= terminalConnectDistance ? terminalRoute(current) : null;
      if (finish) {
        const route = [{ x: start.x, y: start.y }, ...routeToNode(current)];
        route.push(...finish);
        return compressPathWaypoints(route).slice(1);
      }

      for (const [stepX, stepY] of steps) {
        const ix = current.ix + stepX;
        const iy = current.iy + stepY;
        if (ix < minIx || ix > maxIx || iy < minIy || iy > maxIy) continue;
        const key = keyFor(ix, iy);
        if (closed.has(key)) continue;
        const nextPoint = { x: start.x + ix * cellSize, y: start.y + iy * cellSize };
        if (!lineIsClear(current, nextPoint)) continue;
        if (stepX && stepY) {
          const horizontal = { x: current.x + stepX * cellSize, y: current.y };
          const vertical = { x: current.x, y: current.y + stepY * cellSize };
          if (!canStand(horizontal) || !canStand(vertical)) continue;
        }
        const nextG = current.g + (stepX && stepY ? cellSize * Math.SQRT2 : cellSize);
        const existing = openByKey.get(key);
        if (existing && existing.g <= nextG + 1e-7) continue;
        const nextNode = {
          ix,
          iy,
          x: nextPoint.x,
          y: nextPoint.y,
          g: nextG,
          h: heuristic(nextPoint),
          parent: current,
          sequence: sequence++,
        };
        heapPush(nextNode);
        openByKey.set(key, nextNode);
        considerNearestCandidate(nextNode);
      }
    }

    if (!nearestNode || distance(nearestNode, start) < 1e-7) return [];
    return routeToNode(nearestNode);
  }

  function sanitizeSave(raw) {
    if (!raw || typeof raw !== "object" || raw.version !== 1) return null;
    const player = raw.player;
    if (!player || !Number.isFinite(player.x) || !Number.isFinite(player.y)) return null;
    const level = clamp(Math.floor(Number(player.level) || 1), 1, 40);
    const upgrades = player.upgrades && typeof player.upgrades === "object" ? player.upgrades : {};
    const crystals = Array.isArray(raw.crystals)
      ? [...new Set(raw.crystals.filter((value) => ["north", "west", "hollow"].includes(value)))]
      : [];
    const openedChests = Array.isArray(raw.openedChests)
      ? [...new Set(raw.openedChests.filter((value) => typeof value === "string"))].slice(0, 20)
      : [];
    // Legacy combat fields (slash/impact/piercing/magic attack and typed
    // defenses) are deliberately not copied. They were never part of the
    // persisted canonical schema and have no deterministic generic mapping.
    return {
      version: 1,
      player: {
        x: clamp(player.x, 40, 2760),
        y: clamp(player.y, 40, 1800),
        hp: Math.max(1, Number(player.hp) || 1),
        level,
        xp: clamp(Math.floor(Number(player.xp) || 0), 0, xpRequired(level) - 1),
        coins: clamp(Math.floor(Number(player.coins) || 0), 0, 99999),
        potions: clamp(Math.floor(Number(player.potions) || 0), 0, 9),
        weaponLevel: clamp(Math.floor(Number(player.weaponLevel) || 1), 1, 4),
        upgrades: {
          vigor: clamp(Math.floor(Number(upgrades.vigor) || 0), 0, 40),
          edge: clamp(Math.floor(Number(upgrades.edge) || 0), 0, 40),
          swift: clamp(Math.floor(Number(upgrades.swift) || 0), 0, 40),
        },
      },
      questStage: clamp(Math.floor(Number(raw.questStage) || 0), 0, 5),
      pendingLevelUps: clamp(Math.floor(Number(raw.pendingLevelUps) || 0), 0, Math.max(0, level - 1)),
      crystals,
      bossDefeated: Boolean(raw.bossDefeated),
      openedChests,
      playTime: clamp(Number(raw.playTime) || 0, 0, 1e8),
    };
  }

  function hash2D(x, y, seed = 0) {
    let value = Math.imul(x | 0, 0x45d9f3b) ^ Math.imul(y | 0, 0x119de1f3) ^ (seed | 0);
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    value ^= value >>> 16;
    return (value >>> 0) / 4294967295;
  }

  return {
    TAU,
    EXPLORATION_MOVEMENT,
    clamp,
    lerp,
    distance,
    normalize,
    directionVector,
    circleRectOverlap,
    circlesOverlap,
    attackHitsTarget,
    xpRequired,
    grantExperience,
    deriveStats,
    moveWithCollision,
    findOverworldPath,
    sanitizeSave,
    hash2D,
  };
});
