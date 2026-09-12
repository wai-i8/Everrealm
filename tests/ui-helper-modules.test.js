const test = require("node:test");
const assert = require("node:assert/strict");

const UiDom = require("../game/ui-dom-helpers.js");
const UiPresentation = require("../game/ui-presentation-helpers.js");
const SystemFeedback = require("../game/system-feedback.js");
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

test("system feedback preserves toast, announcement, and system-log state behavior", () => {
  const scheduled = [];
  const stored = [];
  let collapsed = false;
  let filter = "all";
  let serial = 0;
  const entries = [];
  const classList = () => ({
    values: new Set(),
    toggle(name, enabled) { enabled ? this.values.add(name) : this.values.delete(name); },
    add(name) { this.values.add(name); },
    contains(name) { return this.values.has(name); },
  });
  const systemLog = { classList: classList(), dataset: {} };
  const toggleButton = {
    textContent: "",
    title: "",
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
  };
  const combatTab = { dataset: { logFilter: "combat" }, classList: classList(), attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
  const allTab = { dataset: { logFilter: "all" }, classList: classList(), attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
  const systemLogMessages = { innerHTML: "", scrollHeight: 120, scrollTop: 0 };
  const dom = {
    toastElement: { textContent: "", className: "", offsetWidth: 120, classList: classList() },
    ariaLive: { textContent: "old" },
    systemLog,
    systemLogToggleButton: toggleButton,
    systemLogTabs: { querySelectorAll() { return [combatTab, allTab]; } },
    systemLogMessages,
  };
  const feedback = SystemFeedback.create({
    dom,
    labels: { combat: "戰鬥", system: "系統" },
    escapeUiText: UiDom.escapeUiText,
    storage: { setItem(key, value) { stored.push([key, value]); } },
    storageKey: "collapsed-key",
    setTimeout(callback, delay) { scheduled.push({ callback, delay }); },
    state: {
      getFilter: () => filter,
      getEntries: () => entries,
      getCollapsed: () => collapsed,
      setCollapsed: (value) => { collapsed = value; },
      nextSerial: () => ++serial,
    },
  });

  feedback.showToast("第一個", "good");
  feedback.showToast("第二個", "danger");
  assert.equal(dom.toastElement.textContent, "第二個");
  assert.equal(dom.toastElement.className, "game-toast danger");
  assert.equal(dom.toastElement.classList.contains("show"), true);

  feedback.announce("回復 10 生命");
  assert.equal(dom.ariaLive.textContent, "");
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].delay, 20);
  scheduled[0].callback();
  assert.equal(dom.ariaLive.textContent, "回復 10 生命");

  feedback.addSystemMessage("combat", "命中 <目標>。", "incoming");
  assert.deepEqual(entries, [{ id: 1, type: "combat", text: "命中 <目標>", tone: "incoming" }]);
  assert.match(systemLogMessages.innerHTML, /\[戰鬥\]/);
  assert.match(systemLogMessages.innerHTML, /命中 &lt;目標&gt;/);
  assert.equal(systemLogMessages.scrollTop, 120);
  assert.equal(combatTab.attributes["aria-pressed"], "false");
  assert.equal(allTab.attributes["aria-pressed"], "true");

  filter = "combat";
  feedback.addSystemMessage("system", "不應顯示。", "");
  assert.doesNotMatch(systemLogMessages.innerHTML, /不應顯示/);
  assert.equal(combatTab.attributes["aria-pressed"], "true");

  feedback.toggleSystemLogCollapsed();
  assert.equal(collapsed, true);
  assert.deepEqual(stored, [["collapsed-key", "1"]]);
  assert.equal(systemLog.dataset.collapsed, "true");
  assert.equal(toggleButton.textContent, "+");
  assert.equal(toggleButton.attributes["aria-expanded"], "false");

  const throwingFeedback = SystemFeedback.create({
    dom,
    labels: { system: "系統" },
    escapeUiText: UiDom.escapeUiText,
    storage: { setItem() { throw new Error("storage unavailable"); } },
    storageKey: "collapsed-key",
    state: {
      getFilter: () => filter,
      getEntries: () => entries,
      getCollapsed: () => collapsed,
      setCollapsed: (value) => { collapsed = value; },
      nextSerial: () => ++serial,
    },
  });
  assert.doesNotThrow(() => throwingFeedback.toggleSystemLogCollapsed());
  assert.equal(collapsed, false);

  filter = "all";
  for (let index = 0; index < 405; index += 1) feedback.addSystemMessage("system", `記錄 ${index}`);
  assert.equal(entries.length, 400);
  assert.equal(entries[0].text, "記錄 5");
  assert.equal(entries.at(-1).text, "記錄 404");
});
