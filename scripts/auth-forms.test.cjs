const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

function fixture(file, component, props = {}) {
  const code = ts.transpileModule(readFileSync(join(__dirname, "../components", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  let state = {};
  let index = 0;
  let effects = [];
  let form;
  let resets = 0;
  let pending = false;
  const submitted = [];
  const hooks = [];
  const exports = {};
  function findForm(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "form") return node;
    return [node.props?.children].flat().map(findForm).find(Boolean);
  }
  new Function("require", "exports", "FormData", code)((id) => {
    if (id === "react") return {
      useActionState: () => [state, (data) => submitted.push(data), pending],
      startTransition: (action) => action(),
      useRef(initial) { const at = index++; hooks[at] ??= { current: initial }; return hooks[at]; },
      useEffect(effect, deps) {
        const at = index++;
        if (!hooks[at] || deps.some((value, i) => !Object.is(value, hooks[at][i]))) effects.push(effect);
        hooks[at] = deps;
      }
    };
    if (id === "@/components/ui") return { Field: "label", Button: "button", inputClass: "input" };
    if (id === "@/lib/auth-actions") return {};
    if (id === "@/lib/password-policy") return { PASSWORD_MIN_LENGTH: 8, PASSWORD_PATTERN: ".*", PASSWORD_REQUIREMENTS: "test policy" };
    if (id === "next/link") return { default: "a" };
    if (id.endsWith(".css")) return { default: {} };
    if (id.startsWith("@phosphor-icons/")) return { ArrowRightIcon: "svg" };
    return require(id);
  }, exports, class { constructor(form) { this.form = form; } });
  function reset() {
    let prevented = false;
    form.props.onReset?.({ preventDefault() { prevented = true; } });
    if (!prevented) resets++;
    return prevented;
  }
  return {
    render(nextState, nextPending = false) {
      state = nextState;
      pending = nextPending;
      index = 0;
      effects = [];
      form = findForm(exports[component](props));
      assert.ok(form);
      form.props.ref.current = { reset };
      effects.forEach((effect) => effect());
    },
    reset,
    submit() {
      let prevented = false;
      form.props.onSubmit({ currentTarget: "native form with entered values", preventDefault() { prevented = true; } });
      return prevented;
    },
    submitted,
    get resets() { return resets; }
  };
}

for (const [file, component, props] of [
  ...["login", "signup", "forgot", "reset"].map((mode) => ["auth-form.tsx", "AuthForm", { mode }]),
  ["password-change-form.tsx", "PasswordChangeForm", {}]
]) {
  test(`${component} ${props.mode ?? "settings"} retains input on action failure and clears each successful submission`, () => {
    const form = fixture(file, component, props);
    form.render({});
    assert.equal(form.submit(), true);
    assert.equal(form.submitted[0].form, "native form with entered values");
    form.render({}, true);
    assert.equal(form.submit(), true);
    assert.equal(form.submitted.length, 1);
    // React requests a native form reset when an action resolves, including
    // actions that resolve with validation or authentication error feedback.
    assert.equal(form.reset(), true);
    form.render({ error: "Please correct your input" });
    assert.equal(form.reset(), true);
    assert.equal(form.resets, 0);
    form.render({ message: "Saved" });
    assert.equal(form.resets, 1);
    form.render({ message: "Saved" });
    assert.equal(form.resets, 2);
    assert.equal(form.reset(), true);
  });
}
