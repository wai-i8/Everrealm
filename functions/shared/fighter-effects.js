(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmFighterEffects = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STANCES = new Set(["guard", "evasion", "counter", "projectile_counter"]);
  const STATUSES = new Set(["guard", "evasion", "counter", "projectile_counter", "poison", "paralysis", "blind", "knockdown", "move_down", "untargetable", "stealth", "action_interference", "burn", "wet", "freeze", "sleep", "petrify", "accuracy_down", "barrier"]);
  const LABELS = { guard: "防禦", evasion: "迴避架式", counter: "反擊架式", projectile_counter: "投射反擊", poison: "中毒", paralysis: "麻痺", blind: "黑暗", knockdown: "跌倒", move_down: "移動下降", untargetable: "不可直接選取", stealth: "不可直接選取", action_interference: "行動妨礙", burn: "灼傷", wet: "濕身", freeze: "凍結", sleep: "睡眠", petrify: "石化", accuracy_down: "命中下降", barrier: "屏障" };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
  const roundNumber = (value) => Math.max(0, Math.trunc(Number(value) || 0));
  const cellOf = (unit) => unit?.cell || unit;
  const isAlive = (unit) => unit && unit.alive !== false && (unit.hp === undefined || unit.hp > 0);
  const result = () => ({ events: [], hpChanges: [], moved: [], applied: 0 });

  // Balance defaults: stat passives add 6%, speed advances one grade, poison
  // deals 5% maximum HP per full round. HP-special attacks succeed at 80%/55%
  // (halve/set-to-one); bosses lose at most 15% maximum HP and retain >= 1 HP.
  // Stances last the casting round; duration-N ailments last N following rounds.

  function passiveModifiers(skills = []) {
    const modifiers = { attackMultiplier: 1, defenceMultiplier: 1, evasion: 0, accuracy: 0, speedBonus: 0, immunities: [] };
    const seen = new Set();
    for (const skill of skills || []) {
      if (!skill || (skill.id && seen.has(skill.id))) continue;
      if (skill.id) seen.add(skill.id);
      for (const effect of skill.effects || []) {
        if (effect.type !== "passive_stat") continue;
        const amount = clamp(effect.amount ?? .06, 0, .9);
        if (effect.stat === "attack") modifiers.attackMultiplier += amount;
        else if (effect.stat === "defence") modifiers.defenceMultiplier += amount;
        else if (effect.stat === "evasion") modifiers.evasion += amount;
        else if (effect.stat === "accuracy") modifiers.accuracy += amount;
        else if (effect.stat === "speed") modifiers.speedBonus += 1;
        else if (String(effect.stat).endsWith("_recovery")) modifiers.immunities.push(String(effect.stat).replace(/_recovery$/, ""));
        // Historical category-specific defense names are normalized by
        // skill-core to generic DEF. Keep this branch only as a safe
        // compatibility path for older in-memory skill objects.
        else if (String(effect.stat).endsWith("_defence")) modifiers.defenceMultiplier += amount;
      }
    }
    modifiers.evasion = clamp(modifiers.evasion, 0, .8);
    modifiers.accuracy = clamp(modifiers.accuracy, 0, .8);
    modifiers.immunities = [...new Set(modifiers.immunities)];
    return modifiers;
  }

  function activeStatus(unit, type, round = 0) {
    const status = unit?.statusEffects?.[type];
    return status && Number(status.untilRound) >= roundNumber(round) ? status : null;
  }

  function isDisabled(unit, round = 0, action = "act") {
    if (!isAlive(unit)) return true;
    if (activeStatus(unit, "paralysis", round) || activeStatus(unit, "sleep", round) || activeStatus(unit, "freeze", round) || activeStatus(unit, "petrify", round)) return true;
    if (action === "act" && activeStatus(unit, "action_interference", round)) return true;
    return (action === "move" || action === "act") && Boolean(activeStatus(unit, "knockdown", round));
  }

  function statusEvasion(unit, round = 0, passives = {}) {
    const stance = activeStatus(unit, "evasion", round)?.amount || 0;
    return clamp((passives.evasion || 0) + stance, 0, .9);
  }

  function accuracyPenalty(unit, round = 0) {
    return Math.min(.9, (activeStatus(unit, "blind", round) ? .55 : 0) + (activeStatus(unit, "accuracy_down", round)?.amount || 0));
  }

  function isUntargetable(unit, round = 0) {
    // `stealth` is retained as a save/debug compatibility alias. It no
    // longer means unseen or evasive; both names use direct-target protection.
    return Boolean(activeStatus(unit, "untargetable", round) || activeStatus(unit, "stealth", round));
  }

  function isDirectTargetable(unit, round = 0) {
    return !isUntargetable(unit, round);
  }

  function isStealthed(unit, round = 0) {
    // Legacy API alias. New callers must use isUntargetable.
    return isUntargetable(unit, round);
  }

  function movementPenalty(unit, round = 0) {
    return Math.max(0, Number(activeStatus(unit, "move_down", round)?.amount) || 0);
  }

  function damageMultiplier(unit, round = 0) {
    const guard = clamp(activeStatus(unit, "guard", round)?.amount || 0, 0, .85);
    const barrier = clamp(activeStatus(unit, "barrier", round)?.amount || 0, 0, .85);
    return (1 - guard) * (1 - barrier);
  }

  function hpChange(unit, nextHp, kind, output, label) {
    const previous = Math.max(0, Number(unit.hp) || 0);
    const maximum = Math.max(previous, Number(unit.maxHp) || previous);
    unit.hp = clamp(Math.round(nextHp), 0, maximum);
    const amount = unit.hp - previous;
    if (!amount) return;
    output.hpChanges.push({ unitId: unit.id, amount, kind });
    output.events.push({ unitId: unit.id, text: label || `${amount > 0 ? "+" : ""}${amount}`, kind, amount });
    output.applied += 1;
  }

  function immuneTo(unit, type, modifiers) {
    const immunities = modifiers?.immunities || unit.passiveModifiers?.immunities || unit.immunities || [];
    return typeof immunities.has === "function" ? immunities.has(type) : immunities.includes(type);
  }

  function applyStatus(unit, effect, caster, round, output) {
    if (immuneTo(unit, effect.type)) {
      output.events.push({ unitId: unit.id, text: "免疫", kind: "immune", status: effect.type });
      return;
    }
    const duration = Math.max(1, Math.trunc(Number(effect.duration) || 1));
    const untilRound = round + duration - (STANCES.has(effect.type) ? 1 : 0);
    unit.statusEffects ||= {};
    const previous = activeStatus(unit, effect.type, round);
    unit.statusEffects[effect.type] = {
      untilRound: Math.max(untilRound, Number(previous?.untilRound) || 0),
      amount: Math.max(Number(effect.amount) || 0, Number(previous?.amount) || 0),
      appliedRound: round,
      sourceId: caster?.id,
      ...(effect.type === "poison" ? { maxHpRatio: clamp(effect.maxHpRatio ?? .05, .01, .25), lastTickRound: round } : {}),
      ...(effect.type === "barrier" ? { barrierKind: effect.barrierKind || "generic" } : {}),
    };
    output.events.push({ unitId: unit.id, text: LABELS[effect.type] || effect.type, kind: "status", status: effect.type });
    output.applied += 1;
  }

  function walkable(grid, cell, units, ignored) {
    if (!grid || cell.x < 0 || cell.y < 0 || cell.x >= grid.width || cell.y >= grid.height) return false;
    const key = `${cell.x},${cell.y}`;
    const blocked = grid.blocked;
    if (blocked?.has?.(key) || (Array.isArray(blocked) && blocked.some((entry) => entry === key || (entry?.x === cell.x && entry?.y === cell.y)))) return false;
    return !(units || []).some((unit) => unit !== ignored && isAlive(unit) && cellOf(unit)?.x === cell.x && cellOf(unit)?.y === cell.y);
  }

  function terrainHeightAt(grid, cell) {
    if (!grid || !cell) return 0;
    const key = `${cell.x},${cell.y}`;
    const source = grid.heightMap;
    const value = typeof source === "function"
      ? source(cell)
      : source && typeof source === "object" ? source[key] : 0;
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function knockbackHeightAllowed(grid, from, to) {
    return terrainHeightAt(grid, to) <= terrainHeightAt(grid, from);
  }

  function knockback(caster, target, effect, units, grid, output) {
    const origin = cellOf(caster);
    const from = cellOf(target);
    if (!origin || !from) return;
    const dx = from.x - origin.x;
    const dy = from.y - origin.y;
    const direction = Math.abs(dx) >= Math.abs(dy) && dx !== 0 ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
    if (!direction.x && !direction.y) return;
    let to = { x: from.x, y: from.y };
    let stopped = false;
    for (let step = 0; step < Math.max(0, Math.trunc(effect.amount || 1)); step += 1) {
      const next = { x: to.x + direction.x, y: to.y + direction.y };
      if (!walkable(grid, next, units, target) || !knockbackHeightAllowed(grid, to, next)) { stopped = true; break; }
      to = next;
    }
    if (to.x !== from.x || to.y !== from.y) {
      output.moved.push({ unitId: target.id, from: { x: from.x, y: from.y }, to: { ...to } });
      if (target.cell) target.cell = to;
      else { target.x = to.x; target.y = to.y; }
      if (target.renderCell) target.renderCell = { ...to };
      output.events.push({ unitId: target.id, text: "擊退", kind: "knockback" });
      output.applied += 1;
    }
    if (stopped) output.events.push({ unitId: target.id, text: "STOP!", kind: "stop" });
  }

  // Ordinary damage/hit-count/position bonuses are resolved by the battle engine.
  // This function owns the authored secondary effects and special HP changes only.
  function applySkillEffects({ skill, caster, targets = [], units = [], grid, round = 0, random = Math.random } = {}) {
    const output = result();
    if (!skill || !caster) return output;
    const currentRound = roundNumber(round);
    const recipients = [...new Set((targets || []).filter(Boolean))];
    if (!recipients.length && skill.targeting?.team === "self" && skill.area?.shape === "self") recipients.push(caster);
    const allUnits = [...new Set([caster, ...units, ...recipients])];
    const hasExplicitSelfPoison = (skill.effects || []).some((effect) => effect.type === "self_poison");
    for (const effect of skill.effects || []) {
      if (effect.type === "damage" || effect.type === "passive_stat") continue;
      if (effect.type === "self_poison") {
        if (isAlive(caster)) {
          applyStatus(caster, { ...effect, type: "poison", maxHpRatio: effect.maxHpRatio ?? .05 }, caster, currentRound, output);
        }
        continue;
      }
      for (const target of recipients) {
        if (!isAlive(target)) continue;
        if (effect.condition && !activeStatus(target, effect.condition, currentRound)) continue;
        const chance = effect.chance ?? (effect.type === "halve_hp" ? .8 : effect.type === "set_hp" ? .55 : 1);
        if (clamp(random(), 0, .999999999) >= clamp(chance, 0, 1)) {
          output.events.push({ unitId: target.id, text: "抵抗", kind: "resist", status: effect.type });
          continue;
        }
        if (effect.type === "knockback") knockback(caster, target, effect, allUnits, grid, output);
        else if (STATUSES.has(effect.type)) applyStatus(target, effect, caster, currentRound, output);
        else if (effect.type === "heal") hpChange(target, target.hp + (Number(target.maxHp) || 0) * (effect.maxHpRatio || 0) + (effect.flat || 0), "heal", output);
        else if (effect.type === "cleanse") {
          for (const type of effect.statuses || []) {
            if (!target.statusEffects?.[type]) continue;
            delete target.statusEffects[type];
            output.applied += 1;
            output.events.push({ unitId: target.id, text: `解除${LABELS[type] || type}`, kind: "cleanse", status: type });
          }
        } else if (effect.type === "feint") {
          if (effect.effectiveAgainst === "guarding_target" && activeStatus(target, "guard", currentRound)) {
            delete target.statusEffects.guard;
            output.applied += 1;
            output.events.push({ unitId: target.id, text: "破防", kind: "feint", status: "guard" });
          }
        } else if (effect.type === "halve_hp" || effect.type === "set_hp") {
          let desired = effect.type === "halve_hp" ? Math.max(1, Math.ceil(target.hp / 2)) : Math.max(1, Number(effect.amount) || 1);
          // A percentage/one-HP move cannot trivialize boss encounters.
          if (target.boss || target.isBoss || target.type === "boss") desired = Math.max(desired, target.hp - Math.max(1, Math.floor((target.maxHp || target.hp) * .15)));
          hpChange(target, Math.min(target.hp, desired), "specialDamage", output);
        }
      }
      if (effect.type === "poison" && effect.selfDuration && !hasExplicitSelfPoison && isAlive(caster) && !recipients.includes(caster)) {
        applyStatus(caster, { ...effect, duration: effect.selfDuration }, caster, currentRound, output);
      }
    }
    return output;
  }

  function tickStatuses(unit, round = 0, passives = {}) {
    const output = result();
    if (!unit?.statusEffects) return output;
    const currentRound = roundNumber(round);
    for (const [type, status] of Object.entries(unit.statusEffects)) {
      if (immuneTo(unit, type, passives)) {
        delete unit.statusEffects[type];
        output.events.push({ unitId: unit.id, text: `解除${LABELS[type] || type}`, kind: "cleanse", status: type });
        continue;
      }
      if (Number(status.untilRound) < currentRound) { delete unit.statusEffects[type]; continue; }
      if ((type === "poison" || type === "burn") && isAlive(unit) && currentRound > Number(status.lastTickRound ?? status.appliedRound ?? -1)) {
        status.lastTickRound = currentRound;
        const damage = Math.max(1, Math.round((unit.maxHp || unit.hp) * (status.maxHpRatio || (type === "burn" ? .04 : .05))));
        hpChange(unit, unit.hp - damage, `${type}Damage`, output, `${LABELS[type] || type} -${Math.min(unit.hp, damage)}`);
      }
    }
    return output;
  }

  function resolveCounter({ defender, attacker, damage = 0, isProjectile = false, round = 0 } = {}) {
    const output = { damage: Math.max(0, Math.round(damage)), reflectedDamage: 0, events: [] };
    if (!isAlive(defender) || !isAlive(attacker) || !output.damage || isDisabled(defender, round)) return output;
    const projectile = isProjectile && activeStatus(defender, "projectile_counter", round);
    const ordinary = activeStatus(defender, "counter", round);
    const stance = projectile || ordinary;
    if (!stance) return output;
    if (!projectile) {
      const first = cellOf(defender);
      const second = cellOf(attacker);
      if (Math.abs(first.x - second.x) + Math.abs(first.y - second.y) > 1) return output;
    }
    const reflected = Math.max(1, Math.round(output.damage * (stance.amount || 1)));
    output.reflectedDamage = Math.min(attacker.hp, reflected);
    attacker.hp = Math.max(0, attacker.hp - reflected);
    if (projectile) output.damage = 0;
    delete defender.statusEffects[projectile ? "projectile_counter" : "counter"];
    output.events.push({ unitId: defender.id, text: projectile ? "投射反擊！" : "反擊！", kind: "counter" });
    output.events.push({ unitId: attacker.id, text: `-${output.reflectedDamage}`, kind: "counterDamage", amount: -output.reflectedDamage });
    return output;
  }

  return { passiveModifiers, applySkillEffects, tickStatuses, activeStatus, isDisabled, isUntargetable, isDirectTargetable, isStealthed, statusEvasion, accuracyPenalty, movementPenalty, damageMultiplier, resolveCounter };
});
