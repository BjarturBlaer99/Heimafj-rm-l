import type { Category } from "@/lib/types";
import { guessCategoryId, normalize, parseAmount, parseDate } from "@/lib/import-parser";

export const MAX_IMPORT_ROWS = 1000;
export const IMPORT_PAGE_SIZE = 25;
export type ImportColumns = { date: string; note: string; merchantType: string; amount: string; debit: string; credit: string };
export type MerchantRule = { pattern: string; categoryId: string };
export type ImportRow = { sourceIndex: number; date: string; note: string; amount: number; type: "expense"; category_id: string | null };
export type ImportDecision = "import" | "skip" | "import_duplicate" | "undecided";
export type ReviewedImportRow = ImportRow & { decision: Exclude<ImportDecision, "undecided">; reviewed: boolean };
export type ExcludedReason = "date" | "amount" | "income" | "zero" | "limit" | "description";
export type ExcludedImportRow = { sourceIndex: number; note: string; date: string; amount: string; reason: ExcludedReason };
export const excludedReasonLabels: Record<ExcludedReason, string> = {
  date: "Dagsetningu vantar eða hún er ógild", amount: "Upphæð vantar eða hún er ógild", income: "Innborgun eða tekjur", zero: "Upphæðin er núll", limit: "Umfram hámarkið: 1.000 færslur", description: "Lýsingin er lengri en 500 stafir"
};

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Match the database's numeric(12,2) storage without silently rounding input.
export function isSupportedImportAmount(value: number) {
  return Number.isFinite(value) && Math.abs(value) <= 9999999999.99 && Number(value.toFixed(2)) === value;
}

export function transactionImportKey(row: { date: string; amount: number; type?: string; note?: string | null }) {
  return `${row.date}|${row.type ?? "expense"}|${Number(row.amount).toFixed(2)}|${(row.note ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("is-IS")}`;
}

export function buildImportReview(rawRows: Record<string, string>[], columns: ImportColumns, categories: Category[], rules: MerchantRule[] = [], categoryOverride = "") {
  const rows: ImportRow[] = [];
  const excluded: ExcludedImportRow[] = [];
  const validCategories = new Set(categories.filter((category) => category.type !== "income").map((category) => category.id));
  rawRows.forEach((raw, sourceIndex) => {
    const rawDate = raw[columns.date] ?? "";
    const date = parseDate(rawDate);
    const note = raw[columns.note]?.trim() || "Innflutt færsla";
    const rawAmount = columns.amount ? raw[columns.amount] ?? "" : `${raw[columns.debit] ?? ""} / ${raw[columns.credit] ?? ""}`;
    const numericText = columns.amount ? raw[columns.amount] ?? "" : `${raw[columns.debit] ?? ""}${raw[columns.credit] ?? ""}`;
    const debit = parseAmount(raw[columns.debit] ?? "");
    const credit = parseAmount(raw[columns.credit] ?? "");
    const amount = columns.amount ? parseAmount(raw[columns.amount] ?? "") : Number((credit - debit).toFixed(2));
    const supportedAmounts = isSupportedImportAmount(amount) && (Boolean(columns.amount) || isSupportedImportAmount(debit) && isSupportedImportAmount(credit));
    let reason: ExcludedReason | undefined;
    if (!isCalendarDate(date)) reason = "date";
    else if (!/\d/.test(numericText) || !supportedAmounts) reason = "amount";
    else if (amount > 0) reason = "income";
    else if (amount === 0) reason = "zero";
    else if (note.length > 500) reason = "description";
    else if (rows.length >= MAX_IMPORT_ROWS) reason = "limit";
    if (reason) { excluded.push({ sourceIndex, note, date: rawDate, amount: rawAmount, reason }); return; }
    const rule = rules.find((item) => normalize(item.pattern).length > 0 && normalize(note).includes(normalize(item.pattern)) && validCategories.has(item.categoryId));
    const suggested = guessCategoryId(note, raw[columns.merchantType] ?? "", categories);
    const category = validCategories.has(categoryOverride) ? categoryOverride : rule?.categoryId ?? suggested;
    rows.push({ sourceIndex, date, note, amount: Math.abs(amount), type: "expense", category_id: category && validCategories.has(category) ? category : null });
  });
  return { rows, excluded };
}

export function findImportDuplicates(rows: ImportRow[], existingKeys: string[]) {
  const existing = new Set(existingKeys);
  const seen = new Set<string>();
  const duplicates: Record<number, "existing" | "file" | "both"> = {};
  for (const row of rows) {
    const key = transactionImportKey(row);
    const inExisting = existing.has(key);
    const inFile = seen.has(key);
    if (inExisting || inFile) duplicates[row.sourceIndex] = inExisting && inFile ? "both" : inExisting ? "existing" : "file";
    seen.add(key);
  }
  return duplicates;
}

export function importReviewKey(row: ImportRow, decision: ImportDecision) {
  return `${transactionImportKey(row)}|${row.category_id ?? ""}|${decision}`;
}

export type ImportPreferences = { version: 1; mappings: Record<string, ImportColumns>; rules: MerchantRule[] };
export function mappingKey(headers: string[]) { return JSON.stringify(headers); }
export function parseImportPreferences(value: string | null): ImportPreferences {
  const empty: ImportPreferences = { version: 1, mappings: {}, rules: [] };
  try {
    const parsed = JSON.parse(value ?? "null");
    if (!parsed || parsed.version !== 1) return empty;
    const mappings: Record<string, ImportColumns> = {};
    for (const [key, item] of Object.entries(parsed.mappings ?? {}).slice(-10)) {
      if (typeof item !== "object" || !item) continue;
      const columns = item as Record<string, unknown>;
      const names = ["date", "note", "merchantType", "amount", "debit", "credit"];
      if (names.every((name) => typeof columns[name] === "string" && (columns[name] as string).length <= 200)) mappings[key] = Object.fromEntries(names.map((name) => [name, columns[name]])) as ImportColumns;
    }
    const rules = (Array.isArray(parsed.rules) ? parsed.rules : []).filter((item: MerchantRule) => item && typeof item.pattern === "string" && item.pattern.trim().length > 0 && item.pattern.length <= 80 && typeof item.categoryId === "string" && /^[0-9a-f-]{36}$/i.test(item.categoryId)).slice(0, 30);
    return { version: 1, mappings, rules: rules.map((rule: MerchantRule) => ({ pattern: rule.pattern, categoryId: rule.categoryId })) };
  } catch { return empty; }
}
