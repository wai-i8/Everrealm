const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('index script manifest points only to existing files', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const match = html.match(/const scripts = \[([\s\S]*?)\];/);
  assert.ok(match, 'script list must exist');
  const scripts = [...match[1].matchAll(/"([^"]+\.js(?:\?[^\"]+)?)"/g)].map((m) => m[1].split('?')[0]);
  assert.ok(scripts.includes('data/items.js'));
  assert.ok(scripts.includes('data/equipment.js'));
  assert.ok(scripts.includes('data/monsters.js'));
  assert.ok(scripts.includes('data/skills/fighter.js'));
  assert.equal(scripts.includes('fighter-skill-data.js'), false);
  for (const script of scripts) assert.equal(fs.existsSync(path.join(root, script)), true, `${script} missing`);
});

test('map registry can be created in Node', () => {
  const Registry = require('../map/map-registry.js');
  const maps = Registry.createMapRegistry();
  assert.ok(maps.world);
  assert.ok(maps.field);
  assert.ok(maps.dungeon);
  assert.ok(maps.guild);
  assert.ok(maps.shop);
});

test('legacy duplicate root map files were removed', () => {
  for (const name of ['equipment-shop.js', 'weapon-navigation.js', 'weapon-navigation.generated.js', 'item-navigation.js', 'item-navigation.generated.js']) {
    assert.equal(fs.existsSync(path.join(root, name)), false, `${name} should not exist at project root`);
  }
});

test('service worker copies stay synchronized', () => {
  assert.equal(
    fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8'),
    fs.readFileSync(path.join(root, 'everrealm-sw.js'), 'utf8'),
  );
});
