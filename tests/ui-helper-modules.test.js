const test = require("node:test");
const assert = require("node:assert/strict");

const UiDom = require("../game/ui-dom-helpers.js");
const UiPresentation = require("../game/ui-presentation-helpers.js");
const SystemFeedback = require("../game/system-feedback.js");
const DialogueUi = require("../game/dialogue-ui.js");
const FacilityBasicViews = require("../game/facility-basic-views.js");
const Skills = require("../skill-core.js");

function testClassList() {
  const values = new Set();
  return {
    toggle(name, enabled) { enabled ? values.add(name) : values.delete(name); },
    add(name) { values.add(name); },
    remove(name) { values.delete(name); },
    contains(name) { return values.has(name); },
  };
}

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

test("dialogue UI preserves text, visibility, choice markup, and progression callbacks", () => {
  const nextLabel = { textContent: "" };
  const choices = {
    hidden: true,
    classList: testClassList(),
    children: [],
    _innerHTML: "existing",
    appendChild(button) { this.children.push(button); },
  };
  Object.defineProperty(choices, "innerHTML", {
    get() { return this._innerHTML; },
    set(value) { this._innerHTML = value; this.children = []; },
  });
  const next = {
    hidden: false,
    dataset: {},
    attributes: {},
    querySelector() { return nextLabel; },
    setAttribute(name, value) { this.attributes[name] = value; },
  };
  const dialogueText = { textContent: "" };
  const createdButtons = [];
  const dom = { dialogueText, dialogueChoices: choices, dialogueNext: next };
  let dialogue = { lines: ["你好 <冒險者>", "準備好嗎？"], index: 0 };
  let choiceIndex = 0;
  const selected = [];
  const renderer = DialogueUi.create({
    getDom: () => dom,
    getDialogue: () => dialogue,
    getChoiceIndex: () => choiceIndex,
    createElement: () => {
      const button = {
        type: "",
        className: "",
        textContent: "",
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, callback) { this[name] = callback; },
        focus() { this.focused = true; },
      };
      createdButtons.push(button);
      return button;
    },
    onChooseDialogueOption: (index) => selected.push(index),
  });

  renderer.renderDialogue();
  assert.equal(dialogueText.textContent, "你好 <冒險者>");
  assert.equal(nextLabel.textContent, "繼續");
  assert.equal(next.dataset.dialogueState, "continue");
  assert.equal(next.attributes["aria-label"], "繼續對話");
  assert.equal(choices.hidden, true);
  assert.equal(next.hidden, false);

  dialogue = {
    lines: ["完成 <任務>"],
    index: 0,
    choiceLayout: "compact",
    choices: [{ label: "接受 & 出發", buttonStyle: "primary" }],
  };
  renderer.renderDialogue();
  assert.equal(dialogueText.textContent, "完成 <任務>");
  assert.equal(nextLabel.textContent, "確定");
  assert.equal(next.dataset.dialogueState, "terminal");
  assert.equal(next.attributes["aria-label"], "確定並關閉對話");
  assert.equal(choices.hidden, false);
  assert.equal(next.hidden, true);
  assert.equal(choices.classList.contains("is-compact"), true);
  assert.equal(createdButtons.length, 1);
  assert.equal(createdButtons[0].textContent, "接受 & 出發");
  assert.match(createdButtons[0].className, /is-primary primary-button/);
  assert.equal(createdButtons[0].attributes["aria-pressed"], "true");
  assert.equal(createdButtons[0].focused, true);
  createdButtons[0].click();
  assert.deepEqual(selected, [0]);
});

test("basic facility views preserve status markup and zero-value presentation", () => {
  const content = { innerHTML: "" };
  const footerMessages = [];
  FacilityBasicViews.renderStatusFacility({
    content,
    setFacilityFooter: (message) => footerMessages.push(message),
    view: {
      displayName: "阿巡",
      className: "格鬥士",
      level: 3,
      hp: 0,
      maxHp: 42,
      hpPercent: 0,
      xp: 0,
      xpNeeded: 120,
      xpPercent: 0,
      attack: 11,
      defence: 7,
      moveRange: 4,
    },
  });
  assert.match(content.innerHTML, /class="status-compact" aria-label="角色狀態"/);
  assert.match(content.innerHTML, /阿巡/);
  assert.match(content.innerHTML, /生命 0 \/ 42/);
  assert.match(content.innerHTML, /經驗值 0 \/ 120/);
  assert.match(content.innerHTML, /<dt>攻擊<\/dt><dd>11<\/dd>/);
  assert.match(content.innerHTML, /<dt>防禦<\/dt><dd>7<\/dd>/);
  assert.match(content.innerHTML, /<dt>移動<\/dt><dd>4<\/dd>/);
  assert.deepEqual(footerMessages, [""]);
});

test("mission facility view preserves empty, active, and completed states", () => {
  const content = { innerHTML: "" };
  const footerMessages = [];
  const render = (view) => FacilityBasicViews.renderMissionFacility({
    content,
    setFacilityFooter: (message) => footerMessages.push(message),
    view,
  });

  render({ active: false });
  assert.match(content.innerHTML, /mission-view is-empty/);
  assert.match(content.innerHTML, /目前沒有進行中的任務/);

  render({
    active: true,
    ready: false,
    title: "山雀仔討伐",
    objectiveText: "討伐山雀仔 × 3",
    progressText: "1 / 3",
    progressMax: 3,
    progressValue: 1,
    progressPercent: 33.33333333333333,
  });
  assert.match(content.innerHTML, /class="mission-card "/);
  assert.match(content.innerHTML, /山雀仔討伐/);
  assert.match(content.innerHTML, /討伐山雀仔 × 3/);
  assert.match(content.innerHTML, /1 \/ 3/);
  assert.doesNotMatch(content.innerHTML, /mission-report-note/);

  render({
    active: true,
    ready: true,
    title: "山雀仔討伐",
    objectiveText: "討伐山雀仔 × 3",
    progressText: "3 / 3",
    progressMax: 3,
    progressValue: 3,
    progressPercent: 100,
  });
  assert.match(content.innerHTML, /mission-card is-ready/);
  assert.match(content.innerHTML, /已完成/);
  assert.match(content.innerHTML, /mission-report-note/);
  assert.match(content.innerHTML, /style="width:100%"/);
  assert.deepEqual(footerMessages, ["", "", ""]);
});
