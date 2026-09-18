const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const ts = require("typescript");
const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const BILL = "33333333-3333-4333-8333-333333333333";
const BILL2 = "44444444-4444-4444-8444-444444444444";
const TX = "55555555-5555-4555-8555-555555555555";
const SERIES = "66666666-6666-4666-8666-666666666666";
function load(path, mocks = {}) {
  const source = ts.transpileModule(readFileSync(join(__dirname, "..", path), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function("require", "exports", source)((name) => mocks[name] ?? (name.startsWith("@/") ? load(`${name.slice(2)}.ts`, mocks) : require(name)), exports);
  return exports;
}
function form(values) { const data = new FormData(); for (const [key, value] of Object.entries(values)) for (const item of Array.isArray(value) ? value : [value]) data.append(key, String(item)); return data; }
const own = (row) => ({ user_id: USER, ...row });
const bill = (id = BILL) => own({ id, series_id: SERIES, month: "2026-09-01", name: "Rafmagn", category_id: null, amount: 5000, due_day: 1, is_active: true });
const expense = (extra = {}) => own({ id: TX, type: "expense", amount: 4500, date: "2026-09-15", note: "Rafmagn", ...extra });
const linkInput = (id = BILL) => form({ bill_id: id, month: "2026-09", mode: "existing", transaction: JSON.stringify({ id: TX, amount: 4500, date: "2026-09-15" }) });
const newInput = (extra = {}) => form({ bill_id: BILL, month: "2026-09", mode: "new", amount: 4750, paid_at: "2026-09-18", confirm_new_expense: "on", ...extra });

// An in-memory Supabase boundary: validates action behavior, not Postgres trigger
// execution. The separate SQL migration is required for cross-record DB races.
function fixture(seed = {}, intercept = async () => null) {
  const tables = structuredClone({ bills: [bill(), bill(BILL2)], transactions: [expense()], bill_payments: [], ...seed });
  const calls = []; let serial = 0;
  const supabase = { from(table) {
    const q = { table, operation: "select", filters: [], order: [] }; let pending;
    const match = (row) => q.filters.every(([key, op, value]) => op === "eq" ? row[key] === value : op === "in" ? value.includes(row[key]) : op === "gte" ? row[key] >= value : row[key] < value);
    async function run() {
      calls.push(q); const failure = await intercept(q, tables);
      if (failure) return { data: null, error: failure, count: null };
      const rows = tables[table] ??= []; let found = rows.filter(match);
      if (q.operation === "insert" || q.operation === "upsert") {
        const proposed = (Array.isArray(q.payload) ? q.payload : [q.payload]).map((item) => ({ id: `00000000-0000-4000-8000-${String(++serial).padStart(12, "0")}`, ...item }));
        found = [];
        for (const item of proposed) {
          const existing = q.operation === "upsert" && rows.find((r) => q.options.onConflict.split(",").every((key) => r[key] === item[key]));
          if (existing) { if (!q.options.ignoreDuplicates) { Object.assign(existing, item); found.push(existing); } continue; }
          if (table === "bill_payments" && rows.some((r) => r.id === item.id || (r.user_id === item.user_id && r.bill_id === item.bill_id && r.month === item.month))) return { data: null, error: { code: "23505", message: "unique" }, count: null };
          rows.push(item); found.push(item);
        }
      }
      if (q.operation === "delete") tables[table] = rows.filter((r) => !match(r));
      for (const [key, asc] of [...q.order].reverse()) found.sort((a, b) => String(a[key]).localeCompare(String(b[key])) * (asc ? 1 : -1));
      const count = found.length;
      if (q.range) found = found.slice(q.range[0], q.range[1] + 1);
      if (q.limit !== undefined) found = found.slice(0, q.limit);
      if (q.single && found.length !== 1 && !q.optional) return { data: null, error: { message: "not found" }, count };
      return { data: structuredClone(q.single ? found[0] ?? null : found), error: null, count };
    }
    const b = { select() { return b; }, insert(payload) { q.operation = "insert"; q.payload = payload; return b; }, upsert(payload, options) { q.operation = "upsert"; q.payload = payload; q.options = options; return b; }, delete() { q.operation = "delete"; return b; }, eq(key, value) { q.filters.push([key, "eq", value]); return b; }, in(key, value) { q.filters.push([key, "in", value]); return b; }, gte(key, value) { q.filters.push([key, "gte", value]); return b; }, lt(key, value) { q.filters.push([key, "lt", value]); return b; }, order(key, options = {}) { q.order.push([key, options.ascending !== false]); return b; }, range(a, z) { q.range = [a, z]; return b; }, limit(n) { q.limit = n; return b; }, single() { q.single = true; return b; }, maybeSingle() { q.single = true; q.optional = true; return b; }, then(resolve, reject) { pending ??= run(); return pending.then(resolve, reject); } };
    return b;
  } };
  const mocks = { "@/lib/data": { getAuthed: async () => ({ supabase, user: { id: USER } }) }, "next/cache": { revalidatePath() {} } };
  return { tables, calls, actions: load("lib/bill-actions.ts", mocks), savings: load("lib/savings-data.ts", mocks), bills: load("lib/bill-data.ts", mocks) };
}

test("linking an existing expense records its actual amount/date without creating an expense", async () => {
  const db = fixture(); const result = await db.actions.recordBillPayment(linkInput());
  assert.equal(result.error, undefined); assert.equal(db.tables.transactions.length, 1);
  assert.deepEqual(db.tables.bill_payments[0], { id: TX, user_id: USER, bill_id: BILL, transaction_id: TX, month: "2026-09-01", amount: 4500, paid_at: "2026-09-15" });
});
test("foreign, non-expense, or stale selected records are rejected without writes", async () => {
  for (const extra of [{ user_id: OTHER }, { type: "income" }, { amount: 4600 }, { date: "2026-09-16" }]) {
    const db = fixture({ transactions: [expense(extra)] }); assert.ok((await db.actions.recordBillPayment(linkInput())).error);
    assert.equal(db.calls.filter((q) => q.operation !== "select").length, 0);
  }
});
test("existing legacy transaction links reject reuse even when payment UUID differs", async () => {
  const db = fixture({ bill_payments: [own({ id: OTHER, bill_id: BILL2, transaction_id: TX, month: "2026-09-01" })] });
  assert.ok((await db.actions.recordBillPayment(linkInput())).error); assert.equal(db.tables.bill_payments.length, 1);
});
test("new expense requires deliberate confirmation and a real calendar date", async () => {
  for (const input of [{ confirm_new_expense: "" }, { paid_at: "2026-02-30" }, { amount: 0 }, { amount: Infinity }]) {
    const db = fixture(); assert.ok((await db.actions.recordBillPayment(newInput(input))).error); assert.equal(db.tables.transactions.length, 1);
  }
});
test("explicit new expense records selected date rather than due date", async () => {
  const db = fixture(); assert.equal((await db.actions.recordBillPayment(newInput())).error, undefined);
  assert.equal(db.tables.bill_payments[0].paid_at, "2026-09-18"); assert.equal(db.tables.bill_payments[0].amount, 4750);
  assert.equal(db.tables.transactions[1].date, "2026-09-18");
});
test("a payment insert failure compensates only the new expense", async () => {
  const db = fixture({}, async (q) => q.table === "bill_payments" && q.operation === "insert" ? { message: "write failure" } : null);
  assert.ok((await db.actions.recordBillPayment(newInput())).error); assert.deepEqual(db.tables.transactions, [expense()]);
});
test("failed linking never deletes an existing expense", async () => {
  const db = fixture({}, async (q) => q.table === "bill_payments" && q.operation === "insert" ? { message: "write failure" } : null);
  assert.ok((await db.actions.recordBillPayment(linkInput())).error); assert.deepEqual(db.tables.transactions, [expense()]);
  assert.equal(db.calls.some((q) => q.table === "transactions" && q.operation === "delete"), false);
});
test("changed expense during linking removes the new link but preserves expense", async () => {
  const db = fixture({}, async (q, tables) => { if (q.table === "bill_payments" && q.operation === "insert") tables.transactions[0].amount = 4700; return null; });
  assert.ok((await db.actions.recordBillPayment(linkInput())).error); assert.equal(db.tables.bill_payments.length, 0); assert.equal(db.tables.transactions[0].amount, 4700);
});
test("concurrent links of the same expense to two bills yield one payment", async () => {
  let arrivals = 0; let release; const barrier = new Promise((resolve) => release = resolve);
  const db = fixture({}, async (q) => { if (q.table === "bill_payments" && q.operation === "insert") { if (++arrivals === 2) release(); await barrier; } return null; });
  const results = await Promise.all([db.actions.recordBillPayment(linkInput()), db.actions.recordBillPayment(linkInput(BILL2))]);
  assert.equal(results.filter((r) => !r.error).length, 1); assert.equal(db.tables.bill_payments.length, 1); assert.equal(db.tables.transactions.length, 1);
});
test("concurrent new payments for one bill keep one new expense", async () => {
  let arrivals = 0; let release; const barrier = new Promise((resolve) => release = resolve);
  const db = fixture({}, async (q) => { if (q.table === "bill_payments" && q.operation === "insert") { if (++arrivals === 2) release(); await barrier; } return null; });
  const results = await Promise.all([db.actions.recordBillPayment(newInput()), db.actions.recordBillPayment(newInput())]);
  assert.equal(results.filter((r) => !r.error).length, 1); assert.equal(db.tables.bill_payments.length, 1); assert.equal(db.tables.transactions.length, 2);
});
test("unlinking preserves the original expense and cannot remove another user's payment", async () => {
  const db = fixture({ bill_payments: [own({ id: TX, transaction_id: TX }), { id: OTHER, user_id: OTHER, transaction_id: OTHER }] });
  await db.actions.unlinkBillPayment(form({ id: TX })); await db.actions.unlinkBillPayment(form({ id: OTHER }));
  assert.deepEqual(db.tables.transactions, [expense()]); assert.deepEqual(db.tables.bill_payments.map((p) => p.id), [OTHER]);
});
test("copying previous month's selected bills preserves series, is idempotent, and copies no payments", async () => {
  const db = fixture({ bills: [{ ...bill(), month: "2026-08-01" }], bill_payments: [own({ id: TX, bill_id: BILL, month: "2026-08-01", amount: 4500 })] });
  const input = () => form({ month: "2026-09", bill_ids: [BILL] });
  assert.equal((await db.actions.copyPreviousBills(input())).error, undefined); assert.equal((await db.actions.copyPreviousBills(input())).error, undefined);
  assert.equal(db.tables.bills.length, 2); assert.equal(db.tables.bills[1].series_id, SERIES); assert.equal(db.tables.bills[1].amount, 5000); assert.equal(db.tables.bill_payments.length, 1);
});
test("copy rejects unowned, wrong-month, inactive and unselected records", async () => {
  for (const extra of [{ user_id: OTHER }, { month: "2026-07-01" }, { is_active: false }]) {
    const db = fixture({ bills: [{ ...bill(), month: "2026-08-01", ...extra }] });
    assert.ok((await db.actions.copyPreviousBills(form({ month: "2026-09", bill_ids: BILL }))).error); assert.equal(db.tables.bills.length, 1);
  }
  assert.ok((await fixture().actions.copyPreviousBills(form({ month: "2026-09" }))).error);
});
test("candidate expenses cover every API page and exclude linked and other-user records", async () => {
  const rows = Array.from({ length: 505 }, (_, i) => expense({ id: `tx-${i}`, date: "2026-09-10" }));
  const db = fixture({ transactions: [...rows, expense({ id: OTHER, user_id: OTHER })], bill_payments: [own({ id: "p", transaction_id: "tx-1" })] });
  const result = await db.bills.getBillPaymentCandidates("2026-09"); assert.equal(result.ready, true); assert.equal(result.expenses.length, 504); assert.equal(result.expenses.some((e) => e.id === "tx-1"), false);
});
test("per-bucket latest lookup finds old bucket activity outside global latest twenty", async () => {
  const entries = Array.from({ length: 30 }, (_, i) => own({ id: `entry-${i}`, bucket_type: "hlutabref", date: "2026-09-01", created_at: String(i).padStart(2, "0") }));
  entries.push(own({ id: "older", bucket_type: "sjodir", date: "2024-01-01", created_at: "old" }));
  const result = await fixture({ savings_bucket_entries: entries }).savings.getLatestSavingsEntries();
  assert.equal(result.entries.find((entry) => entry.bucket_type === "sjodir").id, "older");
  assert.equal(result.entries.find((entry) => entry.bucket_type === "hlutabref").id, "entry-29");
});
test("history pagination exposes all owned entries once and clamps invalid last page", async () => {
  const entries = Array.from({ length: 51 }, (_, i) => own({ id: `entry-${String(i).padStart(2, "0")}`, date: "2026-09-01", created_at: "same" }));
  const db = fixture({ savings_bucket_entries: [...entries, { id: "foreign", user_id: OTHER }] });
  const results = await Promise.all([1, 2, 3].map((page) => db.savings.getSavingsHistory(page)));
  assert.deepEqual(results.map((p) => p.entries.length), [20, 20, 11]); assert.equal(new Set(results.flatMap((p) => p.entries.map((e) => e.id))).size, 51);
  assert.equal((await db.savings.getSavingsHistory(1000)).page, 3); assert.equal((await db.savings.getSavingsHistory(NaN)).page, 1);
});
test("failed savings queries return unavailable instead of authoritative empty state", async () => {
  const db = fixture({}, async (q) => q.table === "savings_bucket_entries" ? { message: "offline" } : null);
  assert.equal((await db.savings.getLatestSavingsEntries()).schemaReady, false); assert.equal((await db.savings.getSavingsHistory()).schemaReady, false);
});
const { savingsPlan, isCalendarDate } = load("lib/savings-plan.ts");
test("goal plan includes current/target months, rounds up krónur and handles year boundaries", () => {
  assert.deepEqual(savingsPlan(0, 10000, "2026-11-30", "2026-09-18"), { status: "active", remaining: 10000, months: 3, monthlyAmount: 3334 });
  assert.equal(savingsPlan(0, 10000, "2026-09-18", "2026-09-18").monthlyAmount, 10000);
  assert.equal(savingsPlan(0, 10000, "2027-01-31", "2026-12-18").months, 2);
});
test("goal plan separates overdue, met, undated and invalid states", () => {
  assert.equal(savingsPlan(10000, 10000, "2026-08-01", "2026-09-18").status, "met");
  assert.equal(savingsPlan(0, 10000, "2026-09-17", "2026-09-18").status, "overdue");
  assert.equal(savingsPlan(0, 10000, null, "2026-09-18").status, "undated");
  assert.equal(savingsPlan(0, 0, null, "2026-09-18").status, "unavailable");
  assert.equal(savingsPlan(0, 10000, "2026-02-30", "2026-09-18").status, "unavailable");
  assert.equal(isCalendarDate("2024-02-29"), true); assert.equal(isCalendarDate("2026-02-29"), false);
});
