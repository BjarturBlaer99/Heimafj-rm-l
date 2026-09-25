"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthed } from "@/lib/data";
import type { ActionFeedback } from "@/lib/action-feedback";

export async function categorizeTransactions(formData: FormData): Promise<ActionFeedback> {
  const ids = z.array(z.string().uuid()).min(1).max(1000).safeParse(formData.getAll("transaction_ids"));
  const category = z.union([z.string().uuid(), z.literal("")]).safeParse(formData.get("category_id"));
  if (!ids.success || !category.success) return { message: "", error: "Veldu færslur og flokk áður en þú vistar." };
  const uniqueIds = [...new Set(ids.data)];
  const { supabase, user } = await getAuthed();
  const { data: records, error } = await supabase.from("transactions").select("id,type").eq("user_id", user.id).in("id", uniqueIds);
  if (error) throw new Error("Ekki tókst að sækja færslurnar.");
  if (records.length !== uniqueIds.length) return { message: "", error: "Ein eða fleiri færslur fundust ekki. Endurhlaðaðu síðuna og reyndu aftur." };
  if (category.data) {
    const { data: selected, error: categoryError } = await supabase.from("categories").select("id,type").eq("user_id", user.id).eq("id", category.data).single();
    if (categoryError || !selected) return { message: "", error: "Flokkurinn fannst ekki. Veldu annan flokk." };
    if (selected.type !== "both" && records.some((row) => row.type !== selected.type)) return { message: "", error: "Veldu flokk sem hentar öllum völdum færslum, annaðhvort tekjum eða útgjöldum." };
  }
  const result = await supabase.from("transactions").update({ category_id: category.data || null }).eq("user_id", user.id).in("id", uniqueIds).select("id");
  if (result.error) throw new Error("Ekki tókst að vista flokkunina.");
  revalidatePath("/", "layout");
  return { message: "Flokkun færslna var uppfærð." };
}
