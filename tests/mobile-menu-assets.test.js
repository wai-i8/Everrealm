const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rpgRoot = path.resolve(__dirname, "..");
const indexSource = fs.readFileSync(path.join(rpgRoot, "index.html"), "utf8");
const stylesCss = fs.readFileSync(path.join(rpgRoot, "styles.css"), "utf8");
// filelist.txt is generated as UTF-16LE on Windows; normalize it before
// checking deployment paths so the asset regression test sees real lines.
const deploymentList = fs
  .readFileSync(path.join(rpgRoot, "filelist.txt"), "utf16le")
  .replace(/^\uFEFF/, "");

const menuAssets = [
  "status-v3.png",
  "inventory-v3.png",
  "panel-v3.png",
  "skills-v3.png",
  "missions-v3.png",
  "system-v3.png",
];

test("mobile/PWA exploration icons are present and included in the deployment payload", () => {
  for (const filename of menuAssets) {
    const relativePath = `assets/ui/mobile-menu/${filename}`;
    assert.equal(fs.existsSync(path.join(rpgRoot, relativePath)), true, `${relativePath} should exist`);
    assert.match(indexSource, new RegExp(relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(deploymentList, new RegExp(`^${relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  }

  assert.match(stylesCss, /\(display-mode: standalone\)/);
  assert.match(stylesCss, /span\.explore-menu-icon/);
});

test("icon rail resets the legacy text-menu grid before sizing the artwork", () => {
  const finalRailRuleStart = stylesCss.lastIndexOf("#exploreSidebar .sidebar-primary .explore-menu-button,");
  const finalRailRule = stylesCss.slice(finalRailRuleStart, stylesCss.indexOf("\n}", finalRailRuleStart) + 2);
  assert.match(finalRailRule, /grid-template-columns:\s*minmax\(0, 1fr\) !important/);
  assert.match(finalRailRule, /grid-template-rows:\s*minmax\(0, 1fr\) !important/);
  assert.match(stylesCss, /transform:\s*scale\(1\.06\) !important/);
});
