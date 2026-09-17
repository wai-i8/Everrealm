(function (root, factory) {
  const questData = root.EverrealmQuestData
    || (typeof require === "function" ? require("./data/quests.js") : null);
  const api = factory(questData);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternGuildCommission = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (questData) {
  "use strict";

  const COMMISSION_STARS = Object.freeze([1, 2, 3, 5, 7]);
  const COMMISSION_TYPES = Object.freeze(["hunt", "delivery", "wish"]);
  const MAX_COUNTED_DEFEATS = 128;

  function freeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) freeze(child);
    return Object.freeze(value);
  }

  const DEFAULT_COMMISSIONS = freeze([...(questData?.GUILD_COMMISSIONS || [])]);

  function wholeNumber(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(number)));
  }

  function validStar(value) {
    const star = Math.trunc(Number(value));
    return COMMISSION_STARS.includes(star) ? star : null;
  }

  function cloneCommission(commission) {
    if (!commission) return null;
    return {
      ...commission,
      objective: { ...(commission.objective || {}) },
      reward: { ...(commission.reward || {}) },
    };
  }

  function normalizeCatalog(catalog = DEFAULT_COMMISSIONS) {
    const source = Array.isArray(catalog) ? catalog : [];
    const seen = new Set();
    const result = [];
    for (const raw of source) {
      if (!raw || typeof raw !== "object") continue;
      const id = String(raw.id || "").trim();
      const star = validStar(raw.star);
      const type = String(raw.type || "").trim();
      if (!id || seen.has(id) || !star || !COMMISSION_TYPES.includes(type)) continue;
      const objective = raw.objective && typeof raw.objective === "object" ? raw.objective : {};
      const reward = raw.reward && typeof raw.reward === "object" ? raw.reward : {};
      const count = wholeNumber(objective.count, type === "delivery" ? 1 : 1, 1, 999);
      const skillEnvelopeStar = validStar(reward.skill_envelope_star);
      if (!skillEnvelopeStar) continue;
      seen.add(id);
      result.push(freeze({
        id,
        star,
        type,
        title: String(raw.title || id),
        description: String(raw.description || ""),
        recommendedLevel: wholeNumber(raw.recommendedLevel, 1, 1, 40),
        repeatable: raw.repeatable !== false,
        objective: type === "hunt"
          ? { monster_id: String(objective.monster_id || "").trim(), count }
          : type === "delivery"
            ? { recipient_npc_id: String(objective.recipient_npc_id || "").trim(), count: 1 }
            : { interaction_id: String(objective.interaction_id || "").trim(), count: 1 },
        reward: { skill_envelope_star: skillEnvelopeStar, coins: wholeNumber(reward.coins, 0, 0, 999999) },
      }));
    }
    return Object.freeze(result);
  }

  const CATALOG = normalizeCatalog(DEFAULT_COMMISSIONS);

  function getCommission(id, catalog = CATALOG) {
    const key = String(id || "").trim();
    return catalog.find((commission) => commission.id === key) || null;
  }

  function emptyState() {
    return {
      schemaVersion: 1,
      activeCommissionId: null,
      status: "available",
      progress: 0,
      objectiveCompleted: false,
      deliveryCompleted: false,
      interactionCompleted: false,
      countedDefeatIds: [],
      cycle: 0,
      envelopeDrawSerial: 0,
      envelopes: { 1: 0, 2: 0, 3: 0, 5: 0, 7: 0 },
      rewardClaimed: false,
    };
  }

  function normalizeState(raw, catalog = CATALOG) {
    const source = raw && typeof raw === "object" ? raw : {};
    const state = emptyState();
    const activeId = String(source.activeCommissionId || "").trim();
    state.activeCommissionId = activeId || null;
    state.status = ["available", "active", "ready_to_report"].includes(source.status) ? source.status : "available";
    state.progress = wholeNumber(source.progress, 0, 0, 999);
    state.objectiveCompleted = Boolean(source.objectiveCompleted);
    state.deliveryCompleted = Boolean(source.deliveryCompleted);
    state.interactionCompleted = Boolean(source.interactionCompleted);
    state.countedDefeatIds = [...new Set((Array.isArray(source.countedDefeatIds) ? source.countedDefeatIds : [])
      .map((id) => String(id || "").trim()).filter(Boolean))].slice(-MAX_COUNTED_DEFEATS);
    state.cycle = wholeNumber(source.cycle, 0, 0, 999999999);
    state.envelopeDrawSerial = wholeNumber(source.envelopeDrawSerial, 0, 0, 999999999);
    const envelopes = source.envelopes && typeof source.envelopes === "object" ? source.envelopes : {};
    for (const star of COMMISSION_STARS) state.envelopes[star] = wholeNumber(envelopes[star], 0, 0, 9999);
    state.rewardClaimed = Boolean(source.rewardClaimed);
    if (state.activeCommissionId && !getCommission(state.activeCommissionId, catalog)) {
      state.activeCommissionId = null;
      state.status = "available";
      state.progress = 0;
      state.objectiveCompleted = false;
      state.deliveryCompleted = false;
      state.interactionCompleted = false;
      state.countedDefeatIds = [];
    }
    if (!state.activeCommissionId || state.status === "available") {
      state.activeCommissionId = null;
      state.status = "available";
      state.progress = 0;
      state.objectiveCompleted = false;
      state.deliveryCompleted = false;
      state.interactionCompleted = false;
      state.countedDefeatIds = [];
    }
    return state;
  }

  function listAvailable(state, catalog = CATALOG) {
    const normalized = normalizeState(state, catalog);
    return normalized.activeCommissionId ? [] : catalog.filter((commission) => commission.repeatable).map(cloneCommission);
  }

  function activeCommission(state, catalog = CATALOG) {
    const normalized = normalizeState(state, catalog);
    return getCommission(normalized.activeCommissionId, catalog);
  }

  function accept(state, commissionId, catalog = CATALOG) {
    const current = normalizeState(state, catalog);
    if (current.activeCommissionId) return { ok: false, reason: "already-active", state: current, commission: activeCommission(current, catalog) };
    const commission = getCommission(commissionId, catalog);
    if (!commission) return { ok: false, reason: "not-found", state: current, commission: null };
    if (!commission.repeatable) return { ok: false, reason: "not-repeatable", state: current, commission };
    return {
      ok: true,
      reason: null,
      commission: cloneCommission(commission),
      state: {
        ...current,
        activeCommissionId: commission.id,
        status: "active",
        progress: 0,
        objectiveCompleted: false,
        deliveryCompleted: false,
        interactionCompleted: false,
        countedDefeatIds: [],
        rewardClaimed: false,
      },
    };
  }

  function recordHuntKill(state, event, catalog = CATALOG) {
    const current = normalizeState(state, catalog);
    const commission = activeCommission(current, catalog);
    const input = event && typeof event === "object" ? event : {};
    const monsterId = String(input.monsterId || input.monster_id || "").trim();
    const instanceId = String(input.instanceId || input.instance_id || "").trim();
    if (!commission || current.status !== "active" || commission.type !== "hunt") return { changed: false, reason: "not-active-hunt", state: current, commission };
    if (monsterId !== commission.objective.monster_id) return { changed: false, reason: "wrong-monster", state: current, commission };
    if (instanceId && current.countedDefeatIds.includes(instanceId)) return { changed: false, reason: "duplicate-instance", state: current, commission };
    const countedDefeatIds = instanceId ? [...current.countedDefeatIds, instanceId].slice(-MAX_COUNTED_DEFEATS) : current.countedDefeatIds;
    const progress = Math.min(commission.objective.count, current.progress + 1);
    const completed = progress >= commission.objective.count;
    return {
      changed: true,
      reason: completed ? "objective-completed" : "progressed",
      commission: cloneCommission(commission),
      state: {
        ...current,
        progress,
        objectiveCompleted: completed,
        status: completed ? "ready_to_report" : "active",
        countedDefeatIds,
      },
    };
  }

  function deliver(state, npcId, catalog = CATALOG) {
    const current = normalizeState(state, catalog);
    const commission = activeCommission(current, catalog);
    const recipientId = String(npcId || "").trim();
    if (!commission || current.status !== "active" || commission.type !== "delivery") return { changed: false, reason: "not-active-delivery", state: current, commission };
    if (recipientId !== commission.objective.recipient_npc_id) return { changed: false, reason: "wrong-recipient", state: current, commission };
    return {
      changed: true,
      reason: "objective-completed",
      commission: cloneCommission(commission),
      state: { ...current, progress: 1, objectiveCompleted: true, deliveryCompleted: true, status: "ready_to_report" },
    };
  }

  function recordInteraction(state, interactionId, catalog = CATALOG) {
    const current = normalizeState(state, catalog);
    const commission = activeCommission(current, catalog);
    const targetId = String(interactionId || "").trim();
    if (!commission || current.status !== "active" || commission.type !== "wish") return { changed: false, reason: "not-active-wish", state: current, commission };
    if (targetId !== commission.objective.interaction_id) return { changed: false, reason: "wrong-interaction", state: current, commission };
    if (current.interactionCompleted) return { changed: false, reason: "already-completed", state: current, commission };
    return {
      changed: true,
      reason: "objective-completed",
      commission: cloneCommission(commission),
      state: { ...current, progress: 1, objectiveCompleted: true, interactionCompleted: true, status: "ready_to_report" },
    };
  }

  function abandon(state, catalog = CATALOG) {
    const current = normalizeState(state, catalog);
    const commission = activeCommission(current, catalog);
    if (!commission) return { ok: false, reason: "not-active", state: current, commission: null };
    if (!["active", "ready_to_report"].includes(current.status)) {
      return { ok: false, reason: "not-abandonable", state: current, commission };
    }
    const next = normalizeState({
      ...current,
      activeCommissionId: null,
      status: "available",
      progress: 0,
      objectiveCompleted: false,
      deliveryCompleted: false,
      interactionCompleted: false,
      countedDefeatIds: [],
      cycle: current.cycle + 1,
      rewardClaimed: false,
    }, catalog);
    return { ok: true, reason: null, state: next, commission };
  }

  function report(state, catalog = CATALOG) {
    const current = normalizeState(state, catalog);
    const commission = activeCommission(current, catalog);
    if (!commission) return { ok: false, reason: "not-active", state: current, commission: null, reward: null };
    if (current.status !== "ready_to_report" || !current.objectiveCompleted) {
      return { ok: false, reason: current.rewardClaimed ? "already-claimed" : "not-ready", state: current, commission, reward: null };
    }
    const star = commission.reward.skill_envelope_star;
    const next = normalizeState({
      ...current,
      activeCommissionId: null,
      status: "available",
      progress: 0,
      objectiveCompleted: false,
      deliveryCompleted: false,
      interactionCompleted: false,
      countedDefeatIds: [],
      cycle: current.cycle + 1,
      rewardClaimed: true,
      envelopes: { ...current.envelopes, [star]: current.envelopes[star] + 1 },
    });
    return { ok: true, reason: null, state: next, commission, reward: { skill_envelope_star: star, quantity: 1, coins: wholeNumber(commission.reward.coins, 0, 0, 999999) } };
  }

  function consumeEnvelope(state, star) {
    const current = normalizeState(state);
    const safeStar = validStar(star);
    if (!safeStar) return { ok: false, reason: "invalid-star", state: current };
    if (current.envelopes[safeStar] < 1) return { ok: false, reason: "no-envelope", state: current };
    return {
      ok: true,
      reason: null,
      star: safeStar,
      state: {
        ...current,
        envelopes: { ...current.envelopes, [safeStar]: current.envelopes[safeStar] - 1 },
        envelopeDrawSerial: Math.min(999999999, current.envelopeDrawSerial + 1),
      },
    };
  }

  return {
    COMMISSION_STARS,
    COMMISSION_TYPES,
    DEFAULT_COMMISSIONS: CATALOG,
    normalizeCatalog,
    getCommission,
    emptyState,
    normalizeState,
    listAvailable,
    activeCommission,
    accept,
    recordHuntKill,
    deliver,
    recordInteraction,
    abandon,
    report,
    consumeEnvelope,
  };
});
