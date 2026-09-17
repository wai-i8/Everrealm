(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmSystemFeedback = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  function create(options = {}) {
    const dom = options.dom || {};
    const state = options.state || {};
    const labels = options.labels || {};
    const filterGroups = options.filterGroups || {};
    const escapeUiText = options.escapeUiText;
    const storage = options.storage;
    const storageKey = options.storageKey;
    const schedule = typeof options.setTimeout === "function"
      ? options.setTimeout
      : root.setTimeout.bind(root);
    let lastAutoSystemLog = { text: "", at: 0 };

    function syncSystemLogCollapsed() {
      if (!dom.systemLog) return;
      const collapsed = state.getCollapsed();
      dom.systemLog.classList.toggle("is-collapsed", collapsed);
      dom.systemLog.dataset.collapsed = String(collapsed);
      if (dom.systemLogToggleButton) {
        dom.systemLogToggleButton.textContent = collapsed ? "+" : "−";
        dom.systemLogToggleButton.setAttribute("aria-expanded", String(!collapsed));
        dom.systemLogToggleButton.setAttribute("aria-label", collapsed ? "展開系統資訊欄" : "縮細系統資訊欄");
        dom.systemLogToggleButton.title = collapsed ? "展開資訊欄" : "縮細資訊欄";
      }
    }

    function renderSystemLog() {
      if (!dom.systemLogMessages) return;
      const filter = state.getFilter();
      const entries = filter === "all"
        ? state.getEntries()
        : state.getEntries().filter((entry) => (filterGroups[filter] || [filter]).includes(entry.type));
      dom.systemLog.dataset.filter = filter;
      const visibleEntries = state.getCollapsed() ? entries.slice(-2) : entries;
      dom.systemLogMessages.innerHTML = visibleEntries.map((entry) => {
        const tag = `<span class="system-log-tag">[${labels[entry.type] || "系統"}]</span>`;
        if (entry.type === "world" && entry.author) {
          return `<div class="system-log-entry is-world"><span class="system-log-tag">[${labels.world || "世界"}]</span><span class="system-log-author">${escapeUiText(entry.author)}：</span><span class="system-log-text">${escapeUiText(entry.text)}</span></div>`;
        }
        return `<div class="system-log-entry is-${entry.type} ${entry.tone ? `is-${entry.tone}` : ""}">${tag}<span class="system-log-text">${escapeUiText(entry.text)}</span></div>`;
      }).join("");
      dom.systemLogMessages.scrollTop = dom.systemLogMessages.scrollHeight;
      for (const tab of dom.systemLogTabs?.querySelectorAll?.("[data-log-filter]") || []) {
        const selected = tab.dataset.logFilter === filter;
        tab.setAttribute("aria-pressed", String(selected));
        tab.classList.toggle("is-active", selected);
      }
      syncSystemLogCollapsed();
    }

    function toggleSystemLogCollapsed() {
      state.setCollapsed(!state.getCollapsed());
      try { storage.setItem(storageKey, state.getCollapsed() ? "1" : "0"); } catch (_) {}
      syncSystemLogCollapsed();
      renderSystemLog();
    }

    function addSystemMessage(type, text, tone = "") {
      const safeType = Object.hasOwn(labels, type) ? type : "system";
      const safeText = String(text || "").trim().replace(/。+$/u, "");
      if (!safeText) return;
      const entries = state.getEntries();
      const now = Date.now();
      const safeTone = String(tone || "");
      const last = entries[entries.length - 1];
      if (last && last.type === safeType && last.text === safeText && last.tone === safeTone && now - Number(last.at || 0) < 800) return;
      entries.push({ id: state.nextSerial(), type: safeType, text: safeText, tone: safeTone, at: now });
      if (entries.length > 800) entries.splice(0, entries.length - 800);
      renderSystemLog();
    }

    function addWorldMessage(author, text) {
      const safeAuthor = String(author || "冒險者").trim().slice(0, 24) || "冒險者";
      const safeText = String(text || "").trim();
      if (!safeText) return;
      const entries = state.getEntries();
      entries.push({ id: state.nextSerial(), type: "world", author: safeAuthor, text: safeText, tone: "" });
      if (entries.length > 800) entries.splice(0, entries.length - 800);
      renderSystemLog();
    }

    function showToast(message, style = "", options = {}) {
      const text = String(message || "").trim();
      const tone = String(style || "").trim();
      const autoLog = options?.log !== false;
      dom.toastElement.textContent = text;
      dom.toastElement.className = `game-toast ${tone}`.trim();
      void dom.toastElement.offsetWidth;
      dom.toastElement.classList.add("show");

      if (autoLog && text && (tone === "danger" || tone === "warning" || tone === "warn")) {
        const now = Date.now();
        if (lastAutoSystemLog.text !== text || now - lastAutoSystemLog.at > 800) {
          lastAutoSystemLog = { text, at: now };
          addSystemMessage("system", text, tone === "danger" ? "danger" : "warning");
        }
      }
    }

    function announce(message) {
      dom.ariaLive.textContent = "";
      schedule(() => { dom.ariaLive.textContent = message; }, 20);
    }

    return Object.freeze({
      showToast,
      announce,
      renderSystemLog,
      addSystemMessage,
      addWorldMessage,
      syncSystemLogCollapsed,
      toggleSystemLogCollapsed,
    });
  }

  return Object.freeze({ create });
});
