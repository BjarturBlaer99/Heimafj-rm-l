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
function loadData(tables = {}, failingTable) {
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
      auth: { getUser: async () => { authCalls += 1; return { data: { user: { id: userId } } }; } },
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
    if (id === "@/lib/read-all" || id === "@/lib/savings-buckets") {
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
    ["transactions", "date"], ["budgets", "month"], ["savings_contributions", "date"], ["bills", "month"]
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