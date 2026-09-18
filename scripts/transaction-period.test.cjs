const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const exportsForTest = {};
new Function('exports', ts.transpileModule(readFileSync('lib/transaction-period.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(exportsForTest);
const { resolveTransactionPeriod: period, transactionPeriodQuery, validDate } = exportsForTest;

test('legacy date ranges override an implicit or stale month', () => {
  const value = period({ month: '2026-09', from: '2026-08-01', to: '2026-08-31' }, '2026-09');
  assert.equal(value.month, undefined);
  assert.equal(value.from, '2026-08-01');
  assert.equal(value.period, 'range');
});
test('explicit month mode drops leftover range fields and all mode has no limits', () => {
  const value = period({ period: 'month', month: '2026-09', from: '2026-08-01' }, '2026-09');
  assert.equal(value.from, undefined);
  assert.equal(value.month, '2026-09');
  assert.equal(transactionPeriodQuery(period({ period: 'all' }, '2026-09')).toString(), 'period=all');
});
test('impossible dates and inverted ranges are rejected', () => {
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2028-02-29'), true);
  assert.throws(() => period({ from: '2026-08-31', to: '2026-08-01' }, '2026-09'));
  assert.throws(() => period({ month: '2026-13' }, '2026-09'));
});
