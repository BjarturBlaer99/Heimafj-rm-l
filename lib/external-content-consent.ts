export const EXTERNAL_CONTENT_STORAGE_KEY = "finance-external-content:v1";
export const EXTERNAL_CONTENT_CHANGE_EVENT = "finance-external-content-change";
export const EXTERNAL_CONTENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000;
export type ExternalContentChoice = "allowed" | "blocked" | "unselected";

export function readExternalContentChoice(raw: string | null, now = Date.now()): ExternalContentChoice {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return "unselected";
    const record = value as Record<string, unknown>;
    if (record.version !== 1 || typeof record.tradingView !== "boolean" || typeof record.decidedAt !== "number") return "unselected";
    if (!Number.isFinite(record.decidedAt) || record.decidedAt > now || now - record.decidedAt >= EXTERNAL_CONTENT_MAX_AGE) return "unselected";
    return record.tradingView ? "allowed" : "blocked";
  } catch { return "unselected"; }
}

export function externalContentRecord(allowed: boolean, now = Date.now()) {
  return JSON.stringify({ version: 1, tradingView: allowed, decidedAt: now });
}
