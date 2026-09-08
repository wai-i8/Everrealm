const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Skills = require("../skill-core.js");

const rpgRoot = path.resolve(__dirname, "..");
const gameSource = fs.readFileSync(path.join(rpgRoot, "game.js"), "utf8");
const indexSource = fs.readFileSync(path.join(rpgRoot, "index.html"), "utf8");
const treeCss = fs.readFileSync(path.join(rpgRoot, "inventory-overhaul.css"), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} should exist`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

function makeLayoutBuilder(skillsApi) {
  const source = `${extractFunction(gameSource, "skillTreeDepth")}\n${extractFunction(gameSource, "buildSkillTreeLayout")}\nbuildSkillTreeLayout;`;
  return vm.runInNewContext(source, { Skills: skillsApi });
}

test("warrior fallback layout is deterministic and derives tiers from prerequisites", () => {
  const skills = [
    { id: "root-a", prerequisites: [] },
    { id: "root-b", prerequisites: [] },
    { id: "a-one", prerequisites: ["root-a"] },
    { id: "b-one", prerequisites: ["root-b"] },
    { id: "merge", prerequisites: ["a-one", "b-one"] },
    { id: "finish", prerequisites: ["merge"] },
  ];
  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  const buildLayout = makeLayoutBuilder({ getSkill: (id) => byId.get(id) });
  const first = buildLayout(skills);
  const second = buildLayout(skills);

  assert.equal(first.authoredColumns, false);
  assert.equal(first.maxDepth, 3);
  assert.deepEqual(Array.from(first.tiers, (tier) => Array.from(tier, (skill) => skill.id)), [
    ["root-a", "root-b"],
    ["a-one", "b-one"],
    ["merge"],
    ["finish"],
  ]);
  assert.deepEqual(Array.from(first.edges, (edge) => `${edge.from}>${edge.to}`), [
    "root-a>a-one",
    "root-b>b-one",
    "a-one>merge",
    "b-one>merge",
    "merge>finish",
  ]);
  assert.deepEqual(Array.from(first.positions), Array.from(second.positions));
});

test("fighter layout uses every authored row and column without overlap or upward links", () => {
  const fighterSkills = Skills.getSkillsByClass("fighter");
  const buildLayout = makeLayoutBuilder(Skills);
  const layout = buildLayout(fighterSkills);

  assert.equal(layout.authoredColumns, true);
  assert.equal(layout.maxColumn, 9);
  assert.equal(layout.maxDepth, 9);
  assert.equal(layout.positions.size, 65);
  for (const skill of fighterSkills) {
    const position = layout.positions.get(skill.id);
    assert.equal(position.depth, skill.treeRow, `${skill.name} should use authored treeRow`);
  }
  for (const edge of layout.edges) {
    assert.ok(layout.positions.get(edge.to).depth > layout.positions.get(edge.from).depth, `${edge.from}>${edge.to} must point down`);
  }
  for (const tier of layout.tiers) {
    const xs = tier.map((skill) => layout.positions.get(skill.id).x).sort((a, b) => a - b);
    for (let index = 1; index < xs.length; index += 1) {
      assert.ok(xs[index] - xs[index - 1] >= 70, `same-row nodes overlap at ${xs[index - 1]} and ${xs[index]}`);
    }
  }
  const psvX = fighterSkills.filter((skill) => skill.treeGroup === "body_passive").map((skill) => layout.positions.get(skill.id).x);
  assert.equal(new Set(psvX).size, 1, "ten body PSV skills stay in one left column");
  assert.equal(new Set(["bougyo", "denkangeki", "ruka_hanki_ken", "ruka_kouitsu_ken", "kenshaku"].map((id) => layout.positions.get(id).x)).size, 1);
  assert.equal(new Set(["hijo_tenketsu", "shincha_tenketsu", "kaimoku_tenketsu", "boumin_daha", "kikou_gedoku"].map((id) => layout.positions.get(id).x)).size, 1);
});

test("facility renders compact name-only SVG/DOM nodes and opens a dismissible detail modal", () => {
  const renderSource = extractFunction(gameSource, "renderSkillsFacility");
  assert.match(renderSource, /const treeNodeTop = \(depth\) => 28 \+ depth \* 78/);
  assert.match(renderSource, /<svg class="skill-tree-links"[^>]*viewBox=/);
  assert.match(renderSource, /class="skill-tree-link is-\$\{linkState\}" data-from=/);
  assert.match(renderSource, /class="skill-tree-board" role="tree"/);
  assert.match(renderSource, /class="skill-tree-node-trigger"[^>]*data-facility-action="skill-detail"/);
  assert.match(renderSource, /<strong>\$\{skill\.name\}<\/strong><\/button>/);
  assert.doesNotMatch(renderSource, /skill-tree-node-icon|skill-tree-node-state|data-facility-action="use-manual"/);
  assert.doesNotMatch(gameSource, /skillDetailIcon/);
  assert.doesNotMatch(indexSource, />技</);

  assert.match(indexSource, /id="skillDetailPanel"[^>]*data-modal-backdrop-dismiss="skill-detail"/);
  assert.match(indexSource, /id="skillDetailCloseButton"[^>]*class="ui-close-button modal-close-button"/s);
  assert.match(indexSource, /id="skillDetailStats"[^>]*class="ui-detail-list"/s);
  assert.match(gameSource, /skillDetailPanel\.addEventListener\("click", \(event\) => \{\s*if \(event\.target === skillDetailPanel\) closeSkillDetail\(\)/s);
  assert.match(gameSource, /skillDetailLearnButton"\)\.addEventListener\("click", learnFromSkillDetail\)/);
  assert.match(gameSource, /class="ui-detail-row"><dt>可選範圍/);
  assert.doesNotMatch(gameSource, /skillDetailStats[\s\S]*grid-template-columns: repeat\(2/);

  assert.match(treeCss, /\.skill-tree-scroll\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(treeCss, /\.skill-tree-scroll\s*\{[^}]*max-height:\s*min\(32rem,62vh\)/s);
  assert.match(treeCss, /\.skill-tree-board\s*\{[^}]*width:\s*max\(100%,var\(--tree-min-width,50rem\)\)[^}]*height:\s*var\(--tree-height\)/s);
  assert.match(treeCss, /\.skill-tree-links\s*\{[^}]*z-index:\s*0/s);
  assert.match(treeCss, /\.skill-tree-node\s*\{[^}]*position:\s*absolute[^}]*z-index:\s*2[^}]*height:\s*2\.625rem/s);
  assert.match(treeCss, /\.skill-tree-node-trigger\s*\{[^}]*width:\s*100%[^}]*height:\s*100%/s);
  assert.match(treeCss, /\.skill-tree-node\.is-learned\s*\{/);
  assert.match(treeCss, /\.skill-tree-node\.is-canLearn\s*\{/);
  assert.match(treeCss, /\.skill-tree-node\.is-missingPrereq,[\s\S]*?border-style:\s*dashed/);
  assert.doesNotMatch(treeCss, /\.skill-tree-board \{ width: 46rem; \}/);
});

test("multi-hit damage uses authored total output, hit metadata, and floating numbers", () => {
  const rising = Skills.getSkill("rising_knuckle");
  assert.equal(rising.name, "連擊");
  assert.equal(rising.star, 2);
  assert.equal(rising.apCost, 12);
  assert.equal(rising.speedGrade, "B");
  assert.equal(rising.effects.find((effect) => effect.type === "damage").hits, 2);
  assert.match(gameSource, /const hitCount = Math\.max\(1, Math\.floor\(Number\(skill\.hitResolution\?\.hit_count \|\| damageEffect\.hits\) \|\| 1\)\)/);
  assert.match(gameSource, /const recheck = Boolean\(skill\.hitResolution\?\.recheck_attack_path_each_hit\)/);
  assert.match(gameSource, /const split = Skills\.splitDamageLaterHits\(totalDamage, hitCount\)/);
  assert.match(gameSource, /heroHitResolvers\.push\(\{ hitCount, recheck/);
  assert.match(gameSource, /critical: skill\.area\.shape === "single" && hitIndex === 0 && battleRandom\(\) < playerStats\(\)\.critChance/);
  assert.match(gameSource, /applyBattleHit\(hit\.target, hit\.damage, hit\.color, hit\.hitIndex, hit\.hitCount\)/);
  assert.match(gameSource, /const spread = \(hitIndex - \(hitCount - 1\) \/ 2\) \* \.18/);
});
