import type { SavingsBucket, SavingsBucketType } from "@/lib/types";

export const savingsBucketTemplates: Array<{ bucket_type: SavingsBucketType; label: string }> = [
  { bucket_type: "serignarsparnadur", label: "Séreignarsparnaður" },
  { bucket_type: "husnaedisparnadur", label: "Húsnæðisparnaður" },
  { bucket_type: "hlutabref", label: "Hlutabréf" },
  { bucket_type: "sjodir", label: "Sjóðir" }
];

export function fallbackSavingsBuckets(userId: string) {
  return savingsBucketTemplates.map((bucket, index) => ({
    id: `fallback-${index}`,
    user_id: userId,
    bucket_type: bucket.bucket_type,
    label: bucket.label,
    amount: 0,
    created_at: "",
    updated_at: ""
  })) satisfies SavingsBucket[];
}

export function mergeSavingsBuckets(userId: string, savedBuckets: SavingsBucket[] = []) {
  const byType = new Map(savedBuckets.map((bucket) => [bucket.bucket_type, bucket]));

  return savingsBucketTemplates.map((template, index) => {
    const saved = byType.get(template.bucket_type);
    return (
      saved ?? {
        id: `fallback-${index}`,
        user_id: userId,
        bucket_type: template.bucket_type,
        label: template.label,
        amount: 0,
        created_at: "",
        updated_at: ""
      }
    );
  }) satisfies SavingsBucket[];
}
