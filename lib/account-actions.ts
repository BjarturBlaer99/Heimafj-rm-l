"use server";

import { revalidatePath } from "next/cache";
import { getAuthed } from "@/lib/data";
import { accountDeletionRequestedAt } from "@/lib/account-deletion";
import type { ActionFeedback } from "@/lib/action-feedback";

export async function requestAccountDeletion(form: FormData): Promise<ActionFeedback> {
  const { supabase, user } = await getAuthed();
  if (String(form.get("confirmation")).trim().toUpperCase() !== "EYÐA") return { message: "", error: "Skrifaðu EYÐA til að staðfesta beiðnina." };
  const existing = user.user_metadata?.account_deletion_request;
  if (accountDeletionRequestedAt(existing)) return { message: "Beiðni um eyðingu er þegar skráð á aðganginn." };
  const { error } = await supabase.auth.updateUser({ data: { account_deletion_request: { status: "requested", requested_at: new Date().toISOString() } } });
  if (error) return { message: "", error: "Ekki tókst að vista beiðnina. Reyndu aftur." };
  revalidatePath("/settings");
  return { message: "Beiðni um eyðingu er vistuð á aðganginn. Aðganginum hefur ekki verið eytt." };
}

export async function cancelAccountDeletion(): Promise<ActionFeedback> {
  const { supabase } = await getAuthed();
  const { error } = await supabase.auth.updateUser({ data: { account_deletion_request: null } });
  if (error) return { message: "", error: "Ekki tókst að afturkalla beiðnina. Reyndu aftur." };
  revalidatePath("/settings");
  return { message: "Beiðni um eyðingu var afturkölluð." };
}
