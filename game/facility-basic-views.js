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
          <div><dt>移動</dt><dd>${view.moveRange}</dd></div>
        </dl>
      </section>`;
    setFacilityFooter("");
  }

  function renderMissionFacility({ content, setFacilityFooter, view }) {
    if (!view.active) {
      content.innerHTML = `
        <section class="mission-view is-empty" aria-label="目前任務">
          <strong>目前沒有進行中的任務</strong>
        </section>`;
      setFacilityFooter("");
      return;
    }
    content.innerHTML = `
      <section class="mission-view" aria-label="目前任務">
        <article class="mission-card ${view.ready ? "is-ready" : ""}">
          <div class="mission-card-heading">
            <strong>${view.title}</strong>
            <span>${view.ready ? "已完成" : "進行中"}</span>
          </div>
          <div class="mission-task-row">
            <div class="mission-objective"><small>目標</small><strong>${view.objectiveText}</strong></div>
            <div class="mission-progress-row"><small>進度</small><strong>${view.progressText}</strong></div>
          </div>
          <div class="mission-progress-bar" role="progressbar" aria-label="任務進度" aria-valuemin="0" aria-valuemax="${view.progressMax}" aria-valuenow="${view.progressValue}"><i style="width:${view.progressPercent}%"></i></div>
          ${view.ready ? '<p class="mission-report-note">請返回公會回報任務</p>' : ""}
        </article>
      </section>`;
    setFacilityFooter("");
  }

  return Object.freeze({ renderStatusFacility, renderMissionFacility });
});
