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

const config = load("lib/privacy-config.ts");
const complete = Object.fromEntries(Object.values(config.privacyDeploymentFields).map((field) => [field, "Verified deployment detail for this test"]));

test("website registration stays closed by default and for every missing deployment disclosure", () => {
  assert.equal(config.getPrivacyDeployment({}).registrationOpen, false);
  assert.equal(config.getPrivacyDeployment(complete).registrationOpen, false);
  for (const flag of ["false", "TRUE", "1", " true "]) assert.equal(config.getPrivacyDeployment({ ...complete, PUBLIC_REGISTRATION_ENABLED: flag }).registrationOpen, false);
  for (const field of Object.values(config.privacyDeploymentFields)) {
    const result = config.getPrivacyDeployment({ ...complete, PUBLIC_REGISTRATION_ENABLED: "true", [field]: "  " });
    assert.equal(result.registrationOpen, false);
    assert.deepEqual(result.missing, [field]);
  }
  assert.equal(config.getPrivacyDeployment({ ...complete, PUBLIC_REGISTRATION_ENABLED: "true" }).registrationOpen, true);
});

function fixture(open) {
  const signups = [];
  let clients = 0;
  const auth = load("lib/auth-actions.ts", {
    "@/lib/privacy-config": { ...config, getPrivacyDeployment: () => ({ registrationOpen: open }) },
    "next/navigation": { redirect() { throw new Error("unexpected redirect"); } },
    "@/lib/supabase/server": { createClient: async () => {
      clients++;
      return { auth: { signUp: async (payload) => { signups.push(payload); return { error: null }; } } };
    } }
  });
  return { auth, signups, get clients() { return clients; } };
}

function signupForm() {
  const form = new FormData();
  form.set("email", "preview@example.invalid");
  form.set("fullName", "Test User");
  form.set("password", "Synthetic!Pass123");
  form.set("PUBLIC_REGISTRATION_ENABLED", "true");
  form.set("privacy_notice_version", "forged-version");
  return form;
}

test("direct server action invocation cannot bypass closed registration using form fields", async () => {
  const f = fixture(false);
  const result = await f.auth.signupAction({}, signupForm());
  assert.ok(result.error);
  assert.equal(f.clients, 0);
  assert.deepEqual(f.signups, []);
});

test("open signup records the server notice version without misrepresenting service use as consent", async () => {
  const f = fixture(true);
  const result = await f.auth.signupAction({}, signupForm());
  assert.ok(result.message);
  assert.equal(f.signups.length, 1);
  assert.deepEqual(f.signups[0].options.data, { full_name: "Test User", privacy_notice_version: config.privacyNoticeVersion });
  assert.equal(f.signups[0].email, "preview@example.invalid");
});

test("open signup continues to reject invalid account data without contacting the provider", async () => {
  const f = fixture(true);
  const form = signupForm();
  form.set("email", "invalid");
  assert.ok((await f.auth.signupAction({}, form)).error);
  assert.equal(f.clients, 0);
});
