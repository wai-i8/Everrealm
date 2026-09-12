(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmFacilityWindowShell = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CONTEXTS = Object.freeze(["portable", "guild", "shop", "general-store", "deck", "deck-view"]);
  const RESTRICTED_TABS = Object.freeze(["guild", "shop", "deck"]);

  function windowKey(tab, context) {
    return `${context}:${tab}`;
  }

  function deniedMessageForTab(tab) {
    if (tab === "guild") return "公會功能要親身入公會先用到。";
    if (tab === "shop") return "購物功能要親身入商店先用到。";
    return "面板配置要去舊港城門設定。";
  }

  function resolveOpenRequest({
    tab,
    requestedContext,
    currentMapId,
    facilityTabs,
    facilityTabsForContext,
    normalizeFacilityTab,
  }) {
    const nextContext = requestedContext || (tab === "guild" ? "guild" : tab === "shop" ? "shop" : tab === "deck" ? "deck-view" : "portable");
    const context = CONTEXTS.includes(nextContext) ? nextContext : "portable";
    const availableTabs = facilityTabsForContext(context, currentMapId);
    if (!availableTabs.includes(tab) && RESTRICTED_TABS.includes(tab)) {
      return {
        allowed: false,
        context,
        availableTabs,
        message: deniedMessageForTab(tab),
      };
    }
    const requestedTab = facilityTabs.includes(tab) ? tab : "bag";
    const normalizedTab = requestedTab === "missions" && availableTabs.includes("missions")
      ? "missions"
      : normalizeFacilityTab(requestedTab, context, currentMapId);
    return {
      allowed: true,
      context,
      availableTabs,
      tab: normalizedTab,
      key: windowKey(normalizedTab, context),
    };
  }

  function remapCloneIds(panel, key) {
    const slug = key.replace(/[^a-z0-9_-]+/gi, "-");
    const idMap = new Map();
    for (const element of [panel, ...panel.querySelectorAll("[id]")]) {
      const oldId = element.id;
      if (!oldId) continue;
      const nextId = `${oldId}-${slug}`;
      idMap.set(oldId, nextId);
      element.id = nextId;
    }
    const idRefAttributes = ["aria-labelledby", "aria-describedby", "aria-controls", "for"];
    for (const element of [panel, ...panel.querySelectorAll("*")]) {
      for (const attribute of idRefAttributes) {
        const value = element.getAttribute?.(attribute);
        if (!value) continue;
        const next = value.split(/\s+/).map((id) => idMap.get(id) || id).join(" ");
        element.setAttribute(attribute, next);
      }
    }
  }

  function createWindow({ template, stage, key, tab, context }) {
    const panel = template.cloneNode(true);
    panel.hidden = false;
    panel.dataset.facilityWindowKey = key;
    panel.classList.add("is-floating-facility-layer");
    panel.setAttribute("aria-modal", "false");
    remapCloneIds(panel, key);
    stage.appendChild(panel);
    return {
      key,
      tab,
      context,
      panel,
      windowElement: panel.querySelector(".facility-window.ui-window"),
      content: panel.querySelector(".facility-content"),
      tabs: panel.querySelector(".facility-tabs"),
      footer: panel.querySelector(".facility-footer"),
      helpButton: panel.querySelector(".ui-info-button"),
      helpPopover: panel.querySelector(".facility-help-popover"),
      helpText: panel.querySelector(".facility-help-popover p"),
      closeButton: panel.querySelector(".facility-close-button"),
    };
  }

  function topWindow(states) {
    return [...states].sort((a, b) => (Number(b.panel.style.zIndex) || 0) - (Number(a.panel.style.zIndex) || 0))[0] || null;
  }

  function wireWindow(state, handlers) {
    state.closeButton?.addEventListener("click", () => handlers.close(state));
    state.helpButton?.addEventListener("click", (event) => {
      event.stopPropagation();
      handlers.activate(state);
      handlers.toggleHelp(state);
    });
    state.panel.addEventListener("pointerdown", () => handlers.activate(state), true);
    state.panel.addEventListener("click", (event) => {
      if (!state.helpPopover?.hidden && !event.target.closest(".facility-help-popover, .ui-info-button")) handlers.closeHelp(state);
      const tab = event.target.closest("[data-facility-tab]");
      if (!tab) return;
      handlers.activate(state);
      if (!handlers.availableTabs().includes(tab.dataset.facilityTab)) return;
      handlers.selectTab(tab.dataset.facilityTab, state);
    });
    state.content.addEventListener("click", (event) => handlers.contentClick(event, state));
    state.content.addEventListener("pointerdown", (event) => {
      handlers.activate(state);
      handlers.beginSkillTreePan(event);
      handlers.beginDeckDrag(event);
    });
    state.content.addEventListener("pointermove", (event) => {
      if (!handlers.isActive(state)) return;
      handlers.moveSkillTreePan(event);
      handlers.moveDeckDrag(event);
    });
    state.content.addEventListener("pointerup", (event) => {
      if (!handlers.isActive(state)) return;
      handlers.finishSkillTreePan(event);
      handlers.finishDeckDrag(event);
    });
    state.content.addEventListener("pointercancel", (event) => {
      if (!handlers.isActive(state)) return;
      handlers.cancelSkillTreePan(event);
      handlers.cancelDeckDrag(event);
    });
  }

  return Object.freeze({
    windowKey,
    resolveOpenRequest,
    remapCloneIds,
    createWindow,
    topWindow,
    wireWindow,
  });
});
