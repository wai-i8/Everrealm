"use strict";

const { reviveResult } = require("./game-rules");

const MAX_MEMBERS = 3;
const PHASE_MS = 30000;
const DISCONNECT_GRACE_MS = 15000;

function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function safeUid(value) { return String(value || "").trim(); }
function safeName(value) { return String(value || "冒險者").trim().slice(0, 24) || "冒險者"; }
function whole(value, fallback = 0) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : fallback;
}
function memberFromSave(uid, save) {
  const memberUid = safeUid(uid);
  if (!memberUid) return null;
  return {
    uid: memberUid,
    name: safeName(save?.player?.name),
    classId: String(save?.expansion?.classId || "fighter"),
    gender: String(save?.player?.gender || "male") === "female" ? "female" : "male",
    level: Math.max(1, whole(save?.player?.level, 1)),
  };
}
function chooseLeader(memberUids, preferred = "") {
  const list = Array.isArray(memberUids) ? memberUids.map(safeUid).filter(Boolean) : [];
  const wanted = safeUid(preferred);
  if (wanted && list.includes(wanted)) return wanted;
  return list[0] || "";
}
function removeMember(party, targetUid) {
  const source = clone(party) || {};
  const target = safeUid(targetUid);
  const memberUids = (Array.isArray(source.memberUids) ? source.memberUids : []).map(safeUid).filter((entry) => entry && entry !== target);
  const members = { ...(source.members || {}) };
  delete members[target];
  return {
    ...source,
    memberUids,
    members,
    leaderUid: chooseLeader(memberUids, source.leaderUid === target ? "" : source.leaderUid),
  };
}
function partyHasCapacity(party) {
  return (Array.isArray(party?.memberUids) ? party.memberUids.length : 0) < MAX_MEMBERS;
}
function applyForcedWildernessDeath(save) {
  const state = clone(save) || {};
  state.player = { ...(state.player || {}), hp: 0 };
  const result = reviveResult(state, { returnToTown: false });
  if (!result.ok) return { ok: false, reason: result.reason, state };
  state.player.hp = result.player.hp;
  state.player.level = result.player.level;
  state.player.xp = result.player.xp;
  return {
    ok: true,
    state,
    penalty: result.penalty,
    deducted: result.deducted,
    levelsLost: result.levelsLost,
  };
}
function allReady(memberUids, readyUids) {
  const ready = new Set((Array.isArray(readyUids) ? readyUids : []).map(safeUid));
  return (Array.isArray(memberUids) ? memberUids : []).map(safeUid).filter(Boolean).every((entry) => ready.has(entry));
}
function activeBattleMemberUids(battle) {
  return (Array.isArray(battle?.memberUids) ? battle.memberUids : []).map(safeUid).filter((memberUid) => {
    const member = battle?.members?.[memberUid];
    return member && member.alive !== false && Number(member.hp) > 0 && member.retreated !== true && member.disconnected !== true;
  });
}
function allActiveSubmitted(battle, collectionName) {
  const submitted = battle?.[collectionName] && typeof battle[collectionName] === "object" ? battle[collectionName] : {};
  return activeBattleMemberUids(battle).every((memberUid) => submitted[memberUid]);
}

module.exports = Object.freeze({
  MAX_MEMBERS,
  PHASE_MS,
  DISCONNECT_GRACE_MS,
  safeUid,
  safeName,
  memberFromSave,
  chooseLeader,
  removeMember,
  partyHasCapacity,
  applyForcedWildernessDeath,
  allReady,
  activeBattleMemberUids,
  allActiveSubmitted,
});
