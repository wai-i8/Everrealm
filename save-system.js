(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.EverrealmSaveSystem = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_INTERVAL_MS = 5000;

  function create(options = {}) {
    const fingerprint = typeof options.fingerprint === "function" ? options.fingerprint : () => "";
    const save = typeof options.save === "function" ? options.save : () => false;
    const intervalMs = Math.max(1, Number(options.intervalMs) || DEFAULT_INTERVAL_MS);
    let dirty = false;
    let elapsedMs = 0;
    let lastFingerprint = null;
    let saving = false;
    let saveAttempts = 0;
    let successfulSaves = 0;

    function currentFingerprint() {
      try { return String(fingerprint()); } catch (_) { return null; }
    }

    function markDirty() {
      dirty = true;
      return dirty;
    }

    function markSaved(value = currentFingerprint()) {
      if (value != null) lastFingerprint = value;
      dirty = false;
      elapsedMs = 0;
      return true;
    }

    function markLoaded(value = currentFingerprint()) {
      saving = false;
      saveAttempts = 0;
      return markSaved(value);
    }

    function needsSave() {
      const next = currentFingerprint();
      return dirty || (next != null && next !== lastFingerprint);
    }

    function checkpoint({ force = false } = {}) {
      if (saving) return { saved: false, reason: "in-flight" };
      if (!force && !needsSave()) return { saved: false, reason: "clean" };
      saving = true;
      saveAttempts += 1;
      let ok = false;
      try { ok = save() !== false; } catch (_) { ok = false; }
      saving = false;
      if (!ok) {
        dirty = true;
        return { saved: false, reason: "failed" };
      }
      successfulSaves += 1;
      markSaved();
      return { saved: true, reason: force ? "forced" : "dirty" };
    }

    function tick(deltaSeconds) {
      elapsedMs += Math.max(0, Number(deltaSeconds) || 0) * 1000;
      if (elapsedMs < intervalMs) return { saved: false, reason: "waiting" };
      elapsedMs %= intervalMs;
      return checkpoint();
    }

    function flush() {
      return checkpoint();
    }

    return {
      markDirty,
      markSaved,
      markLoaded,
      needsSave,
      checkpoint,
      flush,
      tick,
      isDirty: () => dirty,
      getElapsedMs: () => elapsedMs,
      getLastFingerprint: () => lastFingerprint,
      getSaveAttempts: () => saveAttempts,
      getSuccessfulSaves: () => successfulSaves,
    };
  }

  return Object.freeze({ DEFAULT_INTERVAL_MS, create });
});
