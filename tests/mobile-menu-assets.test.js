const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rpgRoot = path.resolve(__dirname, "..");
const indexSource = fs.readFileSync(path.join(rpgRoot, "index.html"), "utf8");
const responsiveCss = fs.readFileSync(path.join(rpgRoot, "responsive-ui-redesign.css"), "utf8");
const deploymentList = fs.readFileSync(path.join(rpgRoot, "filelist.txt"), "utf8");

const menuAssets = [
  "status-v2.png",
  "inventory-v2.png",
  "panel-v2.png",
  "skills-v2.png",
  "missions-v2.png",
];

test("mobile/PWA exploration icons are present and included in the deployment payload", () => {
  for (const filename of menuAssets) {
    const relativePath = `assets/ui/mobile-menu/${filename}`;
    assert.equal(fs.existsSync(path.join(rpgRoot, relativePath)), true, `${relativePath} should exist`);
    assert.match(indexSource, new RegExp(relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(deploymentList, new RegExp(`^${relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  }

  assert.match(responsiveCss, /\(display-mode: standalone\)/);
  assert.match(responsiveCss, /span\.explore-menu-icon/);
});
