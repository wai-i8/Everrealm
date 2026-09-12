const test = require("node:test");
const assert = require("node:assert/strict");

const UiDom = require("../game/ui-dom-helpers.js");
const UiPresentation = require("../game/ui-presentation-helpers.js");
const Skills = require("../skill-core.js");

test("UI DOM helpers preserve normalization, text formatting, and DOM update behavior", () => {
  assert.equal(UiDom.normalizeCharacterName("  阿   巡  "), "阿 巡");
  assert.equal(UiDom.statText({ attack: 2, defense: -1, critChance: .125, accuracy: 4, weight: 9, maxHp: 20 }), "攻擊 +2 · 防禦 -1 · 暴擊 +13% · 命中 +4%");
  assert.equal(UiDom.escapeUiText(`<a>&\"'`), "&lt;a&gt;&amp;&quot;&#39;");
  assert.equal(UiDom.formatTime(125.9), "02:05");

  const element = { textContent: "old", style: { width: "10%" }, dataset: { state: "old" } };
  UiDom.setTextIfChanged(element, "new");
  UiDom.setStyleWidthIfChanged(element, "25%");
  UiDom.setDatasetIfChanged(element, "state", "ready");
  assert.deepEqual(element, { textContent: "new", style: { width: "25%" }, dataset: { state: "ready" } });

  const footer = { hidden: false, cleared: 0, replaceChildren() { this.cleared += 1; } };
  UiDom.setFacilityFooter(footer, "ignored");
  assert.equal(footer.cleared, 1);
  assert.equal(footer.hidden, true);
});

test("UI presentation helpers preserve icon markup and skill presentation output", () => {
  assert.equal(
    UiPresentation.atlasIconHtml("item", 5, "亮羽"),
    `<span class="atlas-icon item-icon-atlas " style="--atlas-x:33.333333%;--atlas-y:33.333333%" role="img" aria-label="亮羽"></span>`
  );
  assert.match(UiPresentation.itemIconHtml("weak_potion", "弱氣之藥"), /assets\/items\/weak-potion-v1\.png/);
  assert.match(UiPresentation.coinAmountHtml(12345), /12,345/);
  assert.match(UiPresentation.envelopeIconHtml(), /assets\/items\/skill-envelope-v1\.png/);
  assert.equal(UiPresentation.materialDescription("bright_feather"), "冒險途中取得嘅素材，可以留作交換或製作裝備。");

  const passive = { tags: ["passive"] };
  assert.equal(UiPresentation.skillIcon({ tags: ["heal"] }), "♥");
  assert.match(UiPresentation.skillBadgeMarkup(passive), /is-psv/);
  assert.equal(UiPresentation.skillRangeText(passive), "PSV · 自動生效");
  assert.equal(UiPresentation.skillTypeText(passive), "PSV 被動");
  assert.equal(UiPresentation.skillDamageText({ dealsDamage: false }), "無直接傷害");
  assert.equal(UiPresentation.skillHeightText({ heightDifference: { status: "not_applicable" } }), "不適用");

  const skill = Skills.getSkill("straight_punch");
  assert.ok(skill);
  assert.equal(UiPresentation.skillStars(skill.star), Skills.formatSkillBookRank(skill.star));
  assert.match(UiPresentation.skillDamageText(skill), /× 總傷害/);
});
