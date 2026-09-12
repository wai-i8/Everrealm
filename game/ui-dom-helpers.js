(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmUiDom = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalizeCharacterName(value) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, 24);
  }

  function statText(stats) {
    const labels = { attack: "攻擊", defense: "防禦", speed: "速度", critChance: "暴擊", moveRange: "移動", accuracy: "命中", evasion: "迴避" };
    return Object.entries(stats)
      .filter(([key, value]) => !["weight", "maxHp"].includes(key) && value)
      .map(([key, value]) => `${labels[key] || key} ${value > 0 ? "+" : ""}${key === "critChance" ? Math.round(value * 100) + "%" : ["accuracy", "evasion"].includes(key) ? `${value}%` : value}`)
      .join(" · ");
  }

  function setTextIfChanged(element, value) {
    if (!element) return;
    const next = String(value);
    if (element.textContent !== next) element.textContent = next;
  }

  function setStyleWidthIfChanged(element, value) {
    if (!element) return;
    const next = String(value);
    if (element.style.width !== next) element.style.width = next;
  }

  function setDatasetIfChanged(element, key, value) {
    if (!element) return;
    const next = String(value);
    if (element.dataset[key] !== next) element.dataset[key] = next;
  }

  function escapeUiText(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  function setFacilityFooter(facilityFooter, message) {
    // Facility explanations belong in the shared header [i] popover. Keep
    // the footer available for future immediate actions without reserving a
    // permanent strip for instructional copy.
    facilityFooter.replaceChildren();
    facilityFooter.hidden = true;
  }

  return Object.freeze({
    normalizeCharacterName,
    statText,
    setTextIfChanged,
    setStyleWidthIfChanged,
    setDatasetIfChanged,
    escapeUiText,
    formatTime,
    setFacilityFooter,
  });
});
