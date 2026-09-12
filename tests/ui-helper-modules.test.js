const test = require("node:test");
const assert = require("node:assert/strict");

const UiDom = require("../game/ui-dom-helpers.js");
const UiPresentation = require("../game/ui-presentation-helpers.js");
const SystemFeedback = require("../game/system-feedback.js");
const DialogueUi = require("../game/dialogue-ui.js");
const FacilityBasicViews = require("../game/facility-basic-views.js");
const FacilityProgressionViews = require("../game/facility-progression-views.js");
const FacilityBagView = require("../game/facility-bag-view.js");
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

test("catalog facility equipment view preserves paperdoll, stats, and equipment action markup", () => {
  const CatalogViews = require("../game/facility-catalog-views.js");
  const content = { innerHTML: "" };
  const footerMessages = [];
  let drewPaperdoll = false;
  const catalog = [
    { id: "gloves", name: "重拳套", slot: "weapon", occupiesSlots: ["weapon"], requiredLevel: 6, description: "重型拳套。", stats: { attack: 8 } },
    { id: "gi", name: "武道服", slot: "upperBody", occupiesSlots: ["upperBody", "lowerBody"], requiredLevel: 8, description: "一件式武道服。", stats: { defence: 5 } },
  ];
  CatalogViews.renderEquipmentFacility({
    content,
    setFacilityFooter: (message) => footerMessages.push(message),
    stats: { maxHp: 88, attack: 31, defence: 12, speed: 4.6, moveRange: 5 },
    level: 6,
    displayName: "阿巡",
    ownedEquipment: ["gloves", "gi"],
    equipped: { weapon: "gloves" },
    catalog,
    equipmentMatchesClass: () => true,
    isEquipmentEquipped: ({ equipped }, id) => Object.values(equipped).includes(id),
    statText: (stats) => stats.attack ? `攻擊 +${stats.attack}` : `防禦 +${stats.defence}`,
    equipmentIconHtml: (item, extraClass) => `<i class="${extraClass}" data-icon="${item.id}"></i>`,
    paperdollSlotHtml: (visualSlot, label, slot) => `<b data-slot="${visualSlot}:${label}:${slot}"></b>`,
    drawEquipmentPaperdoll: () => { drewPaperdoll = true; },
  });

  assert.match(content.innerHTML, /LV\.6 阿巡/);
  assert.match(content.innerHTML, /<dd>31<\/dd>/);
  assert.match(content.innerHTML, /<dd>5<\/dd>/);
  assert.match(content.innerHTML, /data-facility-action="unequip" data-item-id="gloves"/);
  assert.match(content.innerHTML, /data-facility-action="equip" data-item-id="gi" disabled>無法裝備<\/button>/);
  assert.match(content.innerHTML, /上身 · 一件式 · LV\.8/);
  assert.match(content.innerHTML, /2 件/);
  assert.equal(drewPaperdoll, true);
  assert.equal(footerMessages[0], '<span aria-hidden="true">⚔</span> 換裝會即時更新角色能力並自動保存。');
});

test("catalog facility shop view preserves buy and sell action datasets", () => {
  const CatalogViews = require("../game/facility-catalog-views.js");
  const content = { innerHTML: "" };
  const footerMessages = [];
  const catalog = [
    { id: "owned", name: "舊拳套", slot: "weapon", occupiesSlots: ["weapon"], requiredLevel: 2, description: "已擁有", stats: { attack: 2 }, cost: 100, purchasable: true },
    { id: "new", name: "新拳套", slot: "weapon", occupiesSlots: ["weapon"], requiredLevel: 6, description: "新品", stats: { attack: 8 }, cost: 200, purchasable: true },
  ];
  const common = {
    content,
    setFacilityFooter: (message) => footerMessages.push(message),
    tradeTabs: "<nav>tabs</nav>",
    atShop: true,
    category: "weapon",
    discountRate: 0.1,
    guildRankName: "白銀級",
    coins: 500,
    level: 6,
    ownedEquipment: ["owned"],
    equipped: {},
    catalog,
    fighterShopItemIdSet: new Set(["owned", "new"]),
    equipmentMatchesClass: () => true,
    equipmentSellPrice: (item) => item.cost / 2,
    isEquipmentEquipped: ({ equipped }, id) => Object.values(equipped).includes(id),
    statText: (stats) => `攻擊 +${stats.attack}`,
    equipmentIconHtml: (item) => `<i data-icon="${item.id}"></i>`,
    coinAmountHtml: (amount, extraClass = "") => `<span class="${extraClass}">${amount}</span>`,
  };

  CatalogViews.renderShopFacility({ ...common, mode: "buy" });
  assert.match(content.innerHTML, /data-shop-category="weapon" aria-selected="true"/);
  assert.match(content.innerHTML, /data-facility-action="equip" data-item-id="owned"/);
  assert.match(content.innerHTML, /data-facility-action="buy" data-item-id="new"/);
  assert.match(content.innerHTML, /原價 200/);
  assert.equal(footerMessages.at(-1), '<span aria-hidden="true">⚒</span> 500 金幣 · 白銀級折扣 10% · 裝備店');

  CatalogViews.renderShopFacility({ ...common, mode: "sell", equipped: { weapon: "owned" } });
  assert.match(content.innerHTML, /data-facility-action="sell-equipment" data-item-id="owned" disabled>請先卸下<\/button>/);
  assert.equal(footerMessages.at(-1), "");
});

test("catalog facility general-store view preserves buy/sell prices and disabled state", () => {
  const CatalogViews = require("../game/facility-catalog-views.js");
  const content = { innerHTML: "" };
  const footerMessages = [];
  const goods = [
    { id: "cheap", name: "平價藥", description: "平", price: 10 },
    { id: "dear", name: "貴價藥", description: "貴", price: 99 },
  ];
  const goodsById = new Map(goods.map((item) => [item.id, item]));
  goodsById.set("healing_potion", { description: "回復 30 HP。" });
  const common = {
    content,
    setFacilityFooter: (message) => footerMessages.push(message),
    tradeTabs: "<nav>tabs</nav>",
    coins: 20,
    potions: 0,
    inventory: {},
    goods,
    goodsById,
    itemData: { getItem: (id) => id === "mat" ? { name: "素材", description: "素材", kind: "material", sellable: true } : null },
    generalStoreSellPrice: (id) => id === "mat" ? 10 : 0,
    materialDescription: () => "素材描述",
    itemIconHtml: (id) => `<i data-item-icon="${id}"></i>`,
    coinAmountHtml: (amount, extraClass = "") => `<span class="${extraClass}">${amount}</span>`,
  };

  CatalogViews.renderGeneralStoreFacility({ ...common, mode: "buy" });
  assert.match(content.innerHTML, /data-facility-action="buy-store-item" data-item-id="cheap" >購買<\/button>/);
  assert.match(content.innerHTML, /data-facility-action="buy-store-item" data-item-id="dear" disabled>購買<\/button>/);

  CatalogViews.renderGeneralStoreFacility({ ...common, mode: "sell", inventory: { mat: 3 } });
  assert.match(content.innerHTML, /×3/);
  assert.match(content.innerHTML, /出售價 <span class="store-price">10<\/span>/);
  assert.match(content.innerHTML, /data-facility-action="sell-store-item" data-item-id="mat" >出售 1 件<\/button>/);
  assert.deepEqual(footerMessages, ["", ""]);
});

test("catalog facility codex view preserves hidden and discovered monster presentation", () => {
  const CatalogViews = require("../game/facility-catalog-views.js");
  const content = { innerHTML: "" };
  const footerMessages = [];
  CatalogViews.renderCodexFacility({
    content,
    setFacilityFooter: (message) => footerMessages.push(message),
    ids: ["turtle", "snake"],
    monsterKills: { turtle: 3 },
    legacyMonsterMigration: {},
    monsterBlueprint: (type) => type === "turtle"
      ? { battleRole: "tank", name_zh: "苔甲龜", codex: { summary: "耐打。" }, normalLevelRange: [6, 8] }
      : { battleRole: "poison", name_zh: "蛇", codex: { summary: "有毒。" }, normalLevelRange: [7, 9] },
  });
  assert.match(content.innerHTML, /1 \/ 2 種/);
  assert.match(content.innerHTML, /codex-card "><span class="codex-count">討伐 3/);
  assert.match(content.innerHTML, /codex-card is-unknown/);
  assert.match(content.innerHTML, /苔甲龜/);
  assert.match(content.innerHTML, /？？？/);
  assert.equal(footerMessages[0], '<span aria-hidden="true">◎</span> 每次討伐都會永久記錄；目前戰鬥只會獲得 EXP。');
});


test("progression facility guild view preserves active state and commission-detail action datasets", () => {
  const content = { innerHTML: "" };
  const footerMessages = [];
  FacilityProgressionViews.renderGuildFacility({
    content,
    setFacilityFooter: (message) => footerMessages.push(message),
    offers: [
      { id: "hunt-1", title: "討伐委託", star: 1 },
      { id: "delivery-1", title: "送信委託", star: 2 },
    ],
    activeId: "delivery-1",
    status: "ready_to_report",
    formatSkillBookRank: (star) => `${star}★`,
  });

  assert.match(content.innerHTML, /data-facility-action="commission-detail" data-offer-id="hunt-1"/);
  assert.match(content.innerHTML, /guild-simple-row is-active[^>]*data-offer-id="delivery-1"/);
  assert.match(content.innerHTML, /<span class="guild-simple-stars">2★<\/span><em>待回報<\/em>/);
  assert.deepEqual(footerMessages, [""]);
});

test("progression facility skill-tree view preserves links, state classes, and skill-detail datasets", () => {
  const content = { innerHTML: "" };
  const footerMessages = [];
  const classSkills = [
    { id: "jab", name: "直拳" },
    { id: "hook", name: "勾拳" },
  ];
  const layout = {
    maxDepth: 1,
    positions: new Map([
      ["jab", { depth: 0, x: 250 }],
      ["hook", { depth: 1, x: 750 }],
    ]),
    edges: [{ from: "jab", to: "hook" }],
  };
  const states = new Map([
    ["jab", { status: "learned" }],
    ["hook", { status: "canLearn" }],
  ]);
  FacilityProgressionViews.renderSkillsFacility({
    content,
    setFacilityFooter: (message) => footerMessages.push(message),
    classSkills,
    layout,
    states,
    stateLabel: (status) => status === "learned" ? "已學會" : "可學習",
  });

  assert.match(content.innerHTML, /class="skill-tree-link" data-from="jab" data-to="hook"/);
  assert.match(content.innerHTML, /skill-tree-node is-learned/);
  assert.match(content.innerHTML, /skill-tree-node is-canLearn/);
  assert.match(content.innerHTML, /data-facility-action="skill-detail" data-skill-id="hook"/);
  assert.match(content.innerHTML, /aria-label="勾拳，可學習"/);
  assert.deepEqual(footerMessages, [""]);
});

test("progression facility deck view preserves editable drag datasets and readonly presentation", () => {
  const content = { innerHTML: "" };
  const footerMessages = [];
  const jab = { id: "jab", name: "直拳" };
  const hook = { id: "hook", name: "勾拳" };
  const common = {
    content,
    setFacilityFooter: (message) => footerMessages.push(message),
    deckSlots: [jab, null],
    learnedSkills: [hook],
    skillBadgeMarkup: (skill) => `<i data-badge="${skill.id}"></i>`,
  };

  FacilityProgressionViews.renderDeckFacility({ ...common, canEdit: true });
  assert.match(content.innerHTML, /deck-view-shell is-editable/);
  assert.match(content.innerHTML, /data-deck-slot-index="0" data-deck-drag-source="slot" data-skill-id="jab"/);
  assert.match(content.innerHTML, /data-deck-slot-index="1"[^>]*aria-label="面板 2 空白"/);
  assert.match(content.innerHTML, /data-deck-drag-source="library" data-skill-id="hook"/);

  FacilityProgressionViews.renderDeckFacility({ ...common, canEdit: false, learnedSkills: [] });
  assert.match(content.innerHTML, /deck-view-shell is-readonly/);
  assert.doesNotMatch(content.innerHTML, /data-deck-region="learned"/);
  assert.deepEqual(footerMessages, ["", ""]);
});


test("bag facility view preserves filters, paperdoll, selection, paging, and action datasets", () => {
  const content = { innerHTML: "" };
  const footerMessages = [];
  const equipmentItem = {
    id: "gloves",
    name: "重拳套",
    quantity: 1,
    categoryKey: "equipment",
    equipment: { id: "gloves", name: "重拳套" },
    isEquipped: true,
    destroyable: false,
    description: "重型拳套。",
    detail: "攻擊 +8",
  };
  const manualItem = {
    id: "manual_dash",
    name: "技能書：疾步",
    quantity: 2,
    categoryKey: "skillbook",
    iconItemId: "skill_book_1",
    rankLabel: "初階",
    description: "快速移動。",
    detail: "自身 · 速度 A",
    action: "use-manual",
    actionLabel: "學習",
    manualSkillId: "dash",
    destroyable: true,
  };
  const helpers = {
    equipmentIconHtml: (item, extraClass = "") => `<i class="${extraClass}" data-equipment="${item.id}"></i>`,
    paperdollSlotHtml: (visualSlot, label, slot, options = {}) => `<b data-paperdoll="${visualSlot}:${label}:${slot}:${options.iconOnly ? "icon" : "full"}"></b>`,
    envelopeIconHtml: (label) => `<i data-envelope="${label}"></i>`,
    itemIconHtml: (id, label, extraClass = "") => `<i class="${extraClass}" data-item="${id}" aria-label="${label}"></i>`,
    atlasIconHtml: (atlas, index, label) => `<i data-atlas="${atlas}:${index}" aria-label="${label}"></i>`,
    coinAmountHtml: (amount) => `<span data-coins>${amount}</span>`,
  };

  FacilityBagView.renderBagFacility({
    content,
    setFacilityFooter: (message) => footerMessages.push(message),
    filteredItems: [equipmentItem, manualItem],
    visibleItems: [equipmentItem, manualItem],
    selectedItem: manualItem,
    pendingDestroyItemId: null,
    inventoryCategory: "all",
    inventoryPage: 0,
    pageCount: 2,
    coins: 123,
    ...helpers,
  });

  assert.match(content.innerHTML, /class="unified-inventory-layout"/);
  assert.match(content.innerHTML, /data-paperdoll="head:頭部:head:icon"/);
  assert.match(content.innerHTML, /inventory-equipment-item is-equipped/);
  assert.match(content.innerHTML, /data-facility-action="inventory-filter" data-inventory-category="all" aria-selected="true"/);
  assert.match(content.innerHTML, /data-facility-action="inventory-next"/);
  assert.match(content.innerHTML, /<span>1 \/ 2<\/span>/);
  assert.match(content.innerHTML, /data-facility-action="use-manual" data-skill-id="dash" data-item-id="manual_dash"/);
  assert.match(content.innerHTML, /data-facility-action="destroy-item" data-item-id="manual_dash"/);
  assert.match(content.innerHTML, /inventory-detail-rank">初階/);
  assert.match(content.innerHTML, /<span data-coins>123<\/span>/);
  assert.equal(footerMessages.at(-1), "");

  FacilityBagView.renderBagFacility({
    content,
    setFacilityFooter: (message) => footerMessages.push(message),
    filteredItems: [manualItem],
    visibleItems: [manualItem],
    selectedItem: manualItem,
    pendingDestroyItemId: "manual_dash",
    inventoryCategory: "skillbook",
    inventoryPage: 0,
    pageCount: 1,
    coins: 123,
    ...helpers,
  });

  assert.match(content.innerHTML, /data-inventory-category="skillbook" aria-selected="true"/);
  assert.match(content.innerHTML, /data-facility-action="confirm-destroy-item" data-item-id="manual_dash"/);
  assert.match(content.innerHTML, /data-facility-action="cancel-destroy-item" data-item-id="manual_dash"/);
  assert.doesNotMatch(content.innerHTML, /data-facility-action="use-manual"/);
});
