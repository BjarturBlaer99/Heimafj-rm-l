import { z } from "zod";
import { savingsBucketTemplates } from "@/lib/savings-buckets";
import type { SavingsBucket, SavingsBucketType } from "@/lib/types";

const bucketType = z.enum(["serignarsparnadur", "husnaedisparnadur", "hlutabref", "sjodir"]);
const selection = z.array(bucketType).max(4).refine((values) => new Set(values).size === values.length);

export const savingsPreferencesSchema = z.object({
  version: z.literal(1),
  order: selection.refine((values) => values.length === savingsBucketTemplates.length),
  housing: selection,
  goal: selection
}).strict();

export type SavingsPreferences = z.infer<typeof savingsPreferencesSchema>;

export function defaultSavingsPreferences(): SavingsPreferences {
  return {
    version: 1,
    order: savingsBucketTemplates.map((bucket) => bucket.bucket_type),
    housing: ["serignarsparnadur", "husnaedisparnadur"],
    goal: savingsBucketTemplates.map((bucket) => bucket.bucket_type)
  };
}

// These are display preferences, never authorization data. Older accounts keep
// their existing grouping; damaged or unsupported metadata cannot hide balances.
export function normalizeSavingsPreferences(value: unknown): SavingsPreferences {
  const parsed = savingsPreferencesSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultSavingsPreferences();
}

export function orderSavingsBuckets(buckets: SavingsBucket[], preferences: SavingsPreferences): SavingsBucket[] {
  return [...buckets].sort((left, right) => preferences.order.indexOf(left.bucket_type) - preferences.order.indexOf(right.bucket_type));
}

export function selectedSavingsTotal(buckets: SavingsBucket[], selected: SavingsBucketType[]): number {
  return buckets.reduce((sum, bucket) => sum + (selected.includes(bucket.bucket_type) ? Number(bucket.amount) : 0), 0);
}
