(function (root, factory) {
  const skills = root.EverrealmSkills || (typeof require === "function" ? require("./skill-core.js") : null);
  const api = factory(skills);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmPanels = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Skills) {
  "use strict";

  const MAX_PANELS = 24;
  const MAX_SLOTS = 8;
  const DEFAULT_PANEL_ID = "beginner";

  function freeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) freeze(child);
    return Object.freeze(value);
  }

  const PANEL_DEFINITIONS = freeze({
    beginner: {
      id: "beginner",
      name: "初心者面板",
      slotCount: 3,
      passive: null,
      source: "初始",
      description: "最基本嘅戰技面板。",
    },
    adventurer: {
      id: "adventurer",
      name: "冒險者面板",
      slotCount: 4,
      passive: null,
      source: "主線一",
      description: "完成第一段主線後獲得嘅四格面板。",
    },
    skilled_adventurer: {
      id: "skilled_adventurer",
      name: "熟練冒險者面板",
      slotCount: 5,
      passive: null,
      source: "主線二",
      description: "畀已經掌握戰場基本功嘅冒險者使用。",
    },
    veteran_adventurer: {
      id: "veteran_adventurer",
      name: "資深冒險者面板",
      slotCount: 6,
      passive: null,
      source: "主線三",
      description: "得到公會認同後獲得嘅六格面板。",
    },
  });

  function whole(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.trunc(number))) : fallback;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  }

  function cleanId(value) {
    return String(value || "").trim().slice(0, 80);
  }

  function cleanName(value, fallback) {
    const text = String(value || "").trim().slice(0, 48);
    return text || fallback;
  }

  function emptySlots(count) {
    return Array.from({ length: whole(count, 3, 1, MAX_SLOTS) }, () => null);
  }

  function normalizeSlots(values, slotCount, skillState) {
    const skills = Skills?.normalizeSkillState?.(skillState) || skillState || {};
    const unlocked = new Set(Array.isArray(skills.unlockedSkillIds) ? skills.unlockedSkillIds.map(String) : []);
    const classId = String(skills.classId || "fighter");
    const result = emptySlots(slotCount);
    const seen = new Set();
    const source = Array.isArray(values) ? values : [];
    for (let index = 0; index < Math.min(result.length, source.length); index += 1) {
      const id = String(source[index] || "").trim();
      const skill = Skills?.getSkill?.(id);
      if (!skill || skill.classId !== classId || skill.tags?.includes?.("passive") || !unlocked.has(id) || seen.has(id)) continue;
      result[index] = id;
      seen.add(id);
    }
    return result;
  }

  function panelFromDefinition(definition, skillState, slots = null) {
    const def = definition || PANEL_DEFINITIONS[DEFAULT_PANEL_ID];
    const slotCount = whole(def.slotCount, 3, 1, MAX_SLOTS);
    return {
      id: cleanId(def.id),
      name: cleanName(def.name, "戰技面板"),
      slotCount,
      passive: def.passive == null ? null : String(def.passive).slice(0, 160),
      source: String(def.source || "").slice(0, 48),
      description: String(def.description || "").slice(0, 180),
      slots: normalizeSlots(slots, slotCount, skillState),
    };
  }

  function normalizePanelEntry(raw, id, skillState) {
    const definition = PANEL_DEFINITIONS[id] || null;
    const source = raw && typeof raw === "object" ? raw : {};
    const slotCount = whole(source.slotCount ?? definition?.slotCount, definition?.slotCount || 3, 1, MAX_SLOTS);
    return {
      id,
      name: cleanName(source.name, definition?.name || "戰技面板"),
      slotCount,
      passive: source.passive == null ? (definition?.passive ?? null) : String(source.passive).slice(0, 160),
      source: String(source.source ?? definition?.source ?? "").slice(0, 48),
      description: String(source.description ?? definition?.description ?? "").slice(0, 180),
      slots: normalizeSlots(source.slots, slotCount, skillState),
    };
  }

  function createInitialState(skillState) {
    const skills = Skills?.normalizeSkillState?.(skillState) || skillState || {};
    const capacity = whole(skills.deckCapacity, 3, 1, MAX_SLOTS);
    const legacySlots = Array.isArray(skills.deckSlots) ? skills.deckSlots : [];
    const beginner = panelFromDefinition(PANEL_DEFINITIONS.beginner, skills, legacySlots.slice(0, 3));
    const panels = { beginner };
    let equippedPanelId = DEFAULT_PANEL_ID;

    // Preserve old saves that already had a 4–6 slot flat deck before the
    // multi-panel system existed. New saves never create this compatibility panel.
    if (capacity > 3) {
      const legacyId = `legacy_${capacity}`;
      panels[legacyId] = {
        id: legacyId,
        name: "舊式戰技面板",
        slotCount: capacity,
        passive: null,
        source: "舊存檔保留",
        description: "由舊版本戰技配置自動保留。",
        slots: normalizeSlots(legacySlots, capacity, skills),
      };
      equippedPanelId = legacyId;
    }

    return { schemaVersion: 1, equippedPanelId, panels };
  }

  function normalizeState(raw, skillState) {
    const skills = Skills?.normalizeSkillState?.(skillState) || skillState || {};
    if (!raw || typeof raw !== "object" || !raw.panels || typeof raw.panels !== "object") {
      return createInitialState(skills);
    }
    const panels = {};
    for (const [rawId, rawPanel] of Object.entries(raw.panels).slice(0, MAX_PANELS)) {
      const id = cleanId(rawId || rawPanel?.id);
      if (!id || panels[id]) continue;
      panels[id] = normalizePanelEntry(rawPanel, id, skills);
    }
    if (!panels[DEFAULT_PANEL_ID]) {
      panels[DEFAULT_PANEL_ID] = panelFromDefinition(PANEL_DEFINITIONS[DEFAULT_PANEL_ID], skills, []);
    }
    const requestedEquipped = cleanId(raw.equippedPanelId);
    const equippedPanelId = panels[requestedEquipped] ? requestedEquipped : DEFAULT_PANEL_ID;
    return { schemaVersion: 1, equippedPanelId, panels };
  }

  function getPanel(rawState, panelId, skillState) {
    const state = normalizeState(rawState, skillState);
    return state.panels[cleanId(panelId)] || null;
  }

  function activePanel(rawState, skillState) {
    const state = normalizeState(rawState, skillState);
    return state.panels[state.equippedPanelId] || state.panels[DEFAULT_PANEL_ID];
  }

  function listOwned(rawState, skillState) {
    const state = normalizeState(rawState, skillState);
    return Object.values(state.panels).map((panel) => clone(panel));
  }

  function syncSkillState(rawPanelState, rawSkillState) {
    const baseSkills = Skills.normalizeSkillState(rawSkillState);
    const panelState = normalizeState(rawPanelState, baseSkills);
    const panel = panelState.panels[panelState.equippedPanelId];
    return Skills.normalizeSkillState({
      ...baseSkills,
      deckUpgradeMilestones: [],
      deckCapacity: panel.slotCount,
      deckSlots: panel.slots,
      equippedSkillIds: panel.slots.filter(Boolean),
    }, {
      classId: baseSkills.classId,
      ensureEquipped: false,
      deckCapacity: panel.slotCount,
    });
  }

  function grantPanel(rawState, panelId, skillState) {
    const state = normalizeState(rawState, skillState);
    const id = cleanId(panelId);
    const definition = PANEL_DEFINITIONS[id];
    if (!definition) return { ok: false, reason: "unknown-panel", state, panel: null, granted: false };
    if (state.panels[id]) return { ok: true, reason: null, state, panel: clone(state.panels[id]), granted: false };
    const next = clone(state);
    next.panels[id] = panelFromDefinition(definition, skillState, []);
    return { ok: true, reason: null, state: next, panel: clone(next.panels[id]), granted: true };
  }

  function equipPanel(rawState, panelId, skillState) {
    const state = normalizeState(rawState, skillState);
    const id = cleanId(panelId);
    if (!state.panels[id]) return { ok: false, reason: "not-owned", state, skills: Skills.normalizeSkillState(skillState), panel: null };
    const next = clone(state);
    next.equippedPanelId = id;
    const skills = syncSkillState(next, skillState);
    return { ok: true, reason: null, state: next, skills, panel: clone(next.panels[id]) };
  }

  function skillStateForPanel(panel, rawSkillState) {
    const base = Skills.normalizeSkillState(rawSkillState);
    return Skills.normalizeSkillState({
      ...base,
      deckUpgradeMilestones: [],
      deckCapacity: panel.slotCount,
      deckSlots: panel.slots,
      equippedSkillIds: panel.slots.filter(Boolean),
    }, {
      classId: base.classId,
      ensureEquipped: false,
      deckCapacity: panel.slotCount,
    });
  }

  function configureSkill(rawState, rawSkillState, panelId, skillId, slot) {
    const state = normalizeState(rawState, rawSkillState);
    const id = cleanId(panelId);
    const panel = state.panels[id];
    if (!panel) return { ok: false, reason: "not-owned", state, skills: Skills.normalizeSkillState(rawSkillState) };
    const temp = skillStateForPanel(panel, rawSkillState);
    const result = Skills.equipSkill(temp, skillId, slot);
    if (!result.ok) return { ok: false, reason: result.reason, state, skills: Skills.normalizeSkillState(rawSkillState) };
    const next = clone(state);
    next.panels[id].slots = [...result.state.deckSlots];
    const skills = id === next.equippedPanelId ? syncSkillState(next, result.state) : syncSkillState(next, rawSkillState);
    return { ok: true, reason: null, state: next, skills, panel: clone(next.panels[id]) };
  }

  function removeSkill(rawState, rawSkillState, panelId, skillId) {
    const state = normalizeState(rawState, rawSkillState);
    const id = cleanId(panelId);
    const panel = state.panels[id];
    if (!panel) return { ok: false, reason: "not-owned", state, skills: Skills.normalizeSkillState(rawSkillState) };
    const temp = skillStateForPanel(panel, rawSkillState);
    const result = Skills.unequipSkill(temp, skillId);
    if (!result.ok) return { ok: false, reason: result.reason, state, skills: Skills.normalizeSkillState(rawSkillState) };
    const next = clone(state);
    next.panels[id].slots = [...result.state.deckSlots];
    const skills = id === next.equippedPanelId ? syncSkillState(next, result.state) : syncSkillState(next, rawSkillState);
    return { ok: true, reason: null, state: next, skills, panel: clone(next.panels[id]) };
  }

  return Object.freeze({
    DEFAULT_PANEL_ID,
    PANEL_DEFINITIONS,
    createInitialState,
    normalizeState,
    getPanel,
    activePanel,
    listOwned,
    syncSkillState,
    grantPanel,
    equipPanel,
    configureSkill,
    removeSkill,
  });
});
