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
    deckSlots,
    learnedSkills,
    skillBadgeMarkup,
  }) {
    const slots = deckSlots.map((skill, index) => `<article class="deck-slot ${skill ? "is-filled" : "is-empty"}" data-deck-slot-index="${index}" ${skill ? `data-deck-drag-source="slot" data-skill-id="${skill.id}"` : ""} aria-label="${skill ? skill.name : `面板 ${index + 1} 空白`}">${skill
      ? `${skillBadgeMarkup(skill)}<strong>${skill.name}</strong>`
      : ""}</article>`).join("");
    const management = canEdit ? (() => {
      const learned = learnedSkills.map((skill) => `<article class="deck-skill-choice" data-deck-drag-source="library" data-skill-id="${skill.id}" aria-label="${skill.name}">${skillBadgeMarkup(skill)}<strong>${skill.name}</strong></article>`).join("");
      return `<section class="deck-management-column" data-deck-region="learned" aria-labelledby="deckLearnedHeading"><div class="deck-region-heading"><h3 id="deckLearnedHeading">技能</h3></div><div class="deck-skill-list">${learned || '<div class="facility-empty-state"><strong>未有已學技能</strong></div>'}</div></section>`;
    })() : "";
    const currentDeckHeading = `<div class="deck-region-heading"><h3 id="deckCurrentHeading">面板</h3></div>`;
    const currentDeck = `<section class="deck-current-column" data-deck-region="current" aria-labelledby="deckCurrentHeading">${currentDeckHeading}<div class="deck-slot-list">${slots}</div></section>`;
    content.innerHTML = canEdit
      ? `<div class="deck-view-shell is-editable"><div class="deck-manage-layout">${management}${currentDeck}</div></div>`
      : `<div class="deck-view-shell is-readonly">${currentDeck}</div>`;
    setFacilityFooter("");
  }

  return Object.freeze({
    renderGuildFacility,
    renderSkillsFacility,
    renderDeckFacility,
  });
});
