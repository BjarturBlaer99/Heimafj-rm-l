export type PeriodParams = { period?: string; month?: string; from?: string; to?: string };

export function validMonth(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

export function validDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value);
}

export function resolveTransactionPeriod(params: PeriodParams, defaultMonth: string) {
  const period = params.period === "all" || params.month === "all" || params.month === "" && !params.from && !params.to
    ? "all" : params.period === "range" || params.period !== "month" && Boolean(params.from || params.to) ? "range" : "month";
  if (period === "all") return { period, month: undefined, from: undefined, to: undefined, label: "Öll tímabil" } as const;
  if (period === "range") {
    if (params.from && !validDate(params.from) || params.to && !validDate(params.to) || params.from && params.to && params.from > params.to) throw new Error("Ógilt dagsetningabil");
    return { period, month: undefined, from: params.from || undefined, to: params.to || undefined, label: `${params.from || "Frá upphafi"} – ${params.to || "Án lokadags"}` } as const;
  }
  const month = params.month || defaultMonth;
  if (!validMonth(month)) throw new Error("Ógildur mánuður");
  return { period, month, from: undefined, to: undefined, label: new Intl.DateTimeFormat("is-IS", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`)) } as const;
}

export function transactionPeriodQuery(period: ReturnType<typeof resolveTransactionPeriod>) {
  const query = new URLSearchParams({ period: period.period });
  if (period.month) query.set("month", period.month);
  if (period.from) query.set("from", period.from);
  if (period.to) query.set("to", period.to);
  return query;
}
