const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourceText = fs.readFileSync(path.resolve(__dirname, '..', 'main-town-bgm-loop.js'), 'utf8');

const baseCalls = [];
const baseManager = {
  setEnabled(value) { baseCalls.push(['enabled', value]); },
  setMap(value) { baseCalls.push(['map', value]); },
  snapshot() { return { base: true }; },
};

let createdSource = null;
class FakeAudioContext {
  constructor() { this.state = 'running'; this.destination = {}; }
  createGain() { return { gain: { value: 0 }, connect() {} }; }
  createBufferSource() {
    createdSource = {
      buffer: null,
      loop: false,
      loopStart: 0,
      loopEnd: 0,
      connect() {},
      disconnect() {},
      startCalls: [],
      start(...args) { this.startCalls.push(args); },
      stop() { this.stopped = true; },
      onended: null,
    };
    return createdSource;
  }
  decodeAudioData() { return Promise.resolve({ duration: 118.119274 }); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
}

const documentStub = {
  addEventListener() {},
  removeEventListener() {},
};
const windowStub = {
  AudioContext: FakeAudioContext,
  LanternBgm: {
    createBgmManager() { return baseManager; },
    marker: 'preserved',
  },
};

const sandbox = {
  window: windowStub,
  globalThis: windowStub,
  document: documentStub,
  fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
  console,
  Promise,
  Error,
  Math,
  Object,
  Boolean,
  Reflect,
  Proxy,
};
vm.createContext(sandbox);
vm.runInContext(sourceText, sandbox, { filename: 'main-town-bgm-loop.js' });

(async () => {
  assert.equal(windowStub.LanternBgm.marker, 'preserved');
  const manager = windowStub.LanternBgm.createBgmManager({ enabled: true });

  manager.setMap('world');
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(baseCalls[0], ['enabled', false]);
  assert.ok(createdSource, 'main town should create a Web Audio source');
  assert.equal(createdSource.loop, true);
  assert.ok(Math.abs(createdSource.loopStart - 14.209977) < 1e-9);
  assert.ok(Math.abs(createdSource.loopEnd - 118.119274) < 1e-6);
  assert.deepEqual(createdSource.startCalls[0], [0, 0]);

  manager.setEnabled(false);
  manager.setEnabled(true);
  manager.setMap('world');
  assert.equal(createdSource.stopped, undefined, 're-setting world must not restart/stop intro');

  manager.setMap('field');
  assert.equal(createdSource.stopped, true, 'leaving main town should stop custom source');
  assert.ok(baseCalls.some((call) => call[0] === 'enabled' && call[1] === true));
  assert.ok(baseCalls.some((call) => call[0] === 'map' && call[1] === 'field'));

  const snapshot = manager.snapshot();
  assert.equal(snapshot.base, true);
  assert.equal(snapshot.currentMapId, 'field');

  console.log('main-town-bgm-loop.test.js: ok');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
