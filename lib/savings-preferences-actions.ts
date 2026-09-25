"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionFeedback } from "@/lib/action-feedback";
import { savingsPreferencesSchema } from "@/lib/savings-preferences";
import { createClient } from "@/lib/supabase/server";

export async function saveSavingsPreferences(formData: FormData): Promise<ActionFeedback> {
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) redirect("/login");

  const raw = formData.get("preferences");
  let input: unknown;
  try {
    input = typeof raw === "string" && raw.length <= 2048 ? JSON.parse(raw) : null;
  } catch {
    input = null;
  }
  const parsed = savingsPreferencesSchema.safeParse(input);
  if (!parsed.success) return { message: "", error: "Ekki tókst að lesa skiptinguna. Endurhladdu síðuna og reyndu aftur." };

  // updateUser applies only to the authenticated account and merges this key
  // with its existing metadata. No client-supplied user ID or balances are used.
  const { error } = await supabase.auth.updateUser({ data: { savings_preferences: parsed.data } });
  if (error) return { message: "", error: "Ekki tókst að vista skiptinguna. Reyndu aftur." };
  revalidatePath("/", "layout");
  return { message: "Skipting sparnaðar var vistuð." };
}
