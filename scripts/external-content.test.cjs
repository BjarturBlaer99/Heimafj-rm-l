const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const ts = require("typescript");
const { renderToStaticMarkup } = require("react-dom/server");

function load(file, mocks = {}, browser, clock = Date) {
  const source = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  const exports = {};
  new Function("require", "exports", "window", "Date", source)((name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("@/")) return load(`${name.slice(2)}.ts`, mocks, browser, clock);
    return require(name);
  }, exports, browser, clock);
  return exports;
}
const policy = load("lib/external-content-consent.ts");

test("external content is disabled without an explicit current and valid opt-in", () => {
  const now = Date.now();
  const allowed = policy.externalContentRecord(true, now);
  assert.equal(policy.readExternalContentChoice(allowed, now), "allowed");
  assert.equal(policy.readExternalContentChoice(policy.externalContentRecord(false, now), now), "blocked");
  for (const raw of [null, "", "true", "{", "{}", JSON.stringify({ version: 0, tradingView: true, decidedAt: now }), JSON.stringify({ version: 1, tradingView: "true", decidedAt: now }), policy.externalContentRecord(true, now + 1), policy.externalContentRecord(true, now - policy.EXTERNAL_CONTENT_MAX_AGE)]) {
    assert.equal(policy.readExternalContentChoice(raw, now), "unselected", raw);
  }
});

function storeFixture({ unavailable = false, saved, now = Date.now() } = {}) {
  const storage = new Map(saved ? [[policy.EXTERNAL_CONTENT_STORAGE_KEY, saved]] : []);
  const browser = new EventTarget();
  browser.document = new EventTarget();
  browser.document.visibilityState = "visible";
  let clockNow = now;
  class FixtureDate extends Date { static now() { return clockNow; } }
  const intervals = new Set();
  browser.localStorage = {
    getItem(key) { if (unavailable) throw Error("storage blocked"); return storage.get(key) ?? null; },
    setItem(key, value) { if (unavailable) throw Error("storage blocked"); storage.set(key, value); },
    removeItem(key) { if (unavailable) throw Error("storage blocked"); storage.delete(key); }
  };
  browser.setInterval = (callback) => { intervals.add(callback); return callback; };
  browser.clearInterval = (callback) => intervals.delete(callback);
  let subscription;
  let serverSnapshot;
  const hook = load("components/use-external-content-consent.ts", { react: { useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) { subscription = subscribe; serverSnapshot = getServerSnapshot; return getSnapshot(); } } }, browser, FixtureDate).useExternalContentConsent;
  hook();
  return { hook, storage, browser, intervals, serverSnapshot, advanceTime: (milliseconds) => { clockNow += milliseconds; }, subscribe: (callback) => subscription(callback), externalChange(value) {
    if (value === null) storage.delete(policy.EXTERNAL_CONTENT_STORAGE_KEY); else storage.set(policy.EXTERNAL_CONTENT_STORAGE_KEY, value);
    const event = new Event("storage");
    Object.defineProperty(event, "key", { value: policy.EXTERNAL_CONTENT_STORAGE_KEY });
    browser.dispatchEvent(event);
  } };
}

test("choice persists only after a user action, revocation/reset notify all mounted consumers", () => {
  const fixture = storeFixture();
  let changes = 0;
  const unsubscribe = fixture.subscribe(() => changes++);
  assert.equal(fixture.hook().choice, "unselected");
  assert.equal(fixture.storage.size, 0);
  assert.equal(fixture.serverSnapshot(), "unselected");
  assert.equal(fixture.hook().setAllowed(true), true);
  assert.equal(fixture.hook().choice, "allowed");
  assert.equal(changes, 1);
  assert.equal(fixture.hook().setAllowed(false), true);
  assert.equal(fixture.hook().choice, "blocked");
  assert.equal(changes, 2);
  fixture.hook().resetChoice();
  assert.equal(fixture.hook().choice, "unselected");
  assert.equal(fixture.storage.size, 0);
  unsubscribe();
  assert.equal(fixture.intervals.size, 0);
});

test("a long-lived page stops opted-in content on expiry and checks again when a mobile tab resumes", () => {
  const now = Date.now();
  const fixture = storeFixture({ now, saved: policy.externalContentRecord(true, now) });
  let observed = fixture.hook().choice;
  const unsubscribe = fixture.subscribe(() => { observed = fixture.hook().choice; });
  fixture.advanceTime(policy.EXTERNAL_CONTENT_MAX_AGE - 1);
  for (const check of fixture.intervals) check();
  assert.equal(observed, "allowed");
  fixture.advanceTime(1);
  for (const check of fixture.intervals) check();
  assert.equal(observed, "unselected");

  fixture.hook().setAllowed(true);
  assert.equal(observed, "allowed");
  fixture.browser.document.visibilityState = "hidden";
  fixture.advanceTime(policy.EXTERNAL_CONTENT_MAX_AGE);
  fixture.browser.document.visibilityState = "visible";
  fixture.browser.document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(observed, "unselected");
  unsubscribe();
  assert.equal(fixture.intervals.size, 0);
});

test("revocation and expired consent from another tab stop opted-in content", () => {
  const now = Date.now();
  const fixture = storeFixture({ now, saved: policy.externalContentRecord(true, now) });
  let changed = 0;
  const unsubscribe = fixture.subscribe(() => changed++);
  assert.equal(fixture.hook().choice, "allowed");
  fixture.externalChange(policy.externalContentRecord(false, now));
  assert.equal(fixture.hook().choice, "blocked");
  fixture.externalChange(policy.externalContentRecord(true, now - policy.EXTERNAL_CONTENT_MAX_AGE));
  assert.equal(fixture.hook().choice, "unselected");
  fixture.externalChange(null);
  assert.equal(fixture.hook().choice, "unselected");
  assert.equal(changed, 3);
  unsubscribe();
});

test("blocked browser storage defaults to off and still permits immediate revocation", () => {
  const fixture = storeFixture({ unavailable: true });
  assert.equal(fixture.hook().choice, "unselected");
  assert.equal(fixture.hook().setAllowed(true), false);
  assert.equal(fixture.hook().choice, "allowed");
  assert.equal(fixture.hook().setAllowed(false), false);
  assert.equal(fixture.hook().choice, "blocked");
  assert.equal(fixture.hook().resetChoice(), false);
  assert.equal(fixture.hook().choice, "unselected");
});

test("widget has no third-party resource before consent or after revocation; allowed code is isolated", () => {
  let choice = "unselected";
  const { TradingViewMarketWidget } = load("components/tradingview-market-widget.tsx", {
    "@/components/ui/card": { Card: "section" },
    "@/components/external-content-controls": { ExternalContentControls: () => null },
    "@/components/use-app-theme": { useAppTheme: () => ({ theme: "dark" }) },
    "@/components/use-external-content-consent": { useExternalContentConsent: () => ({ choice }) }
  });
  for (const kind of ["stocks", "funds"]) {
    for (const value of ["unselected", "blocked"]) {
      choice = value;
      const html = renderToStaticMarkup(TradingViewMarketWidget({ kind }));
      assert.doesNotMatch(html, /<iframe|<script|srcDoc|s3\.tradingview/i);
    }
    choice = "allowed";
    const html = renderToStaticMarkup(TradingViewMarketWidget({ kind }));
    assert.match(html, /<iframe/);
    const src = html.match(/src="([^"]+)"/)[1];
    const url = new URL(src.replaceAll("&amp;", "&"));
    assert.equal(url.origin, "https://www.tradingview-widget.com");
    assert.equal(url.pathname, "/embed-widget/market-overview/");
    const configuration = JSON.parse(decodeURIComponent(url.hash.slice(1)));
    assert.equal(configuration.colorTheme, "dark");
    assert.ok(configuration.tabs[0].symbols.length > 0);
    assert.match(html, /sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"/);
    assert.doesNotMatch(html, /srcDoc|allow-top-navigation|<script|s3\.tradingview/i);
    assert.match(html, /referrerPolicy="no-referrer"/i);
    assert.doesNotMatch(html, /user_id|email|transactions|account_deletion/);
    choice = "blocked";
    assert.doesNotMatch(renderToStaticMarkup(TradingViewMarketWidget({ kind })), /<iframe|s3\.tradingview/i);
  }
});
