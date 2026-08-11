import "server-only";

import { unstable_cache } from "next/cache";
import { z } from "zod";

export type MarketDataStatus = "live" | "sample";

export type MarketPoint = {
  date: string;
  label: string;
  value: number;
};

export type InflationSnapshot = {
  value: number;
  monthlyChange: number;
  change: number;
  index: number;
  asOf: string;
  status: MarketDataStatus;
  series: MarketPoint[];
};

export type PolicyRateSnapshot = {
  value: number;
  change: number;
  asOf: string;
  status: MarketDataStatus;
  series: MarketPoint[];
};

export type FxSnapshot = {
  code: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  asOf: string;
  status: MarketDataStatus;
  series: MarketPoint[];
};

export type StockSnapshot = {
  symbol: string;
  name: string;
  currency: string;
  value: number;
  change: number;
  changePercent: number;
  asOf: string;
  status: MarketDataStatus;
  series: MarketPoint[];
};

export type MarketSnapshot = {
  generatedAt: string;
  inflation: InflationSnapshot;
  policyRate: PolicyRateSnapshot;
  fx: FxSnapshot[];
  stocks: StockSnapshot[];
  funds: StockSnapshot[];
};

const PX_CPI_URL = "https://px.hagstofa.is/pxen/api/v1/en/Efnahagur/visitolur/1_vnv/1_vnv/VIS01000.px";
const LCE_API_URL = "https://www.lce.is/api/fixed-income";
const ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query";

const requestTimeout = 8_000;
const marketAssetBatchSize = 3;

const pxMetadataSchema = z.object({
  variables: z.array(
    z.object({
      code: z.string(),
      values: z.array(z.string())
    })
  )
});

const pxDataSchema = z.object({
  value: z.array(z.number().nullable())
});

const fxHistorySchema = z.object({
  currency_pair: z.string(),
  points: z.array(
    z.object({
      date: z.string(),
      value: z.number()
    })
  )
});

const policyRateHistorySchema = z.object({
  rate_type: z.string(),
  tenor: z.string(),
  data_points: z.array(
    z.object({
      date: z.string(),
      value: z.number()
    })
  )
});

const alphaVantageSchema = z.object({
  "Time Series (Daily)": z.record(
    z.object({
      "4. close": z.string()
    })
  )
});

function alphaVantageFailureCode(payload: unknown) {
  if (!payload || typeof payload !== "object") return "invalid-response";

  const response = payload as Record<string, unknown>;
  const message = [response.Information, response.Note, response["Error Message"]]
    .find((value): value is string => typeof value === "string")
    ?.toLowerCase();

  if (!message) return "invalid-response";
  if (message.includes("rate limit") || message.includes("call volume") || message.includes("25 requests")) {
    return "rate-limit";
  }
  if (message.includes("api key") || message.includes("apikey")) return "invalid-key";
  return "provider-error";
}

const stockDefinitions = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "TSLA", name: "Tesla" }
] as const;

const fundDefinitions = [
  { symbol: "VOO", name: "Vanguard S&P 500 ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "VT", name: "Vanguard Total World Stock ETF" },
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF" },
  { symbol: "SCHD", name: "Schwab U.S. Dividend Equity ETF" }
] as const;

type MarketAssetDefinition = {
  symbol: string;
  name: string;
};

const fxDefinitions = [
  { code: "EUR", name: "Evra", pair: "EURISK" },
  { code: "USD", name: "Bandaríkjadalur", pair: "USDISK" },
  { code: "GBP", name: "Breskt pund", pair: "GBPISK" },
  { code: "DKK", name: "Dönsk króna", pair: "DKKISK" }
] as const;

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shortDateLabel(date: string) {
  return new Intl.DateTimeFormat("is-IS", { day: "numeric", month: "short" }).format(new Date(`${date}T00:00:00Z`));
}

function monthCodeToDate(code: string) {
  const match = /^(\d{4})M(\d{2})$/.exec(code);
  if (!match) return code;
  return `${match[1]}-${match[2]}-01`;
}

function monthCodeLabel(code: string) {
  const date = monthCodeToDate(code);
  return new Intl.DateTimeFormat("is-IS", { month: "short" }).format(new Date(`${date}T00:00:00Z`));
}

function numeric(value: number | null | undefined, context: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid market value: ${context}`);
  }
  return value;
}

function previousDistinctValue(points: MarketPoint[]) {
  const latest = points.at(-1)?.value;
  if (latest === undefined) return undefined;
  return points
    .slice(0, -1)
    .reverse()
    .find((point) => point.value !== latest)?.value;
}

function monthlySample(points: MarketPoint[], limit = 12) {
  const byMonth = new Map<string, MarketPoint>();
  points.forEach((point) => byMonth.set(point.date.slice(0, 7), point));
  return Array.from(byMonth.values()).slice(-limit);
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers
    },
    signal: AbortSignal.timeout(requestTimeout)
  });

  if (!response.ok) {
    throw new Error(`Market provider returned ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

async function fetchInflation(): Promise<InflationSnapshot> {
  const metadata = pxMetadataSchema.parse(await fetchJson(PX_CPI_URL));
  const monthVariable = metadata.variables.find((variable) => variable.code === "Month");
  const months = monthVariable?.values.slice(-12) ?? [];

  if (months.length < 2) {
    throw new Error("Statistics Iceland returned too few CPI observations");
  }

  const payload = {
    query: [
      { code: "Month", selection: { filter: "item", values: months } },
      { code: "Index", selection: { filter: "item", values: ["CPI"] } },
      { code: "Item", selection: { filter: "item", values: ["index", "change_M", "change_A"] } }
    ],
    response: { format: "json-stat2" }
  };

  const data = pxDataSchema.parse(
    await fetchJson(PX_CPI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
  );

  const observations = months.map((month, index) => ({
    month,
    index: numeric(data.value[index * 3], `${month} CPI`),
    monthlyChange: numeric(data.value[index * 3 + 1], `${month} monthly CPI`),
    annualChange: numeric(data.value[index * 3 + 2], `${month} annual CPI`)
  }));
  const latest = observations.at(-1)!;
  const previous = observations.at(-2)!;

  return {
    value: latest.annualChange,
    monthlyChange: latest.monthlyChange,
    change: latest.annualChange - previous.annualChange,
    index: latest.index,
    asOf: monthCodeToDate(latest.month),
    status: "live",
    series: observations.map((observation) => ({
      date: monthCodeToDate(observation.month),
      label: monthCodeLabel(observation.month),
      value: observation.annualChange
    }))
  };
}

async function fetchPolicyRate(): Promise<PolicyRateSnapshot> {
  const start = new Date();
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  const url = `${LCE_API_URL}/interbank-rates/history?rate_type=CBIID&tenor=1W&start_date=${isoDate(start)}`;
  const response = policyRateHistorySchema.parse(await fetchJson(url));
  const allPoints = response.data_points.map((point) => ({
    date: point.date,
    label: shortDateLabel(point.date),
    value: point.value
  }));
  const latest = allPoints.at(-1);

  if (!latest) {
    throw new Error("Policy rate history is empty");
  }

  const previous = previousDistinctValue(allPoints) ?? latest.value;
  return {
    value: latest.value,
    change: latest.value - previous,
    asOf: latest.date,
    status: "live",
    series: monthlySample(allPoints)
  };
}

async function fetchFxRate(definition: (typeof fxDefinitions)[number]): Promise<FxSnapshot> {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 45);
  const url = `${LCE_API_URL}/fx-rates/history?currency_pair=${definition.pair}&start_date=${isoDate(start)}`;
  const response = fxHistorySchema.parse(await fetchJson(url));
  const points = response.points.map((point) => ({
    date: point.date,
    label: shortDateLabel(point.date),
    value: point.value
  }));
  const latest = points.at(-1);
  const previous = points.at(-2);

  if (!latest || !previous) {
    throw new Error(`FX history is incomplete for ${definition.pair}`);
  }

  const change = latest.value - previous.value;
  return {
    code: definition.code,
    name: definition.name,
    value: latest.value,
    change,
    changePercent: previous.value ? (change / previous.value) * 100 : 0,
    asOf: latest.date,
    status: "live",
    series: points.slice(-20)
  };
}

async function fetchFxRates() {
  return Promise.all(fxDefinitions.map(fetchFxRate));
}

async function fetchMarketAsset(definition: MarketAssetDefinition, apiKey: string): Promise<StockSnapshot> {
  const query = new URLSearchParams({
    function: "TIME_SERIES_DAILY",
    symbol: definition.symbol,
    outputsize: "compact",
    apikey: apiKey
  });
  const payload = await fetchJson(`${ALPHA_VANTAGE_URL}?${query.toString()}`);
  const parsed = alphaVantageSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`alpha-vantage:${alphaVantageFailureCode(payload)}`);
  }
  const response = parsed.data;
  const points = Object.entries(response["Time Series (Daily)"])
    .map(([date, values]) => ({
      date,
      label: shortDateLabel(date),
      value: Number(values["4. close"])
    }))
    .filter((point) => Number.isFinite(point.value))
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-20);
  const latest = points.at(-1);
  const previous = points.at(-2);

  if (!latest || !previous) {
    throw new Error(`Stock history is incomplete for ${definition.symbol}`);
  }

  const change = latest.value - previous.value;
  return {
    symbol: definition.symbol,
    name: definition.name,
    currency: "USD",
    value: latest.value,
    change,
    changePercent: previous.value ? (change / previous.value) * 100 : 0,
    asOf: latest.date,
    status: "live",
    series: points
  };
}

function marketAssetFailureReason(error: unknown) {
  return error instanceof Error && error.message.startsWith("alpha-vantage:")
    ? error.message.slice("alpha-vantage:".length)
    : "request-error";
}

function logMarketAssetFailures(failures: Record<string, number>) {
  console.warn(`[market-data] Alpha Vantage fallbacks: ${JSON.stringify(failures)}`);
}

async function fetchMarketAssetsLive() {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
  }

  const definitions: MarketAssetDefinition[] = [...stockDefinitions, ...fundDefinitions];
  const [probeDefinition, ...remainingDefinitions] = definitions;
  let probe: StockSnapshot;

  try {
    probe = await fetchMarketAsset(probeDefinition, apiKey);
  } catch (error) {
    logMarketAssetFailures({ [marketAssetFailureReason(error)]: 1 });
    throw error;
  }

  const assets = [probe];

  for (let index = 0; index < remainingDefinitions.length; index += marketAssetBatchSize) {
    const batch = remainingDefinitions.slice(index, index + marketAssetBatchSize);
    const results = await Promise.allSettled(
      batch.map((definition) => fetchMarketAsset(definition, apiKey))
    );
    const failures: Record<string, number> = {};

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        assets.push(result.value);
        return;
      }

      const reason = marketAssetFailureReason(result.reason);
      failures[reason] = (failures[reason] ?? 0) + 1;
    });

    if (Object.keys(failures).length > 0) {
      logMarketAssetFailures(failures);
      throw new Error("Alpha Vantage market refresh was incomplete");
    }
  }

  return {
    stocks: assets.slice(0, stockDefinitions.length),
    funds: assets.slice(stockDefinitions.length)
  };
}

const fallbackInflation: InflationSnapshot = {
  value: 5.3,
  monthlyChange: 0.36,
  change: 0.1,
  index: 693.2,
  asOf: "2026-07-01",
  status: "sample",
  series: [3.8, 3.7, 4.1, 4.2, 4.5, 4.6, 4.7, 4.9, 5.2, 5.1, 5.2, 5.3].map((value, index) => {
    const date = new Date(Date.UTC(2025, 7 + index, 1));
    return {
      date: isoDate(date),
      label: new Intl.DateTimeFormat("is-IS", { month: "short" }).format(date),
      value
    };
  })
};

const fallbackPolicyRate: PolicyRateSnapshot = {
  value: 7.75,
  change: 0.25,
  asOf: "2026-08-01",
  status: "sample",
  series: [8.25, 8, 8, 7.75, 7.5, 7.5, 7.75].map((value, index) => ({
    date: `2026-${String(index + 2).padStart(2, "0")}-01`,
    label: String(index + 2),
    value
  }))
};

const fallbackFx: FxSnapshot[] = [
  { code: "EUR", name: "Evra", value: 142.2, change: -0.4, changePercent: -0.28 },
  { code: "USD", name: "Bandaríkjadalur", value: 123.06, change: 0.16, changePercent: 0.13 },
  { code: "GBP", name: "Breskt pund", value: 164.9, change: -0.2, changePercent: -0.12 },
  { code: "DKK", name: "Dönsk króna", value: 19.02, change: -0.03, changePercent: -0.16 }
].map((item, itemIndex) => ({
  ...item,
  asOf: "2026-08-10",
  status: "sample" as const,
  series: Array.from({ length: 12 }, (_, index) => ({
    date: `2026-07-${String(index + 1).padStart(2, "0")}`,
    label: String(index + 1),
    value: item.value * (1 + Math.sin(index * 0.8 + itemIndex) * 0.006)
  }))
}));

const fallbackStocks: StockSnapshot[] = [
  { symbol: "AAPL", name: "Apple", value: 231.4, change: 2.8, changePercent: 1.23 },
  { symbol: "MSFT", name: "Microsoft", value: 514.7, change: -1.9, changePercent: -0.37 },
  { symbol: "NVDA", name: "NVIDIA", value: 182.6, change: 3.1, changePercent: 1.73 },
  { symbol: "GOOGL", name: "Alphabet", value: 201.1, change: 1.7, changePercent: 0.85 },
  { symbol: "AMZN", name: "Amazon", value: 229.6, change: -0.8, changePercent: -0.35 },
  { symbol: "META", name: "Meta Platforms", value: 782.3, change: 6.2, changePercent: 0.8 },
  { symbol: "TSLA", name: "Tesla", value: 339, change: -4.5, changePercent: -1.31 }
].map((item, itemIndex) => ({
  ...item,
  currency: "USD",
  asOf: "2026-08-08",
  status: "sample" as const,
  series: Array.from({ length: 16 }, (_, index) => ({
    date: `2026-07-${String(index + 10).padStart(2, "0")}`,
    label: String(index + 1),
    value: item.value * (0.94 + index * 0.004 + Math.sin(index * 0.72 + itemIndex) * 0.012)
  }))
}));

const fallbackFunds: StockSnapshot[] = [
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", value: 625.2, change: 3.1, changePercent: 0.5 },
  { symbol: "QQQ", name: "Invesco QQQ Trust", value: 572.1, change: 4.2, changePercent: 0.74 },
  { symbol: "VT", name: "Vanguard Total World Stock ETF", value: 139.4, change: 0.5, changePercent: 0.36 },
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF", value: 326.8, change: 1.4, changePercent: 0.43 },
  { symbol: "SCHD", name: "Schwab U.S. Dividend Equity ETF", value: 30.1, change: -0.08, changePercent: -0.27 }
].map((item, itemIndex) => ({
  ...item,
  currency: "USD",
  asOf: "2026-08-08",
  status: "sample" as const,
  series: Array.from({ length: 16 }, (_, index) => ({
    date: `2026-07-${String(index + 10).padStart(2, "0")}`,
    label: String(index + 1),
    value: item.value * (0.955 + index * 0.003 + Math.sin(index * 0.65 + itemIndex) * 0.008)
  }))
}));

const getInflationCached = unstable_cache(fetchInflation, ["market-inflation-v1"], { revalidate: 21_600 });
const getPolicyRateCached = unstable_cache(fetchPolicyRate, ["market-policy-rate-v1"], { revalidate: 3_600 });
const getFxRatesCached = unstable_cache(fetchFxRates, ["market-fx-v1"], { revalidate: 3_600 });
const getMarketAssetsLiveCached = unstable_cache(fetchMarketAssetsLive, ["market-assets-live-v1"], {
  revalidate: 86_400
});
const getMarketAssetsRetryCached = unstable_cache(async () => {
  try {
    return await getMarketAssetsLiveCached();
  } catch {
    return { stocks: fallbackStocks, funds: fallbackFunds };
  }
}, ["market-assets-retry-v1"], { revalidate: 21_600 });

async function getMarketAssets() {
  return process.env.ALPHA_VANTAGE_API_KEY?.trim()
    ? getMarketAssetsRetryCached()
    : { stocks: fallbackStocks, funds: fallbackFunds };
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const [inflationResult, policyRateResult, fxResult, assetsResult] = await Promise.allSettled([
    getInflationCached(),
    getPolicyRateCached(),
    getFxRatesCached(),
    getMarketAssets()
  ]);
  const assets = assetsResult.status === "fulfilled"
    ? assetsResult.value
    : { stocks: fallbackStocks, funds: fallbackFunds };

  return {
    generatedAt: new Date().toISOString(),
    inflation: inflationResult.status === "fulfilled" ? inflationResult.value : fallbackInflation,
    policyRate: policyRateResult.status === "fulfilled" ? policyRateResult.value : fallbackPolicyRate,
    fx: fxResult.status === "fulfilled" ? fxResult.value : fallbackFx,
    stocks: assets.stocks,
    funds: assets.funds
  };
}
