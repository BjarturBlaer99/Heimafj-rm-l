"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { budgetSchema, categorySchema, importTransactionsSchema, monthlyIncomeSchema, profileSchema, savingsBucketSchema, savingsContributionSchema, savingsGoalSchema, transactionSchema } from "@/lib/validation";

async function userId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

function formDataObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function saveTransaction(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = transactionSchema.parse(formDataObject(formData));
  const payload = { ...data, user_id: id, note: data.note || null, category_id: data.category_id || null };
  const result = data.id
    ? await supabase.from("transactions").update(payload).eq("id", data.id).eq("user_id", id)
    : await supabase.from("transactions").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function deleteTransaction(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("transactions").delete().eq("id", String(formData.get("id"))).eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function deleteAllTransactions() {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("transactions").delete().eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function importTransactions(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const rawRows = String(formData.get("rows") ?? "[]");
  const rows = importTransactionsSchema.parse(JSON.parse(rawRows));
  const payload = rows.map((row) => ({
    ...row,
    user_id: id,
    note: row.note || null,
    category_id: row.category_id || null
  }));
  const result = await supabase.from("transactions").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/import");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect("/transactions");
}

export async function saveCategory(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = categorySchema.parse(formDataObject(formData));
  const payload = { name: data.name, type: data.type, user_id: id, is_default: false };
  const result = data.id
    ? await supabase.from("categories").update(payload).eq("id", data.id).eq("user_id", id)
    : await supabase.from("categories").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/settings");
}

export async function deleteCategory(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("categories").delete().eq("id", String(formData.get("id"))).eq("user_id", id).eq("is_default", false);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/settings");
}

export async function saveBudget(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = budgetSchema.parse(formDataObject(formData));
  const payload = { ...data, user_id: id, category_id: data.category_id || null };
  const result = data.id
    ? await supabase.from("budgets").update(payload).eq("id", data.id).eq("user_id", id)
    : await supabase.from("budgets").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/budgets");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function deleteBudget(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("budgets").delete().eq("id", String(formData.get("id"))).eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/budgets");
  revalidatePath("/expenses");
}

export async function saveMonthlyIncome(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = monthlyIncomeSchema.parse(formDataObject(formData));
  const payload = {
    user_id: id,
    category_id: data.category_id || null,
    amount: data.amount,
    type: "income" as const,
    date: data.month,
    note: data.note || null
  };
  const result = data.id
    ? await supabase.from("transactions").update(payload).eq("id", data.id).eq("user_id", id)
    : await supabase.from("transactions").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/income");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

export async function deleteMonthlyIncome(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("transactions").delete().eq("id", String(formData.get("id"))).eq("user_id", id).eq("type", "income");
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/income");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

export async function saveSavingsGoal(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = savingsGoalSchema.parse(formDataObject(formData));
  const payload = { ...data, user_id: id, target_date: data.target_date || null };
  const result = data.id
    ? await supabase.from("savings_goals").update(payload).eq("id", data.id).eq("user_id", id)
    : await supabase.from("savings_goals").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/savings-goals");
  revalidatePath("/dashboard");
}

export async function deleteSavingsGoal(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("savings_goals").delete().eq("id", String(formData.get("id"))).eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/savings-goals");
}

export async function addSavingsContribution(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = savingsContributionSchema.parse(formDataObject(formData));
  const result = await supabase.from("savings_contributions").insert({ ...data, user_id: id, note: data.note || null });
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/savings-goals");
  revalidatePath("/dashboard");
}

export async function deleteSavingsContribution(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("savings_contributions").delete().eq("id", String(formData.get("id"))).eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/savings-goals");
  revalidatePath("/dashboard");
}

export async function deleteAllSavingsContributions() {
  const { supabase, userId: id } = await userId();
  const result = await supabase.from("savings_contributions").delete().eq("user_id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/savings-goals");
  revalidatePath("/dashboard");
}

export async function saveSavingsBucket(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = savingsBucketSchema.parse(formDataObject(formData));
  const result = await supabase.from("savings_buckets").upsert(
    {
      user_id: id,
      bucket_type: data.bucket_type,
      label: data.label,
      amount: data.amount
    },
    { onConflict: "user_id,bucket_type" }
  );
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/savings-goals");
  revalidatePath("/dashboard");
}

export async function deleteSavingsBucket(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const result = await supabase
    .from("savings_buckets")
    .delete()
    .eq("user_id", id)
    .eq("bucket_type", String(formData.get("bucket_type")));
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/savings-goals");
  revalidatePath("/dashboard");
}

export async function saveProfile(formData: FormData) {
  const { supabase, userId: id } = await userId();
  const data = profileSchema.parse(formDataObject(formData));
  const result = await supabase.from("profiles").update(data).eq("id", id);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/settings");
}
