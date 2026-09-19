(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmFacilityBasicViews = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function renderStatusFacility({ content, setFacilityFooter, view }) {
    content.innerHTML = `
      <section class="status-compact" aria-label="角色狀態">
        <div class="status-compact-identity">
          <div>
            <strong class="status-compact-name">${view.displayName}</strong>
            <span class="status-compact-class">${view.className}</span>
          </div>
          <b class="status-compact-level">Lv.${view.level}</b>
        </div>

        <div class="status-compact-meters">
          <div class="status-compact-meter">
            <div class="status-compact-meter-heading"><span>HP</span><b>${view.hp} / ${view.maxHp}</b></div>
            <span class="status-compact-progress is-hp" role="progressbar" aria-label="生命 ${view.hp} / ${view.maxHp}" aria-valuemin="0" aria-valuemax="${view.maxHp}" aria-valuenow="${view.hp}"><i style="width:${view.hpPercent}%"></i></span>
          </div>
          <div class="status-compact-meter">
            <div class="status-compact-meter-heading"><span>EXP</span><b>${view.xp} / ${view.xpNeeded}</b></div>
            <span class="status-compact-progress is-exp" role="progressbar" aria-label="經驗值 ${view.xp} / ${view.xpNeeded}" aria-valuemin="0" aria-valuemax="${view.xpNeeded}" aria-valuenow="${view.xp}"><i style="width:${view.xpPercent}%"></i></span>
          </div>
        </div>

        <dl class="status-compact-stats">
          <div><dt>攻擊</dt><dd>${view.attack}</dd></div>
          <div><dt>防禦</dt><dd>${view.defence}</dd></div>
          <div><dt>移動力</dt><dd>${view.moveRange}</dd></div>
        </dl>
      </section>`;
    setFacilityFooter("");
  }

  function renderMissionFacility({ content, setFacilityFooter, view }) {
    const main = view?.main || null;
    const commission = view?.commission || (view?.active != null ? view : null);

    const mainMarkup = (() => {
      if (!main) return "";
      const state = main.state || "locked";
      const statusLabel = state === "active"
        ? (main.ready ? "已完成" : "進行中")
        : state === "available" ? "可開始"
          : state === "complete" ? "已完成" : "未開放";
      const title = main.title || "主線任務";
      const note = main.ready
        ? "返回公會找資深冒險者艾利斯領取獎勵"
        : state === "available" ? "返回公會找資深冒險者艾利斯"
          : "";
      return `
        <section class="mission-section mission-main-section" aria-label="主線任務">
          <div class="mission-section-label"><strong>主線任務</strong></div>
          <div class="mission-summary mission-main-summary is-${state} ${main.ready ? "is-ready" : ""}">
            <div class="mission-summary-heading">
              <strong>${title}</strong>
              <span>${statusLabel}</span>
            </div>
            ${main.objectiveText ? `<div class="mission-summary-line"><small>目標</small><strong>${main.objectiveText}</strong></div>` : ""}
            ${main.progressText && main.quest?.objectiveType !== "quiz" ? `<div class="mission-summary-line"><small>進度</small><strong>${main.progressText}</strong></div>` : ""}
            ${note ? `<p class="mission-report-note">${note}</p>` : ""}
          </div>
        </section>`;
    })();

    const commissionMarkup = commission?.active ? `
      <section class="mission-section mission-commission-section" aria-label="公會委託">
        <div class="mission-section-label"><strong>公會委託</strong></div>
        <div class="mission-summary ${commission.ready ? "is-ready" : ""}">
          <div class="mission-summary-heading">
            <strong>${commission.title}</strong>
            <span>${commission.ready ? "已完成" : "進行中"}</span>
          </div>
          <div class="mission-summary-line"><small>目標</small><strong>${commission.objectiveText}</strong></div>
          <div class="mission-summary-line"><small>進度</small><strong>${commission.progressText}</strong></div>
          ${commission.ready ? '<p class="mission-report-note">請返回公會回報任務</p>' : ""}
        </div>
      </section>` : `
      <section class="mission-section mission-commission-section" aria-label="公會委託">
        <div class="mission-section-label"><strong>公會委託</strong></div>
        <div class="mission-view is-empty"><strong>目前沒有進行中的公會委託</strong></div>
      </section>`;

    if (!mainMarkup && !commission?.active) {
      content.innerHTML = `
        <section class="mission-view is-empty" aria-label="目前任務">
          <strong>目前沒有進行中的任務</strong>
        </section>`;
      setFacilityFooter("");
      return;
    }

    content.innerHTML = `<div class="mission-hub">${mainMarkup}${commissionMarkup}</div>`;
    setFacilityFooter("");
  }

  return Object.freeze({ renderStatusFacility, renderMissionFacility });
});
