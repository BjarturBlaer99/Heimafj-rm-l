import { savingsBucketTypes, type SavingsBucketType } from '@/types/finance';

// Same metadata contract as the website. These are display preferences only.
export type SavingsPreferences = { version: 1; order: SavingsBucketType[]; housing: SavingsBucketType[]; goal: SavingsBucketType[] };
export const defaultSavingsPreferences = (): SavingsPreferences => ({ version: 1, order: [...savingsBucketTypes], housing: ['serignarsparnadur', 'husnaedisparnadur'], goal: [...savingsBucketTypes] });
export function validSavingsPreferences(value: unknown): value is SavingsPreferences {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  const selection = (list: unknown) => Array.isArray(list) && list.length <= 4 && new Set(list).size === list.length && list.every((type) => savingsBucketTypes.includes(type));
  return input.version === 1 && Object.keys(input).every((key) => ['version', 'order', 'housing', 'goal'].includes(key)) && selection(input.order) && (input.order as unknown[]).length === 4 && selection(input.housing) && selection(input.goal);
}
export function normalizeSavingsPreferences(value: unknown): SavingsPreferences {
  return validSavingsPreferences(value) ? { ...value, order: [...value.order], housing: [...value.housing], goal: [...value.goal] } : defaultSavingsPreferences();
}
export function savingsTotal(buckets: { bucket_type: SavingsBucketType; amount: number }[], selection: SavingsBucketType[] = [...savingsBucketTypes]): number {
  return buckets.reduce((sum, bucket) => sum + (selection.includes(bucket.bucket_type) ? Math.round(bucket.amount * 100) : 0), 0) / 100;
}
