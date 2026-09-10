const test = require('node:test');
const assert = require('node:assert/strict');

const Classes = require('../data/classes.js');
const Items = require('../data/items.js');
const Equipment = require('../data/equipment.js');
const Quests = require('../data/quests.js');
const Monsters = require('../map/monster-blueprints.js');
const Guild = require('../guild-commission-core.js');
const Expansion = require('../expansion-core.js');
const Skills = require('../skill-core.js');

const uniqueIds = (rows) => new Set(rows.map((row) => row.id)).size === rows.length;

test('central catalogs expose stable unique IDs', () => {
  assert.deepEqual(Classes.CLASS_IDS, ['warrior', 'fighter']);
  assert.equal(Classes.CLASS_LEVEL_TABLES.warrior.length, 40);
  assert.equal(Classes.CLASS_LEVEL_TABLES.fighter.length, 40);
  assert.equal(uniqueIds(Items.ITEM_CATALOG), true);
  assert.equal(uniqueIds(Equipment.ALL_EQUIPMENT_CATALOG), true);
  assert.equal(uniqueIds(Quests.GUILD_COMMISSIONS), true);
  assert.equal(uniqueIds(Skills.SKILL_CATALOG), true);
  assert.equal(Monsters.CANONICAL_MONSTER_IDS.length, 9);
  assert.equal(Skills.SKILL_CATALOG.length, 81);
  assert.equal(Quests.GUILD_COMMISSIONS.length, 5);
});

test('item aliases migrate to canonical snake_case and merge quantities', () => {
  assert.equal(Items.normalizeItemId('warden-lens'), 'warden_lens');
  assert.equal(Items.normalizeItemId('bear-claw'), 'bear_claw');
  assert.deepEqual(
    Items.normalizeInventory({ 'warden-lens': 2, warden_lens: 3, 'bear-claw': 4, bear_claw: 2 }),
    { warden_lens: 5, bear_claw: 6 },
  );
});

test('monster drops resolve through the item catalog', () => {
  assert.equal(Monsters.validateMonsterCatalog().ok, true);
  for (const blueprint of Object.values(Monsters.MONSTER_BLUEPRINTS)) {
    if (!blueprint.drop) continue;
    assert.ok(Items.getItem(blueprint.drop.id), `${blueprint.id} drop must exist in item data`);
    assert.equal(blueprint.drop.name, Items.getItem(blueprint.drop.id).name);
  }
});

test('current guild commissions target canonical content IDs', () => {
  assert.deepEqual(Guild.DEFAULT_COMMISSIONS.map((x) => x.id), Quests.GUILD_COMMISSIONS.map((x) => x.id));
  for (const commission of Guild.DEFAULT_COMMISSIONS) {
    if (commission.type === 'hunt') assert.ok(Monsters.monsterBlueprint(commission.objective.monster_id));
  }
});

test('active equipment is separate from legacy-only save compatibility', () => {
  assert.equal(Equipment.EQUIPMENT_CATALOG.length, 20);
  assert.equal(Equipment.LEGACY_EQUIPMENT_CATALOG.length, 26);
  for (const id of Equipment.FIGHTER_SHOP_ITEM_IDS) {
    const item = Equipment.getEquipment(id, { activeOnly: true });
    assert.ok(item, `${id} must be active`);
    assert.equal(item.legacyOnly, false);
  }
  assert.equal(Equipment.getEquipment('tide_iron_knuckles').legacyOnly, true);
  assert.equal(Equipment.getEquipment('training_bracers').legacyOnly, true);
  const legacyRuntimeItem = Expansion.DEFAULT_EQUIPMENT_CATALOG.find((item) => item.id === 'tide_iron_knuckles');
  assert.equal(legacyRuntimeItem.purchasable, false);
});

test('runtime logic consumes central class/equipment data without old contract API', () => {
  assert.deepEqual(Expansion.classStatsAtLevel('fighter', 10), Classes.classStatsAtLevel('fighter', 10));
  assert.deepEqual(Expansion.starterEquipmentForClass('fighter'), { weapon: 'novice_gloves', upperBody: 'traveller_coat' });
  assert.equal(Expansion.DEFAULT_EQUIPMENT_CATALOG.length, Equipment.ALL_EQUIPMENT_CATALOG.length);
  assert.equal(Expansion.DEFAULT_CONTRACT_TEMPLATES, undefined);
  assert.equal(Expansion.createContractOffers, undefined);
  assert.equal(Expansion.claimContract, undefined);
});

test('fighter legacy skill aliases resolve without duplicate skills', () => {
  assert.equal(Skills.canonicalSkillId('straight_punch'), 'kentotsu');
  assert.equal(Skills.getSkill('kentotsu').name, '正拳');
  assert.deepEqual(Skills.CLASS_STARTER_SKILLS.fighter, ['kentotsu']);
});
