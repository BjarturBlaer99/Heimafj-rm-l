const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER_USER = "99999999-9999-4999-8999-999999999999";
const FIRST = "22222222-2222-4222-8222-222222222222";
const SECOND = "33333333-3333-4333-8333-333333333333";
const THIRD = "44444444-4444-4444-8444-444444444444";
const FOOD = "55555555-5555-4555-8555-555555555555";
const SALARY = "66666666-6666-4666-8666-666666666666";
const BOTH = "77777777-7777-4777-8777-777777777777";
const OTHER_CATEGORY = "88888888-8888-4888-8888-888888888888";

function form(ids, category) {
  const data = new FormData();
  for (const id of ids) data.append("transaction_ids", id);
  data.set("category_id", category);
  return data;
}
function fixture(records = []) {
  const transactions = structuredClone(records);
  const categories = [{ id: FOOD, user_id: USER, type: "expense" }, { id: SALARY, user_id: USER, type: "income" }, { id: BOTH, user_id: USER, type: "both" }, { id: OTHER_CATEGORY, user_id: OTHER_USER, type: "both" }];
  const writes = [];
  const invalidations = [];
  const client = { from(table) {
    const filters = [];
    let payload = null, single = false;
    const query = {
      select() { return query; },
      eq(key, value) { filters.push((record) => record[key] === value); return query; },
      in(key, values) { filters.push((record) => values.includes(record[key])); return query; },
      update(values) { payload = values; return query; },
      single() { single = true; return query; },
      then(resolve, reject) { return Promise.resolve().then(() => {
        const matches = (table === "categories" ? categories : transactions).filter((record) => filters.every((filter) => filter(record)));
        if (payload) { writes.push(matches.map((record) => record.id)); matches.forEach((record) => Object.assign(record, payload)); }
        return { data: single ? matches[0] ?? null : structuredClone(matches), error: null };
      }).then(resolve, reject); }
    };
    return query;
  } };
  const source = ts.transpileModule(readFileSync(join(__dirname, "..", "lib/transaction-actions.ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  const mocks = { "@/lib/data": { getAuthed: async () => ({ supabase: client, user: { id: USER } }) }, "next/cache": { revalidatePath: (...args) => invalidations.push(args) } };
  new Function("require", "exports", source)((id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id), exports);
  return { transactions, writes, invalidations, categorizeTransactions: exports.categorizeTransactions };
}
const record = (id, overrides = {}) => ({ id, user_id: USER, type: "expense", category_id: null, ...overrides });

test("batch category updates refuse mixed own and another user's transaction IDs", async () => {
  const f = fixture([record(FIRST), record(SECOND, { user_id: OTHER_USER })]);
  const result = await f.categorizeTransactions(form([FIRST, SECOND], FOOD));
  assert.ok(result.error);
  assert.equal(result.message, "");
  assert.deepEqual(f.writes, []);
  assert.equal(f.transactions[0].category_id, null);
});
test("a category belonging to another user is refused", async () => {
  const f = fixture([record(FIRST)]);
  const result = await f.categorizeTransactions(form([FIRST], OTHER_CATEGORY));
  assert.ok(result.error);
  assert.deepEqual(f.writes, []);
});
test("income-only category is refused for expenses and expense-only category for a mixed selection", async () => {
  const f = fixture([record(FIRST), record(SECOND, { type: "income" })]);
  assert.ok((await f.categorizeTransactions(form([FIRST], SALARY))).error);
  assert.ok((await f.categorizeTransactions(form([FIRST, SECOND], FOOD))).error);
  assert.deepEqual(f.writes, []);
});
test("updates only selected own records, deduplicates IDs, and reports the actual updated count", async () => {
  const f = fixture([record(FIRST), record(SECOND), record(THIRD)]);
  const result = await f.categorizeTransactions(form([FIRST, FIRST, SECOND], FOOD));
  assert.equal(result.message, "Flokkun 2 færslna var uppfærð.");
  assert.equal(result.error, undefined);
  assert.deepEqual(f.writes, [[FIRST, SECOND]]);
  assert.deepEqual(f.transactions.map((item) => item.category_id), [FOOD, FOOD, null]);
  assert.deepEqual(f.invalidations, [["/", "layout"]]);
});
test("both-type categories support mixed transactions and clearing a category sets null", async () => {
  const f = fixture([record(FIRST), record(SECOND, { type: "income" })]);
  assert.equal((await f.categorizeTransactions(form([FIRST, SECOND], BOTH))).error, undefined);
  assert.deepEqual(f.transactions.map((item) => item.category_id), [BOTH, BOTH]);
  assert.equal((await f.categorizeTransactions(form([FIRST], ""))).message, "Flokkun 1 færslna var uppfærð.");
  assert.deepEqual(f.transactions.map((item) => item.category_id), [null, BOTH]);
});
test("empty selection, invalid UUID, and missing record are reported without writes", async () => {
  const f = fixture([record(FIRST)]);
  for (const ids of [[], ["invalid"], [THIRD]]) assert.ok((await f.categorizeTransactions(form(ids, FOOD))).error);
  assert.deepEqual(f.writes, []);
});
