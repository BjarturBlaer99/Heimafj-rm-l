const assert = require("node:assert/strict");
const { AsyncLocalStorage } = require("node:async_hooks");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

const code = ts.transpileModule(readFileSync(join(__dirname, "../lib/data.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

// Exercise the actual data loaders with isolated request-cache and RLS boundaries.
function loadData(tables = {}, failingTable, userPreferences = {}) {
  const requests = new AsyncLocalStorage();
  const queries = [];
  let authCalls = 0;
  const cache = (fn) => (...args) => {
    const request = requests.getStore();
    if (!request) return fn(...args);
    if (!request.cache.has(fn)) request.cache.set(fn, new Map());
    const entries = request.cache.get(fn);
    const key = JSON.stringify(args);
    if (!entries.has(key)) entries.set(key, fn(...args));
    return entries.get(key);
  };
  const createClient = async () => {
    const { userId } = requests.getStore();
    return {
      auth: { getUser: async () => { authCalls += 1; return { data: { user: { id: userId, user_metadata: { savings_preferences: userPreferences[userId] } } } }; } },
      from(table) {
        const query = { table, userId, select: "*", filters: [], orders: [] };
        const builder = {
          select(columns) { query.select = columns; return builder; },
          order(column, options = {}) { query.orders.push([column, options.ascending !== false]); return builder; },
          eq(column, value) { query.filters.push([column, "eq", value]); return builder; },
          gte(column, value) { query.filters.push([column, "gte", value]); return builder; },
          lt(column, value) { query.filters.push([column, "lt", value]); return builder; },
          lte(column, value) { query.filters.push([column, "lte", value]); return builder; },
          ilike(column, value) { query.filters.push([column, "ilike", value]); return builder; },
          single() { query.single = true; return builder; },
          limit(value) { query.limit = value; return builder; },
          range(from, to) { query.range = [from, to]; return builder; },
          upsert(rows, options) { query.upsert = rows; query.conflict = options.onConflict; return builder; },
          then(resolve, reject) {
            queries.push(query);
            if (table === failingTable) return Promise.resolve({ data: null, error: { message: "unavailable" } }).then(resolve, reject);
            if (query.upsert) {
              tables[table] ??= [];
              for (const row of query.upsert) {
                assert.equal(row.user_id, userId);
                const existing = tables[table].find((item) => item.user_id === userId && item.name === row.name);
                if (existing) Object.assign(existing, row);
                else tables[table].push({ ...row, id: `${userId}-${row.name}`, created_at: "2026-01-01" });
              }
              return Promise.resolve({ data: null, error: null }).then(resolve, reject);
            }
            let rows = (tables[table] ?? []).filter((row) => (table === "profiles" ? row.id : row.user_id) === userId);
            for (const [column, operation, value] of query.filters) {
              rows = rows.filter((row) => operation === "eq" ? row[column] === value
                : operation === "gte" ? row[column] >= value
                : operation === "lt" ? row[column] < value
                : operation === "lte" ? row[column] <= value
                : String(row[column] ?? "").toLowerCase().includes(value.slice(1, -1).toLowerCase()));
            }
            rows = [...rows].sort((left, right) => {
              for (const [column, ascending] of query.orders) {
                const result = String(left[column]).localeCompare(String(right[column]));
                if (result) return ascending ? result : -result;
              }
              return 0;
            });
            if (query.limit !== undefined) rows = rows.slice(0, query.limit);
            if (query.range) rows = rows.slice(query.range[0], query.range[1] + 1);
            rows = rows.slice(0, 1000); // Match the PostgREST response cap.
            if (!query.select.includes("*")) rows = rows.map((row) => Object.fromEntries(query.select.split(",").map((column) => [column, row[column]])));
            return Promise.resolve({ data: query.single ? rows[0] ?? null : rows, error: null }).then(resolve, reject);
          }
        };
        return builder;
      }
    };
  };
  const exports = {};
  const testRequire = (id) => {
    if (id === "react") return { cache };
    if (id === "next/navigation") return { redirect: () => { throw new Error("redirect"); } };
    if (id === "@/lib/supabase/server") return { createClient };
    if (id === "@/lib/format") return { currentMonth: () => "2026-09", monthStart: (month) => `${month}-01` };
    if (id === "@/lib/read-all" || id === "@/lib/savings-buckets" || id === "@/lib/savings-preferences") {
      const helper = {};
      const file = join(__dirname, "..", id.replace("@/", "") + ".ts");
      new Function("require", "exports", ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(testRequire, helper);
      return helper;
    }
    return require(id);
  };
  new Function("require", "exports", code)(testRequire, exports);
  return {
    ...exports,
    queries,
    get authCalls() { return authCalls; },
    request: (callback, userId = "user-a") => requests.run({ userId, cache: new Map() }, callback)
  };
}

const defaults = () => ["Áskriftir", "Reikningar"].map((name) => ({
  id: name, user_id: "user-a", name, type: "expense", is_default: true
}));

test("existing categories and category details share one read without a write", async () => {
  const loader = loadData({ categories: defaults() });
  const [categories, repeated, category] = await loader.request(() => Promise.all([
    loader.getCategories(), loader.getCategories(), loader.getCategoryById("Reikningar")
  ]));
  assert.equal(categories.length, 2);
  assert.equal(repeated, categories);
  assert.equal(category.name, "Reikningar");
  assert.equal(loader.queries.length, 1);
  assert.equal(loader.queries[0].upsert, undefined);
  assert.equal(loader.authCalls, 1);
});

test("older accounts repair only missing or changed system categories", async () => {
  const categories = [...defaults().slice(0, 1), { id: "custom", user_id: "user-a", name: "Matur", type: "expense", is_default: false }];
  const loader = loadData({ categories });
  const first = await loader.request(() => loader.getCategories());
  assert.equal(first.length, 3);
  assert.equal(first.find((row) => row.name === "Reikningar").is_default, true);
  assert.deepEqual(loader.queries.find((query) => query.upsert).upsert.map((row) => row.name), ["Reikningar"]);
  const before = loader.queries.length;
  await loader.request(() => loader.getCategories());
  assert.equal(loader.queries.length - before, 1);
  categories.find((row) => row.name === "Reikningar").type = "income";
  const repaired = await loader.request(() => loader.getCategories());
  assert.equal(repaired.find((row) => row.name === "Reikningar").type, "expense");
  assert.equal(categories.filter((row) => row.name === "Reikningar").length, 1);
});

test("a failed category read does not initiate writes", async () => {
  const loader = loadData({}, "categories");
  await assert.rejects(loader.request(() => loader.getCategories()), /Ekki tókst/);
  assert.equal(loader.queries.length, 1);
  assert.equal(loader.queries[0].upsert, undefined);
});

test("equivalent transaction filters share a query while different filters stay separate", async () => {
  const loader = loadData({ transactions: [
    { id: "a", user_id: "user-a", date: "2026-09-01", type: "expense", category_id: "food", note: "Store", amount: 30 },
    { id: "b", user_id: "user-a", date: "2026-10-01", type: "expense", category_id: "food", note: "Store", amount: 40 },
    { id: "c", user_id: "user-a", date: "2026-09-02", type: "income", category_id: "salary", note: "Pay", amount: 50 }
  ] });
  const [first, repeated, income] = await loader.request(() => Promise.all([
    loader.getTransactions({ month: "2026-09", type: "expense", category: "food", search: "store", from: "2026-09-01", to: "2026-09-30" }),
    loader.getTransactions({ to: "2026-09-30", from: "2026-09-01", search: "store", category: "food", type: "expense", month: "2026-09" }),
    loader.getTransactions({ month: "2026-09", type: "income" })
  ]));
  assert.deepEqual(first.map((row) => row.id), ["a"]);
  assert.equal(repeated, first);
  assert.deepEqual(income.map((row) => row.id), ["c"]);
  assert.equal(loader.queries.length, 2);
});

test("cached reads are fresh across requests and isolated between signed-in users", async () => {
  const profiles = [{ id: "user-a", full_name: "A" }, { id: "user-b", full_name: "B" }];
  const loader = loadData({ profiles });
  const first = await loader.request(() => loader.getProfile());
  const second = await loader.request(() => loader.getProfile(), "user-b");
  assert.equal(first.full_name, "A");
  assert.equal(second.full_name, "B");
  profiles[0] = { id: "user-a", full_name: "Updated" };
  assert.equal((await loader.request(() => loader.getProfile())).full_name, "Updated");
  assert.equal(loader.authCalls, 3);
});

test("overview month choices retain the sorted union using date columns only", async () => {
  const own = (rows) => rows.map((row) => ({ user_id: "user-a", ...row }));
  const loader = loadData({
    transactions: own([{ date: "2026-08-02" }, { date: "2026-08-01" }]),
    budgets: own([{ month: "2026-10-01" }]),
    savings_contributions: own([{ date: "2026-07-31" }]),
    bills: own([{ month: "2026-06-01" }])
  });
  assert.deepEqual(await loader.request(() => loader.getOverviewMonths(4)), ["2026-10", "2026-09", "2026-08", "2026-07"]);
  assert.deepEqual(loader.queries.map(({ table, select }) => [table, select]), [
    ["transactions", "date"], ["budgets", "month"], ["savings_contributions", "date"], ["bills", "month"], ["savings_bucket_entries", "date"]
  ]);
});

test("monthly overview includes savings on both month edges and excludes adjacent months", async () => {
  const loader = loadData({ savings_contributions: [
    { id: "before", date: "2026-11-30", amount: 100 },
    { id: "start", date: "2026-12-01", amount: 20 },
    { id: "end", date: "2026-12-31", amount: 30 },
    { id: "after", date: "2027-01-01", amount: 200 }
  ].map((row) => ({ user_id: "user-a", ...row })) });
  const result = await loader.request(() => loader.getMonthlyOverviewData("2026-12"));
  assert.equal(result.savingsContributed, 50);
  assert.deepEqual(result.savingsContributions.map((row) => row.id), ["end", "start"]);
  assert.deepEqual(loader.queries.find((query) => query.table === "savings_contributions").filters, [
    ["date", "gte", "2026-12-01"], ["date", "lt", "2027-01-01"]
  ]);
});

test("monthly trends reuse descending history without changing values at the API row cap", () => {
  const { addMonths, format, startOfMonth } = require("date-fns");
  const loader = loadData();
  const thisMonth = startOfMonth(new Date());
  const rangeStart = format(addMonths(thisMonth, -7), "yyyy-MM-dd");
  const transactions = Array.from({ length: 12 }, (_, index) => {
    const date = format(addMonths(thisMonth, 2 - index), "yyyy-MM-dd");
    return [
      { date, type: "income", amount: 1000 + index },
      { date, type: "expense", amount: 100 + index }
    ];
  }).flat();

  for (const cap of [1, 7, 17, 1000]) {
    const allHistory = transactions.slice(0, cap);
    const oldTrendQuery = transactions.filter((row) => row.date >= rangeStart).slice(0, cap);
    assert.deepEqual(loader.buildMonthlyTrend(allHistory, 8), loader.buildMonthlyTrend(oldTrendQuery, 8));
  }

  const trend = loader.buildMonthlyTrend(transactions, 8);
  assert.equal(trend.length, 8);
  assert.equal(trend.at(-1).income, 1002);
  assert.equal(trend.at(-1).expenses, 102);
  assert.equal(trend.at(-1).savings, 900);
  assert.deepEqual(loader.buildMonthlyTrend([], 8).map(({ income, expenses, savings }) => [income, expenses, savings]),
    Array.from({ length: 8 }, () => [0, 0, 0]));
});

test("read failures never become empty transactions, goals, or zero savings", async () => {
  for (const [table, method] of [["transactions", "getTransactions"], ["savings_goals", "getSavingsGoals"], ["budgets", "getBudgets"]]) {
    const loader = loadData({}, table);
    await assert.rejects(loader.request(() => loader[method]()), /Ekki tókst/);
  }
  const buckets = loadData({}, "savings_buckets");
  const result = await buckets.request(() => buckets.getSavingsBuckets());
  assert.equal(result.schemaReady, false);
  assert.deepEqual(result.buckets, []);
});

test("dashboard savings follow each account's order and goal selection without changing total balances", async () => {
  const types = ["serignarsparnadur", "husnaedisparnadur", "hlutabref", "sjodir"];
  const preferences = {
    "user-a": { version: 1, order: [...types].reverse(), housing: ["husnaedisparnadur"], goal: ["husnaedisparnadur", "sjodir"] }
  };
  const buckets = ["user-a", "user-b"].flatMap((user_id, userIndex) => types.map((bucket_type, index) => ({
    id: `${user_id}-${index}`, user_id, bucket_type, label: bucket_type,
    amount: String([4650000, 3875000, 1245000, 875000][index] * (userIndex + 1)),
    created_at: `2026-01-0${index + 1}`
  })));
  const before = structuredClone(buckets);
  const loader = loadData({ savings_buckets: buckets }, undefined, preferences);
  const [custom, legacy] = await Promise.all([
    loader.request(() => loader.getDashboardData(), "user-a"),
    loader.request(() => loader.getDashboardData(), "user-b")
  ]);
  assert.deepEqual(custom.savingsBuckets.map((bucket) => bucket.bucket_type), [...types].reverse());
  assert.equal(custom.totalSavingsBalance, 10645000);
  assert.equal(custom.goalSavingsBalance, 4750000);
  assert.deepEqual(legacy.savingsBuckets.map((bucket) => bucket.bucket_type), types);
  assert.equal(legacy.totalSavingsBalance, 21290000);
  assert.equal(legacy.goalSavingsBalance, legacy.totalSavingsBalance);
  assert.ok(custom.savingsBuckets.every((bucket) => bucket.user_id === "user-a"));
  assert.ok(legacy.savingsBuckets.every((bucket) => bucket.user_id === "user-b"));
  assert.deepEqual(buckets, before);
  for (const query of loader.queries.filter((query) => query.table === "savings_buckets")) {
    assert.deepEqual(query.filters, [["user_id", "eq", query.userId]]);
  }

  // A new request must see a saved selection, including an intentionally empty
  // goal, rather than retaining another request's cached values.
  preferences["user-a"] = { ...preferences["user-a"], goal: [] };
  const updated = await loader.request(() => loader.getDashboardData(), "user-a");
  assert.equal(updated.goalSavingsBalance, 0);
  assert.equal(updated.totalSavingsBalance, custom.totalSavingsBalance);
  assert.equal((await loader.request(() => loader.getDashboardData(), "user-b")).goalSavingsBalance, legacy.goalSavingsBalance);
});

test("savings reads keep selected empty groups and fill missing buckets with owner-specific zero balances", async () => {
  const order = ["sjodir", "hlutabref", "husnaedisparnadur", "serignarsparnadur"];
  const selected = { version: 1, order, housing: [], goal: ["sjodir", "hlutabref"] };
  const loader = loadData({ savings_buckets: [{ id: "fund", user_id: "user-a", bucket_type: "sjodir", label: "Sjóðir", amount: "100" }] }, undefined, { "user-a": selected });
  const result = await loader.request(() => loader.getSavingsBuckets());
  assert.equal(result.schemaReady, true);
  assert.deepEqual(result.preferences, selected);
  assert.deepEqual(result.buckets.map((bucket) => bucket.bucket_type), order);
  assert.deepEqual(result.buckets.map((bucket) => Number(bucket.amount)), [100, 0, 0, 0]);
  assert.ok(result.buckets.every((bucket) => bucket.user_id === "user-a"));
});

test("custom date range replaces a conflicting month", async () => {
  const loader = loadData({ transactions: [{ id: "august", user_id: "user-a", date: "2026-08-15", amount: 100, type: "expense" }] });
  const rows = await loader.request(() => loader.getTransactions({ month: "2026-09", from: "2026-08-01", to: "2026-08-31" }));
  assert.deepEqual(rows.map((row) => row.id), ["august"]);
});

test("transaction totals include rows beyond the server's 1000-row page", async () => {
  const loader = loadData({ transactions: Array.from({ length: 1050 }, (_, index) => ({ id: String(index).padStart(5, "0"), user_id: "user-a", date: "2026-09-02", amount: 2, type: "expense" })) });
  const rows = await loader.request(() => loader.getTransactions({ month: "2026-09" }));
  assert.equal(rows.length, 1050);
  assert.equal(rows.reduce((total, row) => total + row.amount, 0), 2100);
  assert.equal(loader.queries.length, 2);
});

test("overall budget is a ceiling, not an additional category allocation", async () => {
  const budgets = [
    { id: "overall", category_id: null, amount: "500000" },
    { id: "food", category_id: "food", amount: "100000" },
    { id: "housing", category_id: "housing", amount: "250000" }
  ].map((row) => ({ user_id: "user-a", month: "2026-09-01", ...row }));
  const loader = loadData({ budgets });
  const dashboard = await loader.request(() => loader.getDashboardData());
  const monthly = await loader.request(() => loader.getMonthlyOverviewData("2026-09"));
  assert.equal(dashboard.budgeted, 500000);
  assert.equal(dashboard.remainingBudget, 500000);
  assert.equal(monthly.budgeted, 500000);
  assert.equal(loader.totalBudget(budgets.slice(1)), 350000);
  assert.equal(loader.totalBudget([]), 0);
});

test("largest expenses ranks amounts without changing the recent transaction order", async () => {
  const transactions = Array.from({ length: 10 }, (_, index) => ({
    id: String(index), user_id: "user-a", type: "expense", date: `2026-09-${String(index + 1).padStart(2, "0")}`, amount: index === 0 ? "9999" : String(index)
  }));
  transactions.push({ id: "salary", user_id: "user-a", type: "income", date: "2026-09-20", amount: "100000" });
  const loader = loadData({ transactions });
  const result = await loader.request(() => loader.getMonthlyOverviewData("2026-09"));
  assert.deepEqual(result.largestExpenses.map((row) => row.id), ["0", "9", "8", "7", "6", "5", "4", "3"]);
  assert.equal(result.transactions[0].id, "salary");
  assert.equal(result.expenseTransactions[0].id, "9");
});

test("month choices retain older data beyond each table's first 1000 records", async () => {
  for (const [table, column] of [["transactions", "date"], ["budgets", "month"], ["savings_contributions", "date"], ["bills", "month"], ["savings_bucket_entries", "date"]]) {
    const rows = Array.from({ length: 1000 }, (_, index) => ({ id: `recent-${index}`, user_id: "user-a", [column]: "2026-09-01" }));
    rows.push({ id: "older", user_id: "user-a", [column]: "2025-01-01" });
    rows.push({ id: "other-account", user_id: "user-b", [column]: "2024-01-01" });
    const loader = loadData({ [table]: rows });
    assert.deepEqual(await loader.request(() => loader.getOverviewMonths()), ["2026-09", "2025-01"], table);
    assert.equal(loader.queries.filter((query) => query.table === table).length, 2);
  }
});

test("savings reports include bucket entries and legacy contributions within the selected month", async () => {
  const loader = loadData({
    savings_contributions: [{ id: "legacy", user_id: "user-a", date: "2026-09-01", amount: "25" }],
    savings_bucket_entries: [
      { id: "before", date: "2026-08-31", amount: "100" },
      { id: "start", date: "2026-09-01", amount: "50" },
      { id: "end", date: "2026-09-30", amount: "75" },
      { id: "after", date: "2026-10-01", amount: "200" }
    ].map((row) => ({ user_id: "user-a", ...row })),
    savings_buckets: [{ user_id: "user-a", bucket_type: "sjodir", amount: "9000" }]
  });
  const result = await loader.request(() => loader.getMonthlyOverviewData("2026-09"));
  assert.equal(result.savingsContributed, 150);
  assert.deepEqual(result.savingsContributions.map((row) => row.id), ["end", "start", "legacy"]);
  const all = await loader.request(() => loader.getSavingsActivity());
  assert.equal(all.length, 5);
  assert.equal(all.reduce((sum, row) => sum + Number(row.amount), 0), 450);
});

test("savings reports paginate bucket history and fail instead of showing an incomplete total", async () => {
  const loader = loadData({ savings_bucket_entries: Array.from({ length: 1050 }, (_, index) => ({
    id: String(index).padStart(5, "0"), user_id: "user-a", date: "2026-09-01", amount: "2"
  })) });
  const result = await loader.request(() => loader.getMonthlyOverviewData("2026-09"));
  assert.equal(result.savingsContributed, 2100);
  const failing = loadData({}, "savings_bucket_entries");
  await assert.rejects(failing.request(() => failing.getSavingsActivity()), /Ekki tókst/);
  await assert.rejects(failing.request(() => failing.getOverviewMonths()), /Ekki tókst/);
});

test("category, budget, goal and bill reads retain records past the API cap", async () => {
  const own = (id) => ({ id: String(id).padStart(5, "0"), user_id: "user-a" });
  const loader = loadData({
    categories: [...defaults(), ...Array.from({ length: 1005 }, (_, i) => ({ ...own(i), name: `Custom ${i}`, type: "expense", is_default: false }))],
    budgets: Array.from({ length: 1005 }, (_, i) => ({ ...own(i), category_id: String(i), month: "2026-09-01", amount: 2 })),
    savings_goals: Array.from({ length: 1005 }, (_, i) => own(i)),
    bills: Array.from({ length: 1005 }, (_, i) => ({ ...own(i), name: String(i), is_active: true, month: "2026-09-01", amount: 10 })),
    bill_payments: Array.from({ length: 1005 }, (_, i) => ({ ...own(i), bill_id: own(i).id, month: "2026-09-01", amount: 10 }))
  });
  assert.equal((await loader.request(() => loader.getCategories())).length, 1007);
  assert.equal((await loader.request(() => loader.getSavingsGoals())).length, 1005);
  const monthly = await loader.request(() => loader.getMonthlyOverviewData("2026-09"));
  assert.equal(monthly.budgeted, 2010);
  assert.equal(monthly.paidBills.length, 1005);
  assert.equal(monthly.unpaidBills.length, 0);
  assert.equal(monthly.paidBillsTotal, 10050);
});

test("a payment read failure never turns paid bills into unpaid bills", async () => {
  const loader = loadData({ bills: [{ id: "bill", user_id: "user-a", month: "2026-09-01", is_active: true, amount: 10 }] }, "bill_payments");
  const result = await loader.request(() => loader.getBillsForMonth("2026-09"));
  assert.equal(result.schemaReady, false);
  assert.deepEqual(result.bills, []);
});
