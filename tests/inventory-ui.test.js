const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Expansion = require("../expansion-core.js");

const rpgRoot = path.resolve(__dirname, "..");
const gameSource = fs.readFileSync(path.join(rpgRoot, "game.js"), "utf8");
const inventoryCss = fs.readFileSync(path.join(rpgRoot, "inventory-overhaul.css"), "utf8");

test("inventory and class-specific equipment atlases exist and every catalog item has an explicit frame", () => {
  for (const filename of ["item-icon-atlas-v1.png", "equipment-icon-atlas-v1.png", "fighter-equipment-atlas-v1.png"]) {
    const assetPath = path.join(rpgRoot, "assets", filename);
    assert.equal(fs.existsSync(assetPath), true, `${filename} should exist`);
    assert.ok(fs.statSync(assetPath).size > 100_000, `${filename} should contain generated art`);
  }
  const mapping = gameSource.match(/const EQUIPMENT_ICON_INDEX = Object\.freeze\(\{([\s\S]*?)\}\);/)?.[1] || "";
  Expansion.DEFAULT_EQUIPMENT_CATALOG.filter((item) => item.classId !== "fighter").forEach((item, index) => {
    assert.match(mapping, new RegExp(`\\b${item.id}:\\s*${index}(?:,|\\s)`), `${item.id} should map to frame ${index}`);
  });
  const fighterMapping = gameSource.match(/const FIGHTER_EQUIPMENT_ICON_INDEX = Object\.freeze\(\{([\s\S]*?)\}\);/)?.[1] || "";
  Expansion.DEFAULT_EQUIPMENT_CATALOG.filter((item) => item.classId === "fighter" && item.slot === "weapon").forEach((item) => {
    assert.match(fighterMapping, new RegExp(`\\b${item.id}:\\s*[0-3](?:,|\\s)`), `${item.id} should map to a fighter frame`);
  });
  Expansion.DEFAULT_EQUIPMENT_CATALOG.filter((item) => item.classId === "fighter" && item.slot !== "weapon").forEach((item) => {
    assert.match(gameSource, new RegExp(`\\b${item.id}:\\s*\\d+`), `${item.id} should map to a generic equipment frame`);
  });
  assert.match(gameSource, /fighter-equipment/, "fighter weapons should select their dedicated atlas");
  assert.match(gameSource, /"warden-lens":\s*14/, "the actual boss-drop id should use the warden-lens icon");
});

test("bag uses an icon grid and paper doll exposes all seven canonical visual slots", () => {
  assert.match(gameSource, /class="inventory-icon-grid"/);
  assert.match(gameSource, /class="inventory-grid-item\s/);
  for (const slot of ["weapon", "head", "upperBody", "lowerBody", "hands", "feet", "charm"]) {
    assert.match(gameSource, new RegExp(`paperdollSlotHtml\\("${slot}"`));
    assert.match(inventoryCss, new RegExp(`data-paperdoll-slot="${slot}"`));
  }
  assert.match(inventoryCss, /\.item-icon-atlas\s*\{/);
  assert.match(inventoryCss, /\.equipment-icon-atlas\s*\{/);
  assert.match(inventoryCss, /data-paperdoll-slot="upperBody"/);
  assert.match(inventoryCss, /data-paperdoll-slot="lowerBody"/);
});

test("bag keeps a contained loadout beside a compact selectable grid", () => {
  const bagRenderer = gameSource.match(/function renderBagFacility\(\)\s*\{([\s\S]*?)\r?\n  \}\r?\n\r?\n  function equipmentIconHtml/)?.[1] || "";
  assert.match(bagRenderer, /class="unified-inventory-layout"/);
  assert.match(bagRenderer, /class="bag-loadout-panel"/);
  assert.match(bagRenderer, /class="bag-items-panel"/);
  assert.match(bagRenderer, /ownedEquipment\.includes\(entry\.id\)/);
  assert.match(bagRenderer, /inventory-equipment-item/);
  assert.match(bagRenderer, /data-facility-action="select-item"/);
  assert.match(bagRenderer, /inventory-selected-detail/);
  assert.match(bagRenderer, /inventory-filter/);
  assert.match(bagRenderer, /actionMarkup/);
  assert.match(bagRenderer, /drawEquipmentPaperdoll\(\)/);
  assert.match(bagRenderer, /完整描述與可用動作/);
  assert.match(inventoryCss, /\.unified-inventory-layout\s*\{[^}]*grid-template-columns:\s*minmax\(27rem/s);
  assert.match(inventoryCss, /@media \(max-width: 900px\)[\s\S]*?\.unified-inventory-layout\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(inventoryCss, /\.inventory-grid-item\.is-selected/);
  assert.match(inventoryCss, /\.inventory-selected-detail/);
  assert.match(bagRenderer, /inventoryFixtureCount/);
  assert.match(gameSource, /setInventoryFixture:/);
  assert.match(inventoryCss, /\.bag-paperdoll-board\s*\{[^}]*grid-template-columns:\s*minmax\(9\.2rem,1fr\) 7\.4rem/s);
});

test("the extra stylesheet keeps facility text readable at 100% browser zoom", () => {
  assert.match(gameSource, /stylesheet\.href = "inventory-overhaul\.css"/);
  assert.match(inventoryCss, /\.inventory-item-copy > p/);
  assert.match(inventoryCss, /\.inventory-item-copy > p[^}]*font-size:\s*\.74rem/s);
  assert.match(inventoryCss, /\.facility-content \.facility-action-button\s*\{[^}]*font-size:\s*\.74rem/s);
});

test("inventory fixture contract covers both required stress sizes without changing gameplay data", () => {
  assert.match(gameSource, /inventoryFixtureCount = Core\.clamp\(Math\.floor\(Number\(count\) \|\| 0\), 0, 30\)/);
  assert.match(gameSource, /id: `fixture_material_\$\{index \+ 1\}`/);
  assert.match(gameSource, /只供版面壓力測試使用，不會寫入存檔/);
  assert.match(inventoryCss, /\.inventory-icon-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(auto-fill/);
  assert.match(inventoryCss, /\.unified-inventory-layout\s*\{[\s\S]*grid-template-columns/);
  assert.match(inventoryCss, /@media \(max-width: 900px\)[\s\S]*?\.unified-inventory-layout\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(inventoryCss, /\.inventory-selected-detail\s*\{/);
});
