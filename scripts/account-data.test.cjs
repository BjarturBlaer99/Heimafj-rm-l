const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const TABLES = ["profiles", "categories", "transactions", "budgets", "bills", "bill_payments", "savings_goals", "savings_contributions", "savings_buckets", "savings_bucket_entries"];
const compiled = new Map();

function loadTypeScript(relativePath, mocks = {}) {
  if (!compiled.has(relativePath)) compiled.set(relativePath, ts.transpileModule(readFileSync(join(__dirname, "..", relativePath), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText);
  const exports = {};
  new Function("require", "exports", compiled.get(relativePath))((id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith("@/")) return loadTypeScript(`${id.slice(2)}.ts`, mocks);
    return require(id);
  }, exports);
  return exports;
}

// The fake deliberately does not apply RLS: an omitted owner predicate must
// expose a foreign row and fail the test, rather than being hidden by the mock.
function exportFixture(seed = {}, options = {}) {
  const tables = structuredClone(seed);
  const queries = [];
  let authCalls = 0;
  const user = options.user === undefined ? { id: USER, email: "own@example.invalid", created_at: "2026-01-01", user_metadata: { account_deletion_request: { status: "requested", requested_at: "2026-09-18T12:00:00Z" } } } : options.user;
  const supabase = {
    auth: { async getUser() { authCalls++; return { data: { user }, error: options.authError ?? null }; } },
    from(table) {
      const query = { table, filters: [], orders: [] };
      let execution;
      const execute = async () => {
        queries.push(query);
        let rows = (tables[table] ?? []).filter((row) => query.filters.every(([key, value]) => row[key] === value));
        rows = [...rows].sort((a, b) => {
          for (const key of query.orders) { const order = String(a[key]).localeCompare(String(b[key])); if (order) return order; }
          return 0;
        });
        if (query.range) rows = rows.slice(query.range[0], query.range[1] + 1);
        // Simulate the service's default per-request maximum as well.
        rows = rows.slice(0, 1000);
        const error = await options.fail?.(query);
        return { data: structuredClone(rows), error: error ?? null };
      };
      const builder = {
        select(columns) { query.columns = columns; return builder; },
        eq(key, value) { query.filters.push([key, value]); return builder; },
        order(key) { query.orders.push(key); return builder; },
        range(from, to) { query.range = [from, to]; return builder; },
        then(resolve, reject) { execution ??= execute(); return execution.then(resolve, reject); }
      };
      return builder;
    }
  };
  const route = loadTypeScript("app/api/data/export/route.ts", { "@/lib/supabase/server": { createClient: async () => supabase } });
  return { ...route, queries, tables, get authCalls() { return authCalls; } };
}

const request = (query = "") => new Request(`https://example.invalid/api/data/export${query}`);
function assertPrivate(response) {
  assert.match(response.headers.get("cache-control"), /private/);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
}
function ownRows(table, count) {
  return Array.from({ length: count }, (_, index) => ({ id: `${table}-${String(index).padStart(5, "0")}`, user_id: USER, date: "2026-09-18", type: "expense", amount: index + 1, category_id: null, note: `Færsla ${index}` }));
}

test("export rejects absent or invalid authentication before reading any account data", async () => {
  for (const options of [{ user: null }, { authError: { message: "expired" } }]) {
    const fixture = exportFixture({}, options);
    const response = await fixture.GET(request("?format=json"));
    assert.equal(response.status, 401);
    assert.equal(fixture.authCalls, 1);
    assert.equal(fixture.queries.length, 0);
    assert.equal(response.headers.get("content-disposition"), null);
    assert.ok((await response.json()).error);
    assertPrivate(response);
  }
});

test("export refuses unsupported formats without reading tables", async () => {
  const fixture = exportFixture();
  const response = await fixture.GET(request("?format=html"));
  assert.equal(response.status, 400);
  assert.equal(fixture.queries.length, 0);
  assert.equal(response.headers.get("content-disposition"), null);
  assertPrivate(response);
});

test("JSON exports every account table and every page with explicit owner scoping", async () => {
  const seed = Object.fromEntries(TABLES.map((table) => [table, table === "profiles"
    ? [{ id: USER, full_name: "Eigin prófíll" }, { id: OTHER, full_name: "FOREIGN SECRET" }]
    : [...ownRows(table, table === "transactions" ? 2501 : table === "bills" ? 1000 : 1001), { id: `foreign-${table}`, user_id: OTHER, note: "FOREIGN SECRET" }]]));
  const fixture = exportFixture(seed);
  const response = await fixture.GET(request(`?format=json&user_id=${OTHER}`));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.match(response.headers.get("content-disposition"), /^attachment; filename="min-fjarmal-\d{4}-\d{2}-\d{2}\.json"$/);
  assertPrivate(response);
  const text = await response.text();
  assert.ok(!text.includes("FOREIGN SECRET"));
  const body = JSON.parse(text);
  assert.equal(body.account.id, USER);
  assert.equal(body.account.email, "own@example.invalid");
  assert.equal(body.account.deletion_request.status, "requested");
  assert.equal(body.currency, "ISK");
  assert.ok(Number.isFinite(Date.parse(body.exported_at)));
  assert.deepEqual(Object.keys(body.data).sort(), [...TABLES].sort());
  for (const table of TABLES) {
    const expected = seed[table].filter((row) => (table === "profiles" ? row.id : row.user_id) === USER);
    assert.deepEqual(body.data[table], expected);
    for (const query of fixture.queries.filter((entry) => entry.table === table)) {
      assert.ok(query.filters.some(([key, value]) => key === (table === "profiles" ? "id" : "user_id") && value === USER));
      assert.deepEqual(query.orders, ["id"]);
    }
  }
  assert.deepEqual(fixture.queries.filter((entry) => entry.table === "transactions").map((entry) => entry.range), [[0, 999], [1000, 1999], [2000, 2999]]);
  assert.deepEqual(fixture.queries.filter((entry) => entry.table === "bills").map((entry) => entry.range), [[0, 999], [1000, 1999]]);
});

test("CSV reads only all owned transaction pages and fixes the supported currency to ISK", async () => {
  const rows = ownRows("transactions", 2001);
  rows[0].currency = "USD";
  const fixture = exportFixture({ transactions: [...rows, { id: "other", user_id: OTHER, note: "FOREIGN SECRET" }] });
  const response = await fixture.GET(request("?format=csv"));
  assert.equal(response.status, 200);
  assertPrivate(response);
  assert.match(response.headers.get("content-type"), /text\/csv; charset=utf-8/);
  assert.match(response.headers.get("content-disposition"), /\.csv"$/);
  const text = await response.text();
  assert.equal(text.split("\r\n").length, 2002);
  assert.ok(text.includes('"transactions-02000"'));
  assert.ok(!text.includes("FOREIGN SECRET"));
  assert.ok(!text.includes("USD"));
  assert.equal((text.match(/"ISK"/g) ?? []).length, 2001);
  assert.deepEqual([...new Set(fixture.queries.map((entry) => entry.table))], ["transactions"]);
});

test("a later-page or table error aborts the entire export without an attachment or partial data", async () => {
  for (const format of ["json", "csv"]) {
    const fixture = exportFixture({ transactions: ownRows("transactions", 2001) }, {
      fail: (query) => query.table === "transactions" && query.range[0] === 1000 ? { message: "sensitive internal failure" } : null
    });
    const response = await fixture.GET(request(`?format=${format}`));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("content-disposition"), null);
    assertPrivate(response);
    const text = await response.text();
    assert.ok(JSON.parse(text).error);
    assert.ok(!text.includes("transactions-00000"));
    assert.ok(!text.includes("sensitive internal failure"));
  }
  const fixture = exportFixture({ transactions: ownRows("transactions", 1) }, { fail: (query) => query.table === "savings_bucket_entries" ? { message: "missing schema" } : null });
  const response = await fixture.GET(request());
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("content-disposition"), null);
});

test("CSV neutralizes formula prefixes, including leading whitespace, and preserves quoting/newlines", () => {
  const { csvCell, transactionsCsv } = loadTypeScript("lib/data-export.ts");
  for (const value of ["=1+1", "+SUM(A1:A3)", "-1+2", "@SUM(A1)", "  =1+1", "\t=1+1", "\r+1+1", "\n=1+1", "\uFEFF=1+1"]) {
    assert.equal(csvCell(value), `"'${value}"`, value);
  }
  assert.equal(csvCell('Bónus, "matur"\nönnur lína'), '"Bónus, ""matur""\nönnur lína"');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(1250.5), '"1250.5"');
  const csv = transactionsCsv([{ id: "a", date: "2026-09-18", type: "expense", amount: 1250.5, category_id: null, note: "=HYPERLINK(A1)" }]);
  assert.ok(csv.startsWith('\uFEFF"id","date","type","amount","currency","category_id","note"\r\n'));
  assert.ok(csv.endsWith('"1250.5","ISK","","\'=HYPERLINK(A1)"'));
});

function form(confirmation) {
  const result = new FormData();
  if (confirmation !== undefined) result.set("confirmation", confirmation);
  return result;
}

function deletionFixture({ authenticated = true, metadata = {}, updateError = null, beforePersist } = {}) {
  const user = { id: USER, user_metadata: structuredClone(metadata) };
  const updates = [];
  const invalidations = [];
  let authCalls = 0;
  const supabase = {
    auth: {
      updateUser: async (payload) => {
        updates.push(structuredClone(payload));
        await beforePersist?.();
        if (updateError) return { error: updateError };
        Object.assign(user.user_metadata, structuredClone(payload.data));
        return { data: { user }, error: null };
      },
      admin: new Proxy({}, { get() { throw new Error("Actual account deletion is forbidden in request actions"); } })
    },
    from() { throw new Error("Deletion request must not modify financial tables"); }
  };
  const actions = loadTypeScript("lib/account-actions.ts", {
    "@/lib/data": { getAuthed: async () => { authCalls++; if (!authenticated) throw new Error("AUTH_REQUIRED"); return { supabase, user }; } },
    "next/cache": { revalidatePath: (path) => invalidations.push(path) }
  });
  return { actions, user, updates, invalidations, get authCalls() { return authCalls; } };
}

test("deletion request and cancellation require authentication and cannot modify another account", async () => {
  const fixture = deletionFixture({ authenticated: false });
  await assert.rejects(fixture.actions.requestAccountDeletion(form("EYÐA")), /AUTH_REQUIRED/);
  await assert.rejects(fixture.actions.cancelAccountDeletion(), /AUTH_REQUIRED/);
  assert.equal(fixture.authCalls, 2);
  assert.deepEqual(fixture.updates, []);
  assert.deepEqual(fixture.invalidations, []);
});

test("deletion request validates confirmation and persists metadata before reporting success", async () => {
  let release;
  let entered;
  const waiting = new Promise((resolve) => { release = resolve; });
  const reached = new Promise((resolve) => { entered = resolve; });
  const fixture = deletionFixture({ metadata: { display_name: "Keep me" }, beforePersist: async () => { entered(); await waiting; } });
  for (const invalid of [undefined, "", "DELETE", "EYDA"]) {
    assert.ok((await fixture.actions.requestAccountDeletion(form(invalid))).error);
  }
  assert.equal(fixture.updates.length, 0);
  const input = form("  eyða  ");
  input.set("user_id", OTHER);
  let settled = false;
  const result = fixture.actions.requestAccountDeletion(input).then((value) => { settled = true; return value; });
  await reached;
  assert.equal(settled, false);
  assert.equal(fixture.user.user_metadata.account_deletion_request, undefined);
  assert.deepEqual(fixture.invalidations, []);
  release();
  const feedback = await result;
  assert.equal(feedback.error, undefined);
  assert.match(feedback.message, /ekki verið eytt/);
  assert.equal(fixture.user.id, USER);
  assert.equal(fixture.user.user_metadata.display_name, "Keep me");
  const saved = fixture.user.user_metadata.account_deletion_request;
  assert.equal(saved.status, "requested");
  assert.ok(Number.isFinite(Date.parse(saved.requested_at)));
  assert.deepEqual(Object.keys(fixture.updates[0]), ["data"]);
  assert.deepEqual(fixture.invalidations, ["/settings"]);
});

test("repeat deletion requests preserve the original request date, and cancellation clears only the request", async () => {
  const original = { status: "requested", requested_at: "2026-09-01T10:00:00Z" };
  const fixture = deletionFixture({ metadata: { account_deletion_request: original, display_name: "Keep me" } });
  const repeated = await fixture.actions.requestAccountDeletion(form("EYÐA"));
  assert.equal(repeated.error, undefined);
  assert.deepEqual(fixture.updates, []);
  assert.deepEqual(fixture.user.user_metadata.account_deletion_request, original);
  const cancelled = await fixture.actions.cancelAccountDeletion();
  assert.equal(cancelled.error, undefined);
  assert.match(cancelled.message, /afturkölluð/);
  assert.deepEqual(fixture.updates, [{ data: { account_deletion_request: null } }]);
  assert.deepEqual(fixture.user.user_metadata, { account_deletion_request: null, display_name: "Keep me" });
  assert.deepEqual(fixture.invalidations, ["/settings"]);
});

test("metadata write failures report errors without successful invalidation or data changes", async () => {
  const original = { status: "requested", requested_at: "2026-09-01T10:00:00Z" };
  const create = deletionFixture({ updateError: { message: "rejected" } });
  assert.ok((await create.actions.requestAccountDeletion(form("EYÐA"))).error);
  assert.equal(create.user.user_metadata.account_deletion_request, undefined);
  assert.deepEqual(create.invalidations, []);
  const cancel = deletionFixture({ metadata: { account_deletion_request: original }, updateError: { message: "rejected" } });
  assert.ok((await cancel.actions.cancelAccountDeletion()).error);
  assert.deepEqual(cancel.user.user_metadata.account_deletion_request, original);
  assert.deepEqual(cancel.invalidations, []);
});

test("malformed editable deletion metadata can be replaced by a valid request", async () => {
  const { accountDeletionRequestedAt } = loadTypeScript("lib/account-deletion.ts");
  for (const value of [null, "requested", [], {}, { status: "requested" }, { status: "requested", requested_at: "invalid" }, { status: "requested", requested_at: 42 }, { status: "cancelled", requested_at: "2026-09-18T12:00:00Z" }]) {
    assert.equal(accountDeletionRequestedAt(value), null);
    const fixture = deletionFixture({ metadata: { account_deletion_request: value } });
    const result = await fixture.actions.requestAccountDeletion(form("EYÐA"));
    assert.equal(result.error, undefined);
    assert.equal(fixture.updates.length, 1);
    assert.ok(accountDeletionRequestedAt(fixture.user.user_metadata.account_deletion_request));
  }
});
