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
  if (records.length !== uniqueIds.length) return { message: "", error: "Ein eða fleiri færslur eru ekki lengur tiltækar. Endurhladdu síðunni." };
  if (category.data) {
    const { data: selected, error: categoryError } = await supabase.from("categories").select("id,type").eq("user_id", user.id).eq("id", category.data).single();
    if (categoryError || !selected) return { message: "", error: "Flokkurinn er ekki tiltækur." };
    if (selected.type !== "both" && records.some((row) => row.type !== selected.type)) return { message: "", error: "Flokkurinn þarf að passa við tegund allra valinna færslna." };
  }
  const result = await supabase.from("transactions").update({ category_id: category.data || null }).eq("user_id", user.id).in("id", uniqueIds).select("id");
  if (result.error) throw new Error("Ekki tókst að vista flokkun.");
  revalidatePath("/", "layout");
  return { message: `Flokkun ${result.data.length} færslna var uppfærð.` };
}
