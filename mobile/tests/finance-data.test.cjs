const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('../node_modules/typescript');

// In-memory SDK fixture only: importing this suite never loads native Supabase
// configuration or makes a network request. Run: node mobile/tests/finance-data.test.cjs
const root = join(__dirname, '..');
const userId = '11111111-1111-4111-8111-111111111111';
const otherUser = '22222222-2222-4222-8222-222222222222';
const categoryId = '33333333-3333-4333-8333-333333333333';
const billId = '44444444-4444-4444-8444-444444444444';
const goalId = '55555555-5555-4555-8555-555555555555';
const month = new Date().toISOString().slice(0, 7);
let tables;
let calls;
let failures;
let serviceCap;
let currentUser;
let rpcError;

function reset() {
  currentUser = { id: userId, email: 'synthetic@example.invalid', user_metadata: {} };
  rpcError = null;
  serviceCap = 37;
  calls = [];
  failures = [];
  tables = {
    profiles: [{ id: userId, full_name: 'Synthetic User', currency: 'ISK' }],
    categories: [{ id: categoryId, user_id: userId, name: 'Matur', type: 'expense' }],
    transactions: [],
    bills: [{ id: billId, user_id: userId, series_id: billId, category_id: categoryId, month: `${month}-01`, name: 'Synthetic bill', amount: 1250, due_day: 31, is_active: true }],
    bill_payments: [], savings_buckets: [], budgets: [], savings_bucket_entries: [],
    savings_goals: [{ id: goalId, user_id: userId, title: 'Synthetic goal', target_amount: 10000, current_amount: 0, target_date: null }],
    savings_contributions: [],
  };
}

class Query {
  constructor(table) { this.table = table; this.op = 'select'; this.filters = []; this.orders = []; this.maximum = Infinity; }
  select() { return this; }
  eq(key, value) { this.filters.push([key, 'eq', value]); return this; }
  is(key, value) { return this.eq(key, value); }
  gte(key, value) { this.filters.push([key, 'gte', value]); return this; }
  lt(key, value) { this.filters.push([key, 'lt', value]); return this; }
  order(key, options) { this.orders.push([key, options?.ascending !== false]); return this; }
  range(from, to) { this.bounds = [from, to]; return this; }
  limit(limit) { this.maximum = limit; return this; }
  maybeSingle() { this.single = true; return this; }
  insert(payload) { this.op = 'insert'; this.payload = payload; return this; }
  update(payload) { this.op = 'update'; this.payload = payload; return this; }
  delete() { this.op = 'delete'; return this; }
  upsert(payload) { this.op = 'upsert'; this.payload = payload; return this; }
  then(resolve, reject) { return Promise.resolve().then(() => this.execute()).then(resolve, reject); }
  execute() {
    calls.push({ table: this.table, op: this.op, filters: this.filters, payload: this.payload, bounds: this.bounds });
    const failureIndex = failures.findIndex((failure) => failure.table === this.table && failure.op === this.op);
    const failure = failureIndex >= 0 ? failures.splice(failureIndex, 1)[0] : null;
    if (failure?.when === 'before') return { data: null, error: { code: failure.code, message: 'Raw SQL fixture text must never escape' } };
    const matches = (row) => this.filters.every(([key, op, value]) => op === 'eq' ? row[key] === value : op === 'gte' ? row[key] >= value : row[key] < value);
    let rows = tables[this.table].filter(matches);
    if (this.op === 'insert' || this.op === 'upsert') {
      const incoming = Array.isArray(this.payload) ? this.payload : [this.payload];
      rows = [];
      for (const payload of incoming) {
        const duplicate = tables[this.table].find((row) => payload.id && row.id === payload.id || this.table === 'bill_payments' && row.user_id === payload.user_id && row.bill_id === payload.bill_id && row.month === payload.month || this.table === 'savings_buckets' && row.user_id === payload.user_id && row.bucket_type === payload.bucket_type);
        if (duplicate && this.op === 'insert') return { data: null, error: { code: '23505', message: 'Unique violation' } };
        if (duplicate) { Object.assign(duplicate, payload); rows.push(duplicate); continue; }
        const row = { id: crypto.randomUUID(), created_at: '2026-01-01T00:00:00Z', ...payload };
        if (this.table === 'bills') row.series_id ??= crypto.randomUUID();
        tables[this.table].push(row);
        rows.push(row);
        if (this.table === 'savings_contributions') tables.savings_goals.find((goal) => goal.id === row.savings_goal_id).current_amount += row.amount;
      }
    } else if (this.op === 'update') rows.forEach((row) => Object.assign(row, this.payload));
    else if (this.op === 'delete') {
      if (this.table === 'transactions') tables.bill_payments.forEach((payment) => { if (rows.some((row) => row.id === payment.transaction_id)) payment.transaction_id = null; });
      if (this.table === 'savings_contributions') rows.forEach((row) => { tables.savings_goals.find((goal) => goal.id === row.savings_goal_id).current_amount -= row.amount; });
      tables[this.table] = tables[this.table].filter((row) => !rows.includes(row));
    }
    if (failure?.when === 'after') return { data: null, error: { code: failure.code, message: 'Lost response' } };
    rows = [...rows].sort((left, right) => {
      for (const [key, ascending] of this.orders) {
        const comparison = String(left[key]).localeCompare(String(right[key]));
        if (comparison) return comparison * (ascending ? 1 : -1);
      }
      return 0;
    });
    if (this.bounds) rows = rows.slice(this.bounds[0], Math.min(this.bounds[1] + 1, this.bounds[0] + serviceCap));
    else rows = rows.slice(0, this.maximum);
    rows = rows.map((row) => ({ ...row, ...(this.table === 'transactions' ? { categories: tables.categories.find((category) => category.id === row.category_id) ?? null } : {}) }));
    return { data: this.single ? rows[0] ?? null : rows, error: null };
  }
}

const sdk = { from: (table) => new Query(table),
  rpc: async (name, payload) => { calls.push({ rpc: name, payload }); return { error: rpcError }; },
  auth: {
    getUser: async () => ({ data: { user: currentUser }, error: null }),
    updateUser: async ({ data }) => { calls.push({ metadata: data }); Object.assign(currentUser.user_metadata, data); return { error: null }; },
  },
};
const modules = new Map();
function load(path) {
  if (modules.has(path)) return modules.get(path).exports;
  const module = { exports: {} };
  modules.set(path, module);
  const source = ts.transpileModule(readFileSync(join(root, `${path}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, {
    module, exports: module.exports, console,
    require(name) {
      if (name === '@/lib/supabase') return { supabase: sdk };
      if (name === 'expo-crypto') return { randomUUID: crypto.randomUUID, CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_, text) => crypto.createHash('sha256').update(text).digest('hex') };
      if (name.startsWith('@/')) return load(name.slice(2));
      throw new Error(`Unexpected fixture dependency: ${name}`);
    },
  }, { filename: path });
  return module.exports;
}
const validation = load('lib/finance-validation');
const data = load('lib/finance-data');
const actions = load('lib/finance-actions');
const events = load('lib/finance-events');
const account = load('lib/account-data');
const preferences = load('lib/savings-preferences');

test('amount parser accepts Icelandic/decimal notation and rejects malformed or out-of-range values', () => {
  for (const [text, number] of [['1.234,56', 1234.56], ['1234.56', 1234.56], ['1.234', 1234], ['0', 0], ['9.999.999.999,99', 9999999999.99]]) assert.equal(validation.parseAmount(text), number);
  for (const value of ['', '1,234', '12.34,56', '1,234.56', '12abc', '1e3', 'Infinity', '-5', '1.2.3', '10000000000']) assert.throws(() => validation.parseAmount(value));
  assert.throws(() => validation.validateAmount(0));
  assert.throws(() => validation.validateAmount(1.001));
  assert.equal(validation.validateAmount(0, true), 0);
});

test('dates reject rollover and validate leap years', () => {
  assert.equal(validation.validateDate('2024-02-29'), '2024-02-29');
  for (const value of ['2025-02-29', '2026-04-31', '2026-13-01', '2026-01-00', '26-01-01', '0000-01-01']) assert.throws(() => validation.validateDate(value));
  assert.equal(validation.validateMonth('2026-12'), '2026-12');
  assert.throws(() => validation.validateMonth('2026-13'));
});

test('monthly pages and dashboard cover more than1000 rows despite a smaller service cap and exclude other users', async () => {
  reset();
  tables.transactions = Array.from({ length: 1205 }, (_, index) => ({ id: crypto.randomUUID(), user_id: userId, type: index < 500 ? 'income' : 'expense', amount: 1.25, date: `${month}-01`, created_at: '2026-01-01', note: `Synthetic ${index}`, category_id: categoryId }));
  tables.transactions.push({ ...tables.transactions[0], id: crypto.randomUUID(), user_id: otherUser, amount: 999999 });
  const page = await data.fetchTransactionPage(userId, { month, type: 'expense', search: 'Synthetic', limit: 1200 });
  assert.equal(page.items.length, 705);
  assert.equal(page.income, 625);
  assert.equal(page.expenses, 881.25);
  assert.equal(page.hasMore, false);
  const snapshot = await data.fetchDashboard(userId);
  assert.equal(snapshot.income, 625);
  assert.equal(snapshot.expenses, 881.25);
  assert.equal((await data.fetchTransactions()).length, 100);
  assert(calls.filter((call) => call.table === 'transactions').every((call) => call.filters.some(([key, op, value]) => key === 'user_id' && op === 'eq' && value === userId)));
});

test('transaction draft request ID recovers a lost response and compares numeric database strings', async () => {
  reset();
  const input = { request_id: crypto.randomUUID(), category_id: categoryId, amount: 1250, type: 'expense', date: `${month}-02`, note: 'Synthetic purchase' };
  failures.push({ table: 'transactions', op: 'insert', when: 'after' });
  await actions.saveTransaction(userId, input);
  tables.transactions[0].amount = '1250.00';
  await actions.saveTransaction(userId, input);
  assert.equal(tables.transactions.length, 1);
});

test('bill payment lost responses reconcile one expense and one payment; retries do not rewrite the expense', async () => {
  reset();
  failures.push({ table: 'transactions', op: 'insert', when: 'after' }, { table: 'bill_payments', op: 'insert', when: 'after' });
  await actions.markBillPaid(userId, tables.bills[0]);
  assert.equal(tables.transactions.length, 1);
  assert.equal(tables.bill_payments.length, 1);
  assert.equal(tables.bill_payments[0].transaction_id, tables.transactions[0].id);
  assert.equal(tables.bill_payments[0].amount, 1250);
  const before = calls.filter((call) => call.op === 'insert').length;
  await actions.markBillPaid(userId, tables.bills[0]);
  assert.equal(calls.filter((call) => call.op === 'insert').length, before);
  assert.equal(calls.filter((call) => call.table === 'transactions' && call.op === 'update').length, 0);
});

test('explicit payment rejection compensates the expense; failed cleanup is explicit and retry recovers', async () => {
  reset();
  failures.push({ table: 'bill_payments', op: 'insert', when: 'before', code: '23514' });
  await assert.rejects(actions.markBillPaid(userId, tables.bills[0]), (error) => !error.message.includes('Raw SQL'));
  assert.equal(tables.transactions.length, 0);
  failures.push({ table: 'bill_payments', op: 'insert', when: 'before', code: '23514' }, { table: 'transactions', op: 'delete', when: 'before' });
  await assert.rejects(actions.markBillPaid(userId, tables.bills[0]), /staðfesta/);
  assert.equal(tables.transactions.length, 1);
  await assert.rejects(actions.deleteBill(userId, billId), /óstaðfest/);
  await actions.markBillPaid(userId, tables.bills[0]);
  assert.equal(tables.transactions.length, 1);
  assert.equal(tables.bill_payments.length, 1);
});

test('payment rejects a changed confirmation snapshot and concurrent taps share one write', async () => {
  reset();
  const confirmed = { ...tables.bills[0] };
  tables.bills[0].amount = 2500;
  await assert.rejects(actions.markBillPaid(userId, confirmed), /Reikningnum var breytt/);
  assert.equal(tables.transactions.length, 0);
  const fresh = { ...tables.bills[0] };
  await Promise.all([actions.markBillPaid(userId, fresh), actions.markBillPaid(userId, fresh)]);
  assert.equal(tables.transactions.length, 1);
  assert.equal(tables.bill_payments.length, 1);
});

test('linked expenses cannot be edited/deleted directly and undo removes their payment and expense', async () => {
  reset();
  await actions.markBillPaid(userId, tables.bills[0]);
  const transaction = tables.transactions[0];
  await assert.rejects(actions.saveTransaction(userId, transaction), /Reikningum/);
  await assert.rejects(actions.deleteTransaction(userId, transaction.id), /Reikningum/);
  await assert.rejects(actions.deleteBill(userId, billId), /Afturkallaðu/);
  await actions.deleteBillPayment(userId, tables.bill_payments[0]);
  assert.equal(tables.transactions.length, 0);
  assert.equal(tables.bill_payments.length, 0);
});

test('contribution retry applies the database trigger once and goal edits preserve concurrent balance', async () => {
  reset();
  const input = { request_id: crypto.randomUUID(), savings_goal_id: goalId, amount: 100, date: `${month}-01`, note: 'Synthetic deposit' };
  failures.push({ table: 'savings_contributions', op: 'insert', when: 'after' });
  await actions.addSavingsContribution(userId, input);
  await actions.addSavingsContribution(userId, input);
  assert.equal(tables.savings_goals[0].current_amount, 100);
  await actions.saveSavingsGoal(userId, { id: goalId, title: 'Updated goal', target_amount: 20000, current_amount: 0, target_date: null });
  assert.equal(tables.savings_goals[0].current_amount, 100);
  assert(!calls.some((call) => call.table === 'savings_goals' && call.op === 'update' && 'current_amount' in call.payload));
  await actions.deleteSavingsContribution(userId, tables.savings_contributions[0].id);
  assert.equal(tables.savings_goals[0].current_amount, 0);
});

test('category ownership is checked before saving and successful profile writes emit refresh events', async () => {
  reset();
  tables.categories[0].user_id = otherUser;
  await assert.rejects(actions.saveTransaction(userId, { category_id: categoryId, amount: 10, type: 'expense', date: `${month}-01`, note: '' }), /Veldu flokk/);
  assert.equal(tables.transactions.length, 0);
  let refreshes = 0;
  const unsubscribe = events.subscribeFinanceChanges(() => { refreshes += 1; });
  await actions.saveProfile(userId, 'Updated name');
  unsubscribe();
  assert.equal(refreshes, 1);
  assert.equal(tables.profiles[0].full_name, 'Updated name');
});

test('savings settings use the current account and preserve unrelated metadata', async () => {
  reset(); currentUser.user_metadata.keep = 'unchanged';
  const selected = { ...preferences.defaultSavingsPreferences(), housing: ['husnaedisparnadur'], goal: ['sjodir'] };
  await actions.saveSavingsPreferences(userId, selected);
  assert.equal(currentUser.user_metadata.keep, 'unchanged');
  assert.equal((await data.fetchSavings(userId)).preferences.housing.length, 1);
  await assert.rejects(actions.saveSavingsPreferences(otherUser, selected), /Skráðu/);
});

test('bucket deposits use the atomic RPC and retain the same request on retry', async () => {
  reset(); const input = { request_id: crypto.randomUUID(), bucket_type: 'sjodir', label: 'Sjóðir', amount: 1500, date: `${month}-01` };
  await actions.addSavingsBucketContribution(userId, input);
  await actions.addSavingsBucketContribution(userId, input);
  assert.equal(calls.filter(call => call.rpc).length, 2);
  assert.equal(calls[0].payload.p_request_id, calls[1].payload.p_request_id);
  assert.equal(calls[0].rpc, 'add_savings_bucket_contribution');
  assert.equal(calls.some(call => call.op === 'insert' || call.op === 'upsert'), false);
  rpcError = { code: 'PGRST202' };
  await assert.rejects(actions.addSavingsBucketContribution(userId, input), /gagnagrunnsins/);
});

test('account export includes every owned row and fails closed on partial failure', async () => {
  reset(); tables.transactions = Array.from({ length: 1005 }, () => ({ id: crypto.randomUUID(), user_id: userId, amount: 10 }));
  tables.transactions.push({ id: crypto.randomUUID(), user_id: otherUser, amount: 999 });
  currentUser.user_metadata.privateInternalKey = 'must-not-export';
  const exported = await account.exportAccountData(userId);
  assert.equal(exported.data.transactions.length, 1005);
  assert.equal(Object.keys(exported.data).length, 10);
  assert.equal(JSON.stringify(exported).includes('must-not-export'), false);
  failures.push({ table: 'bills', op: 'select', when: 'before', code: '42501' });
  await assert.rejects(account.exportAccountData(userId));
  currentUser = { ...currentUser, id: otherUser };
  await assert.rejects(account.exportAccountData(userId), /Skráðu/);
});

test('deletion requests require confirmation, are idempotent and can be cancelled', async () => {
  reset(); await assert.rejects(account.setDeletionRequest(userId, 'wrong'), /EYÐA/);
  assert.equal(calls.filter(call => call.metadata).length, 0);
  await account.setDeletionRequest(userId, 'EYÐA');
  const requested = currentUser.user_metadata.account_deletion_request.requested_at;
  await account.setDeletionRequest(userId, 'EYÐA');
  assert.equal(currentUser.user_metadata.account_deletion_request.requested_at, requested);
  assert.equal(calls.filter(call => call.metadata).length, 1);
  await account.setDeletionRequest(userId, null);
  assert.equal(currentUser.user_metadata.account_deletion_request, null);
});
