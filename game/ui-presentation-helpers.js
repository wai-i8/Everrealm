(function (root, factory) {
  const itemData = root.EverrealmItemData
    || (typeof require === "function" ? require("../data/items.js") : null);
  const skills = root.LanternSkills
    || (typeof require === "function" ? require("../skill-core.js") : null);
  const api = factory(itemData, skills);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.EverrealmUiPresentation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (ItemData, Skills) {
  "use strict";

  function atlasIconHtml(atlas, index, label, extraClass = "") {
    const safeIndex = Math.max(0, Math.min(15, Number(index) || 0));
    const column = safeIndex % 4;
    const row = Math.floor(safeIndex / 4);
    return `<span class="atlas-icon ${atlas}-icon-atlas ${extraClass}" style="--atlas-x:${column * 33.333333}%;--atlas-y:${row * 33.333333}%" role="img" aria-label="${label}"></span>`;
  }

  function itemIconHtml(itemId, label, extraClass = "", fallbackIndex = 4) {
    const item = ItemData?.getItem?.(itemId);
    if (item?.iconSrc) {
      return `<span class="standalone-item-icon ${extraClass}" style="--item-icon-src:url('${item.iconSrc}')" role="img" aria-label="${label}"></span>`;
    }
    return atlasIconHtml("item", Number.isFinite(Number(item?.iconIndex)) ? Number(item.iconIndex) : fallbackIndex, label, extraClass);
  }

  function coinAmountHtml(amount, extraClass = "") {
    const value = Math.max(0, Math.floor(Number(amount) || 0)).toLocaleString("zh-HK");
    return `<span class="currency-amount ${extraClass}" aria-label="${value} 金幣"><i class="coin-icon" aria-hidden="true"></i><strong>${value}</strong></span>`;
  }

  function envelopeIconHtml(label = "公會委託獎勵信") {
    return `<span class="standalone-item-icon inventory-envelope-icon" style="--item-icon-src:url('assets/items/skill-envelope-v1.png')" role="img" aria-label="${label}"></span>`;
  }

  function materialDescription(id) {
    return ItemData?.getItem?.(id)?.description || "冒險途中取得嘅素材，可以留作交換或製作裝備。";
  }

  function skillStars(star) {
    return Skills.formatSkillBookRank(star);
  }

  function skillIcon(skill) {
    if (skill.tags.includes("heal")) return "♥";
    if (skill.tags.includes("defense")) return "♢";
    if (skill.tags.includes("mobility")) return "✣";
    if (skill.tags.includes("magic")) return "✦";
    if (skill.tags.includes("ranged")) return "➶";
    return skill.tags.includes("passive") ? "✦" : "·";
  }

  function skillBadgeMarkup(skill) {
    const passive = skill.tags.includes("passive");
    const label = passive ? "P" : "C";
    return `<span class="skill-kind-badge ${passive ? "is-psv" : "is-cmd"}" aria-hidden="true"><b>${label}</b></span>`;
  }

  function skillRangeText(skill) {
    if (skill.tags.includes("passive")) return "PSV · 自動生效";
    const range = Array.isArray(skill.rangeCellsRelative)
      ? `${skill.rangeCellsRelative.length} 格`
      : skill.range?.min == null || skill.range?.max == null
        ? "未確定"
        : skill.range.min === skill.range.max ? `${skill.range.max}` : `${skill.range.min}–${skill.range.max}`;
    const shapes = { single: "單體", self: "自身", line: "直線", cone: "扇形", cross: "十字", radius: "範圍", relative_cells: "範圍", line_to_target: "直線", impact_area: "爆發範圍" };
    return `${skill.apCost} AP · ${shapes[skill.area.shape] || skill.area.shape} · 射程 ${range}`;
  }

  function skillTypeText(skill) {
    if (skill.tags.includes("passive")) return "PSV 被動";
    if (skill.actionKind === "cleanse") return "CMD · 淨化";
    if (skill.dealsDamage && skill.deliveryMode === "linear") return "CMD · 線性攻擊";
    if (skill.dealsDamage && skill.deliveryMode === "arc") return "CMD · 弧線攻擊";
    if (skill.dealsDamage) return "CMD · 無路線效果";
    return "CMD · 輔助／控制";
  }

  function skillDamageText(skill) {
    if (skill.damage?.model?.type === "set_remaining_hp_fraction") return "特殊：目標剩餘生命比例";
    if (skill.damage?.model?.type === "set_remaining_hp_value") return "特殊：目標剩餘生命固定值";
    if (!skill.dealsDamage) return "無直接傷害";
    const multiplier = Skills.calculateSkillDamageMultiplier(skill);
    const utility = Number(skill.damage?.utility_multiplier);
    return `${multiplier.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}× 總傷害${utility < 1 ? ` · 輔助修正 ${utility}×` : ""}`;
  }

  function skillHeightText(skill) {
    const rule = skill.heightDifference;
    if (!rule || rule.status === "not_applicable") return "不適用";
    const value = (part) => part === "unlimited" ? "∞" : part == null ? "?" : part;
    return `上 ${value(rule.up)} · 下 ${value(rule.down)}${rule.status === "uncertain" ? "（來源未確定）" : ""}`;
  }

  return Object.freeze({
    atlasIconHtml,
    itemIconHtml,
    coinAmountHtml,
    envelopeIconHtml,
    materialDescription,
    skillStars,
    skillIcon,
    skillBadgeMarkup,
    skillRangeText,
    skillTypeText,
    skillDamageText,
    skillHeightText,
  });
});
