const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const uiCss = fs.readFileSync(path.join(root, "inventory-overhaul.css"), "utf8");
const maps = require(path.join(root, "map", "map-registry.js")).createMapRegistry();

test("Guild commission UI is single-identity, summary-first and progressive-disclosure", () => {
  const renderGuild = game.match(/function renderGuildFacility\(\) \{([\s\S]*?)\r?\n  \}\r?\n\r?\n  function totalOwnedSkillBooks/)?.[1] || "";
  assert.match(game, /guild: \["GUILD COMMISSIONS", "公會委託"/);
  assert.match(game, /一份委託只可以同時進行/);
  assert.doesNotMatch(renderGuild, /拾燈公會|公會委託板|公會規矩|canonical Fighter/);
  assert.match(renderGuild, /guild-commission-state-line/);
  assert.match(renderGuild, /guild-commission-card/);
  for (const field of ["目標", "建議等級", "進度", "獎勵"]) assert.match(renderGuild, new RegExp(`<dt>${field}</dt>`));
  for (const action of ["accept", "abandon", "claim"]) assert.match(renderGuild, new RegExp(`data-facility-action=\\"${action}\\"`));
  assert.match(renderGuild, /guild-commission-actions/);
  assert.match(renderGuild, /role="progressbar"/);
  assert.match(uiCss, /\.guild-commission-card\s*\{[\s\S]*?grid-template-rows:\s*auto auto auto auto/);
  assert.match(uiCss, /\.guild-commission-actions\s*\{[\s\S]*?align-items:\s*stretch/);
  assert.match(uiCss, /@media \(max-width: 650px\)[\s\S]*?\.guild-commission-details\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(uiCss, /@media \(max-width: 650px\)[\s\S]*?\.guild-commission-actions\s*\{\s*grid-template-columns:\s*1fr/);
});

test("Guild help carries rules while player-facing UI avoids developer terminology", () => {
  assert.match(game, /facilityHelpText\.textContent = copy\[2\]/);
  assert.match(game, /五份固定委託都可以重複接受/);
  assert.match(game, /完成目標後返公會回報/);
  assert.doesNotMatch(game.match(/function renderGuildFacility\(\) \{([\s\S]*?)\r?\n  \}\r?\n\r?\n  function totalOwnedSkillBooks/)?.[1] || "", /canonical Fighter|Fighter 技能資料/);
  assert.doesNotMatch(game, /開封後從 canonical Fighter/);
  assert.doesNotMatch(game, /仍須符合 Fighter 前置/);
});

test("active NPCs expose functional map labels without changing identity or routing", () => {
  const expected = [
    ["guild", "guildmaster-yin", "妍姐", "公會接待員", ["guild-rank", "bounty-report", "repeatable-bounties"]],
    ["shop", "merchant-gin", "銀姐", "裝備店店員", ["equipment-shop", "sell", "compare-equipment"]],
    ["general-store", "store-merchant-gin", "穀嬸", "道具店店員", ["general-store"]],
    ["inn", "inn-keeper", "朵姨", "旅館接待員", ["inn-rest"]],
    ["clinic", "clinic-healer-siu-moon", "小滿", "醫療所護士", ["clinic-healing"]],
    ["field", "mountain_delivery_recipient", "洛安", "山地收件員", ["guild-delivery"]],
    ["dungeon", "lost-explorer-kai", "露娜", "坑道探索者", ["dungeon-tip"]],
  ];
  for (const [mapId, id, previousName, displayName, services] of expected) {
    const npc = maps[mapId].npcs.find((candidate) => candidate.id === id);
    assert.ok(npc, `${id} should remain active in ${mapId}`);
    assert.equal(npc.name, previousName, `${id} dialogue identity should remain stable`);
    assert.equal(npc.displayName, displayName, `${id} should use its functional map label`);
    assert.deepEqual(npc.services, services, `${id} service routing should remain stable`);
  }
  assert.deepEqual(maps.world.npcs, [], "Main Town street NPCs must remain absent");
  assert.match(game, /function npcDisplayName\(npc\)/);
  assert.match(game, /drawNpcName\(anchorX, nameY, npcDisplayName\(npc\)\)/);
  assert.match(game, /if \(entity\.kind === "npc"\) return `同\$\{npcDisplayName\(entity\)\}傾偈`/);
  assert.match(game, /speaker: npc\.name/);
});
