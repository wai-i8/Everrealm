(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmFacilityProgressionViews = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function renderGuildFacility({
    content,
    setFacilityFooter,
    offers,
    activeId,
    status,
    formatSkillBookRank,
  }) {
    const rows = offers.map((offer) => {
      const activeRow = activeId === offer.id;
      const stateLabel = activeRow ? (status === "ready_to_report" ? "待回報" : "進行中") : "";
      return `<button class="guild-simple-row ${activeRow ? "is-active" : ""}" type="button" data-facility-action="commission-detail" data-offer-id="${offer.id}"><strong>${offer.title}</strong><span class="guild-simple-stars">${formatSkillBookRank(offer.star)}</span>${stateLabel ? `<em>${stateLabel}</em>` : ""}</button>`;
    }).join("");
    content.innerHTML = `<section class="guild-simple-list" aria-label="公會委託">${rows || '<div class="facility-empty-state"><strong>暫時冇委託</strong></div>'}</section>`;
    setFacilityFooter("");
  }

  function renderSkillsFacility({
    content,
    setFacilityFooter,
    classSkills,
    layout,
    states,
    stateLabel,
  }) {
    const treeTopPercent = 1.5;
    const treeBottomPercent = 89.5;
    const treeNodeYPercent = (depth) => layout.maxDepth > 0
      ? treeTopPercent + (treeBottomPercent - treeTopPercent) * (depth / layout.maxDepth)
      : 45;
    const treeNodeYCoord = (depth) => treeNodeYPercent(depth) * 10;
    const treeNodeHeightCoord = 38;
    const treeHeight = 1000;
    const tierGuides = "";
    const links = layout.edges.map(({ from, to }) => {
      const parent = layout.positions.get(from);
      const child = layout.positions.get(to);
      const startY = treeNodeYCoord(parent.depth) + treeNodeHeightCoord;
      const endY = treeNodeYCoord(child.depth);
      const middleY = Math.max(startY + 8, endY - 22);
      return `<path class="skill-tree-link" data-from="${from}" data-to="${to}" d="M ${parent.x.toFixed(2)} ${startY.toFixed(2)} V ${middleY.toFixed(2)} H ${child.x.toFixed(2)} V ${endY.toFixed(2)}" />`;
    }).join("");
    const nodes = classSkills.map((skill) => {
      const learnability = states.get(skill.id);
      const label = stateLabel(learnability.status);
      const position = layout.positions.get(skill.id);
      return `<article class="skill-tree-node is-${learnability.status}" role="treeitem" aria-level="${position.depth + 1}" data-tree-state="${learnability.status}" data-tree-depth="${position.depth}" data-tree-x="${position.x.toFixed(2)}" style="--tree-x:${(position.x / 10).toFixed(3)}%;--tree-y:${treeNodeYPercent(position.depth).toFixed(3)}%">
        <button class="skill-tree-node-trigger" type="button" data-facility-action="skill-detail" data-skill-id="${skill.id}" aria-label="${skill.name}，${label}" title="${skill.name}"><strong>${skill.name}</strong></button>
      </article>`;
    }).join("");
    content.innerHTML = `
      <div class="skill-tree-scroll" aria-label="技能樹">
        <div class="skill-tree-board" role="tree" aria-label="技能發展路線">
          <svg class="skill-tree-links" viewBox="0 0 1000 ${treeHeight}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${links}</svg>
          ${tierGuides}${nodes}
        </div>
      </div>`;
    setFacilityFooter("");
  }

  function renderDeckFacility({
    content,
    setFacilityFooter,
    canEdit,
    panels,
    selectedPanelId,
    equippedPanelId,
    pendingEquipPanelId,
    learnedSkills,
    skillBadgeMarkup,
  }) {
    const ownedPanels = Array.isArray(panels) ? panels : [];
    const selected = ownedPanels.find((panel) => panel.id === selectedPanelId)
      || ownedPanels.find((panel) => panel.id === equippedPanelId)
      || ownedPanels[0]
      || null;
    if (!selected) {
      content.innerHTML = '<div class="facility-empty-state"><strong>暫時未有戰技面板</strong></div>';
      setFacilityFooter("");
      return;
    }

    const panelCards = ownedPanels.map((panel) => {
      const equipped = panel.id === equippedPanelId;
      const active = panel.id === selected.id;
      return `<button class="panel-selector-card ${active ? "is-selected" : ""} ${equipped ? "is-equipped" : ""}" type="button" data-facility-action="select-panel" data-panel-id="${panel.id}" aria-pressed="${active ? "true" : "false"}">
        <span class="panel-selector-top"><strong>${panel.name}</strong>${equipped ? "<em>使用中</em>" : ""}</span>
        <span class="panel-selector-meta">${panel.slotCount} 格技能</span>
      </button>`;
    }).join("");

    const slots = selected.slots.map((skill, index) => `<article class="deck-slot ${skill ? "is-filled" : "is-empty"}" data-deck-slot-index="${index}" ${canEdit && skill ? `data-deck-drag-source="slot" data-skill-id="${skill.id}"` : ""} aria-label="${skill ? skill.name : `技能格 ${index + 1} 空白`}">${skill
      ? `${skillBadgeMarkup(skill)}<strong>${skill.name}</strong>`
      : `<span class="deck-empty-slot-index">${index + 1}</span>`}</article>`).join("");

    const passiveText = selected.passive || "無";
    const selectedEquipped = selected.id === equippedPanelId;
    const confirmingEquip = canEdit && !selectedEquipped && pendingEquipPanelId === selected.id;
    const panelAction = canEdit
      ? (selectedEquipped
        ? '<span class="panel-equipped-status">目前使用中</span>'
        : confirmingEquip
          ? `<span class="panel-equip-confirm"><button class="facility-action-button is-quiet" type="button" data-facility-action="cancel-equip-panel">取消</button><button class="facility-action-button panel-equip-button" type="button" data-facility-action="confirm-equip-panel" data-panel-id="${selected.id}">確認更換</button></span>`
          : `<button class="facility-action-button panel-equip-button" type="button" data-facility-action="equip-panel" data-panel-id="${selected.id}">使用此面板</button>`)
      : `<span class="panel-readonly-note">${selectedEquipped ? "目前使用中" : "只可於城門更換"}</span>`;

    const management = canEdit ? (() => {
      const learned = learnedSkills.map((skill) => `<article class="deck-skill-choice" data-deck-drag-source="library" data-skill-id="${skill.id}" aria-label="${skill.name}">${skillBadgeMarkup(skill)}<strong>${skill.name}</strong></article>`).join("");
      return `<section class="deck-management-column" data-deck-region="learned" aria-labelledby="deckLearnedHeading"><div class="deck-region-heading"><h3 id="deckLearnedHeading">已學技能</h3><small>拖到右邊面板</small></div><div class="deck-skill-list">${learned || '<div class="facility-empty-state"><strong>未有已學技能</strong></div>'}</div></section>`;
    })() : "";

    const currentDeck = `<section class="deck-current-column" data-deck-region="current" aria-label="${selected.name}">
      <div class="deck-panel-heading">
        <div><small>${selected.source || "戰技面板"}</small><h3>${selected.name}</h3></div>
        ${panelAction}
      </div>
      <div class="panel-passive-row"><span>被動效果</span><strong>${passiveText}</strong></div>
      <div class="deck-slot-list" style="--panel-slot-count:${selected.slotCount}">${slots}</div>
      ${canEdit ? '<p class="panel-edit-hint">每塊面板會獨立保存自己嘅技能配置。</p>' : ''}
    </section>`;

    content.innerHTML = `
      <div class="deck-view-shell ${canEdit ? "is-editable" : "is-readonly"}">
        <section class="panel-selector-strip" aria-label="持有面板">${panelCards}</section>
        ${canEdit ? `<div class="deck-manage-layout">${management}${currentDeck}</div>` : currentDeck}
      </div>`;
    setFacilityFooter(canEdit ? "城門面板配置 · 更換面板前會要求確認" : "可隨時查看；更換面板及技能配置只可於舊港城門進行");
  }

  return Object.freeze({
    renderGuildFacility,
    renderSkillsFacility,
    renderDeckFacility,
  });
});
