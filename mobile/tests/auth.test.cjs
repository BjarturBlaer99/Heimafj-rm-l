/* global __dirname */
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('../node_modules/typescript');

function loadSource(name, mocks = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'lib', `${name}.ts`), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = vm.createContext({
    exports: {}, URL, URLSearchParams, ...globals,
    require: (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  new vm.Script(outputText, { filename: name }).runInContext(context);
  return context;
}

function links(base = 'exp://192.0.2.1:8082/--/') {
  return loadSource('auth-links', { 'expo-linking': { createURL: (route) => `${base}${route}` } }).exports;
}
const plain = (value) => JSON.parse(JSON.stringify(value));

test('Expo Go redirects use the active LAN or tunnel host and both callback paths', () => {
  for (const base of ['exp://192.0.2.1:8082/--/', 'exp://fixture.exp.direct/--/', 'exps://fixture.on.expo.app/--/']) {
    const auth = links(base);
    assert.equal(auth.authRedirectUrl('auth-callback'), `${base}auth-callback`);
    assert.equal(auth.authRedirectUrl('reset-password'), `${base}reset-password`);
    assert.equal(auth.parseAuthLink(`${base}auth-callback?code=fixture-code`).code, 'fixture-code');
    assert.equal(auth.parseAuthLink(`${base}reset-password?code=fixture-code`).recovery, true);
  }
});

test('installed custom scheme accepts exact callback paths with two or three slashes', () => {
  const auth = links();
  for (const prefix of ['minfjarmal://', 'minfjarmal:///']) {
    assert.equal(auth.parseAuthLink(`${prefix}auth-callback?code=fixture`).recovery, false);
    assert.equal(auth.parseAuthLink(`${prefix}reset-password?code=fixture`).recovery, true);
  }
});

test('foreign hosts, schemes, paths and userinfo never trigger authentication', () => {
  const auth = links();
  for (const url of [
    'exp://192.0.2.2:8082/--/auth-callback?code=fixture',
    'exp://192.0.2.1:8083/--/auth-callback?code=fixture',
    'https://foreign.example/auth-callback?code=fixture',
    'other://auth-callback?code=fixture',
    'minfjarmal://profile?code=fixture',
    'minfjarmal://auth-callback/extra?code=fixture',
    'minfjarmal://user@auth-callback?code=fixture',
    'not a url',
  ]) assert.equal(auth.parseAuthLink(url), null);
});

test('PKCE code, recovery hash and legacy fragment tokens are distinct supported flows', () => {
  const auth = links();
  assert.deepEqual(plain(auth.parseAuthLink('minfjarmal://auth-callback?code=fixture&sb_flow_id=fixture_123')),
    { recovery: false, code: 'fixture', flowId: 'fixture_123' });
  assert.deepEqual(plain(auth.parseAuthLink('minfjarmal://auth-callback?token_hash=fixture&type=recovery')),
    { recovery: true, tokenHash: 'fixture', type: 'recovery' });
  assert.deepEqual(plain(auth.parseAuthLink('minfjarmal://reset-password#access_token=fixture-access&refresh_token=fixture-refresh&type=recovery')),
    { recovery: true, accessToken: 'fixture-access', refreshToken: 'fixture-refresh' });
  assert.deepEqual(plain(auth.parseAuthLink('minfjarmal://reset-password')), { recovery: true, empty: true });
});

test('ambiguous or incomplete credentials and invalid verification types are rejected', () => {
  const auth = links();
  for (const parameters of [
    '?code=fixture&token_hash=fixture&type=signup',
    '?code=fixture#access_token=fixture&refresh_token=fixture',
    '?token_hash=fixture&type=recovery#access_token=fixture&refresh_token=fixture',
    '?code=one&code=two', '?code=one#code=two',
    '?access_token=one', '?refresh_token=one',
    '?token_hash=fixture', '?token_hash=fixture&type=admin',
    '?token_hash=fixture&type=recovery#type=signup',
    '?code=fixture&sb_flow_id=bad!',
  ]) assert.throws(() => auth.parseAuthLink(`minfjarmal://auth-callback${parameters}`), { message: auth.INVALID_AUTH_LINK });
  assert.throws(() => auth.parseAuthLink('minfjarmal://reset-password?token_hash=fixture&type=signup'));
});

test('server errors are replaced with a safe message, without reflecting URL contents', () => {
  const auth = links();
  assert.throws(() => auth.parseAuthLink('minfjarmal://auth-callback#error=access_denied&error_description=private-fixture-token'),
    { message: auth.INVALID_AUTH_LINK });
});

test('password policy requires 10–100 characters and every web policy character class', () => {
  const { isStrongPassword } = loadSource('auth-password').exports;
  assert.equal(isStrongPassword('Abcdefg1!x'), true);
  assert.equal(isStrongPassword(`Aa1!${'x'.repeat(96)}`), true);
  for (const password of ['Abcdef1!x', `Aa1!${'x'.repeat(97)}`, 'abcdefgh1!', 'ABCDEFGH1!', 'Abcdefghi!', 'Abcdefghi1', 'Abcdef1!\nx']) {
    assert.equal(isStrongPassword(password), false);
  }
});

function cryptoFixture(os, crypto) {
  const calls = { random: 0, digest: 0 };
  const context = loadSource('supabase', {
    'react-native-url-polyfill/auto': {},
    '@/lib/auth-storage': { authStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } },
    '@supabase/supabase-js': { createClient: (_url, _key, options) => ({ options }) },
    'react-native': { Platform: { OS: os } },
    'expo-crypto': {
      CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
      getRandomValues: (array) => { calls.random += 1; array.fill(7); return array; },
      digest: async (algorithm, bytes) => {
        calls.digest += 1;
        assert.equal(algorithm, 'SHA-256');
        return Uint8Array.from(createHash('sha256').update(bytes).digest()).buffer;
      },
    },
  }, {
    __DEV__: true, crypto,
    process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://fixture.supabase.co', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key' } },
  });
  return { context, calls };
}

test('native PKCE routes randomness and SHA-256 to Expo Crypto and enables PKCE', async () => {
  const { context, calls } = cryptoFixture('ios', undefined);
  const values = new Uint32Array(4);
  assert.equal(context.crypto.getRandomValues(values), values);
  assert.equal(calls.random, 1);
  const digest = await context.crypto.subtle.digest('SHA-256', new TextEncoder().encode('abc'));
  assert.equal(Buffer.from(digest).toString('hex'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(calls.digest, 1);
  await assert.rejects(context.crypto.subtle.digest('unsupported', new Uint8Array()));
  assert.equal(context.exports.supabase.options.auth.flowType, 'pkce');
});

test('web keeps its existing browser cryptography untouched', () => {
  const browserCrypto = { getRandomValues: () => { throw new Error('Not called during setup'); } };
  const { context, calls } = cryptoFixture('web', browserCrypto);
  assert.equal(context.crypto, browserCrypto);
  assert.equal(context.crypto.subtle, undefined);
  assert.deepEqual(calls, { random: 0, digest: 0 });
});
