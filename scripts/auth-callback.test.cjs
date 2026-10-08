const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

const code = ts.transpileModule(readFileSync(join(__dirname, "../app/auth/callback/route.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

function fixture({ error = null } = {}) {
  const calls = [];
  const exports = {};
  new Function("require", "exports", code)((id) => {
    if (id === "@/lib/supabase/config") return { getSupabaseConfig: () => ({ url: "https://auth.example.invalid", key: "public-test-key" }) };
    if (id === "@supabase/ssr") return { createServerClient: (url, key, options) => ({ auth: {
      async exchangeCodeForSession(code) {
        calls.push(code);
        if (error) return { error };
        options.cookies.setAll([{ name: "auth-session", value: "test-session", options: { path: "/", sameSite: "lax", httpOnly: true } }]);
        return { error: null };
      },
      async verifyOtp(input) {
        calls.push(input);
        assert.deepEqual(options.cookies.getAll(), []);
        if (error) return { error };
        options.cookies.setAll([{ name: "auth-session", value: "test-email-session", options: { path: "/", sameSite: "lax", httpOnly: true } }]);
        return { error: null };
      }
    } }) };
    return require(id);
  }, exports);
  return { ...exports, calls };
}

function request(next, code = "test-code") {
  const url = new URL("https://app.example/auth/callback");
  if (code) url.searchParams.set("code", code);
  if (next !== undefined) url.searchParams.set("next", next);
  return new Request(url);
}

test("auth callback preserves valid same-origin routes and freshly exchanged cookies", async () => {
  for (const next of [undefined, "/dashboard", "/reset-password", "/transactions?month=2026-09#transaction-test"]) {
    const f = fixture();
    const response = await f.GET(request(next));
    assert.equal(response.headers.get("location"), new URL(next ?? "/dashboard", "https://app.example").href);
    assert.equal(response.cookies.get("auth-session").value, "test-session");
    assert.deepEqual(f.calls, ["test-code"]);
  }
});

test("auth callback rejects external and normalized protocol-relative redirect targets", async () => {
  for (const next of ["https://evil.example", "//evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "///evil.example", "javascript:alert(1)", "//[invalid"]) {
    const response = await fixture().GET(request(next));
    assert.equal(response.headers.get("location"), "https://app.example/dashboard", JSON.stringify(next));
  }
});

test("missing or rejected auth codes return to login without exposing a session", async () => {
  const missing = fixture();
  const absent = await missing.GET(request("/dashboard", null));
  assert.equal(absent.headers.get("location"), "https://app.example/login?error=invalid_auth_link");
  assert.deepEqual(missing.calls, []);
  const rejected = await fixture({ error: { message: "bad code" } }).GET(request("/dashboard"));
  assert.equal(rejected.headers.get("location"), "https://app.example/login?error=invalid_auth_link");
  assert.equal(rejected.cookies.get("auth-session"), undefined);
});

test("email recovery works without original-browser cookies and always opens password reset", async () => {
  for (const next of ["", "&next=/dashboard", "&next=https://evil.example"]) {
    const f = fixture();
    const response = await f.GET(new Request(`https://app.example/auth/callback?token_hash=test-email-token&type=recovery${next}`));
    assert.equal(response.headers.get("location"), "https://app.example/reset-password");
    assert.equal(response.cookies.get("auth-session").value, "test-email-session");
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.deepEqual(f.calls, [{ token_hash: "test-email-token", type: "recovery" }]);
  }
});

test("email signup tokens work without a PKCE verifier and cannot redirect off site", async () => {
  for (const type of ["signup", "email"]) {
    const f = fixture();
    const response = await f.GET(new Request(`https://app.example/auth/callback?token_hash=test-email-token&type=${type}&next=//evil.example`));
    assert.equal(response.headers.get("location"), "https://app.example/dashboard");
    assert.equal(response.cookies.get("auth-session").value, "test-email-session");
  }
});

test("expired or reused email tokens reject without session cookies or token leakage", async () => {
  const f = fixture({ error: { message: "Token has expired or is invalid" } });
  const response = await f.GET(new Request("https://app.example/auth/callback?token_hash=expired-secret&type=recovery"));
  assert.equal(response.headers.get("location"), "https://app.example/login?error=invalid_auth_link");
  assert.equal(response.cookies.get("auth-session"), undefined);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});

test("unsupported email token types and malformed tokens never call the auth provider", async () => {
  for (const query of ["token_hash=x&type=sms", "token_hash=x&type=email_change", "token_hash=x", "token_hash=&type=recovery", `token_hash=${'x'.repeat(2049)}&type=recovery`]) {
    const f = fixture();
    const response = await f.GET(new Request(`https://app.example/auth/callback?${query}`));
    assert.equal(response.headers.get("location"), "https://app.example/login?error=invalid_auth_link");
    assert.deepEqual(f.calls, []);
  }
});
