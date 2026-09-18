const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

const code = ts.transpileModule(readFileSync(join(__dirname, "../components/savings-contribution-form.tsx"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
}).outputText;

// Keep React hook state across explicit renders while exercising the actual
// form action. No DOM or browser automation is needed for retry identity.
function fixture(save) {
  const hooks = [];
  let index = 0;
  const exports = {};
  new Function("require", "exports", code)((id) => {
    if (id === "react") return {
      useRef(initial) { const at = index++; hooks[at] ??= { current: initial }; return hooks[at]; },
      useState(initial) { const at = index++; if (!(at in hooks)) hooks[at] = initial; return [hooks[at], (value) => { hooks[at] = value; }]; }
    };
    if (id === "@/components/action-form") return { ActionForm: "action-form" };
    if (id === "@/components/ui") return { Button: "button" };
    if (id === "@/lib/actions") return { addSavingsBucketAmount: save };
    return require(id);
  }, exports);
  return { render() { index = 0; return exports.SavingsContributionForm({ children: "Original fields", className: "layout" }); } };
}

function form(amount = "250", date = "2026-09-18") {
  const result = new FormData();
  for (const [key, value] of Object.entries({ amount, date, bucket_type: "sjodir", label: "Sjóðir", note: "Framlag" })) result.set(key, value);
  return result;
}
const fields = (element) => element.props.children[0];
const retryPanel = (element) => element.props.children[1];

test("an uncertain committed response locks fields and retries the original UUID and values exactly once", async () => {
  const calls = [];
  const recorded = new Map();
  const f = fixture(async (input) => {
    const values = Object.fromEntries(input);
    calls.push(values);
    recorded.set(values.request_id, values);
    if (calls.length === 1) throw new Error("response lost after commit");
    return { message: "Vistað" };
  });
  const first = f.render();
  assert.equal(fields(first).props.disabled, false);
  assert.equal(retryPanel(first), null);
  const original = form();
  await assert.rejects(first.props.action(original), /response lost/);
  original.set("amount", "9000");
  const retry = f.render();
  assert.equal(fields(retry).props.disabled, true);
  assert.ok(retryPanel(retry));
  assert.equal(retryPanel(retry).props.children[1].props.type, "submit");
  // Disabled controls are absent from the browser's next FormData, but the
  // action must replay its snapshot even if submitted values are changed.
  await retry.props.action(form("9999", "2026-01-01"));
  assert.deepEqual(calls[1], calls[0]);
  assert.equal(calls[1].amount, "250");
  assert.equal(recorded.size, 1);
  const afterSuccess = f.render();
  assert.equal(fields(afterSuccess).props.disabled, false);
  assert.equal(retryPanel(afterSuccess), null);
  await afterSuccess.props.action(form("500"));
  assert.notEqual(calls[2].request_id, calls[0].request_id);
  assert.equal(calls[2].amount, "500");
  assert.equal(recorded.size, 2);
});

test("repeated uncertain failures retain the same immutable contribution snapshot", async () => {
  const calls = [];
  const f = fixture(async (input) => { calls.push(Object.fromEntries(input)); throw new Error("offline"); });
  for (let attempt = 0; attempt < 3; attempt++) {
    const rendered = f.render();
    await assert.rejects(rendered.props.action(form(String(250 + attempt))), /offline/);
  }
  assert.deepEqual(calls[1], calls[0]);
  assert.deepEqual(calls[2], calls[0]);
  assert.equal(fields(f.render()).props.disabled, true);
});

test("known validation feedback leaves fields editable and permits corrected fresh submission", async () => {
  const calls = [];
  const f = fixture(async (input) => {
    calls.push(Object.fromEntries(input));
    return calls.length === 1 ? { message: "", error: "Ógild upphæð" } : { message: "Vistað" };
  });
  const failed = await f.render().props.action(form("0"));
  assert.ok(failed.error);
  assert.equal(fields(f.render()).props.disabled, false);
  const completed = await f.render().props.action(form("250"));
  assert.equal(completed.error, undefined);
  assert.equal(calls[1].amount, "250");
  assert.notEqual(calls[1].request_id, calls[0].request_id);
});
