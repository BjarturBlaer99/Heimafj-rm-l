const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

const USER = "11111111-1111-4111-8111-111111111111";
const RECORD = "22222222-2222-4222-8222-222222222222";
const CATEGORY = "33333333-3333-4333-8333-333333333333";
const OTHER = "44444444-4444-4444-8444-444444444444";
const PAYMENT = "55555555-5555-4555-8555-555555555555";
const TRANSACTION = "66666666-6666-4666-8666-666666666666";

const compiled = new Map();
function loadTypeScript(relativePath, mocks = {}) {
  if (!compiled.has(relativePath)) {
    compiled.set(relativePath, ts.transpileModule(readFileSync(join(__dirname, "..", relativePath), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText);
  }
  const exports = {};
  new Function("require", "exports", compiled.get(relativePath))((id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith("@/")) return loadTypeScript(`${id.slice(2)}.ts`, mocks);
    return require(id);
  }, exports);
  return exports;
}

function form(values) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, String(value));
  return result;
}

// Only Supabase and Next side effects are mocked. Actions and validation are real.
// RPC storage is simulated atomically here; real PostgreSQL concurrency and
// rollback behavior are covered separately by the database integration suite.
function fixture(seed = {}, { intercept = async () => null, authenticated = true } = {}) {
  const tables = structuredClone({ categories: [{ id: CATEGORY, user_id: USER, type: "expense" }], ...seed });
  const queries = [];
  const invalidations = [];
  let nextId = 100;
  const client = {
    auth: { getUser: async () => authenticated
      ? { data: { user: { id: USER } }, error: null }
      : { data: { user: null }, error: { message: "expired session" } } },
    async rpc(name, payload) {
      const query = { table: name, operation: "rpc", payload };
      queries.push(query);
      const failure = await intercept(query);
      if (failure) return { data: null, error: failure };
      assert.equal(name, "add_savings_bucket_contribution");
      const stored = tables.savings_buckets ??= [];
      const bucket = stored.find((row) => row.user_id === USER && row.bucket_type === payload.p_bucket_type);
      if (bucket) bucket.amount = Number(bucket.amount) + payload.p_amount;
      else stored.push({ user_id: USER, bucket_type: payload.p_bucket_type, amount: payload.p_amount, label: payload.p_label });
      (tables.savings_bucket_entries ??= []).push({ id: payload.p_request_id, user_id: USER, bucket_type: payload.p_bucket_type, amount: payload.p_amount, date: payload.p_date, label: payload.p_label, note: payload.p_note });
      return { data: [{ entry_id: payload.p_request_id, already_recorded: false }], error: null };
    },
    from(table) {
      const query = { table, operation: "select", filters: [], orders: [] };
      let execution;
      const matches = (row) => query.filters.every(([key, value]) => row[key] === value);
      const execute = async () => {
        queries.push(query);
        const failure = await intercept(query);
        if (failure) return { data: null, error: failure };
        const stored = tables[table] ??= [];
        let rows = stored.filter(matches);
        if (query.operation === "insert" || query.operation === "upsert") {
          rows = (Array.isArray(query.payload) ? query.payload : [query.payload]).map((payload) => {
            const existing = query.operation === "upsert" && stored.find((row) =>
              query.conflict.split(",").every((key) => row[key] === payload[key]));
            if (existing) return Object.assign(existing, structuredClone(payload));
            const row = { id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`, ...structuredClone(payload) };
            stored.push(row);
            return row;
          });
        } else if (query.operation === "update") {
          rows.forEach((row) => Object.assign(row, structuredClone(query.payload)));
        } else if (query.operation === "delete") {
          tables[table] = stored.filter((row) => !matches(row));
        }
        for (const [column, ascending] of [...query.orders].reverse()) {
          rows = [...rows].sort((a, b) => String(a[column]).localeCompare(String(b[column])) * (ascending ? 1 : -1));
        }
        if (query.limit !== undefined) rows = rows.slice(0, query.limit);
        if (query.single && !rows.length && !query.optional) return { data: null, error: { message: "missing row" } };
        return { data: structuredClone(query.single ? rows[0] ?? null : rows), error: null };
      };
      const builder = {
        select(columns) { query.columns = columns; return builder; },
        insert(payload) { query.operation = "insert"; query.payload = payload; return builder; },
        update(payload) { query.operation = "update"; query.payload = payload; return builder; },
        upsert(payload, options) { query.operation = "upsert"; query.payload = payload; query.conflict = options.onConflict; return builder; },
        delete() { query.operation = "delete"; return builder; },
        eq(key, value) { query.filters.push([key, value]); return builder; },
        is(key, value) { query.filters.push([key, value]); return builder; },
        order(key, options = {}) { query.orders.push([key, options.ascending !== false]); return builder; },
        limit(count) { query.limit = count; return builder; },
        single() { query.single = true; return builder; },
        maybeSingle() { query.single = true; query.optional = true; return builder; },
        then(resolve, reject) { execution ??= execute(); return execution.then(resolve, reject); }
      };
      return builder;
    }
  };
  const actions = loadTypeScript("lib/actions.ts", {
    "@/lib/supabase/server": { createClient: async () => client },
    "@/lib/data": { getAuthed: async () => {
      if (!authenticated) throw Object.assign(new Error("redirect:/login"), { redirectTo: "/login" });
      return { supabase: client, user: { id: USER } };
    } },
    "next/cache": { revalidatePath: (path) => invalidations.push(path) },
    "next/navigation": { redirect: (path) => { throw Object.assign(new Error(`redirect:${path}`), { redirectTo: path }); } }
  });
  return { actions, tables, queries, invalidations };
}

function deferredWrite(table, operation) {
  let release;
  let reached;
  const pending = new Promise((resolve) => { release = resolve; });
  const entered = new Promise((resolve) => { reached = resolve; });
  return {
    entered, release,
    intercept: async (query) => {
      if (query.table === table && query.operation === operation) {
        reached();
        await pending;
      }
      return null;
    }
  };
}

function assertFeedback(result) {
  assert.equal(typeof result?.message, "string");
  assert.ok(result.message.trim().length > 0);
  assert.equal(result.redirectTo, undefined);
}

const transactionInput = { amount: "1250.50", type: "expense", date: "2026-09-16", category_id: CATEGORY, note: "  Próf  " };
const own = (row) => ({ user_id: USER, ...row });
const fail = (table, operation) => async (query) => query.table === table && query.operation === operation
  ? { message: "synthetic write failure" } : null;

test("transaction create/edit feedback waits for persistence and identifies the completed operation", { timeout: 3000 }, async () => {
  for (const editing of [false, true]) {
    const gate = deferredWrite("transactions", editing ? "update" : "insert");
    const db = fixture({ transactions: [own({ id: RECORD, amount: 1 }), { id: OTHER, user_id: OTHER, amount: 9 }] }, gate);
    let settled = false;
    const result = db.actions.saveTransaction(form({ ...transactionInput, ...(editing ? { id: RECORD } : {}) }))
      .then((value) => { settled = true; return value; });
    await gate.entered;
    assert.equal(settled, false);
    assert.deepEqual(db.invalidations, []);
    gate.release();
    assert.deepEqual(await result, { message: editing ? "Færslan var uppfærð." : "Færslunni var bætt við." });
    const saved = db.tables.transactions.find((row) => row.amount === 1250.5);
    assert.equal(saved.user_id, USER);
    assert.equal(saved.note, "Próf");
    assert.equal(saved.category_id, CATEGORY);
    assert.equal(db.tables.transactions.find((row) => row.id === OTHER).amount, 9);
    assert.ok(db.invalidations.includes("/") || db.invalidations.includes("/transactions"));
  }
});

test("transaction write or validation failure rejects without successful feedback or revalidation", async () => {
  for (const editing of [false, true]) {
    const db = fixture({ transactions: [own({ id: RECORD })] }, { intercept: fail("transactions", editing ? "update" : "insert") });
    await assert.rejects(db.actions.saveTransaction(form({ ...transactionInput, ...(editing ? { id: RECORD } : {}) })), /synthetic write failure/);
    assert.deepEqual(db.invalidations, []);
  }
  const db = fixture();
  await assert.rejects(db.actions.saveTransaction(form({ ...transactionInput, amount: "-1" })), { name: "ZodError" });
  assert.equal(db.queries.length, 0);
  assert.deepEqual(db.invalidations, []);
});

const saveCases = [
  { action: "saveProfile", table: "profiles", operation: "update", seed: [{ id: USER, full_name: "Áður" }], input: { full_name: "  Nýtt nafn  ", currency: "ISK" }, saved: { full_name: "Nýtt nafn", currency: "ISK" } },
  { action: "saveMonthlyIncome", table: "transactions", input: { amount: "5000", month: "2026-09", category_id: "", note: "Laun" }, saved: { date: "2026-09-01", type: "income", amount: 5000, category_id: null } },
  { action: "saveCategory", table: "categories", input: { name: "  Matur  ", type: "expense" }, saved: { name: "Matur", type: "expense", is_default: false } },
  { action: "saveBudget", table: "budgets", input: { amount: "10000", month: "2026-09", category_id: "" }, saved: { amount: 10000, month: "2026-09-01", category_id: null } },
  { action: "saveSavingsGoal", table: "savings_goals", input: { title: "Varasjóður", target_amount: "20000", current_amount: "1000", target_date: "" }, saved: { target_amount: 20000, current_amount: 1000, target_date: null } },
  { action: "addSavingsContribution", table: "savings_contributions", input: { savings_goal_id: RECORD, amount: "1000", date: "2026-09-16", note: "" }, saved: { savings_goal_id: RECORD, amount: 1000, note: null } }
];

test("profile, income, category, budget and goal/contribution saves return feedback only on successful writes", async (t) => {
  for (const entry of saveCases) {
    await t.test(entry.action, async () => {
      const seed = { [entry.table]: entry.seed ?? [] };
      const db = fixture(seed);
      assertFeedback(await db.actions[entry.action](form(entry.input)));
      const row = db.tables[entry.table][0];
      for (const [key, value] of Object.entries(entry.saved)) assert.equal(row[key], value, key);
      assert.equal(entry.table === "profiles" ? row.id : row.user_id, USER);
      assert.ok(db.invalidations.length > 0);

      const unavailable = fixture(seed, { intercept: fail(entry.table, entry.operation ?? "insert") });
      await assert.rejects(unavailable.actions[entry.action](form(entry.input)), /synthetic write failure/);
      assert.deepEqual(unavailable.invalidations, []);

      if (!["saveProfile", "addSavingsContribution"].includes(entry.action)) {
        const edit = fixture({ [entry.table]: [own({ id: RECORD })] });
        assertFeedback(await edit.actions[entry.action](form({ ...entry.input, id: RECORD })));
        assert.equal(edit.tables[entry.table].length, 1);
        for (const [key, value] of Object.entries(entry.saved)) assert.equal(edit.tables[entry.table][0][key], value, key);
        assert.equal(edit.queries[0].operation, "update");
      }
    });
  }
});

const bucket = own({ bucket_type: "sjodir", label: "Sjóðir", amount: "1000.00" });
const bucketInput = { request_id: RECORD, bucket_type: "sjodir", label: "Sjóðir", amount: "250", date: "2026-09-16", note: "Mánaðarlegt" };

test("correcting a savings total returns feedback after replacing the balance, including zero", { timeout: 3000 }, async () => {
  const gate = deferredWrite("savings_buckets", "upsert");
  const db = fixture({ savings_buckets: [bucket] }, gate);
  let settled = false;
  const result = db.actions.saveSavingsBucket(form({ ...bucketInput, amount: "0" })).then((value) => { settled = true; return value; });
  await gate.entered;
  assert.equal(settled, false);
  assert.equal(db.tables.savings_buckets[0].amount, "1000.00");
  gate.release();
  assertFeedback(await result);
  assert.equal(db.tables.savings_buckets.length, 1);
  assert.equal(db.tables.savings_buckets[0].amount, 0);
  const failed = fixture({ savings_buckets: [bucket] }, { intercept: fail("savings_buckets", "upsert") });
  await assert.rejects(failed.actions.saveSavingsBucket(form(bucketInput)), /synthetic write failure/);
  assert.deepEqual(failed.invalidations, []);
});

test("adding savings waits for the atomic RPC before feedback and cache invalidation", { timeout: 3000 }, async () => {
  const gate = deferredWrite("add_savings_bucket_contribution", "rpc");
  const db = fixture({ savings_buckets: [bucket] }, gate);
  let settled = false;
  const result = db.actions.addSavingsBucketAmount(form(bucketInput)).then((value) => { settled = true; return value; });
  await gate.entered;
  assert.equal(settled, false);
  assert.equal(db.queries.length, 1);
  assert.equal(db.queries[0].payload.p_request_id, RECORD);
  assert.equal(db.tables.savings_buckets[0].amount, "1000.00");
  assert.deepEqual(db.invalidations, []);
  gate.release();
  assertFeedback(await result);
  assert.equal(db.tables.savings_bucket_entries[0].amount, 250);
  assert.equal(db.tables.savings_bucket_entries[0].date, "2026-09-16");
  assert.equal(db.tables.savings_buckets[0].amount, 1250);
  assert.ok(db.invalidations.includes("/"));
});

test("a failed savings RPC never falls back to partial balance or history writes", async () => {
  const db = fixture({ savings_buckets: [bucket] }, { intercept: fail("add_savings_bucket_contribution", "rpc") });
  await assert.rejects(db.actions.addSavingsBucketAmount(form(bucketInput)), /synthetic write failure/);
  assert.deepEqual(db.invalidations, []);
  assert.equal((db.tables.savings_bucket_entries ?? []).length, 0);
  assert.equal(Number(db.tables.savings_buckets[0].amount), 1000);
  assert.equal(db.queries.length, 1);
});

test("savings requests require a retry ID and a real calendar date before writing", async () => {
  for (const invalid of [{ request_id: "" }, { date: "2026-02-30" }, { amount: "Infinity" }, { amount: "0.001" }]) {
    const db = fixture();
    const result = await db.actions.addSavingsBucketAmount(form({ ...bucketInput, ...invalid }));
    assert.ok(result.error);
    assert.deepEqual(db.queries, []);
  }
});

const bill = own({ id: RECORD, series_id: OTHER, name: "Rafmagn", amount: 1250, category_id: CATEGORY, due_day: 31, month: "2026-09-01", is_active: true });
const billInput = { name: "Rafmagn", amount: "1250", category_id: CATEGORY, due_day: "31", month: "2026-09", is_active: "on" };
const payInput = { bill_id: RECORD, month: "2026-09", mode: "new", amount: "1250", paid_at: "2026-09-16", confirm_new_expense: "on" };

test("saving a bill returns feedback and a clean selected-month URL without throwing a success redirect", async () => {
  for (const editing of [false, true]) {
    const db = fixture({ bills: [bill] });
    const result = await db.actions.saveBill(form({ ...billInput, ...(editing ? { id: RECORD } : {}) }));
    assert.equal(result.redirectTo, "/bills?month=2026-09");
    assert.ok(result.message.length > 0);
    assert.equal(db.tables.bills.length, editing ? 1 : 2);
    assert.equal(db.tables.bills.at(-1).series_id, OTHER);
    assert.equal(db.tables.bills.at(-1).month, "2026-09-01");
    const failed = fixture({ bills: [bill] }, { intercept: fail("bills", editing ? "update" : "insert") });
    await assert.rejects(failed.actions.saveBill(form({ ...billInput, ...(editing ? { id: RECORD } : {}) })), /synthetic write failure/);
    assert.deepEqual(failed.invalidations, []);
  }
});

test("bill-payment feedback waits for its linked expense and payment to persist", { timeout: 3000 }, async () => {
  const gate = deferredWrite("bill_payments", "insert");
  const db = fixture({ bills: [bill] }, gate);
  let settled = false;
  const result = db.actions.markBillPaid(form(payInput)).then((value) => { settled = true; return value; });
  await gate.entered;
  assert.equal(settled, false);
  assert.equal(db.tables.transactions.length, 1);
  assert.deepEqual(db.invalidations, []);
  gate.release();
  assertFeedback(await result);
  assert.equal(db.tables.bill_payments[0].transaction_id, db.tables.transactions[0].id);
  assert.equal(db.tables.transactions[0].date, "2026-09-16");
  assert.equal(db.tables.transactions[0].type, "expense");
  assert.equal(db.tables.transactions[0].amount, 1250);
});

test("bill-payment read/write/rollback failures return explicit errors rather than success", async (t) => {
  for (const stage of ["read", "expense", "payment", "rollback"]) {
    await t.test(stage, async () => {
      const db = fixture({ bills: [bill] }, { intercept: async (query) => {
        const fails = stage === "read" ? query.table === "bills"
          : stage === "expense" ? query.table === "transactions" && query.operation === "insert"
          : query.table === "bill_payments" && query.operation === "insert" || (stage === "rollback" && query.table === "transactions" && query.operation === "delete");
        return fails ? { message: "synthetic write failure" } : null;
      } });
      const result = await db.actions.markBillPaid(form(payInput));
      assert.equal(result.message, "");
      assert.ok(result.error);
      if (["read", "expense"].includes(stage)) assert.deepEqual(db.invalidations, []);
      assert.equal((db.tables.bill_payments ?? []).length, 0);
      assert.equal((db.tables.transactions ?? []).length, stage === "rollback" ? 1 : 0);
      if (["payment", "rollback"].includes(stage)) {
        assert.ok(db.queries.some((query) => query.table === "transactions" && query.operation === "delete"));
      }
    });
  }
});

test("unlinking a bill payment waits for its deletion and preserves the linked expense", { timeout: 3000 }, async () => {
  const seed = { transactions: [own({ id: TRANSACTION })], bill_payments: [own({ id: PAYMENT, transaction_id: TRANSACTION })] };
  const gate = deferredWrite("bill_payments", "delete");
  const db = fixture(seed, gate);
  let settled = false;
  const pending = db.actions.deleteBillPayment(form({ id: PAYMENT })).then((result) => { settled = true; return result; });
  await gate.entered;
  assert.equal(settled, false);
  assert.deepEqual(db.invalidations, []);
  gate.release();
  assertFeedback(await pending);
  assert.equal(db.tables.transactions.length, 1);
  assert.equal(db.tables.bill_payments.length, 0);
  assert.equal(db.queries.some((query) => query.table === "transactions" && query.operation === "delete"), false);
  const failed = fixture(seed, { intercept: fail("bill_payments", "delete") });
  assert.ok((await failed.actions.deleteBillPayment(form({ id: PAYMENT }))).error);
  assert.deepEqual(failed.invalidations, []);
  assert.equal(failed.tables.bill_payments.length, 1);
  assert.equal(failed.tables.transactions.length, 1);
});

test("delete actions return feedback after deleting only the signed-in user's requested records", async (t) => {
  const cases = [
    ["deleteTransaction", "transactions"], ["deleteAllTransactions", "transactions"],
    ["deleteMonthlyIncome", "transactions"], ["deleteCategory", "categories"],
    ["deleteBudget", "budgets"], ["deleteSavingsGoal", "savings_goals"],
    ["deleteSavingsContribution", "savings_contributions"], ["deleteAllSavingsContributions", "savings_contributions"],
    ["deleteSavingsBucket", "savings_buckets"]
  ];
  for (const [action, table] of cases) {
    await t.test(action, async () => {
      const seed = { [table]: [own({ id: RECORD, type: "income", is_default: false, bucket_type: "sjodir" }), { id: OTHER, user_id: OTHER, type: "income", is_default: false, bucket_type: "sjodir" }] };
      const input = form({ id: RECORD, bucket_type: "sjodir" });
      const db = fixture(seed);
      assertFeedback(await db.actions[action](input));
      assert.deepEqual(db.tables[table].map((row) => row.id), [OTHER]);
      const failed = fixture(seed, { intercept: fail(table, "delete") });
      await assert.rejects(failed.actions[action](input), /synthetic write failure/);
      assert.deepEqual(failed.invalidations, []);
    });
  }
});

test("bill deletion feedback follows the requested month or whole-series deletion", async () => {
  for (const scope of ["month", "all"]) {
    const seed = { bills: [bill, { ...bill, id: PAYMENT, month: "2026-10-01" }, { ...bill, id: OTHER, user_id: OTHER }] };
    const db = fixture(seed);
    assertFeedback(await db.actions.deleteBill(form({ id: RECORD, month: "2026-09", scope })));
    assert.equal(db.tables.bills.filter((row) => row.user_id === USER).length, scope === "all" ? 0 : 1);
    assert.ok(db.tables.bills.some((row) => row.user_id === OTHER));
    const failed = fixture(seed, { intercept: fail("bills", "delete") });
    await assert.rejects(failed.actions.deleteBill(form({ id: RECORD, month: "2026-09", scope })), /synthetic write failure/);
    assert.deepEqual(failed.invalidations, []);
  }
});

test("expired authentication redirects before any finance write or successful feedback", async () => {
  const db = fixture({}, { authenticated: false });
  const financeActions = Object.keys(db.actions).filter((name) => /^(save|delete|add|mark)/.test(name));
  assert.ok(financeActions.length >= 20);
  for (const name of financeActions) {
    await assert.rejects(db.actions[name](new FormData()), (error) => error.redirectTo === "/login", name);
  }
  assert.deepEqual(db.queries, []);
  assert.deepEqual(db.invalidations, []);
});
