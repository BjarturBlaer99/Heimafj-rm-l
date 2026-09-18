export function accountDeletionRequestedAt(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const request = value as Record<string, unknown>;
  if (request.status !== "requested" || typeof request.requested_at !== "string") return null;
  const timestamp = Date.parse(request.requested_at);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}
