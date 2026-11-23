const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');
function load(name, mocks = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', name + '.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: (id) => mocks[id] || load(id.replace('@/', ''), mocks) });
  return module.exports;
}
const amounts = load('lib/amount-draft');
const validation = load('lib/finance-validation');
test('startup isolation requires explicit development opt-in; production always loads the real app', () => {
  const source = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8');
  for (const [dev, flag, expected] of [[true, '1', './diagnostics/startup-entry'], [true, undefined, 'expo-router/entry'], [false, '1', 'expo-router/entry']]) {
    const loaded = [];
    vm.runInNewContext(source, { __DEV__: dev, process: { env: { EXPO_PUBLIC_STARTUP_DIAGNOSTIC: flag } }, require: (id) => loaded.push(id) });
    assert.deepEqual(loaded, [expected]);
  }
});
test('SDK 58 router handles Icelandic text and malformed links without throwing', () => {
  // Exercise the installed router parser; SDK 58 removed query-string and its decoder.
  const { parseQueryParams, safelyDecodeURIComponent } = require('expo-router/build/fork/getStateFromPath-forks');
  const route = { name: 'sign-in' };
  assert.deepEqual({ ...parseQueryParams('/sign-in?name=Bjartur%20Bl%C3%A6r&bad=%E0%A4%A', route) }, { name: 'Bjartur Blær', bad: '\uFFFD%A' });
  assert.equal(safelyDecodeURIComponent('%E0%A4%A'), '%E0%A4%A');
  const malformed = '%FF'.repeat(20000);
  assert.equal(parseQueryParams('/sign-in?value=' + malformed, route).value, '\uFFFD'.repeat(20000));
  assert.equal(safelyDecodeURIComponent(malformed), malformed);
});
test('amount editing preserves value through grouping, decimal input, deletion and paste', () => {
  assert.equal(amounts.amountFromNumber(1234.56), '1.234,56');
  assert.equal(amounts.editAmountDraft('123', '1234', '4'), '1.234');
  assert.equal(amounts.editAmountDraft('12.345', '12.34', 'Backspace'), '1.234');
  assert.equal(amounts.editAmountDraft('1.234', '1234', 'Backspace'), '234');
  assert.equal(amounts.editAmountDraft('12', '12.', '.'), '12,');
  assert.equal(amounts.amountDraft('1234.56'), '1.234,56');
  for (const input of ['1,234.56', '12.34,56', '1.2.3', '-2', '100abc']) {
    assert.equal(amounts.amountDraft(input), input);
    assert.throws(() => validation.parseAmount(amounts.amountDraft(input)));
  }
});
function storage() {
  const memory = new Map();
  return { memory, getItem: async (key) => memory.get(key) ?? null, setItem: async (key, value) => { assert(Buffer.byteLength(value) < 2048); memory.set(key, value); }, removeItem: async (key) => { memory.delete(key); } };
}
test('native session migration preserves large Unicode values and removes plaintext', async () => {
  const secure = storage(), legacy = storage(); let id = 0;
  const auth = load('lib/chunked-auth-storage').createAuthStorage(secure, legacy, () => 'generation-' + ++id);
  const session = 'á😀漢'.repeat(2000);
  legacy.memory.set('session', session);
  assert.equal(await auth.getItem('session'), session);
  assert.equal(legacy.memory.has('session'), false);
  assert.equal(await auth.getItem('session'), session);
  await auth.removeItem('session');
  legacy.memory.set('session', 'stale');
  assert.equal(await auth.getItem('session'), null);
});
test('interrupted secure write retains old session; queued sign-out wins', async () => {
  const secure = storage(), legacy = storage(); let id = 0;
  const auth = load('lib/chunked-auth-storage').createAuthStorage(secure, legacy, () => 'generation-' + ++id);
  await auth.setItem('session', 'old');
  const original = secure.setItem;
  secure.setItem = async (key, value) => { if (key.includes('generation-2.1')) throw new Error('device full'); return original(key, value); };
  await assert.rejects(auth.setItem('session', 'x'.repeat(2000)), /device full/);
  assert.equal(await auth.getItem('session'), 'old');
  await Promise.all([auth.setItem('session', 'new'), auth.removeItem('session')]);
  assert.equal(await auth.getItem('session'), null);
});
test('damaged secure data forces sign-in without restoring stale plaintext', async () => {
  const secure = storage(), legacy = storage();
  const auth = load('lib/chunked-auth-storage').createAuthStorage(secure, legacy, () => 'fresh');
  secure.memory.set('session.secure-v1', '{broken'); legacy.memory.set('session', 'stale');
  assert.equal(await auth.getItem('session'), null);
  await auth.setItem('session', 'valid');
  assert.equal(await auth.getItem('session'), 'valid');
});
test('savings preferences match web defaults and reject malformed metadata', () => {
  const preferences = load('lib/savings-preferences');
  const defaults = preferences.defaultSavingsPreferences();
  assert.equal(preferences.validSavingsPreferences(defaults), true);
  assert.equal(preferences.validSavingsPreferences({ ...defaults, order: ['sjodir', 'sjodir'] }), false);
  assert.equal(preferences.normalizeSavingsPreferences({ version: 2 }).order.length, 4);
  assert.equal(preferences.savingsTotal([{ bucket_type: 'sjodir', amount: 0.1 }, { bucket_type: 'hlutabref', amount: 0.2 }]), 0.3);
  assert.equal(preferences.savingsTotal([{ bucket_type: 'serignarsparnadur', amount: 500 }], ['husnaedisparnadur']), 0);
});
