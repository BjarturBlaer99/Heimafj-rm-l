const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  new Function("require", "exports", code)((id) => mocks[id] ?? (id.startsWith("@/") ? load(`${id.slice(2)}.ts`, mocks) : require(id)), exports);
  return exports;
}

const helpers = load("lib/savings-preferences.ts");
const types = ["serignarsparnadur", "husnaedisparnadur", "hlutabref", "sjodir"];
const buckets = types.map((bucket_type, index) => ({ id: String(index), bucket_type, amount: [4650000, 3875000, 1245000, 875000][index] }));
const preferences = { version: 1, order: [...types].reverse(), housing: ["husnaedisparnadur"], goal: ["husnaedisparnadur", "sjodir"] };

test("legacy accounts preserve grouping and full goal without sharing mutable defaults", () => {
  const defaults = helpers.normalizeSavingsPreferences(undefined);
  assert.deepEqual(defaults.order, types);
  assert.deepEqual(defaults.housing, types.slice(0, 2));
  assert.deepEqual(defaults.goal, types);
  defaults.housing.length = 0;
  assert.equal(helpers.defaultSavingsPreferences().housing.length, 2);
});

test("homeowners can exclude pension, reorder all buckets, and keep balances intact", () => {
  const before = structuredClone(buckets);
  const normalized = helpers.normalizeSavingsPreferences(preferences);
  const sorted = helpers.orderSavingsBuckets(buckets, normalized);
  assert.deepEqual(sorted.map((bucket) => bucket.bucket_type), [...types].reverse());
  assert.equal(helpers.selectedSavingsTotal(sorted, normalized.housing), 3875000);
  assert.equal(helpers.selectedSavingsTotal(sorted, normalized.goal), 4750000);
  assert.equal(helpers.selectedSavingsTotal(sorted, types), 10645000);
  assert.deepEqual(buckets, before);
});

test("deliberately empty groups remain empty and duplicate requests cannot inflate totals", () => {
  const empty = { ...preferences, housing: [], goal: [] };
  assert.deepEqual(helpers.normalizeSavingsPreferences(empty), empty);
  assert.equal(helpers.selectedSavingsTotal(buckets, []), 0);
  assert.equal(helpers.selectedSavingsTotal(buckets, ["sjodir", "sjodir"]), 875000);
});

test("invalid or future metadata safely falls back and untrusted save payloads fail validation", () => {
  for (const invalid of [null, [], "text", { ...preferences, version: 2 }, { ...preferences, order: types.slice(1) }, { ...preferences, order: [types[0], types[0], types[2], types[3]] }, { ...preferences, housing: ["foreign"] }, { ...preferences, goal: ["sjodir", "sjodir"] }, { ...preferences, user_id: "someone-else" }]) {
    assert.equal(helpers.savingsPreferencesSchema.safeParse(invalid).success, false);
    assert.deepEqual(helpers.normalizeSavingsPreferences(invalid), helpers.defaultSavingsPreferences());
  }
});

function actionFixture({ signedIn = true, updateError = null } = {}) {
  const users = {
    own: { id: "own", user_metadata: { full_name: "Test User", unrelated: "keep" } },
    other: { id: "other", user_metadata: { full_name: "Other", savings_preferences: helpers.defaultSavingsPreferences() } }
  };
  const calls = [];
  const revalidated = [];
  const actions = load("lib/savings-preferences-actions.ts", {
    "next/navigation": { redirect(path) { throw new Error(`redirect:${path}`); } },
    "next/cache": { revalidatePath(...args) { revalidated.push(args); } },
    "@/lib/supabase/server": { createClient: async () => ({
      auth: {
        getUser: async () => ({ data: { user: signedIn ? users.own : null }, error: null }),
        updateUser: async (input) => {
          calls.push(input);
          if (updateError) return { error: { message: updateError } };
          Object.assign(users.own.user_metadata, input.data);
          return { data: { user: users.own }, error: null };
        }
      },
      from() { throw new Error("Preferences must never mutate financial records"); }
    }) }
  });
  return { ...actions, users, calls, revalidated };
}

const form = (value) => { const data = new FormData(); data.set("preferences", typeof value === "string" ? value : JSON.stringify(value)); return data; };

test("saving changes only current user's preference key, preserves identity and revalidates views", async () => {
  const f = actionFixture();
  const other = structuredClone(f.users.other);
  const input = form(preferences);
  input.set("user_id", "other");
  const result = await f.saveSavingsPreferences(input);
  assert.equal(result.error, undefined);
  assert.deepEqual(f.calls, [{ data: { savings_preferences: preferences } }]);
  assert.deepEqual(f.users.other, other);
  assert.equal(f.users.own.user_metadata.full_name, "Test User");
  assert.equal(f.users.own.user_metadata.unrelated, "keep");
  assert.deepEqual(f.revalidated, [["/", "layout"]]);
  assert.deepEqual(helpers.normalizeSavingsPreferences(f.users.own.user_metadata.savings_preferences), preferences);
});

test("unauthenticated requests redirect and malformed or oversized saves do not write", async () => {
  const signedOut = actionFixture({ signedIn: false });
  await assert.rejects(signedOut.saveSavingsPreferences(form(preferences)), /redirect:\/login/);
  assert.equal(signedOut.calls.length, 0);
  for (const input of ["{invalid", "x".repeat(2049), { ...preferences, order: [] }, { ...preferences, amount: 999 }]) {
    const f = actionFixture();
    assert.ok((await f.saveSavingsPreferences(form(input))).error);
    assert.equal(f.calls.length, 0);
    assert.equal(f.revalidated.length, 0);
  }
});

test("save failures keep previous preference state and return useful feedback", async () => {
  const f = actionFixture({ updateError: "unavailable" });
  const before = structuredClone(f.users.own);
  const result = await f.saveSavingsPreferences(form(preferences));
  assert.ok(result.error);
  assert.equal(result.message, "");
  assert.deepEqual(f.users.own, before);
  assert.equal(f.revalidated.length, 0);
});
