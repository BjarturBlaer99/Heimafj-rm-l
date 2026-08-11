import "server-only";

import { unstable_cache } from "next/cache";
import { z } from "zod";

export type HousingDataStatus = "live" | "sample";

export type HousingPoint = {
  date: string;
  label: string;
  value: number;
};

export type HousingSeries = {
  id: "all" | "capital-apartments" | "capital-houses" | "outside-capital";
  label: string;
  shortLabel: string;
  value: number;
  monthlyChange: number;
  annualChange: number;
  asOf: string;
  points: HousingPoint[];
};

export type RealEstateSnapshot = {
  generatedAt: string;
  status: HousingDataStatus;
  series: HousingSeries[];
};

const HOUSING_INDEX_URL = "https://px.hagstofa.is/pxen/api/v1/en/Efnahagur/visitolur/1_vnv/3_greiningarvisitolur/VIS01106.px";
const requestTimeout = 8_000;

const metadataSchema = z.object({
  variables: z.array(
    z.object({
      code: z.string(),
      values: z.array(z.string())
    })
  )
});

const datasetSchema = z.object({
  value: z.array(z.number().nullable())
});

const seriesDefinitions = [
  { id: "capital-apartments", code: "RI_cap_mult", label: "Fjölbýli á höfuðborgarsvæðinu", shortLabel: "Fjölbýli" },
  { id: "capital-houses", code: "RI_cap_single", label: "Sérbýli á höfuðborgarsvæðinu", shortLabel: "Sérbýli" },
  { id: "outside-capital", code: "RI_outside_cap", label: "Íbúðarhúsnæði utan höfuðborgarsvæðis", shortLabel: "Landsbyggð" },
  { id: "all", code: "RI_total", label: "Íbúðarhúsnæði á landinu öllu", shortLabel: "Landið allt" }
] as const;

const icelandicMonths = ["jan.", "feb.", "mar.", "apr.", "maí", "jún.", "júl.", "ágú.", "sep.", "okt.", "nóv.", "des."];

function monthCodeToDate(code: string) {
  const match = /^(\d{4})M(\d{2})$/.exec(code);
  return match ? `${match[1]}-${match[2]}-01` : code;
}

function monthCodeLabel(code: string) {
  const match = /^(\d{4})M(\d{2})$/.exec(code);
  if (!match) return code;
  return `${icelandicMonths[Number(match[2]) - 1] ?? ""} ${match[1].slice(2)}`;
}

function percentChange(current: number, previous: number) {
  return previous === 0 ? 0 : ((current / previous) - 1) * 100;
}

function numeric(value: number | null | undefined, context: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid housing value: ${context}`);
  }
  return value;
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
    throw new Error(`Housing provider returned ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

async function fetchHousingSeries(): Promise<HousingSeries[]> {
  const metadata = metadataSchema.parse(await fetchJson(HOUSING_INDEX_URL));
  const months = metadata.variables.find((variable) => variable.code === "Month")?.values.slice(-25) ?? [];

  if (months.length < 13) {
    throw new Error("Statistics Iceland returned too few housing observations");
  }

  const payload = {
    query: [
      { code: "Month", selection: { filter: "item", values: months } },
      { code: "Index", selection: { filter: "item", values: seriesDefinitions.map((series) => series.code) } }
    ],
    response: { format: "json-stat2" }
  };

  const dataset = datasetSchema.parse(
    await fetchJson(HOUSING_INDEX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
  );

  return seriesDefinitions.map((definition, seriesIndex) => {
    const points = months.map((month, monthIndex) => ({
      date: monthCodeToDate(month),
      label: monthCodeLabel(month),
      value: numeric(dataset.value[monthIndex * seriesDefinitions.length + seriesIndex], `${month} ${definition.code}`)
    }));
    const latest = points.at(-1)!;
    const previous = points.at(-2)!;
    const previousYear = points.at(-13)!;

    return {
      id: definition.id,
      label: definition.label,
      shortLabel: definition.shortLabel,
      value: latest.value,
      monthlyChange: percentChange(latest.value, previous.value),
      annualChange: percentChange(latest.value, previousYear.value),
      asOf: latest.date,
      points
    };
  });
}

const fallbackMonths = Array.from({ length: 25 }, (_, index) => {
  const date = new Date(Date.UTC(2024, 6 + index, 1));
  return {
    date: date.toISOString().slice(0, 10),
    label: `${icelandicMonths[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(2)}`
  };
});

const fallbackSeries: HousingSeries[] = ([
  { id: "capital-apartments", label: "Fjölbýli á höfuðborgarsvæðinu", shortLabel: "Fjölbýli", start: 731.4, end: 801.9 },
  { id: "capital-houses", label: "Sérbýli á höfuðborgarsvæðinu", shortLabel: "Sérbýli", start: 802.2, end: 881.5 },
  { id: "outside-capital", label: "Íbúðarhúsnæði utan höfuðborgarsvæðis", shortLabel: "Landsbyggð", start: 756.8, end: 833.7 },
  { id: "all", label: "Íbúðarhúsnæði á landinu öllu", shortLabel: "Landið allt", start: 745.5, end: 821.7 }
] as const).map((definition, definitionIndex) => {
  const points = fallbackMonths.map((month, index) => ({
    ...month,
    value: definition.start + ((definition.end - definition.start) * index) / 24 + Math.sin(index * 0.68 + definitionIndex) * 4.2
  }));
  points[points.length - 1] = { ...points[points.length - 1], value: definition.end };
  const latest = points.at(-1)!;
  const previous = points.at(-2)!;
  const previousYear = points.at(-13)!;

  return {
    id: definition.id,
    label: definition.label,
    shortLabel: definition.shortLabel,
    value: latest.value,
    monthlyChange: percentChange(latest.value, previous.value),
    annualChange: percentChange(latest.value, previousYear.value),
    asOf: latest.date,
    points
  };
});

const getHousingSeriesCached = unstable_cache(fetchHousingSeries, ["housing-price-index-v1"], { revalidate: 21_600 });

export async function getRealEstateSnapshot(): Promise<RealEstateSnapshot> {
  try {
    return {
      generatedAt: new Date().toISOString(),
      status: "live",
      series: await getHousingSeriesCached()
    };
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      status: "sample",
      series: fallbackSeries
    };
  }
}
