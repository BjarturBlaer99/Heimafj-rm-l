const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const { NextRequest } = require("next/server");
const { createServerClient } = require("@supabase/ssr");
const ts = require("typescript");

const code = ts.transpileModule(readFileSync(join(__dirname, "../lib/supabase/middleware.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const algorithm = { name: "ECDSA", namedCurve: "P-256" };
const signing = { name: "ECDSA", hash: "SHA-256" };
const testKeys = webcrypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
const userId = "11111111-1111-4111-8111-111111111111";
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
let projectSequence = 0;

// Exercise the real installed Supabase SSR/Auth SDK, replacing only its HTTP
// boundary. Keys and sessions are generated test fixtures, never credentials.
async function createHarness({ refreshFails = false, userRejected = false, authDelay = 0, initialCookies = [] } = {}) {
  const url = `https://middleware-test-${++projectSequence}.supabase.co`;
  const cookieName = `sb-middleware-test-${projectSequence}-auth-token`;
  const { publicKey, privateKey } = await testKeys;
  const jwk = { ...await webcrypto.subtle.exportKey("jwk", publicKey), kid: "test-key", alg: "ES256", use: "sig" };
  const requests = [];
  const user = { id: userId, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
  let refreshedSession;

  async function token(overrides = {}, legacy = false) {
    const now = Math.floor(Date.now() / 1000);
    const header = encode(legacy ? { alg: "HS256", typ: "JWT" } : { alg: "ES256", typ: "JWT", kid: "test-key" });
    const payload = encode({ iss: `${url}/auth/v1`, sub: userId, aud: "authenticated", role: "authenticated", iat: now - 1, exp: now + 3600, ...overrides });
    const data = `${header}.${payload}`;
    // HS256 fixtures are deliberately only accepted by the mocked Auth server;
    // the middleware must not validate them by decoding the cookie alone.
    const signature = legacy ? "dGVzdC1zZXJ2ZXItdmVyaWZpZWQ" : Buffer.from(await webcrypto.subtle.sign(signing, privateKey, Buffer.from(data))).toString("base64url");
    return `${data}.${signature}`;
  }

  function session(accessToken, expiresAt = Math.floor(Date.now() / 1000) + 3600) {
    return { access_token: accessToken, refresh_token: "test-refresh-token", token_type: "bearer", expires_in: 3600, expires_at: expiresAt, user };
  }

  function request(path = "/dashboard", currentSession) {
    const result = new NextRequest(`https://app.example${path}`);
    if (currentSession) result.cookies.set(cookieName, `base64-${encode(currentSession)}`);
    return result;
  }

  async function fetchAuth(input) {
    const path = new URL(String(input)).pathname;
    requests.push(path);
    if (path.endsWith("/.well-known/jwks.json")) return Response.json({ keys: [jwk] });
    if (path.endsWith("/user")) {
      if (authDelay) await new Promise((resolve) => setTimeout(resolve, authDelay));
      if (userRejected) return Response.json({ msg: "Test session revoked" }, { status: 401 });
      return Response.json(user);
    }
    if (path.endsWith("/token")) {
      if (refreshFails) return Response.json({ code: "refresh_token_not_found", msg: "Test refresh rejected" }, { status: 400 });
      refreshedSession = session(await token());
      return Response.json(refreshedSession);
    }
    throw new Error(`Unexpected Auth request: ${path}`);
  }

  const exports = {};
  new Function("require", "exports", code)((id) => {
    if (id === "@/lib/supabase/config") return { getSupabaseConfig: () => ({ url, key: "test-public-key" }) };
    if (id === "@supabase/ssr") return {
      createServerClient: (projectUrl, key, options) => {
        if (initialCookies.length) options.cookies.setAll(initialCookies);
        return createServerClient(projectUrl, key, { ...options, global: { fetch: fetchAuth } });
      }
    };
    return require(id);
  }, exports);

  return { ...exports, requests, token, session, request, cookieName, get refreshedSession() { return refreshedSession; } };
}

test("verifies ES256 signatures and reuses only public JWKS between requests", async () => {
  const app = await createHarness();
  const currentSession = app.session(await app.token());
  for (let index = 0; index < 2; index++) {
    const response = await app.updateSession(app.request("/dashboard", currentSession));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
  }
  assert.deepEqual(app.requests, ["/auth/v1/.well-known/jwks.json"]);
});

test("rejects a tampered signed payload despite its forged cookie user", async () => {
  const app = await createHarness();
  const parts = (await app.token()).split(".");
  parts[1] = encode({ ...JSON.parse(Buffer.from(parts[1], "base64url")), sub: "22222222-2222-4222-8222-222222222222" });
  const response = await app.updateSession(app.request("/transactions", app.session(parts.join("."))));
  assert.equal(response.headers.get("location"), "https://app.example/login");
  assert.deepEqual(app.requests, ["/auth/v1/.well-known/jwks.json"]);
});

test("missing cookies and a signed token without a subject cannot access private pages", async () => {
  const app = await createHarness();
  const missing = await app.updateSession(app.request("/bills"));
  assert.equal(missing.headers.get("location"), "https://app.example/login");
  assert.deepEqual(app.requests, []);
  const noSubject = await app.updateSession(app.request("/bills", app.session(await app.token({ sub: undefined }))));
  assert.equal(noSubject.headers.get("location"), "https://app.example/login");
});

test("checks JWT expiry even if cookie metadata claims a future expiration", async () => {
  const app = await createHarness();
  const expiredToken = await app.token({ exp: Math.floor(Date.now() / 1000) - 60 });
  const response = await app.updateSession(app.request("/savings", app.session(expiredToken)));
  assert.equal(response.headers.get("location"), "https://app.example/login");
  assert.deepEqual(app.requests, []);
});

test("refreshes expired sessions and passes refreshed cookies to request and response", async () => {
  const app = await createHarness();
  const expired = Math.floor(Date.now() / 1000) - 60;
  const request = app.request("/dashboard", app.session(await app.token({ exp: expired }), expired));
  const response = await app.updateSession(request);
  assert.equal(response.status, 200);
  assert.deepEqual(app.requests, ["/auth/v1/token", "/auth/v1/.well-known/jwks.json"]);
  const expected = `base64-${encode(app.refreshedSession)}`;
  assert.equal(request.cookies.get(app.cookieName).value, expected);
  assert.equal(response.cookies.get(app.cookieName).value, expected);
  assert.ok(response.headers.get("x-middleware-request-cookie").includes(expected));
});

test("preserves refreshed cookies when redirecting an authenticated login", async () => {
  const app = await createHarness({ initialCookies: [{ name: "auth-companion", value: "retained", options: { path: "/", sameSite: "lax" } }] });
  const expired = Math.floor(Date.now() / 1000) - 60;
  const response = await app.updateSession(app.request("/login", app.session(await app.token({ exp: expired }), expired)));
  assert.equal(response.headers.get("location"), "https://app.example/dashboard");
  assert.equal(response.cookies.get(app.cookieName).value, `base64-${encode(app.refreshedSession)}`);
  assert.equal(response.cookies.get("auth-companion").value, "retained");
  assert.ok(app.requests.includes("/auth/v1/user"));
});

test("preserves cookie deletion when failed refresh redirects to login", async (t) => {
  t.mock.method(console, "error", () => {});
  const app = await createHarness({ refreshFails: true });
  const expired = Math.floor(Date.now() / 1000) - 60;
  const response = await app.updateSession(app.request("/dashboard", app.session(await app.token({ exp: expired }), expired)));
  assert.equal(response.headers.get("location"), "https://app.example/login");
  assert.equal(response.cookies.get(app.cookieName).maxAge, 0);
  assert.equal(response.cookies.get(app.cookieName).value, "");
});

test("revoked users with signed JWTs can access login and signup without a redirect loop", async () => {
  const app = await createHarness({ userRejected: true });
  for (const path of ["/login", "/signup"]) {
    const response = await app.updateSession(app.request(path, app.session(await app.token())));
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("location"), null, path);
  }
  assert.equal(app.requests.filter((path) => path === "/auth/v1/user").length, 2);
});

test("legacy tokens rejected by Auth cannot pass from their cookie claims alone", async () => {
  const app = await createHarness({ userRejected: true });
  const response = await app.updateSession(app.request("/dashboard", app.session(await app.token({}, true))));
  assert.equal(response.headers.get("location"), "https://app.example/login");
  assert.deepEqual(app.requests, ["/auth/v1/user"]);
});

test("malformed JWTs redirect to login instead of throwing a middleware error", async () => {
  const app = await createHarness();
  const response = await app.updateSession(app.request("/dashboard", app.session("invalid.token")));
  assert.equal(response.headers.get("location"), "https://app.example/login");
  assert.deepEqual(app.requests, []);
});

test("keeps public routes accessible without a session", async () => {
  const app = await createHarness();
  for (const path of ["/", "/demo", "/help", "/privacy", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback"]) {
    const response = await app.updateSession(app.request(path));
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("location"), null, path);
  }
  assert.deepEqual(app.requests, []);
});

test("unauthenticated API requests return private JSON rather than login HTML", async () => {
  const app = await createHarness();
  const response = await app.updateSession(app.request("/api/data/export?format=json"));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("location"), null);
  assert.match(response.headers.get("cache-control"), /private, no-store/);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.ok((await response.json()).error);
});

test("failed API session refresh clears invalid cookies on the JSON response", async (t) => {
  t.mock.method(console, "error", () => {});
  const app = await createHarness({ refreshFails: true });
  const expired = Math.floor(Date.now() / 1000) - 60;
  const response = await app.updateSession(app.request("/api/data/export", app.session(await app.token({ exp: expired }), expired)));
  assert.equal(response.status, 401);
  assert.equal(response.cookies.get(app.cookieName).maxAge, 0);
  assert.equal(response.cookies.get(app.cookieName).value, "");
});

test("legacy HS256 uses remote Auth validation, while warm ES256 removes that round trip", async (t) => {
  const app = await createHarness({ authDelay: 150 });
  const signed = app.session(await app.token());
  await app.updateSession(app.request("/dashboard", signed));
  app.requests.length = 0;
  const claimsStart = performance.now();
  await app.updateSession(app.request("/dashboard", signed));
  const claimsMs = performance.now() - claimsStart;
  assert.deepEqual(app.requests, []);
  const legacy = app.session(await app.token({}, true));
  const legacyStart = performance.now();
  const response = await app.updateSession(app.request("/dashboard", legacy));
  const legacyMs = performance.now() - legacyStart;
  assert.equal(response.status, 200);
  assert.deepEqual(app.requests, ["/auth/v1/user"]);
  t.diagnostic(`Synthetic 150 ms Auth latency: warm ES256 middleware ${claimsMs.toFixed(1)} ms; legacy remote verification ${legacyMs.toFixed(1)} ms.`);
});
