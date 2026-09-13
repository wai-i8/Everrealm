(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmBattleVictory = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clamp01(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(1, number));
  }

  function buildXpSegments({ beforeLevel = 1, beforeXp = 0, afterLevel = beforeLevel, afterXp = beforeXp, levelCap = 40, xpRequired } = {}) {
    if (typeof xpRequired !== "function") throw new TypeError("xpRequired(level) is required");
    const startLevel = Math.max(1, Math.trunc(Number(beforeLevel) || 1));
    const endLevel = Math.max(startLevel, Math.trunc(Number(afterLevel) || startLevel));
    const cap = Math.max(endLevel, Math.trunc(Number(levelCap) || endLevel));
    const segments = [];
    for (let level = startLevel; level <= endLevel; level += 1) {
      const atCap = level >= cap;
      const need = atCap ? 1 : Math.max(1, Math.round(Number(xpRequired(level)) || 1));
      const fromXp = level === startLevel ? Math.max(0, Number(beforeXp) || 0) : 0;
      const toXp = level === endLevel ? Math.max(0, Number(afterXp) || 0) : need;
      const from = atCap ? 1 : clamp01(fromXp / need);
      const to = atCap ? 1 : clamp01(toXp / need);
      const distance = Math.max(.0001, Math.abs(to - from));
      segments.push(Object.freeze({ level, need, fromXp, toXp, from, to, distance, levelUpAfter: level < endLevel }));
    }
    return Object.freeze(segments);
  }

  function progressAt(segments, ratio) {
    const list = Array.isArray(segments) ? segments : [];
    if (!list.length) return null;
    const p = clamp01(ratio);
    const total = list.reduce((sum, segment) => sum + Math.max(.0001, Number(segment.distance) || 0), 0);
    let remaining = p * total;
    for (let index = 0; index < list.length; index += 1) {
      const segment = list[index];
      const distance = Math.max(.0001, Number(segment.distance) || 0);
      if (remaining <= distance || index === list.length - 1) {
        const local = clamp01(remaining / distance);
        const bar = segment.from + (segment.to - segment.from) * local;
        const xp = Math.round(segment.fromXp + (segment.toXp - segment.fromXp) * local);
        return Object.freeze({ segmentIndex: index, level: segment.level, need: segment.need, xp, bar: clamp01(bar), local });
      }
      remaining -= distance;
    }
    return null;
  }

  function createPresenter(options = {}) {
    const host = options.root || (typeof window !== "undefined" ? window : null);
    const overlay = options.overlay || null;
    const xpRequired = options.xpRequired;
    const levelCap = Math.max(1, Number(options.levelCap) || 40);
    const reducedMotion = Boolean(options.reducedMotion);
    const onLevelUp = typeof options.onLevelUp === "function" ? options.onLevelUp : () => {};
    const requestFrame = host?.requestAnimationFrame?.bind(host) || ((fn) => setTimeout(() => fn(Date.now()), 16));
    const cancelFrame = host?.cancelAnimationFrame?.bind(host) || clearTimeout;
    const now = () => host?.performance?.now?.() ?? Date.now();
    let frame = null;
    let state = null;
    let serial = 0;

    function element(name) { return overlay?.querySelector?.(`[data-victory-${name}]`) || null; }
    function setText(name, value) { const node = element(name); if (node) node.textContent = String(value ?? ""); }
    function setBar(ratio) { const fill = element("xp-fill"); if (fill) fill.style.width = `${Math.round(clamp01(ratio) * 10000) / 100}%`; }
    function setPrompt(ready) {
      setText("prompt", ready ? "返回" : "Click / Enter 跳過動畫");
      if (overlay) overlay.dataset.ready = String(Boolean(ready));
    }
    function revealLevelUp() {
      if (!state || state.levelUpRevealed || state.afterLevel <= state.beforeLevel) return;
      state.levelUpRevealed = true;
      const badge = element("level-up");
      if (badge) {
        badge.hidden = false;
        badge.textContent = `LEVEL UP · LV.${state.beforeLevel} → LV.${state.afterLevel}`;
      }
      onLevelUp({ from: state.beforeLevel, to: state.afterLevel, levelsGained: state.afterLevel - state.beforeLevel });
    }
    function renderProgress(ratio) {
      if (!state) return;
      const progress = progressAt(state.segments, ratio);
      if (!progress) return;
      setText("level", `LV.${progress.level}`);
      setText("xp-text", progress.level >= levelCap ? "MAX" : `${progress.xp} / ${progress.need} EXP`);
      setBar(progress.bar);
      if (progress.level > state.beforeLevel || (ratio >= 1 && state.afterLevel > state.beforeLevel)) revealLevelUp();
    }
    function complete() {
      if (!state) return false;
      if (frame != null) cancelFrame(frame);
      frame = null;
      renderProgress(1);
      revealLevelUp();
      state.ready = true;
      setPrompt(true);
      overlay?.classList?.add("is-ready");
      return true;
    }
    function tick(timestamp) {
      if (!state) return;
      const token = state.serial;
      const elapsed = Math.max(0, timestamp - state.startedAt - state.delayMs);
      if (timestamp - state.startedAt < state.delayMs) {
        frame = requestFrame(tick);
        return;
      }
      const ratio = clamp01(elapsed / state.durationMs);
      renderProgress(ratio);
      if (ratio >= 1) {
        if (state?.serial === token) complete();
        return;
      }
      frame = requestFrame(tick);
    }
    function show(result = {}) {
      hide();
      serial += 1;
      const beforeLevel = Math.max(1, Math.trunc(Number(result.beforeLevel) || 1));
      const afterLevel = Math.max(beforeLevel, Math.trunc(Number(result.afterLevel) || beforeLevel));
      const beforeXp = Math.max(0, Math.round(Number(result.beforeXp) || 0));
      const afterXp = Math.max(0, Math.round(Number(result.afterXp) || 0));
      const segments = buildXpSegments({ beforeLevel, beforeXp, afterLevel, afterXp, levelCap, xpRequired });
      const levelsGained = Math.max(0, afterLevel - beforeLevel);
      state = {
        serial, beforeLevel, afterLevel, beforeXp, afterXp, segments,
        startedAt: now(), delayMs: reducedMotion ? 0 : 560,
        durationMs: reducedMotion ? 1 : Math.min(2200, 900 + levelsGained * 320),
        ready: false, levelUpRevealed: false, result,
      };
      if (overlay) {
        overlay.hidden = false;
        overlay.dataset.ready = "false";
        overlay.classList.remove("is-ready");
      }
      setText("xp", `+${Math.max(0, Math.round(Number(result.earnedXp) || 0))}`);
      setText("coins", `+${Math.max(0, Math.round(Number(result.coins) || 0))}`);
      setText("level", `LV.${beforeLevel}`);
      const initialNeed = beforeLevel >= levelCap ? 1 : Math.max(1, Math.round(Number(xpRequired(beforeLevel)) || 1));
      setText("xp-text", beforeLevel >= levelCap ? "MAX" : `${beforeXp} / ${initialNeed} EXP`);
      setBar(beforeLevel >= levelCap ? 1 : beforeXp / initialNeed);
      const loot = element("loot");
      if (loot) {
        const drops = Array.isArray(result.drops) ? result.drops.filter(Boolean) : [];
        loot.innerHTML = "";
        if (!drops.length) {
          const item = host?.document?.createElement?.("li");
          if (item) { item.className = "battle-victory-loot-empty"; item.textContent = ""; loot.appendChild(item); }
        } else {
          for (const drop of drops) {
            const item = host?.document?.createElement?.("li");
            if (!item) continue;
            const name = String(drop.name || drop.id || "戰利品");
            const quantity = Math.max(1, Math.floor(Number(drop.quantity) || 1));
            item.textContent = `${name} ×${quantity}`;
            loot.appendChild(item);
          }
        }
      }
      const badge = element("level-up");
      if (badge) { badge.hidden = true; badge.textContent = ""; }
      setPrompt(false);
      frame = requestFrame(tick);
      return snapshot();
    }
    function advance() {
      if (!state) return Object.freeze({ handled: false, exit: false, skipped: false });
      if (!state.ready) {
        complete();
        return Object.freeze({ handled: true, exit: false, skipped: true });
      }
      return Object.freeze({ handled: true, exit: true, skipped: false });
    }
    function hide() {
      if (frame != null) cancelFrame(frame);
      frame = null;
      state = null;
      if (overlay) {
        overlay.hidden = true;
        overlay.dataset.ready = "false";
        overlay.classList.remove("is-ready");
      }
    }
    function snapshot() {
      return state ? Object.freeze({ beforeLevel: state.beforeLevel, afterLevel: state.afterLevel, beforeXp: state.beforeXp, afterXp: state.afterXp, ready: state.ready, levelUpRevealed: state.levelUpRevealed }) : null;
    }
    return Object.freeze({ show, advance, complete, hide, snapshot });
  }

  return Object.freeze({ buildXpSegments, progressAt, createPresenter });
});
