import { getAuthed } from "@/lib/data";
import { savingsBucketTemplates } from "@/lib/savings-buckets";
import type { SavingsBucketEntry } from "@/lib/types";

export async function getLatestSavingsEntries() {
  const { supabase, user } = await getAuthed();
  const results = await Promise.all(savingsBucketTemplates.map(({ bucket_type }) =>
    supabase.from("savings_bucket_entries").select("*").eq("user_id", user.id).eq("bucket_type", bucket_type)
      .order("date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1)
  ));
  if (results.some((result) => result.error)) return { schemaReady: false, entries: [] as SavingsBucketEntry[] };
  return { schemaReady: true, entries: results.flatMap((result) => result.data ?? []) as SavingsBucketEntry[] };
}

export async function getSavingsHistory(requestedPage = 1) {
  const { supabase, user } = await getAuthed();
  const pageSize = 20;
  let page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 1_000_000) : 1;
  const read = (number: number) => supabase.from("savings_bucket_entries").select("*", { count: "exact" }).eq("user_id", user.id)
    .order("date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false })
    .range((number - 1) * pageSize, number * pageSize - 1);
  let result = await read(page);
  if (result.error || result.count === null) return { schemaReady: false, entries: [] as SavingsBucketEntry[], page: 1, pageCount: 1, total: 0 };
  const pageCount = Math.max(1, Math.ceil(result.count / pageSize));
  if (page > pageCount) {
    page = pageCount;
    result = await read(page);
    if (result.error || result.count === null) return { schemaReady: false, entries: [] as SavingsBucketEntry[], page: 1, pageCount: 1, total: 0 };
  }
  return { schemaReady: true, entries: (result.data ?? []) as SavingsBucketEntry[], page, pageCount, total: result.count };
}
