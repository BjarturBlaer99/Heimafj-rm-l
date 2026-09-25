const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const source = ts.transpileModule(readFileSync(join(__dirname, '../lib/amount-input.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const loaded = {};
new Function('exports', source)(loaded);
const { amountInput, displayAmount, editAmount, amountInputError } = loaded;

test('typing and pasting Icelandic amounts groups thousands without changing submitted values', () => {
  for (const [raw, display, value] of [
    ['1000', '1.000', '1000'], ['1000000', '1.000.000', '1000000'],
    ['1.250,50', '1.250,50', '1250.50'], ['1 250,05', '1.250,05', '1250.05'],
    ['0001200', '1.200', '1200'], ['0,29', '0,29', '0.29'],
    ['9999999999,99', '9.999.999.999,99', '9999999999.99']
  ]) assert.deepEqual(amountInput(raw), { display, value });
});

test('editing preserves partial decimals and empty fields, without rounding cents', () => {
  assert.deepEqual(amountInput('1250,'), { display: '1.250,', value: '1250' });
  assert.deepEqual(amountInput(',5'), { display: '0,5', value: '0.5' });
  assert.deepEqual(amountInput(''), { display: '', value: '' });
  assert.equal(amountInput('1,001').value, '1.001');
  assert.ok(amountInputError('1,001', '0.01', undefined, '0.01'));
});

test('malformed values are rejected instead of silently saving a different amount', () => {
  for (const raw of ['1e3', '1000abc', '1,250.50', '1,000.00', '1,2,3', '--10']) {
    assert.equal(amountInput(raw).value, null, raw);
    assert.ok(amountInputError(raw), raw);
  }
  assert.equal(amountInput('-1000').value, '-1000');
  assert.ok(amountInputError('-1000', 0));
});

test('server values display as Icelandic amounts while keeping decimal precision', () => {
  assert.equal(displayAmount(1234567.89), '1.234.567,89');
  assert.equal(displayAmount('1234.50'), '1.234,50');
  assert.equal(displayAmount(0), '0');
  assert.equal(displayAmount(undefined), '');
});

test('caret follows the edited digit as grouping changes', () => {
  assert.deepEqual(editAmount('100', '1000', 4, 'insertText'), { display: '1.000', value: '1000', caret: 5 });
  assert.deepEqual(editAmount('12.345', '129.345', 3, 'insertText'), { display: '129.345', value: '129345', caret: 3 });
  assert.deepEqual(editAmount('1.000', '1.00', 4, 'deleteContentBackward'), { display: '100', value: '100', caret: 3 });
});

test('backspace and delete work next to an inserted thousands dot', () => {
  assert.deepEqual(editAmount('1.234', '1234', 1, 'deleteContentBackward'), { display: '234', value: '234', caret: 0 });
  assert.deepEqual(editAmount('1.234', '1234', 1, 'deleteContentForward'), { display: '134', value: '134', caret: 1 });
});

test('amount bounds and whole-króna fields retain validation', () => {
  assert.ok(amountInputError('0', '0.01', undefined, '0.01'));
  assert.ok(amountInputError('1.001', 0, 1000));
  assert.ok(amountInputError('1.000,50', 1, undefined, 1));
  assert.equal(amountInputError('1.000', 1, undefined, 1), '');
  assert.equal(amountInputError('0,29', '0.01', undefined, '0.01'), '');
  assert.equal(amountInputError('1.250,50', '0.01', undefined, '0.01'), '');
});
