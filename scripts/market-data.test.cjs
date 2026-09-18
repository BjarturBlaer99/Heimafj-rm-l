const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

const code = ts.transpileModule(readFileSync(join(__dirname, "../lib/market-data.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

// Exercise the production loader with isolated HTTP and Next cache boundaries.
function loadMarketData(policyFetch) {
  const requests = [];
  const warnings = [];
  const errors = [];
  const exports = {};
  const testRequire = (id) => {
    if (id === "server-only") return {};
    if (id === "next/cache") return { unstable_cache: (fn) => fn };
    return require(id);
  };
  new Function("require", "exports", "fetch", "console", code)(
    testRequire,
    exports,
    async (url, init) => {
      if (url.includes("interbank-rates") || url.includes("xmltimeseries")) {
        assert.ok(init.signal instanceof AbortSignal);
        requests.push(url);
        return policyFetch(url, init);
      }
      if (url.includes("hagstofa")) {
        return Response.json(init.method === "POST"
          ? { value: [690, 0.1, 5.2, 693.2, 0.36, 5.3] }
          : { variables: [{ code: "Month", values: ["2026M06", "2026M07"] }] });
      }
      return Response.json({
        currency_pair: new URL(url).searchParams.get("currency_pair"),
        points: [{ date: "2026-09-03", value: 140 }, { date: "2026-09-04", value: 141 }]
      });
    },
    { warn: (...args) => warnings.push(args), error: (...args) => errors.push(args) }
  );
  return { ...exports, requests, warnings, errors };
}

const history = {
  rate_type: "CBIID",
  tenor: "1W",
  data_points: [
    { date: "2026-09-04", value: 8 },
    { date: "2026-07-31", value: 7.75 },
    { date: "2026-08-31", value: 8 }
  ]
};
const centralBankCsv = [
  "1;Vextir Seðlabankans;75;;Vextir á 7 daga bundnum innlánum;Innlán bundin, 7 daga, flatir vextir;9/4/2026 12:00:00 AM;8.000000",
  "1;Vextir Seðlabankans;75;;Vextir á 7 daga bundnum innlánum;Innlán bundin, 7 daga, flatir vextir;7/31/2026 12:00:00 AM;7.750000",
  "1;Vextir Seðlabankans;75;;Vextir á 7 daga bundnum innlánum;Innlán bundin, 7 daga, flatir vextir;8/31/2026 12:00:00 AM;8.000000"
].join("\r\n") + "\r\n";

function assertLiveSnapshot(snapshot) {
  assert.equal(snapshot.policyRate.status, "live");
  assert.equal(snapshot.policyRate.value, 8);
  assert.equal(snapshot.policyRate.change, 0.25);
  assert.equal(snapshot.policyRate.asOf, "2026-09-04");
  assert.deepEqual(snapshot.policyRate.series.map(({ date, value }) => ({ date, value })), [
    { date: "2026-07-31", value: 7.75 },
    { date: "2026-08-31", value: 8 },
    { date: "2026-09-04", value: 8 }
  ]);
  assert.equal(snapshot.inflation.status, "live");
  assert.ok(snapshot.fx.every((rate) => rate.status === "live"));
}

test("uses valid IS-Macro history without requesting the fallback", async () => {
  const loader = loadMarketData(() => Response.json(history));
  assertLiveSnapshot(await loader.getMarketSnapshot());
  assert.equal(loader.requests.length, 1);
  assert.equal(loader.warnings.length, 0);
});

const failedPrimaryResponses = {
  "HTTP failure": () => new Response("Unavailable", { status: 503 }),
  timeout: () => { throw new DOMException("Timed out", "TimeoutError"); },
  "malformed JSON": () => new Response("<html>Provider error</html>"),
  "empty history": () => Response.json({ ...history, data_points: [] }),
  "wrong rate series": () => Response.json({ ...history, tenor: "ON" }),
  "invalid date": () => Response.json({ ...history, data_points: [{ date: "2026-02-30", value: 8 }] })
};

for (const [reason, primary] of Object.entries(failedPrimaryResponses)) {
  test(`uses official CBI history after ${reason}`, async () => {
    const loader = loadMarketData((url) => url.includes("xmltimeseries") ? new Response(centralBankCsv) : primary());
    assertLiveSnapshot(await loader.getMarketSnapshot());
    assert.equal(loader.requests.length, 2);
    const fallbackUrl = new URL(loader.requests[1]);
    assert.equal(fallbackUrl.searchParams.get("TimeSeriesID"), "75");
    assert.equal(fallbackUrl.searchParams.get("DagsFra"), new URL(loader.requests[0]).searchParams.get("start_date"));
    assert.equal(fallbackUrl.searchParams.get("DagsTil"), new URL(loader.requests[0]).searchParams.get("end_date"));
    assert.equal(loader.warnings.length, 1);
    assert.equal(loader.errors.length, 0);
  });
}

test("keeps unavailable data hidden when both sources fail, then recovers", async () => {
  let recovered = false;
  const loader = loadMarketData(() => recovered ? Response.json(history) : new Response("Unavailable", { status: 503 }));
  const failed = await loader.getMarketSnapshot();
  assert.equal(failed.policyRate.status, "unavailable");
  assert.equal(failed.inflation.status, "live");
  assert.ok(failed.fx.every((rate) => rate.status === "live"));
  assert.equal(loader.errors.length, 1);
  recovered = true;
  assertLiveSnapshot(await loader.getMarketSnapshot());
});

test("rejects empty, unrelated, or invalid Central Bank data", async () => {
  for (const csv of ["", "<html>Error</html>", centralBankCsv.replaceAll(";75;", ";55;"),
    centralBankCsv.replace(";8.000000", ";"), centralBankCsv.replace(";8.000000", ";NaN"),
    centralBankCsv.replace("9/4/2026", "2/30/2026")]) {
    const loader = loadMarketData((url) => url.includes("xmltimeseries")
      ? new Response(csv)
      : new Response("Unavailable", { status: 503 }));
    assert.equal((await loader.getMarketSnapshot()).policyRate.status, "unavailable");
    assert.equal(loader.errors.length, 1);
  }
});
