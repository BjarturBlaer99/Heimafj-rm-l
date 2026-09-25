"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { findImportDuplicates, isCalendarDate, isSupportedImportAmount, transactionImportKey, type ImportRow, type ReviewedImportRow } from "@/lib/import-review";

const rowSchema = z.object({
  sourceIndex: z.number().int().nonnegative().max(1000000),
  date: z.string().refine(isCalendarDate, "Ógild dagsetning"),
  note: z.string().trim().min(1).max(500),
  amount: z.number().finite().positive().refine(isSupportedImportAmount, "Upphæð þarf að vera innan leyfilegra marka og að hámarki með tveimur aukastöfum"),
  type: z.literal("expense"),
  category_id: z.string().uuid().nullable()
});
const rowsSchema = z.array(rowSchema).max(1000).refine((rows) => new Set(rows.map((row) => row.sourceIndex)).size === rows.length, "Færslunúmer verða að vera einstök");
const reviewedRowsSchema = z.array(rowSchema.extend({ decision: z.enum(["import", "skip", "import_duplicate"]), reviewed: z.boolean() })).min(1).max(1000)
  .refine((rows) => new Set(rows.map((row) => row.sourceIndex)).size === rows.length, "Færslunúmer verða að vera einstök")
  .refine((rows) => rows.every((row) => row.decision === "skip" || row.reviewed), "Yfirfarðu allar valdar færslur");

type SavedImportRow = { id: string; date: string; type: string; amount: number; note: string | null; category_id: string | null };

async function savedBatchRows(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, ids: string[]) {
  const chunks = Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) => ids.slice(index * 100, (index + 1) * 100));
  const results = await Promise.all(chunks.map(async (chunk) => {
    const { data, error } = await supabase.from("transactions").select("id,date,type,amount,note,category_id").eq("user_id", userId).in("id", chunk);
    if (error) throw new Error("Ekki tókst að staðfesta hvort færslurnar voru vistaðar. Reyndu innflutninginn aftur með sama takka.");
    return (data ?? []) as SavedImportRow[];
  }));
  return results.flat();
}

function matchesSavedRow(saved: SavedImportRow, expected: SavedImportRow) {
  return saved.date === expected.date && saved.type === expected.type && Number(saved.amount) === Number(expected.amount.toFixed(2))
    && saved.note === expected.note && saved.category_id === expected.category_id;
}

function changedBatch() {
  return { status: "conflict" as const, message: "Ein af innfluttu færslunum hefur breyst síðan hún var vistuð. Skoðaðu færsluyfirlitið áður en þú flytur skrána inn aftur. Engar eldri færslur voru yfirskrifaðar." };
}

async function authenticated() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

async function existingRecords(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, rows: ImportRow[]) {
  if (!rows.length) return [];
  const dates = rows.map((row) => row.date).sort();
  const result: Array<{ id: string; date: string; type: string; amount: number; note: string | null }> = [];
  for (let offset = 0; offset < 100000; offset += 1000) {
    const { data, error } = await supabase.from("transactions").select("id,date,type,amount,note")
      .eq("user_id", userId).eq("type", "expense").gte("date", dates[0]).lte("date", dates[dates.length - 1])
      .order("id").range(offset, offset + 999);
    if (error) throw new Error("Ekki tókst að bera saman við skráðar færslur. Reyndu aftur.");
    result.push(...(data ?? []));
    if (!data || data.length < 1000) return result;
  }
  throw new Error("Of margar færslur eru skráðar á þessu tímabili til að hægt sé að athuga tvítekningar. Skiptu skránni í styttri tímabil og reyndu aftur.");
}

function matchingKeys(records: Array<{ date: string; type: string; amount: number; note: string | null }>, rows: ImportRow[]) {
  const candidateKeys = new Set(rows.map(transactionImportKey));
  return [...new Set(records.map(transactionImportKey).filter((key) => candidateKeys.has(key)))];
}

export async function checkImportDuplicates(input: ImportRow[]) {
  const rows = rowsSchema.parse(input);
  const { supabase, userId } = await authenticated();
  return { userId, existingKeys: matchingKeys(await existingRecords(supabase, userId, rows), rows) };
}

export async function saveReviewedImport(input: { batchId: string; userId: string; rows: ReviewedImportRow[] }) {
  const batchId = z.string().uuid().parse(input.batchId);
  const rows = reviewedRowsSchema.parse(input.rows);
  const { supabase, userId } = await authenticated();
  if (z.string().uuid().parse(input.userId) !== userId) throw new Error("Þú hefur skipt um aðgang. Endurhlaðaðu síðuna áður en þú flytur færslurnar inn.");
  // The same confirmed batch can be retried after an uncertain network response.
  // IDs are scoped to the authenticated user; the client cannot supply row IDs.
  const rowId = (sourceIndex: number) => {
    const hash = createHash("sha256").update(`${userId}:${batchId}:${sourceIndex}`).digest("hex");
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  };
  const batchIds = new Set(rows.map((row) => rowId(row.sourceIndex)));
  const selected = rows.filter((row) => row.decision !== "skip");
  const payload = selected.map(({ sourceIndex, date, note, amount, type, category_id }) => ({ id: rowId(sourceIndex), user_id: userId, date, note, amount, type, category_id }));
  const expected = new Map(payload.map((row) => [row.id, row]));
  const [existing, saved] = await Promise.all([existingRecords(supabase, userId, rows), savedBatchRows(supabase, userId, [...batchIds])]);
  if (saved.some((row) => !expected.has(row.id) || !matchesSavedRow(row, expected.get(row.id)!))) return changedBatch();
  const otherExisting = existing.filter((row) => !batchIds.has(row.id));
  const existingKeys = matchingKeys(otherExisting, rows);
  const duplicates = findImportDuplicates(rows, existingKeys);
  if (rows.some((row) => row.decision === "import" && duplicates[row.sourceIndex])) {
    return { status: "needs_review" as const, existingKeys };
  }
  const categoryIds = new Set(selected.flatMap((row) => row.category_id ? [row.category_id] : []));
  if (categoryIds.size) {
    const { data: categories, error } = await supabase.from("categories").select("id,type").eq("user_id", userId);
    if (error) throw new Error("Ekki tókst að sækja flokkana. Reyndu aftur.");
    const allowed = new Set((categories ?? []).filter((category) => category.type !== "income").map((category) => category.id));
    if ([...categoryIds].some((id) => !allowed.has(id))) throw new Error("Einn af völdum flokkum er ekki lengur tiltækur. Yfirfarðu flokkunina.");
  }
  let newlyImported = 0;
  if (payload.length) {
    // One database statement avoids partial multi-batch writes.
    const { data, error } = await supabase.from("transactions").upsert(payload, { onConflict: "id", ignoreDuplicates: true }).select("id");
    if (error) throw new Error("Ekki tókst að staðfesta hvort innflutningi lauk. Reyndu aftur með sama takka.");
    revalidatePath("/", "layout");
    newlyImported = data?.length ?? 0;
    // Another tab may finish the same batch or edit it while this write waits.
    // Verify the actual persisted values rather than treating ignored IDs as success.
    const persisted = await savedBatchRows(supabase, userId, payload.map((row) => row.id));
    if (persisted.length !== payload.length) throw new Error("Ekki tókst að staðfesta að allar færslurnar hafi verið vistaðar. Reyndu aftur með sama takka.");
    if (persisted.some((row) => !matchesSavedRow(row, expected.get(row.id)!))) return changedBatch();
  }
  const skipped = rows.filter((row) => row.decision === "skip");
  return {
    status: "complete" as const,
    imported: selected.length,
    newlyImported,
    skipped: skipped.length,
    duplicatesSkipped: skipped.filter((row) => duplicates[row.sourceIndex]).length,
    duplicatesImported: selected.filter((row) => duplicates[row.sourceIndex]).length,
    from: (selected.length ? selected : rows).map((row) => row.date).sort()[0],
    to: (selected.length ? selected : rows).map((row) => row.date).sort().at(-1)!
  };
}
