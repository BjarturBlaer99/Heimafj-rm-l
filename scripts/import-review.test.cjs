const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

function load(path, mocks = {}) {
  const output = ts.transpileModule(readFileSync(join(__dirname, "..", path), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function("require", "exports", output)((id) => Object.hasOwn(mocks, id) ? mocks[id] : id.startsWith("@/") ? load(`${id.slice(2)}.ts`, mocks) : require(id), exports);
  return exports;
}
const parser = load("lib/import-parser.ts");
const review = load("lib/import-review.ts");
const USER = "11111111-1111-4111-8111-111111111111";
const OTHER_USER = "99999999-9999-4999-8999-999999999999";
const FOOD = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const BATCH = "44444444-4444-4444-8444-444444444444";
const categories = [{ id: FOOD, user_id: USER, name: "Matur", type: "expense" }, { id: OTHER, user_id: USER, name: "Annað", type: "expense" }];
const columns = { date: "Dagsetning", note: "Lýsing", amount: "Upphæð", merchantType: "", debit: "Debet", credit: "Kredit" };
const raw = (overrides = {}) => ({ Dagsetning: "18.09.2026", Lýsing: "Bónus", Upphæð: "-1.250,50", ...overrides });
const row = (overrides = {}) => ({ sourceIndex: 0, date: "2026-09-18", note: "Bónus", amount: 1250.5, type: "expense", category_id: FOOD, ...overrides });

test("CSV keeps quoted delimiters, escaped quotes and multiline descriptions", () => {
  const result = parser.parseCsv('Dagsetning;Lýsing;Upphæð\r\n18.09.2026;"Verslun; \"\"A\"\"\nMiðbær";-1.250,50\r\n');
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].Lýsing, 'Verslun; "A"\nMiðbær');
  assert.equal(result.rows[0].Upphæð, "-1.250,50");
});
test("Icelandic and international numbers, accounting negatives, and dates remain supported", () => {
  for (const amount of ["-1.250,50 kr.", "-1,250.50", "(1.250,50)"]) assert.equal(parser.parseAmount(amount), -1250.5);
  assert.equal(parser.parseDate("18/09/26"), "2026-09-18");
  assert.equal(parser.parseDate("2026-09-18T09:42:00"), "2026-09-18");
  assert.equal(parser.parseDate("45000"), "2023-03-15");
});
test("CSV decoding preserves Icelandic UTF-8 and falls back for Windows-1252 bank exports", async () => {
  const utf8 = new TextEncoder().encode("Bónus;Þór");
  assert.equal(await parser.readCsvText({ arrayBuffer: async () => utf8.buffer }), "Bónus;Þór");
  const legacy = Uint8Array.from([66, 243, 110, 117, 115]);
  assert.equal(await parser.readCsvText({ arrayBuffer: async () => legacy.buffer }), "Bónus");
});
test("invalid calendar dates, missing amounts, income and zero each have explicit reasons", () => {
  const result = review.buildImportReview([raw(), raw({ Dagsetning: "31.02.2026" }), raw({ Upphæð: "ólesanlegt" }), raw({ Upphæð: "100" }), raw({ Upphæð: "0" })], columns, categories);
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.excluded.map((item) => item.reason), ["date", "amount", "income", "zero"]);
  assert.deepEqual(result.excluded.map((item) => item.sourceIndex), [1, 2, 3, 4]);
});
test("a zero explicit amount never falls back silently to a debit column", () => {
  assert.equal(review.buildImportReview([raw({ Upphæð: "0", Debet: "500" })], columns, categories).excluded[0].reason, "zero");
  assert.equal(review.buildImportReview([raw({ Debet: "1.500", Kredit: "200" })], { ...columns, amount: "" }, categories).rows[0].amount, 1300);
});

test("amounts match stored precision and range while debit/credit subtraction preserves cents", async () => {
  for (const amount of ["-10.000.000.000,00"]) {
    assert.equal(review.buildImportReview([raw({ Upphæð: amount })], columns, categories).excluded[0].reason, "amount");
  }
  const debitCredit = review.buildImportReview([raw({ Debet: "500,14", Kredit: "200,12" })], { ...columns, amount: "" }, categories);
  assert.equal(debitCredit.rows[0].amount, 300.02);
  assert.equal(review.buildImportReview([raw({ Upphæð: "-0,29" })], columns, categories).rows[0].amount, 0.29);
  const f = fixture();
  for (const amount of [1.005, 10000000000]) await assert.rejects(f.actions.saveReviewedImport({ batchId: BATCH, userId: USER, rows: [confirmed({ amount })] }));
  assert.equal(f.records.length, 0);
});
test("all 1,000 eligible records are reviewable and overflow is explicitly excluded", () => {
  const result = review.buildImportReview(Array.from({ length: 1001 }, () => raw()), columns, categories);
  assert.equal(result.rows.length, 1000);
  assert.equal(result.rows.at(-1).sourceIndex, 999);
  assert.deepEqual(result.excluded.map((item) => item.reason), ["limit"]);
});
test("merchant rules respect order and allowed categories; explicit whole-file category wins", () => {
  const rules = [{ pattern: "Bónus", categoryId: OTHER }, { pattern: "bón", categoryId: FOOD }];
  assert.equal(review.buildImportReview([raw()], columns, categories, rules).rows[0].category_id, OTHER);
  assert.equal(review.buildImportReview([raw()], columns, categories, rules, FOOD).rows[0].category_id, FOOD);
  assert.equal(review.buildImportReview([raw()], columns, categories, [{ pattern: "Bónus", categoryId: "deleted" }]).rows[0].category_id, FOOD);
});
test("duplicate detection distinguishes existing matches and repeated file rows without discarding them", () => {
  const rows = [row(), row({ sourceIndex: 1, note: "  BÓNUS  " }), row({ sourceIndex: 2, amount: 400 })];
  assert.deepEqual(review.findImportDuplicates(rows, []), { 1: "file" });
  assert.deepEqual(review.findImportDuplicates(rows, [review.transactionImportKey(rows[0])]), { 0: "existing", 1: "both" });
  assert.equal(rows.length, 3);
});
test("review confirmation is invalidated by category, amount or decision changes", () => {
  const key = review.importReviewKey(row(), "import");
  assert.notEqual(review.importReviewKey(row({ category_id: OTHER }), "import"), key);
  assert.notEqual(review.importReviewKey(row({ amount: 1500 }), "import"), key);
  assert.notEqual(review.importReviewKey(row(), "import_duplicate"), key);
});
test("preferences tolerate malformed storage and retain only mappings and rules", () => {
  assert.deepEqual(review.parseImportPreferences("not json"), { version: 1, mappings: {}, rules: [] });
  const saved = review.parseImportPreferences(JSON.stringify({ version: 1, rawFile: "private", mappings: { header: { ...columns, transactions: [raw()] } }, rules: [{ pattern: "Bónus", categoryId: FOOD, amount: 123 }] }));
  assert.deepEqual(saved, { version: 1, mappings: { header: columns }, rules: [{ pattern: "Bónus", categoryId: FOOD }] });
});

function fixture(seed = [], options = {}) {
  const records = structuredClone(seed);
  const state = { writes: 0, reads: [], records, invalidations: [] };
  const client = {
    auth: { getUser: async () => ({ data: { user: options.authenticated === false ? null : { id: USER } }, error: null }) },
    from(table) {
      const filters = [];
      let first = 0, last = Infinity, payload = null;
      const query = {
        select() { return query; },
        eq(key, value) { filters.push((record) => record[key] === value); return query; },
        in(key, values) { filters.push((record) => values.includes(record[key])); return query; },
        gte(key, value) { filters.push((record) => record[key] >= value); return query; },
        lte(key, value) { filters.push((record) => record[key] <= value); return query; },
        order() { return query; },
        range(start, end) { first = start; last = end; return query; },
        upsert(input, config) { assert.deepEqual(config, { onConflict: "id", ignoreDuplicates: true }); payload = input; return query; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            if (payload) {
              state.writes += 1;
              if (options.writeError) return { data: null, error: { message: "write failed" } };
              const inserted = payload.filter((item) => !records.some((existing) => existing.id === item.id));
              records.push(...structuredClone(inserted));
              if (options.uncertainFirstWrite && state.writes === 1) return { data: null, error: { message: "connection lost after commit" } };
              return { data: inserted.map(({ id }) => ({ id })), error: null };
            }
            state.reads.push({ table, first, last });
            if (options.readError) return { data: null, error: { message: "read failed" } };
            return { data: (table === "categories" ? categories : records).filter((record) => filters.every((filter) => filter(record))).slice(first, last + 1), error: null };
          }).then(resolve, reject);
        }
      };
      return query;
    }
  };
  const actions = load("lib/import-actions.ts", { "@/lib/supabase/server": { createClient: async () => client }, "next/navigation": { redirect: () => { throw new Error("AUTH_REQUIRED"); } }, "next/cache": { revalidatePath(...args) { state.invalidations.push(args); } } });
  return { ...state, actions };
}
const confirmed = (overrides = {}) => ({ ...row(), decision: "import", reviewed: true, ...overrides });

test("duplicate preflight reads beyond the first 1,000 existing records and scopes to the signed-in user", async () => {
  const records = Array.from({ length: 1000 }, (_, index) => ({ ...row({ note: `Unrelated ${index}` }), user_id: USER, id: String(index) }));
  records.push({ ...row(), user_id: USER, id: "match" }, { ...row({ amount: 400 }), user_id: OTHER_USER, id: "other" });
  const f = fixture(records);
  const result = await f.actions.checkImportDuplicates([row(), row({ sourceIndex: 1, amount: 400 })]);
  assert.deepEqual(result.existingKeys, [review.transactionImportKey(row())]);
  assert.deepEqual(f.reads.filter((read) => read.table === "transactions").map((read) => read.first), [0, 1000]);
});
test("an existing match requires a new explicit duplicate decision before any write", async () => {
  const f = fixture([{ ...row(), id: "existing", user_id: USER }]);
  const result = await f.actions.saveReviewedImport({ batchId: BATCH, userId: USER, rows: [confirmed()] });
  assert.equal(result.status, "needs_review");
  assert.equal(f.records.length, 1);
});
test("explicit import of a possible duplicate is honored and a retry does not add it twice", async () => {
  const f = fixture([{ ...row(), id: "existing", user_id: USER }]);
  const input = { batchId: BATCH, userId: USER, rows: [confirmed({ decision: "import_duplicate" })] };
  const first = await f.actions.saveReviewedImport(input);
  const retry = await f.actions.saveReviewedImport(input);
  assert.equal(first.imported, 1); assert.equal(first.duplicatesImported, 1); assert.equal(first.newlyImported, 1);
  assert.equal(retry.imported, 1); assert.equal(retry.newlyImported, 0);
  assert.equal(f.records.length, 2);
});
test("completion counts distinguish imported, manually skipped and duplicate-skipped rows", async () => {
  const f = fixture();
  const result = await f.actions.saveReviewedImport({ batchId: BATCH, userId: USER, rows: [confirmed(), confirmed({ sourceIndex: 1, decision: "skip", reviewed: false }), confirmed({ sourceIndex: 2, note: "Different", decision: "skip", reviewed: false })] });
  assert.equal(result.imported, 1); assert.equal(result.skipped, 2); assert.equal(result.duplicatesSkipped, 1);
  assert.equal(f.records.length, 1);
});
test("a deliberate second identical payment in one file imports as a distinct record", async () => {
  const f = fixture();
  const result = await f.actions.saveReviewedImport({ batchId: BATCH, userId: USER, rows: [confirmed(), confirmed({ sourceIndex: 1, decision: "import_duplicate" })] });
  assert.equal(result.imported, 2);
  assert.equal(result.duplicatesImported, 1);
  assert.equal(f.records.length, 2);
  assert.notEqual(f.records[0].id, f.records[1].id);
});
test("switching accounts after review rejects the batch without writing it to the new account", async () => {
  const f = fixture();
  await assert.rejects(f.actions.saveReviewedImport({ batchId: BATCH, userId: OTHER_USER, rows: [confirmed()] }), /Notandi hefur breyst/);
  assert.equal(f.records.length, 0);
});
test("unreviewed imports and inaccessible categories cannot be written", async () => {
  const f = fixture();
  await assert.rejects(f.actions.saveReviewedImport({ batchId: BATCH, userId: USER, rows: [confirmed({ reviewed: false })] }));
  await assert.rejects(f.actions.saveReviewedImport({ batchId: BATCH, userId: USER, rows: [confirmed({ category_id: OTHER_USER })] }));
  assert.equal(f.records.length, 0);
});
test("unauthenticated preflight and failed atomic writes reject without claiming success", async () => {
  await assert.rejects(fixture([], { authenticated: false }).actions.checkImportDuplicates([row()]), /AUTH_REQUIRED/);
  const f = fixture([], { writeError: true });
  await assert.rejects(f.actions.saveReviewedImport({ batchId: BATCH, userId: USER, rows: [confirmed()] }));
  assert.equal(f.records.length, 0);
});

test("uncertain import response is retryable without duplicating committed records", async () => {
  const f = fixture([], { uncertainFirstWrite: true });
  const input = { batchId: BATCH, userId: USER, rows: [confirmed()] };
  await assert.rejects(f.actions.saveReviewedImport(input));
  assert.equal(f.records.length, 1);
  const result = await f.actions.saveReviewedImport(input);
  assert.equal(result.status, "complete");
  assert.equal(result.imported, 1);
  assert.equal(result.newlyImported, 0);
  assert.equal(f.records.length, 1);
});

test("concurrent confirmations of the same batch both reconcile to one saved record", async () => {
  const f = fixture();
  const input = { batchId: BATCH, userId: USER, rows: [confirmed()] };
  const results = await Promise.all([f.actions.saveReviewedImport(input), f.actions.saveReviewedImport(input)]);
  assert.deepEqual(results.map((result) => result.status), ["complete", "complete"]);
  assert.equal(results.reduce((sum, result) => sum + result.newlyImported, 0), 1);
  assert.equal(f.records.length, 1);
});

test("retry detects edited persisted rows even when moved outside the imported date range", async () => {
  for (const changes of [{ date: "2026-08-01" }, { type: "income" }, { amount: 1500 }, { note: "Edited elsewhere" }, { category_id: OTHER }]) {
    const f = fixture();
    const input = { batchId: BATCH, userId: USER, rows: [confirmed()] };
    await f.actions.saveReviewedImport(input);
    Object.assign(f.records[0], changes);
    const snapshot = structuredClone(f.records);
    const result = await f.actions.saveReviewedImport(input);
    assert.equal(result.status, "conflict", JSON.stringify(changes));
    assert.deepEqual(f.records, snapshot);
  }
});

test("reuse of a committed batch with different values or skip decisions cannot claim success", async () => {
  for (const changes of [{ amount: 5000 }, { category_id: OTHER }, { decision: "skip", reviewed: false }]) {
    const f = fixture();
    await f.actions.saveReviewedImport({ batchId: BATCH, userId: USER, rows: [confirmed()] });
    const snapshot = structuredClone(f.records);
    const result = await f.actions.saveReviewedImport({ batchId: BATCH, userId: USER, rows: [confirmed(changes)] });
    assert.equal(result.status, "conflict");
    assert.deepEqual(f.records, snapshot);
  }
});

test("concurrent different payloads sharing a batch preserve the first saved values", async () => {
  const f = fixture();
  const results = await Promise.all([
    f.actions.saveReviewedImport({ batchId: BATCH, userId: USER, rows: [confirmed()] }),
    f.actions.saveReviewedImport({ batchId: BATCH, userId: USER, rows: [confirmed({ amount: 5000 })] })
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), ["complete", "conflict"]);
  assert.equal(f.records.length, 1);
  assert.equal(f.records[0].amount, 1250.5);
});

test("failed duplicate or saved-row reads block import without a partial write", async () => {
  const f = fixture([], { readError: true });
  await assert.rejects(f.actions.saveReviewedImport({ batchId: BATCH, userId: USER, rows: [confirmed()] }));
  assert.equal(f.records.length, 0);
  assert.deepEqual(f.invalidations, []);
});

test("a full 1,000-row reviewed batch preserves every cent and remains retry-safe across saved-row chunks", async () => {
  const f = fixture();
  const rows = Array.from({ length: 1000 }, (_, index) => confirmed({ sourceIndex: index, note: `Unique import ${index}`, amount: Number((index + 0.29).toFixed(2)) }));
  const input = { batchId: BATCH, userId: USER, rows };
  const first = await f.actions.saveReviewedImport(input);
  assert.equal(first.status, "complete");
  assert.equal(first.imported, 1000);
  assert.equal(first.newlyImported, 1000);
  assert.equal(f.records.length, 1000);
  assert.deepEqual(f.records.map((record) => record.amount), rows.map((record) => record.amount));
  const retry = await f.actions.saveReviewedImport(input);
  assert.equal(retry.status, "complete");
  assert.equal(retry.imported, 1000);
  assert.equal(retry.newlyImported, 0);
  assert.equal(f.records.length, 1000);
  assert.deepEqual(f.invalidations, [["/", "layout"], ["/", "layout"]]);
});
