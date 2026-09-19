"use strict";

const Expansion = require("./shared/expansion-core.js");
const Skills = require("./shared/skill-core.js");
const Tactics = require("./shared/tactics-core.js");
const MonsterAI = require("./shared/monster-ai.js");
const FighterEffects = require("./shared/fighter-effects.js");
const MonsterBlueprints = require("./shared/map/monster-blueprints.js");
const ServerGame = require("./server-game.js");
const Party = require("./party-system.js");
const { classMaxHp } = require("./game-rules.js");

const TURN_COST = 0.5;
const MAX_AP = Skills.MAX_AP || 30;
const AP_GAIN = Skills.ROUND_AP_GAIN || 10;
const SIDE_BONUS = 0.15;
const REAR_BONUS = 0.35;
const MAX_EVENTS = 40;
const MAX_PRESENTATIONS = 24;
const CORPSE_ROUNDS = 3;

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function whole(value, fallback = 0) { const n = Math.floor(Number(value)); return Number.isFinite(n) ? n : fallback; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function cell(value, fallback = { x: 0, y: 0 }) {
  const x = Number(value?.x); const y = Number(value?.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x: Math.trunc(x), y: Math.trunc(y) } : { ...fallback };
}
function facing(value, fallback = "right") { return ServerGame.canonicalBattleFacing(value, fallback); }
function maxHpForSave(save) {
  const level = Math.max(1, whole(save?.player?.level, 1));
  const gear = Expansion.equipmentStats(save?.expansion?.equipped || {});
  return Math.max(1, classMaxHp(save?.expansion?.classId, level) + Math.max(0, whole(gear?.maxHp, 0)));
}
function deploymentCells(battlefield, count) {
  const authored = Array.isArray(battlefield?.deploymentZones?.ally) ? battlefield.deploymentZones.ally : [];
  const result = authored.map((entry) => cell(entry));
  const fallback = [{ x: 1, y: 3 }, { x: 1, y: 2 }, { x: 1, y: 4 }];
  for (const candidate of fallback) {
    if (result.length >= count) break;
    if (!result.some((entry) => Tactics.cellKey(entry) === Tactics.cellKey(candidate))) result.push(candidate);
  }
  while (result.length < count) result.push({ x: 1, y: clamp(2 + result.length, 0, Math.max(0, whole(battlefield?.height, 7) - 1)) });
  return result.slice(0, count);
}
function memberUnit(battle, memberUid, save) {
  const member = battle.members?.[memberUid];
  const stats = ServerGame.serverHeroBattleStats(save);
  return {
    id: String(member?.battleUnitId || `party:${memberUid}`),
    uid: memberUid,
    side: "ally",
    team: "ally",
    type: "player",
    name: member?.name || save?.player?.name || "冒險者",
    classId: member?.classId || save?.expansion?.classId || "fighter",
    gender: member?.gender || save?.player?.gender || "male",
    level: Math.max(1, whole(member?.level, save?.player?.level || 1)),
    cell: cell(member?.cell),
    facing: facing(member?.facing, "right"),
    hp: Math.max(0, Number(member?.hp) || 0),
    maxHp: Math.max(1, Number(member?.maxHp) || maxHpForSave(save)),
    alive: member?.alive !== false && Number(member?.hp) > 0 && member?.retreated !== true && member?.disconnected !== true,
    deathRound: whole(member?.deathRound, 0) > 0 ? whole(member.deathRound, 0) : null,
    ap: clamp(whole(member?.ap, 0), 0, MAX_AP),
    statusEffects: clone(member?.statusEffects || {}),
    defenceDown: Math.max(0, Number(member?.defenceDown) || 0),
    defenceDownUntilRound: Math.max(0, whole(member?.defenceDownUntilRound, 0)),
    moveDown: Math.max(0, Number(member?.moveDown) || 0),
    moveDownUntilRound: Math.max(0, whole(member?.moveDownUntilRound, 0)),
    ...stats,
    maxHp: Math.max(1, Number(member?.maxHp) || maxHpForSave(save)),
  };
}
function enemyUnits(battle) { return (battle.enemies || []).map((enemy, index) => ServerGame.serverEnemyUnit(battle, enemy, index)); }
function activeMemberUids(battle) { return Party.activeBattleMemberUids(battle); }
function corpseVisible(unit, round) {
  const deathRound = whole(unit?.deathRound, 0);
  if (unit?.alive !== false || Number(unit?.hp) > 0 || deathRound <= 0) return false;
  return Math.max(1, whole(round, 1)) < deathRound + CORPSE_ROUNDS + 1;
}
function corpseBlockers(battle, saves = {}) {
  const blockers = [];
  for (const uid of battle.memberUids || []) {
    const member = battle.members?.[uid];
    if (!member || member.retreated || member.disconnected || !corpseVisible(member, battle.round)) continue;
    blockers.push({ id: `corpse:${member.battleUnitId || `party:${uid}`}`, side: "corpse", team: "corpse", type: "corpse", alive: true, hp: 1, maxHp: 1, cell: cell(member.cell), facing: member.facing || "down", weight: 9999, initiative: -9999, moveRange: 0 });
  }
  for (const enemy of battle.enemies || []) {
    if (!corpseVisible(enemy, battle.round)) continue;
    blockers.push({ id: `corpse:${enemy.id}`, side: "corpse", team: "corpse", type: "corpse", alive: true, hp: 1, maxHp: 1, cell: cell(enemy.cell), facing: enemy.facing || "left", weight: 9999, initiative: -9999, moveRange: 0 });
  }
  return blockers;
}
function allUnits(battle, saves) {
  const allies = activeMemberUids(battle).map((memberUid) => memberUnit(battle, memberUid, saves[memberUid])).filter(Boolean);
  const enemies = enemyUnits(battle).filter((enemy) => enemy.alive && enemy.hp > 0);
  return { allies, enemies, units: [...allies, ...enemies] };
}
function persistMember(battle, unit) {
  const member = battle.members?.[unit.uid];
  if (!member) return;
  member.hp = Math.max(0, Number(unit.hp) || 0);
  member.maxHp = Math.max(1, Number(unit.maxHp) || member.maxHp || 1);
  member.alive = unit.alive !== false && member.hp > 0;
  member.deathRound = whole(unit.deathRound, 0) > 0 ? whole(unit.deathRound, 0) : (whole(member.deathRound, 0) > 0 ? whole(member.deathRound, 0) : null);
  member.cell = cell(unit.cell);
  member.facing = facing(unit.facing, member.facing || "right");
  member.ap = clamp(whole(unit.ap, member.ap || 0), 0, MAX_AP);
  member.statusEffects = clone(unit.statusEffects || {});
  member.defenceDown = Math.max(0, Number(unit.defenceDown) || 0);
  member.defenceDownUntilRound = Math.max(0, whole(unit.defenceDownUntilRound, 0));
  member.moveDown = Math.max(0, Number(unit.moveDown) || 0);
  member.moveDownUntilRound = Math.max(0, whole(unit.moveDownUntilRound, 0));
}
function persistEnemy(battle, unit, index) {
  const enemy = battle.enemies?.[index];
  if (!enemy) return;
  enemy.hp = Math.max(0, Number(unit.hp) || 0);
  enemy.alive = unit.alive !== false && enemy.hp > 0;
  enemy.deathRound = whole(unit.deathRound, 0) > 0 ? whole(unit.deathRound, 0) : (whole(enemy.deathRound, 0) > 0 ? whole(enemy.deathRound, 0) : null);
  enemy.cell = cell(unit.cell);
  enemy.facing = facing(unit.facing, enemy.facing || "left");
  enemy.ap = clamp(whole(unit.ap, enemy.ap || 0), 0, MAX_AP);
  enemy.statusEffects = clone(unit.statusEffects || {});
  enemy.defenceDown = Math.max(0, Number(unit.defenceDown) || 0);
  enemy.defenceDownUntilRound = Math.max(0, whole(unit.defenceDownUntilRound, 0));
  enemy.moveDown = Math.max(0, Number(unit.moveDown) || 0);
  enemy.moveDownUntilRound = Math.max(0, whole(unit.moveDownUntilRound, 0));
}
function appendEvent(battle, event) {
  battle.eventSerial = Math.max(0, whole(battle.eventSerial, 0)) + 1;
  const authored = { serial: battle.eventSerial, ...event };
  // The rolling battle event log stays compact, but a resolving phase must
  // keep its complete ordered event list for presentation. Multi-hit/AoE
  // rounds can legitimately exceed MAX_EVENTS.
  if (Array.isArray(battle.__collectPresentationEvents)) battle.__collectPresentationEvents.push(clone(authored));
  battle.events = [...(Array.isArray(battle.events) ? battle.events : []), authored].slice(-MAX_EVENTS);
}
function appendPresentation(battle, presentation) {
  battle.presentationSerial = Math.max(0, whole(battle.presentationSerial, 0)) + 1;
  battle.presentations = [...(Array.isArray(battle.presentations) ? battle.presentations : []), {
    serial: battle.presentationSerial,
    ...(presentation && typeof presentation === "object" ? clone(presentation) : {}),
  }].slice(-MAX_PRESENTATIONS);
}
function phaseDurationMs(battle, fallback = Party.PHASE_MS) {
  const value = Number(battle?.phaseDurationMs);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : Math.max(0, Math.floor(Number(fallback) || 0));
}
function beginMovePhase(battle, nowMs, durationMs = phaseDurationMs(battle)) {
  battle.phase = "planning_move";
  battle.phaseEndsAtMs = durationMs > 0 ? nowMs + durationMs : 0;
  battle.movePlans = {};
  battle.actions = {};
  for (const memberUid of activeMemberUids(battle)) {
    const member = battle.members[memberUid];
    member.ap = Math.min(MAX_AP, Math.max(0, whole(member.ap, 0)) + AP_GAIN);
  }
  for (const enemy of battle.enemies || []) {
    if (enemy.alive !== false && Number(enemy.hp) > 0) enemy.ap = Math.min(MAX_AP, Math.max(0, whole(enemy.ap, 0)) + AP_GAIN);
  }
  return battle;
}
function createBattle({ id, party, saves, canonicalBattle, nowMs = Date.now(), phaseMs = Party.PHASE_MS, loading = true }) {
  const battleId = String(id || canonicalBattle?.id || "").trim();
  if (!battleId) throw new Error("party battle requires id");
  const memberUids = (party?.memberUids || []).filter((memberUid) => saves[memberUid]).slice(0, Party.MAX_MEMBERS);
  const battlefield = ServerGame.serverBattlefieldFor(canonicalBattle.mapId, canonicalBattle.monsterType);
  const spawns = deploymentCells(battlefield, memberUids.length);
  const members = {};
  memberUids.forEach((memberUid, index) => {
    const save = saves[memberUid];
    const meta = party.members?.[memberUid] || Party.memberFromSave(memberUid, save);
    const maxHp = maxHpForSave(save);
    members[memberUid] = {
      ...meta,
      hp: clamp(Number(save?.player?.hp) || 0, 0, maxHp),
      maxHp,
      ap: 0,
      alive: Number(save?.player?.hp) > 0,
      deathRound: null,
      retreated: false,
      disconnected: false,
      offlineSinceMs: 0,
      cell: spawns[index] || { x: 1, y: 3 },
      facing: "right",
      statusEffects: {},
      defenceDown: 0,
      defenceDownUntilRound: 0,
      moveDown: 0,
      moveDownUntilRound: 0,
    };
  });
  const battle = {
    id: battleId,
    partyId: party.id,
    leaderUid: party.leaderUid,
    memberUids,
    members,
    mapId: canonicalBattle.mapId,
    monsterType: canonicalBattle.monsterType,
    encounterId: canonicalBattle.encounterId || "",
    level: Math.max(1, whole(canonicalBattle.level, 1)),
    status: loading ? "loading" : "active",
    result: "",
    phase: loading ? "loading" : "planning_move",
    phaseDurationMs: Math.max(0, Math.floor(Number(phaseMs) || 0)),
    phaseEndsAtMs: 0,
    round: 1,
    readyUids: [],
    movePlans: {},
    actions: {},
    enemies: clone(canonicalBattle.enemies || []).map((enemy) => ({ ...enemy, deathRound: whole(enemy?.deathRound, 0) > 0 ? whole(enemy.deathRound, 0) : null })),
    eventSerial: 0,
    events: [],
    presentationSerial: 0,
    presentations: [],
    movementReplay: null,
    finishParticipantUids: [],
    finishReadyUids: [],
    finishReleased: false,
    exitReleased: false,
    finishedAtMs: 0,
    finishReleasedAtMs: 0,
    exitReleasedAtMs: 0,
    rewards: {},
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  };
  if (!loading) beginMovePhase(battle, nowMs, battle.phaseDurationMs);
  return battle;
}
function validateMoveSubmission(battle, memberUid, save, commands, requestedFacing) {
  if (battle.phase !== "planning_move") return { ok: false, reason: "phase" };
  const member = battle.members?.[memberUid];
  if (!member || member.retreated || member.disconnected || member.alive === false || Number(member.hp) <= 0) return { ok: false, reason: "inactive-member" };
  const battlefield = ServerGame.serverBattlefieldFor(battle.mapId, battle.monsterType);
  const grid = ServerGame.serverBattleGrid(battlefield);
  const hero = memberUnit(battle, memberUid, save);
  const cleaned = ServerGame.sanitizeServerMoveCommands(commands);
  if (cleaned.some((entry) => entry.type === "invalid" || (entry.type === "move" && (!Number.isFinite(entry.to?.x) || !Number.isFinite(entry.to?.y))))) return { ok: false, reason: "invalid-movement-command" };
  const schedule = Tactics.movementCommandEvents(hero.cell, cleaned, { turnCost: TURN_COST, initialFacing: hero.facing });
  if (!Number.isFinite(schedule.totalCost) || schedule.events.some((entry) => entry.type === "invalid")) return { ok: false, reason: "invalid-movement-path" };
  const disabled = FighterEffects.isDisabled(hero, battle.round, "move");
  const moveLimit = disabled ? 0 : Math.max(0, hero.moveRange - (FighterEffects.movementPenalty(hero, battle.round) || 0));
  if (schedule.totalCost > moveLimit + 1e-7) return { ok: false, reason: "movement-range" };
  const routeLimit = Math.max(0, moveLimit - Math.max(0, Number(hero.facingReserve) || 0));
  let spent = 0;
  for (const event of schedule.events) {
    spent += Math.max(0, Number(event.duration) || 0);
    if (event.type === "move" && spent > routeLimit + 1e-7) return { ok: false, reason: "movement-route-range" };
    if (event.type === "move" && (!Tactics.isInside(grid, event.to) || !Tactics.isWalkable(grid, event.to, corpseBlockers(battle, { [memberUid]: save })))) return { ok: false, reason: "movement-blocked" };
  }
  return { ok: true, commands: cleaned, finalFacing: facing(requestedFacing, schedule.finalTravelFacing || hero.facing), schedule };
}
function enemyMovePlans(battle, allies, enemies, grid) {
  const simulated = [...allies, ...enemies, ...corpseBlockers(battle)].map((unit) => ({ ...unit, cell: { ...unit.cell } }));
  const plans = [];
  const order = Tactics.buildTurnOrder(enemies.filter((enemy) => enemy.alive));
  for (const actual of order) {
    const enemy = simulated.find((unit) => unit.id === actual.id);
    const targets = simulated.filter((unit) => unit.side === "ally" && unit.alive && unit.hp > 0);
    if (!enemy || !targets.length) continue;
    enemy.moveRange = Math.max(0, enemy.moveRange - (FighterEffects.movementPenalty(actual, battle.round) || 0));
    if (FighterEffects.isDisabled(actual, battle.round, "move")) enemy.moveRange = 0;
    const action = MonsterAI.planEnemyAction({ grid, enemy, targets, units: simulated, skills: actual.skills, apGain: AP_GAIN, canDirectTarget: (unit) => FighterEffects.isDirectTargetable(unit, battle.round) });
    if (!action) continue;
    enemy.cell = { ...(action.previewCell || action.move || enemy.cell) };
    enemy.facing = action.facing || enemy.facing;
    plans.push({
      enemyId: actual.id,
      path: (action.path?.length ? action.path : [actual.cell]).map((entry) => cell(entry)),
      commands: Array.isArray(action.commands) ? action.commands.map((entry) => clone(entry)) : [],
      facing: facing(action.facing, actual.facing),
    });
  }
  return plans;
}
function resolveMovement(battle, saves, nowMs = Date.now()) {
  const next = clone(battle);
  if (next.phase !== "planning_move") return { ok: false, reason: "phase", battle: next };
  const battlefield = ServerGame.serverBattlefieldFor(next.mapId, next.monsterType);
  const grid = ServerGame.serverBattleGrid(battlefield);
  const { allies, enemies } = allUnits(next, saves);
  const routes = new Map();
  for (const ally of allies) {
    const submitted = next.movePlans?.[ally.uid] || { commands: [] };
    const validated = validateMoveSubmission(next, ally.uid, saves[ally.uid], submitted.commands || [], submitted.facing || ally.facing);
    const schedule = validated.ok ? validated.schedule : Tactics.movementCommandEvents(ally.cell, [], { turnCost: TURN_COST, initialFacing: ally.facing });
    routes.set(ally.id, { path: schedule.path, commands: validated.ok ? validated.commands : [], finalFacing: validated.ok ? validated.finalFacing : ally.facing });
  }
  const enemyPlans = enemyMovePlans(next, allies, enemies, grid);
  for (const plan of enemyPlans) routes.set(plan.enemyId, { path: plan.path, commands: plan.commands, finalFacing: plan.facing });
  const leaderUnitId = allies.find((unit) => String(unit.uid || "") === String(next.leaderUid || ""))?.id || `party:${next.leaderUid}`;
  const result = Tactics.resolveSimultaneousMovement({
    timed: true,
    grid,
    units: [...[...allies, ...enemies].filter((unit) => unit.alive), ...corpseBlockers(next, saves)],
    routes,
    turnCost: TURN_COST,
    priorityUnitId: leaderUnitId,
  });
  for (const ally of allies) {
    const outcome = result.unitResults?.[ally.id];
    if (!outcome) continue;
    ally.cell = cell(outcome.cell, ally.cell);
    ally.facing = facing(outcome.facing, ally.facing);
    persistMember(next, ally);
  }
  enemies.forEach((enemy, index) => {
    const outcome = result.unitResults?.[enemy.id];
    if (outcome) {
      enemy.cell = cell(outcome.cell, enemy.cell);
      enemy.facing = facing(outcome.facing, enemy.facing);
    }
    persistEnemy(next, enemy, index);
  });
  // Keep a compact authoritative movement replay on the battle snapshot.
  // Clients can animate exactly what the server resolved instead of snapping
  // every unit straight to its final Firestore cell.
  next.movementReplay = {
    id: `${next.round}:${nowMs}`,
    round: next.round,
    actors: [...(result.actors || [])],
    frameTimes: [...(result.frameTimes || [])],
    frames: (result.frames || []).map((frame) => clone(frame)),
    timeline: (result.timeline || []).map((frame) => ({
      time: Number(frame?.time) || 0,
      renderCells: clone(frame?.renderCells || {}),
      facings: clone(frame?.facings || {}),
    })),
    cancelled: [...(result.cancelled || [])],
    unitResults: clone(result.unitResults || {}),
  };
  appendPresentation(next, { type: "movement", round: next.round, movementReplay: next.movementReplay });
  next.phase = "planning_action";
  const actionPhaseMs = phaseDurationMs(next);
  next.phaseEndsAtMs = actionPhaseMs > 0 ? nowMs + actionPhaseMs : 0;
  next.actions = {};
  next.updatedAtMs = nowMs;
  return { ok: true, battle: next };
}
function playerSkillState(save) { return Skills.normalizeSkillState(save?.expansion?.skills, { classId: save?.expansion?.classId }); }
function targetAt(units, targetCell, team = null, actorUid = "") {
  const key = Tactics.cellKey(targetCell);
  const candidates = units.filter((unit) => unit.alive && unit.hp > 0 && Tactics.cellKey(unit.cell) === key);
  if (team === "enemy") return candidates.find((unit) => unit.side === "enemy") || null;
  if (team === "self") return candidates.find((unit) => unit.uid === actorUid) || null;
  if (team === "ally") return candidates.find((unit) => unit.side === "ally") || null;
  return candidates[0] || null;
}
function validatePlayerAction(battle, memberUid, save, rawAction) {
  if (battle.phase !== "planning_action") return { ok: false, reason: "phase" };
  const member = battle.members?.[memberUid];
  if (!member || member.retreated || member.disconnected || member.alive === false || Number(member.hp) <= 0) return { ok: false, reason: "inactive-member" };
  const action = rawAction && typeof rawAction === "object" ? rawAction : { type: "wait" };
  const type = String(action.type || action.heroAction || "wait");
  if (type === "wait") return { ok: true, action: { type: "wait" } };
  if (type === "potion") {
    if (whole(save?.player?.potions, 0) <= 0) return { ok: false, reason: "empty" };
    if (Number(member.hp) >= Number(member.maxHp)) return { ok: false, reason: "full" };
    return { ok: true, action: { type: "potion" } };
  }
  if (type !== "skill") return { ok: false, reason: "unsupported-battle-action" };
  const skillId = Skills.canonicalSkillId(String(action.skillId || ""));
  const skill = Skills.getSkill(skillId);
  const state = playerSkillState(save);
  if (!skill || !state.unlockedSkillIds.some((id) => Skills.canonicalSkillId(id) === skillId) || !state.equippedSkillIds.some((id) => Skills.canonicalSkillId(id) === skillId)) return { ok: false, reason: "skill-not-equipped" };
  if (Number(member.ap) < Number(skill.apCost || 0)) return { ok: false, reason: "ap" };
  const battlefield = ServerGame.serverBattlefieldFor(battle.mapId, battle.monsterType);
  const grid = ServerGame.serverBattleGrid(battlefield);
  // Target geometry is re-run at resolution with the complete party snapshot.
  // Submission validates only action shape/equipment/AP plus grid bounds.
  const targetCell = cell(action.targetCell, member.cell);
  if (!Tactics.isInside(grid, targetCell)) return { ok: false, reason: "target-outside-grid" };
  return { ok: true, action: { type: "skill", skillId, targetCell } };
}
function skillTargets(battle, actor, skill, targetCell, allies, enemies, grid) {
  const units = [...allies, ...enemies];
  const preferredTeam = skill.targeting?.team || (skill.tags?.includes("heal") ? "ally" : "enemy");
  const targetUnit = targetAt(units, targetCell, preferredTeam, actor.uid);
  const validation = Skills.validateSkillTarget(skill, actor.cell, targetCell, {
    grid,
    heightMap: grid.heightMap,
    facing: actor.facing,
    actorTeam: "ally",
    actorId: actor.id,
    targetUnit: targetUnit ? { ...targetUnit, team: targetUnit.side } : null,
    canDirectTarget: (unit) => FighterEffects.isDirectTargetable(unit, battle.round),
  });
  if (!validation.ok) return { ok: false, reason: `skill-${validation.reason || "target"}` };
  const pattern = Skills.patternCells(skill, actor.cell, targetCell, { grid, heightMap: grid.heightMap, facing: actor.facing });
  const keys = new Set(pattern.map((entry) => Tactics.cellKey(entry)));
  let affected = preferredTeam === "ally" || preferredTeam === "self"
    ? allies.filter((unit) => unit.alive && keys.has(Tactics.cellKey(unit.cell)))
    : enemies.filter((unit) => unit.alive && keys.has(Tactics.cellKey(unit.cell)));
  let attackPath = [];
  if (Tactics.usesAttackPath(skill.deliveryMode)) {
    attackPath = Tactics.facingOrthogonalPriority(actor.cell, targetCell, actor.facing);
    const trace = Tactics.traceAttackPath({ origin: actor.cell, target: targetCell, path: attackPath, facing: actor.facing, grid, units, actorId: actor.id, deliveryMode: skill.deliveryMode, blocksByTerrain: skill.blocksByTerrain, blocksByUnits: skill.blocksByUnits, arcHeight: skill.arcHeight, piercing: skill.piercing, maxPierce: skill.maxPierce, friendlyFire: Tactics.FRIENDLY_FIRE });
    if (trace.stoppedReason === "terrain") return { ok: false, reason: "skill-blocked-path" };
    // Route candidates must keep blockers from either team. Friendly-fire is
    // decided by the damage resolver; a friendly unit can still be the impact
    // that stops a non-piercing attack without taking damage.
    affected = trace.piercing
      ? (trace.candidateUnits || trace.impactedUnits || [])
      : (trace.actualTarget ? [trace.actualTarget] : []);
  }
  const ground = skill.targeting?.mode === "ground";
  if (!affected.length && !ground && preferredTeam === "enemy") return { ok: false, reason: "target" };
  if (!affected.length && (preferredTeam === "ally" || preferredTeam === "self")) affected = actor ? [actor] : [];
  return { ok: true, affected, attackPath, targetUnit };
}
function enemyActionPlans(battle, allies, enemies, grid) {
  const simulated = [...allies, ...enemies].map((unit) => ({ ...unit, cell: { ...unit.cell }, moveRange: 0 }));
  const plans = [];
  for (const actual of Tactics.buildTurnOrder(enemies.filter((enemy) => enemy.alive))) {
    const enemy = simulated.find((unit) => unit.id === actual.id);
    const targets = simulated.filter((unit) => unit.side === "ally" && unit.alive && unit.hp > 0);
    if (!enemy || !targets.length || FighterEffects.isDisabled(actual, battle.round)) continue;
    const action = MonsterAI.planEnemyAction({ grid, enemy, targets, units: simulated, skills: actual.skills, apGain: AP_GAIN, canDirectTarget: (unit) => FighterEffects.isDirectTargetable(unit, battle.round) });
    if (!action?.attackTargetId || !action.skill) continue;
    plans.push({ enemyId: actual.id, targetId: action.attackTargetId, skill: action.skill, apCost: action.skill.apCost || 0, speedGrade: action.skill.speedGrade || "C" });
  }
  return plans;
}
function resolveActions(battle, saves, nowMs = Date.now()) {
  const next = clone(battle);
  if (next.phase !== "planning_action") return { ok: false, reason: "phase", battle: next, saves };
  const actionRound = Math.max(1, whole(next.round, 1));
  next.__collectPresentationEvents = [];
  const nextSaves = Object.fromEntries(Object.entries(saves).map(([uid, save]) => [uid, clone(save)]));
  const battlefield = ServerGame.serverBattlefieldFor(next.mapId, next.monsterType);
  const grid = ServerGame.serverBattleGrid(battlefield);
  let { allies, enemies } = allUnits(next, nextSaves);
  const allyByUid = Object.fromEntries(allies.map((unit) => [unit.uid, unit]));
  const enemyPlans = enemyActionPlans(next, allies, enemies, grid);
  const queued = [];
  for (const ally of allies) {
    const raw = next.actions?.[ally.uid] || { type: "wait" };
    const type = String(raw.type || "wait");
    let skill = null;
    if (type === "skill") skill = Skills.getSkill(Skills.canonicalSkillId(String(raw.skillId || "")));
    queued.push({ actorId: ally.id, kind: "ally", uid: ally.uid, type, raw, skill, speedGrade: skill?.speedGrade || (type === "potion" ? "S" : "F"), initiative: ally.initiative || 0 });
  }
  for (const plan of enemyPlans) {
    const enemy = enemies.find((unit) => unit.id === plan.enemyId);
    if (enemy) queued.push({ actorId: enemy.id, kind: "enemy", plan, enemy, speedGrade: plan.speedGrade || enemy.speedGrade || "C", initiative: enemy.initiative || 0 });
  }
  const order = Skills.orderActionsBySpeed(queued);
  const guardByUid = new Map();
  const evasionByUid = new Map();
  const pendingByActorId = new Map();
  for (const entry of queued) {
    const skill = entry.kind === "ally" ? entry.skill : entry.plan?.skill;
    if (!skill) continue;
    pendingByActorId.set(entry.actorId, Tactics.createPendingAction({
      id: `round-${next.round}:${entry.actorId}`,
      actorId: entry.actorId,
      targetId: entry.kind === "enemy" ? entry.plan?.targetId : null,
      targetCell: entry.kind === "ally" ? entry.raw?.targetCell : null,
      skillId: skill.id,
      skillDurability: skill.durability,
      deliveryMode: skill.deliveryMode || "pathless",
      rangeMin: skill.range?.min,
      rangeMax: skill.range?.max,
      targetArc: skill.targetArc,
      blocksByTerrain: skill.blocksByTerrain,
      blocksByUnits: skill.blocksByUnits,
      arcHeight: skill.arcHeight,
      piercing: skill.piercing,
      maxPierce: skill.maxPierce,
    }));
  }

  function interrupted(actorId) {
    return Tactics.isPendingActionInterrupted?.(pendingByActorId.get(actorId)) === true;
  }

  function applyInterrupt(target, skill) {
    if (!target?.id || !skill?.interrupt) return;
    const pending = pendingByActorId.get(target.id);
    if (pending) Tactics.applyInterrupt(pending, skill.interrupt);
  }

  function appendInterrupted(actor) {
    if (!actor) return;
    appendEvent(next, {
      type: "status",
      actorId: actor.id,
      ...(actor.uid ? { actorUid: actor.uid } : {}),
      actorName: actor.name,
      targetId: actor.id,
      ...(actor.uid ? { targetUid: actor.uid } : {}),
      targetName: actor.name,
      actionType: "interrupted",
      text: `${actor.name} 的行動被中斷`,
    });
  }

  function skillHitCount(skill, damageEffect = null) {
    return Math.max(1, whole(skill?.hitResolution?.hit_count || damageEffect?.hits, 1));
  }

  function appendActionStart(entry, actor, target = null, skill = null) {
    if (!actor) return;
    const damageEffect = skill?.effects?.find?.((effect) => effect.type === "damage") || null;
    appendEvent(next, {
      type: "action",
      actorId: actor.id,
      ...(actor.uid ? { actorUid: actor.uid } : {}),
      actorName: actor.name,
      actorType: actor.type || (actor.side === "enemy" ? "monster" : "player"),
      actionType: entry?.type || (skill ? "skill" : "wait"),
      skillId: skill?.id || entry?.skill?.id || entry?.plan?.skill?.id || null,
      skillName: skill?.name || entry?.skill?.name || entry?.plan?.skill?.name || null,
      hitCount: skill ? skillHitCount(skill, damageEffect) : 1,
      ...(target?.id ? { targetId: target.id } : {}),
      ...(target?.uid ? { targetUid: target.uid } : {}),
      ...((target?.cell || entry?.raw?.targetCell || entry?.plan?.targetCell)
        ? { targetCell: cell(target?.cell || entry?.raw?.targetCell || entry?.plan?.targetCell) }
        : {}),
    });
  }

  function unitEvasion(target) {
    return Math.max(0, Number(target?.evasion) || 0)
      + (target?.uid ? (evasionByUid.get(target.uid) || 0) * 100 : 0)
      + (FighterEffects.statusEvasion(target, next.round, target?.passives || {}) || 0) * 100;
  }

  function markDefeat(unit) {
    if (!unit) return;
    unit.alive = Number(unit.hp) > 0;
    if (!unit.alive && !(whole(unit.deathRound, 0) > 0)) unit.deathRound = next.round;
  }

  function appendMiss(actor, target, skill, hitIndex, hitCount) {
    appendEvent(next, {
      type: "miss",
      actorId: actor.id,
      ...(actor.uid ? { actorUid: actor.uid } : {}),
      actorName: actor.name,
      targetId: target?.id || null,
      ...(target?.uid ? { targetUid: target.uid } : {}),
      targetName: target?.name || "目標",
      ...(target?.cell ? { targetCell: cell(target.cell) } : {}),
      actionType: "skill",
      skillId: skill?.id || null,
      skillName: skill?.name || null,
      hit: hitIndex + 1,
      hits: hitCount,
      text: `${actor.name} 用 ${skill?.name || "攻擊"} 攻擊 ${target?.name || "目標"}，但失手`,
    });
  }

  function appendDamage(actor, target, skill, amount, hitIndex, hitCount, extra = {}) {
    appendEvent(next, {
      type: "damage",
      actorId: actor.id,
      ...(actor.uid ? { actorUid: actor.uid } : {}),
      actorName: actor.name,
      targetId: target.id,
      ...(target.uid ? { targetUid: target.uid } : {}),
      targetName: target.name,
      targetCell: cell(target.cell),
      amount: Math.max(0, whole(amount, 0)),
      actionType: "skill",
      skillId: skill?.id || null,
      skillName: skill?.name || null,
      hit: hitIndex + 1,
      hits: hitCount,
      defeated: target.alive === false,
      ...extra,
      text: `${actor.name} 用 ${skill?.name || "攻擊"} 對 ${target.name} 造成 ${Math.max(0, whole(amount, 0))} 傷害`,
    });
  }

  function applySecondaryEffectEvents(actor, skill, result, actionType = "skill") {
    if (!result) return;
    for (const change of result.hpChanges || []) {
      const target = [...allies, ...enemies].find((unit) => String(unit.id) === String(change.unitId));
      if (!target) continue;
      markDefeat(target);
      if (Number(change.amount) < 0) {
        appendEvent(next, {
          type: "damage",
          actorId: actor.id,
          ...(actor.uid ? { actorUid: actor.uid } : {}),
          actorName: actor.name,
          targetId: target.id,
          ...(target.uid ? { targetUid: target.uid } : {}),
          targetName: target.name,
          targetCell: cell(target.cell),
          amount: Math.abs(whole(change.amount, 0)),
          actionType,
          skillId: skill?.id || null,
          skillName: skill?.name || null,
          hit: 1,
          hits: 1,
          defeated: target.alive === false,
          text: `${skill?.name || actor.name}令${target.name}損失 ${Math.abs(whole(change.amount, 0))} HP`,
        });
      } else if (Number(change.amount) > 0) {
        appendEvent(next, {
          type: "heal",
          actorId: actor.id,
          ...(actor.uid ? { actorUid: actor.uid } : {}),
          actorName: actor.name,
          targetId: target.id,
          ...(target.uid ? { targetUid: target.uid } : {}),
          targetName: target.name,
          amount: whole(change.amount, 0),
          actionType,
          skillId: skill?.id || null,
          skillName: skill?.name || null,
          text: `${actor.name} 對 ${target.name} 恢復 ${whole(change.amount, 0)} HP`,
        });
      }
    }
    for (const moved of result.moved || []) {
      const target = [...allies, ...enemies].find((unit) => String(unit.id) === String(moved.unitId));
      if (!target) continue;
      appendEvent(next, {
        type: "move_effect",
        actorId: actor.id,
        ...(actor.uid ? { actorUid: actor.uid } : {}),
        actorName: actor.name,
        targetId: target.id,
        ...(target.uid ? { targetUid: target.uid } : {}),
        targetName: target.name,
        targetCell: cell(moved.to, target.cell),
        fromCell: cell(moved.from, target.cell),
        actionType,
        skillId: skill?.id || null,
        skillName: skill?.name || null,
      });
    }
    for (const event of result.events || []) {
      if ((result.hpChanges || []).some((change) => String(change.unitId) === String(event.unitId) && Number(change.amount) === Number(event.amount))) continue;
      const target = [...allies, ...enemies].find((unit) => String(unit.id) === String(event.unitId));
      appendEvent(next, {
        type: "status",
        actorId: actor.id,
        ...(actor.uid ? { actorUid: actor.uid } : {}),
        actorName: actor.name,
        ...(target?.id ? { targetId: target.id } : {}),
        ...(target?.uid ? { targetUid: target.uid } : {}),
        targetName: target?.name || "",
        actionType,
        skillId: skill?.id || null,
        skillName: skill?.name || null,
        text: target?.name ? `${target.name}：${event.text}` : String(event.text || ""),
      });
    }
  }

  function appendStatusTickEvents(unit, result) {
    if (!unit || !result) return;
    markDefeat(unit);
    for (const change of result.hpChanges || []) {
      const amount = whole(change.amount, 0);
      if (amount < 0) {
        appendEvent(next, {
          type: "damage",
          actorId: unit.id,
          ...(unit.uid ? { actorUid: unit.uid } : {}),
          actorName: unit.name,
          targetId: unit.id,
          ...(unit.uid ? { targetUid: unit.uid } : {}),
          targetName: unit.name,
          targetCell: cell(unit.cell),
          amount: Math.abs(amount),
          appliedAmount: Math.abs(amount),
          actionType: "status",
          skillId: null,
          hit: 1,
          hits: 1,
          defeated: unit.alive === false,
          text: `${unit.name} 因狀態效果損失 ${Math.abs(amount)} HP`,
        });
      } else if (amount > 0) {
        appendEvent(next, {
          type: "heal",
          actorId: unit.id,
          ...(unit.uid ? { actorUid: unit.uid } : {}),
          actorName: unit.name,
          targetId: unit.id,
          ...(unit.uid ? { targetUid: unit.uid } : {}),
          targetName: unit.name,
          amount,
          actionType: "status",
          skillId: null,
          text: `${unit.name} 因狀態效果恢復 ${amount} HP`,
        });
      }
    }
    for (const event of result.events || []) {
      if ((result.hpChanges || []).some((change) => String(change.unitId) === String(event.unitId) && Number(change.amount) === Number(event.amount))) continue;
      appendEvent(next, {
        type: "status",
        actorId: unit.id,
        ...(unit.uid ? { actorUid: unit.uid } : {}),
        actorName: unit.name,
        targetId: unit.id,
        ...(unit.uid ? { targetUid: unit.uid } : {}),
        targetName: unit.name,
        actionType: "status",
        skillId: null,
        text: `${unit.name}：${String(event.text || "")}`,
      });
    }
  }

  function resolveAllyDamage(actor, skill, targetResult, damageEffect, pierceEffect) {
    const hitCount = skillHitCount(skill, damageEffect);
    const routed = Tactics.usesAttackPath(skill.deliveryMode);
    const recheck = Boolean(skill.hitResolution?.recheck_attack_path_each_hit || skill.hitResolution?.hit_judgement_mode === "each_hit");
    const authoredMultiplier = Math.max(0, Number(Skills.calculateSkillDamageMultiplier(skill)) || 0);
    const rng = ServerGame.deterministicBattleRng(next, next.round, `ally:${actor.uid}:${skill.id}`);
    const totalDamageByTarget = new Map();
    const executedTargets = new Set();
    const combatUnits = () => [...allies, ...enemies].filter((unit) => unit.alive && unit.hp > 0);
    const traceNow = () => Tactics.traceAttackPath({
      origin: actor.cell,
      target: targetResult.targetCell || targetResult.targetUnit?.cell || actor.cell,
      path: targetResult.attackPath,
      facing: actor.facing,
      grid,
      units: combatUnits(),
      actorId: actor.id,
      deliveryMode: skill.deliveryMode,
      blocksByTerrain: skill.blocksByTerrain,
      blocksByUnits: skill.blocksByUnits,
      arcHeight: skill.arcHeight,
      piercing: skill.piercing,
      maxPierce: skill.maxPierce,
      friendlyFire: Tactics.FRIENDLY_FIRE,
    });
    const initialTrace = routed ? traceNow() : null;
    const initialTargets = routed
      ? (initialTrace?.candidateUnits || (initialTrace?.actualTarget ? [initialTrace.actualTarget] : []))
      : targetResult.affected.filter((unit) => unit.alive && unit.hp > 0);

    function splitFor(target, attackPath) {
      let split = totalDamageByTarget.get(target.id);
      if (split) return split;
      const existingDebuff = target.defenceDownUntilRound >= next.round ? target.defenceDown || 0 : 0;
      const defence = Math.max(0, (Number(target.defence) || 0) * (1 - existingDebuff) * (1 - (Number(pierceEffect?.amount) || 0)));
      const positional = Tactics.positionalAttack(actor, target, {
        attackPath: attackPath || targetResult.attackPath,
        facing: actor.facing,
        side: 1 + SIDE_BONUS,
        rear: 1 + REAR_BONUS,
      });
      const critical = skill.area?.shape === "single" && rng() < Math.max(0, Number(actor.critChance) || 0);
      const totalDamage = Tactics.calculateDamage(actor, target, {
        defence,
        multiplier: authoredMultiplier * positional.multiplier,
        critical,
        minimum: Tactics.MIN_DIRECT_DAMAGE,
      });
      split = Skills.splitDamageLaterHits(totalDamage, hitCount);
      totalDamageByTarget.set(target.id, split);
      return split;
    }

    for (let hitIndex = 0; hitIndex < hitCount; hitIndex += 1) {
      const trace = routed ? (recheck ? traceNow() : initialTrace) : null;
      const candidates = routed
        ? (recheck ? (trace?.candidateUnits || (trace?.actualTarget ? [trace.actualTarget] : [])) : initialTargets)
        : initialTargets;
      let performed = false;
      for (const candidate of candidates) {
        const target = [...allies, ...enemies].find((unit) => String(unit.id) === String(candidate?.id)) || candidate;
        if (!target?.alive || Number(target.hp) <= 0) continue;
        performed = true;
        const hitRoll = Tactics.rollHit({
          accuracy: actor.accuracy,
          accuracyMultiplier: skill.accuracyMultiplier ?? 1,
          evasion: unitEvasion(target),
          accuracyPenalties: [(FighterEffects.accuracyPenalty(actor, next.round) || 0) * 100],
        }, rng);
        if (!hitRoll.hit) {
          appendMiss(actor, target, skill, hitIndex, hitCount);
          continue;
        }
        if (Tactics.FRIENDLY_FIRE || target.side !== actor.side) {
          const split = splitFor(target, trace?.path || targetResult.attackPath);
          const requested = Math.max(0, whole(split[hitIndex], 0));
          const applied = Math.min(Math.max(0, whole(target.hp, 0)), requested);
          target.hp = Math.max(0, Number(target.hp) - requested);
          markDefeat(target);
          executedTargets.add(target);
          appendDamage(actor, target, skill, requested, hitIndex, hitCount, { appliedAmount: applied });
          applyInterrupt(target, skill);
        }
        // A successful unit is still the impact point for a normal routed
        // delivery even when friendly-fire damage is disabled.
        if (!skill.piercing) break;
      }
      if (!performed && routed) break;
    }
    return [...executedTargets];
  }

  function executeAlly(entry) {
    const actor = allyByUid[entry.uid];
    if (!actor?.alive || actor.hp <= 0 || FighterEffects.isDisabled(actor, next.round)) return;
    if (interrupted(actor.id)) { appendInterrupted(actor); return; }
    const save = nextSaves[entry.uid];
    if (entry.type === "potion") {
      if (whole(save?.player?.potions, 0) <= 0 || actor.hp >= actor.maxHp) return;
      appendActionStart(entry, actor, actor, null);
      save.player.potions = Math.max(0, whole(save.player.potions, 0) - 1);
      const healed = Math.min(150, actor.maxHp - actor.hp);
      actor.hp += healed;
      appendEvent(next, { type: "heal", actorId: actor.id, actorUid: actor.uid, actorName: actor.name, targetId: actor.id, targetUid: actor.uid, targetName: actor.name, amount: healed, actionType: "potion", skillId: null, text: `${actor.name} 使用藥水恢復 ${healed} HP` });
      return;
    }
    if (entry.type !== "skill" || !entry.skill) return;
    const state = playerSkillState(save);
    const skillId = Skills.canonicalSkillId(entry.skill.id);
    if (!state.equippedSkillIds.some((id) => Skills.canonicalSkillId(id) === skillId) || actor.ap < (entry.skill.apCost || 0)) return;
    const targetResult = skillTargets(next, actor, entry.skill, cell(entry.raw.targetCell, actor.cell), allies, enemies, grid);
    if (!targetResult.ok) return;
    targetResult.targetCell = cell(entry.raw.targetCell, actor.cell);
    const declaredTarget = targetResult.targetUnit || targetResult.affected?.[0] || actor;
    appendActionStart(entry, actor, declaredTarget, entry.skill);
    actor.ap = Math.max(0, actor.ap - (entry.skill.apCost || 0));
    const effects = entry.skill.effects || [];
    for (const effect of effects) {
      if (effect.type === "guard") guardByUid.set(actor.uid, Math.max(guardByUid.get(actor.uid) || 0, Number(effect.amount) || 0));
      if (effect.type === "evasion") evasionByUid.set(actor.uid, Math.max(evasionByUid.get(actor.uid) || 0, Number(effect.amount) || 0));
    }
    const heals = effects.filter((effect) => effect.type === "heal");
    if (heals.length) {
      for (const target of targetResult.affected.filter((unit) => unit.side === "ally")) {
        const amount = heals.reduce((sum, effect) => sum + Math.max(0, whole(effect.flat, 0)) + Math.floor(target.maxHp * Math.max(0, Number(effect.maxHpRatio) || 0)), 0);
        const healed = Math.min(amount, target.maxHp - target.hp);
        target.hp += healed;
        target.alive = target.hp > 0;
        if (healed > 0) appendEvent(next, { type: "heal", actorId: actor.id, actorUid: actor.uid, actorName: actor.name, targetId: target.id, targetUid: target.uid, targetName: target.name, amount: healed, actionType: "skill", skillId: entry.skill.id, skillName: entry.skill.name, text: `${actor.name} 對 ${target.name} 恢復 ${healed} HP` });
      }
    }
    const damageEffect = effects.find((effect) => effect.type === "damage");
    const pierceEffect = effects.find((effect) => effect.type === "armor_pierce");
    const executedTargets = damageEffect ? resolveAllyDamage(actor, entry.skill, targetResult, damageEffect, pierceEffect) : [];
    const defenceDown = effects.find((effect) => effect.type === "defense_down");
    const moveDown = effects.find((effect) => effect.type === "move_down");
    for (const target of targetResult.affected) {
      if (!target.alive) continue;
      if (defenceDown) { target.defenceDown = Math.max(target.defenceDown || 0, Number(defenceDown.amount) || 0); target.defenceDownUntilRound = next.round + Math.max(1, whole(defenceDown.duration, 1)); }
      if (moveDown) { target.moveDown = Math.max(target.moveDown || 0, Number(moveDown.amount) || 0); target.moveDownUntilRound = next.round + Math.max(1, whole(moveDown.duration, 1)); }
    }
    const handled = new Set(["damage", "heal", "guard", "move_up", "evasion", "defense_down", "move_down", "armor_pierce"]);
    const extra = effects.filter((effect) => !handled.has(effect.type));
    if (extra.length) {
      const effectTargets = damageEffect ? executedTargets.filter((unit) => unit.alive) : targetResult.affected;
      const result = FighterEffects.applySkillEffects({
        skill: { ...entry.skill, effects: extra },
        caster: actor,
        targets: effectTargets,
        units: [...allies, ...enemies],
        grid,
        round: next.round,
        random: ServerGame.deterministicBattleRng(next, next.round, `effect:${actor.uid}:${entry.skill.id}`),
      });
      applySecondaryEffectEvents(actor, entry.skill, result);
    }
  }

  function executeEnemy(entry) {
    const enemy = enemies.find((unit) => unit.id === entry.enemy.id);
    const target = allies.find((unit) => unit.id === entry.plan.targetId);
    if (!enemy?.alive || !target?.alive || target.hp <= 0 || FighterEffects.isDisabled(enemy, next.round)) return;
    if (interrupted(enemy.id)) { appendInterrupted(enemy); return; }
    const skill = entry.plan.skill;
    const apCost = entry.plan.apCost || skill?.apCost || 0;
    if (!skill || enemy.ap < apCost) return;
    const valid = MonsterAI.validateSkillFrom(skill, enemy, enemy.cell, enemy.facing, target, grid, [...allies, ...enemies], { canDirectTarget: (unit) => FighterEffects.isDirectTargetable(unit, next.round) });
    if (!valid) return;
    const targetCells = Skills.patternCells(skill, enemy.cell, target.cell, { grid, heightMap: grid.heightMap, facing: enemy.facing });
    if (!targetCells.some((entryCell) => Tactics.cellKey(entryCell) === Tactics.cellKey(target.cell))) return;
    appendActionStart({ ...entry, type: "skill" }, enemy, target, skill);
    enemy.ap = Math.max(0, enemy.ap - apCost);
    const rng = ServerGame.deterministicBattleRng(next, next.round, `enemy:${enemy.id}:${target.uid}:${skill.id}`);
    const hitCount = skillHitCount(skill, skill.effects?.find?.((effect) => effect.type === "damage"));
    const positionalPath = Tactics.facingOrthogonalPriority(enemy.cell, target.cell, enemy.facing);
    const positional = Tactics.positionalAttack(enemy, target, { attackPath: positionalPath, facing: enemy.facing, side: 1 + SIDE_BONUS, rear: 1 + REAR_BONUS });
    const guard = guardByUid.get(target.uid) || 0;
    let totalDamage = Tactics.calculateDamage(enemy, target, { multiplier: (skill.damageModel?.scale || Skills.calculateSkillDamageMultiplier(skill) || 1) * positional.multiplier, guarded: guard > 0, guardMultiplier: 1 - guard, minimum: Tactics.MIN_DIRECT_DAMAGE });
    totalDamage = Math.max(1, Math.round(whole(totalDamage, 1) * (FighterEffects.damageMultiplier(target, next.round) ?? 1)));
    const split = Skills.splitDamageLaterHits(totalDamage, hitCount);
    for (let hitIndex = 0; hitIndex < hitCount && enemy.alive && target.alive && target.hp > 0; hitIndex += 1) {
      const hit = Tactics.rollHit({
        accuracy: enemy.accuracy,
        accuracyMultiplier: skill.accuracyMultiplier ?? 1,
        evasion: unitEvasion(target),
        accuracyPenalties: [(FighterEffects.accuracyPenalty(enemy, next.round) || 0) * 100],
      }, rng);
      if (!hit.hit) {
        appendMiss(enemy, target, skill, hitIndex, hitCount);
        continue;
      }
      let damage = Math.max(0, whole(split[hitIndex], 0));
      const counter = FighterEffects.resolveCounter({ defender: target, attacker: enemy, damage, isProjectile: skill.isProjectile === true, round: next.round });
      damage = Math.max(0, whole(counter.damage, 0));
      const appliedDamage = Math.min(Math.max(0, whole(target.hp, 0)), damage);
      target.hp = Math.max(0, target.hp - damage);
      markDefeat(target);
      markDefeat(enemy);
      appendDamage(enemy, target, skill, damage, hitIndex, hitCount, { appliedAmount: appliedDamage });
      applyInterrupt(target, skill);
      if (counter.reflectedDamage > 0) {
        appendEvent(next, {
          type: "damage",
          actorId: target.id,
          ...(target.uid ? { actorUid: target.uid } : {}),
          actorName: target.name,
          targetId: enemy.id,
          targetName: enemy.name,
          targetCell: cell(enemy.cell),
          amount: Math.max(0, whole(counter.reflectedDamage, 0)),
          actionType: "counter",
          skillId: null,
          hit: hitIndex + 1,
          hits: hitCount,
          defeated: enemy.alive === false,
          text: `${target.name} 反擊 ${enemy.name}，造成 ${Math.max(0, whole(counter.reflectedDamage, 0))} 傷害`,
        });
      }
    }
    if (target.alive && skill.effects?.length) {
      const extra = skill.effects.filter((effect) => !["damage", "armor_pierce"].includes(effect.type));
      if (extra.length) {
        const result = FighterEffects.applySkillEffects({ skill: { ...skill, effects: extra }, caster: enemy, targets: [target], units: [...allies, ...enemies], grid, round: next.round, random: rng });
        applySecondaryEffectEvents(enemy, skill, result);
      }
    }
  }

  for (const ordered of order) {
    const original = queued.find((entry) => entry.actorId === ordered.actorId);
    if (!original) continue;
    if (original.kind === "ally") executeAlly(original);
    else executeEnemy(original);
  }

  for (const ally of allies) {
    persistMember(next, ally);
    const save = nextSaves[ally.uid];
    if (save?.player) save.player.hp = Math.max(0, Math.min(ally.maxHp, whole(ally.hp, 0)));
  }
  enemies.forEach((enemy, index) => persistEnemy(next, enemy, index));

  function finishFromCurrentState() {
    const living = next.enemies.filter((enemy) => enemy.alive !== false && Number(enemy.hp) > 0);
    const active = activeMemberUids(next);
    if (!living.length) {
      next.status = "finished";
      next.result = "victory";
      next.phase = "finished";
      next.phaseEndsAtMs = 0;
      return true;
    }
    if (!active.length) {
      const anyoneDead = next.memberUids.some((memberUid) => next.members?.[memberUid] && next.members[memberUid].retreated !== true && Number(next.members[memberUid].hp) <= 0);
      next.status = "finished";
      next.result = anyoneDead ? "defeat" : "retreat";
      next.phase = "finished";
      next.phaseEndsAtMs = 0;
      return true;
    }
    return false;
  }

  if (!finishFromCurrentState()) {
    next.round += 1;
    for (const memberUid of activeMemberUids(next)) {
      const unit = memberUnit(next, memberUid, nextSaves[memberUid]);
      const tick = FighterEffects.tickStatuses(unit, next.round, unit.passives || {});
      appendStatusTickEvents(unit, tick);
      persistMember(next, unit);
      const save = nextSaves[memberUid];
      if (save?.player) save.player.hp = Math.max(0, Math.min(unit.maxHp, whole(unit.hp, 0)));
    }
    const refreshedEnemies = enemyUnits(next);
    refreshedEnemies.forEach((enemy, index) => {
      const tick = FighterEffects.tickStatuses(enemy, next.round, {});
      appendStatusTickEvents(enemy, tick);
      persistEnemy(next, enemy, index);
    });
    if (!finishFromCurrentState()) beginMovePhase(next, nowMs);
  }
  const actionEvents = Array.isArray(next.__collectPresentationEvents) ? next.__collectPresentationEvents : [];
  delete next.__collectPresentationEvents;
  appendPresentation(next, { type: "action", round: actionRound, events: actionEvents });
  if (next.status === "finished") {
    next.finishParticipantUids = (next.memberUids || []).filter((memberUid) => {
      const member = next.members?.[memberUid];
      return member && member.retreated !== true && member.disconnected !== true;
    });
    next.finishReadyUids = [];
    next.finishReleased = next.solo === true;
    next.exitReleased = next.solo === true;
    next.finishedAtMs = nowMs;
    next.finishReleasedAtMs = 0;
    next.exitReleasedAtMs = 0;
    appendPresentation(next, { type: "result", round: actionRound, result: next.result || "" });
  }
  next.updatedAtMs = nowMs;
  return { ok: true, battle: next, saves: nextSaves };
}
function grantVictoryRewards(battle, saves) {
  const nextBattle = clone(battle);
  const nextSaves = Object.fromEntries(Object.entries(saves).map(([uid, save]) => [uid, clone(save)]));
  const blueprint = MonsterBlueprints.monsterBlueprint(nextBattle.monsterType);
  const encounterCount = (nextBattle.enemies || []).length || 1;
  const rewardLevel = Math.max(nextBattle.level || blueprint?.baseLevel || 1, ...(nextBattle.enemies || []).map((enemy) => enemy.level || 1));
  const rewards = {};
  for (const memberUid of nextBattle.memberUids || []) {
    const member = nextBattle.members?.[memberUid];
    const save = nextSaves[memberUid];
    if (!member || !save || member.retreated || member.disconnected || !member.alive || Number(member.hp) <= 0) continue;
    const earnedXp = MonsterBlueprints.battleXpReward(rewardLevel, save.player.level, encounterCount, blueprint?.rewards?.baseXp ?? 100);
    const earnedCoins = (nextBattle.enemies || []).reduce((sum) => sum + Math.max(0, whole(blueprint?.rewards?.coins, 0)), 0);
    const beforeLevel = Math.max(1, whole(save.player.level, 1));
    const beforeXp = Math.max(0, whole(save.player.xp, 0));
    const xp = Expansion.grantExperience(beforeLevel, beforeXp, earnedXp);
    save.player.level = xp.level;
    save.player.xp = xp.xp;
    const newMaxHp = maxHpForSave(save);
    save.player.hp = xp.levelsGained > 0 ? newMaxHp : clamp(whole(member.hp, 1), 1, newMaxHp);
    save.player.coins = clamp(whole(save.player.coins, 0) + earnedCoins, 0, 99999);
    const questProgress = ServerGame.recordServerKill(save, nextBattle.monsterType, nextBattle.encounterId || nextBattle.id);
    for (let index = 1; index < encounterCount; index += 1) ServerGame.recordServerKill(save, nextBattle.monsterType, `${nextBattle.encounterId || nextBattle.id}:pack-${index + 1}`);
    rewards[memberUid] = {
      earnedXp,
      coins: earnedCoins,
      beforeLevel,
      beforeXp,
      afterLevel: xp.level,
      afterXp: xp.xp,
      levelsGained: xp.levelsGained,
      questProgress: questProgress ? { changed: questProgress.changed === true, reason: questProgress.reason || null } : null,
    };
  }
  nextBattle.rewards = rewards;
  return { battle: nextBattle, saves: nextSaves, rewards };
}
function retreatChance(battle, memberUid) {
  const member = battle.members?.[memberUid];
  if (!member) return 0;
  const enemies = (battle.enemies || []).filter((enemy) => enemy.alive !== false && Number(enemy.hp) > 0).map((enemy) => ({ level: Math.max(1, whole(enemy.level, battle.level || 1)) }));
  return MonsterBlueprints.retreatChance(Math.max(1, whole(member.level, 1)), enemies);
}

module.exports = Object.freeze({
  TURN_COST,
  AP_GAIN,
  createBattle,
  beginMovePhase,
  phaseDurationMs,
  validateMoveSubmission,
  validatePlayerAction,
  resolveMovement,
  resolveActions,
  grantVictoryRewards,
  retreatChance,
  activeMemberUids,
  corpseVisible,
  corpseBlockers,
  maxHpForSave,
});
